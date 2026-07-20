-- ============================================================
-- SECURITY FIX 3a (Medium) — deepen-entry base overwrite
--
-- CONFIRMED VULNERABILITY (audit 2026-07-21, live pg_get_functiondef):
--   process_review_consensus() merged a deepen-entry's content into its
--   base (updates_entry_id) unconditionally. Any member could submit a
--   deepen targeting another user's approved entry; after 3-reviewer
--   consensus the victim's content/short_summary was overwritten.
--
-- FIX (option A — additive-only merge):
--   Fill content/short_summary on the BASE row ONLY when that field is
--   currently empty. Existing non-empty base content is never clobbered.
--   Layer still deepens via greatest(); difficulty still updates.
--
-- SOURCE OF TRUTH: live pg_get_functiondef dump on 2026-07-21 — only the
-- two CASE expressions in the deepen merge UPDATE differ from production.
-- Idempotent. Safe to re-run.
-- ============================================================

create or replace function public.process_review_consensus()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_entry           archive_entries%rowtype;
  v_author_id       uuid;
  v_reviewer_count  integer;
  v_all_pass        boolean;
  v_avg_difficulty  integer;
  v_base_id         uuid;
  v_base_title      text;
  v_base_layer      integer;
begin
  select * into v_entry from archive_entries where id = new.entry_id;

  if v_entry.submitted_by is not null and v_entry.submitted_by = new.reviewer_id then
    raise exception 'cannot review own submission';
  end if;

  update users_profile set points = points + 85 where id = new.reviewer_id;

  if v_entry.status <> 'pending' then
    return new;
  end if;

  select count(distinct reviewer_id), bool_and(fact_check_pass), round(avg(difficulty))
    into v_reviewer_count, v_all_pass, v_avg_difficulty
    from reviews where entry_id = new.entry_id;

  if v_reviewer_count >= 3 then
    if v_all_pass then
      if v_entry.updates_entry_id is not null then
        v_base_id := v_entry.updates_entry_id;
        -- Additive-only merge: never overwrite non-empty base content.
        update archive_entries
          set short_summary = case
                when trim(coalesce(short_summary, '')) = ''
                 and trim(coalesce(v_entry.short_summary, '')) <> ''
                then v_entry.short_summary else short_summary end,
              content = case
                when trim(coalesce(content, '')) = ''
                 and trim(coalesce(v_entry.content, '')) <> ''
                then v_entry.content else content end,
              layer      = greatest(layer, v_entry.layer),
              difficulty = v_avg_difficulty
          where id = v_base_id;
      else
        v_base_id := v_entry.id;
        update archive_entries set difficulty = v_avg_difficulty where id = v_base_id;
      end if;

      update archive_entries set status = 'approved' where id = new.entry_id and status = 'pending';
      if not found then
        return new;
      end if;

      select submitted_by, title, layer into v_author_id, v_base_title, v_base_layer from archive_entries where id = v_base_id;
      if v_author_id is not null then
        update users_profile set points = points + 220 where id = v_author_id;
        insert into notifications (user_id, message, entry_id, type)
          values (
            v_author_id,
            'Your L' || v_base_layer || ' entry "' || coalesce(v_base_title, v_entry.title) || '" cleared review. Status: Approved. +220 points.',
            v_base_id,
            'entry_approved'
          );
      end if;
    else
      update archive_entries set status = 'rejected' where id = new.entry_id and status = 'pending';
      if not found then
        return new;
      end if;

      if v_entry.submitted_by is not null then
        insert into notifications (user_id, message, entry_id, type)
          values (
            v_entry.submitted_by,
            'Your L' || v_entry.layer || ' entry "' || v_entry.title || '" was rejected. Reviewer feedback is attached — see My submissions.',
            v_entry.id,
            'entry_rejected'
          );
      end if;
    end if;
  end if;

  return new;
end;
$function$;

-- Re-assert trigger-only RPC revocation (CREATE OR REPLACE resets default grants).
revoke execute on function public.process_review_consensus() from public, anon, authenticated;
