-- ============================================================
-- RECOMMENDED FIX — NOT AUTO-APPLIED. Requires a product decision first.
-- Placed OUTSIDE supabase/migrations/ deliberately so `supabase db push`
-- will not run it until you move it in.
--
-- AUDIT FINDING 3a (Medium, CVSS ~6.4, Broken Access Control / integrity):
-- `process_review_consensus()` merges a deepen-entry's content into its
-- BASE entry (`updates_entry_id`) with NO check that the deepen author owns
-- (or may edit) the base entry. Because the "deepen / add missing depth"
-- links in ArchiveGrid are shown on EVERY approved entry, any member can
-- submit a pending deepen-entry targeting ANOTHER user's approved entry;
-- once it clears 3-reviewer consensus (reachable with sockpuppet reviewer
-- accounts — submitter != reviewers, so the self-review rule doesn't trip),
-- the victim's approved `content`/`short_summary` is OVERWRITTEN and `layer`
-- is bumped. Points/notification go to the base author, so the payoff is
-- content vandalism, not point gain.
--
-- Live body confirmed via pg_get_functiondef on 2026-07-21 — the overwrite is:
--   update archive_entries
--     set short_summary = case when new-value non-empty then new else keep end,
--         content       = case when new-value non-empty then new else keep end,
--         layer = greatest(layer, v_entry.layer), difficulty = v_avg_difficulty
--   where id = v_base_id;   -- no ownership check
--
-- DECISION REQUIRED (pick one before applying):
--   (A) Deepening another user's entry is NOT intended to replace their
--       content  ->  only fill fields that are currently EMPTY on the base,
--       never overwrite non-empty base content (additive-only). Preserves
--       "add missing L5 summary/L6 detail" and layer-deepening. RECOMMENDED.
--   (B) Only the base-entry OWNER may cause a content overwrite; a deepen by
--       a different user is approved as its own standalone entry (or blocked).
--
-- Below implements (A): additive-only merge of content/short_summary
-- (existing non-empty base content is never clobbered), while still bumping
-- layer via greatest() and updating difficulty. This is the minimal change
-- to the confirmed live body — DIFF IS ONLY THE TWO `case` EXPRESSIONS.
--
-- TEST BEFORE APPLYING: create a base approved entry (user A) with non-empty
-- content, submit a deepen-entry (user B) with different content targeting
-- it, drive 3 passing reviews, and confirm A's content is UNCHANGED while a
-- deepen that only fills a previously-EMPTY field still works.
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
        -- FIX 3a: additive-only merge. Fill content/short_summary ONLY when
        -- the BASE field is currently empty; never overwrite existing base
        -- content. Layer still deepens (greatest), difficulty still updates.
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
