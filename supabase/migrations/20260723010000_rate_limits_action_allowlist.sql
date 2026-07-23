-- ============================================================
-- Close the residual resource-consumption vector left by restoring
-- EXECUTE on enforce_rate_limit(text) to anon/authenticated (see
-- 20260723000000_hotfix_restore_enforce_rate_limit_execute.sql).
--
-- CONTEXT: that grant was necessary -- the rl_* wrapper triggers are
-- invoker-rights, not SECURITY DEFINER, so they need it to complete their
-- call. (Making the wrappers SECURITY DEFINER instead was considered and
-- REJECTED: inside a SECURITY DEFINER function, current_user becomes the
-- function OWNER for the duration of the call, not the original PostgREST
-- role -- that would break the `current_user in ('anon','authenticated')`
-- check those wrappers use to distinguish live requests from
-- migrations/service-role writes, silently disabling rate-limit
-- enforcement for real users. Keeping the wrappers invoker-rights and
-- granting the narrow EXECUTE is the correct shape.)
--
-- Re-granting EXECUTE does make enforce_rate_limit() directly callable via
-- /rest/v1/rpc/enforce_rate_limit again (Supabase advisors 0028/0029).
-- Reviewed: the function resolves the caller strictly from auth.jwt()->>
-- 'sub' (never a caller-supplied id), so a direct call can only touch the
-- CALLER'S OWN rate_limits row -- no cross-user effect, no bypass (direct
-- calls can only make the caller hit their own limit sooner, never later).
-- The one real gap: p_action is unconstrained text with no allowlist, so a
-- caller varying p_action across many distinct strings could create
-- unbounded rows against their own user_id (DB bloat / minor resource
-- consumption -- OWASP API4:2023). Verified live: rate_limits currently
-- contains exactly one distinct action value, one of the three the app
-- ever produces, so this allowlist is safe to add with no data cleanup.
-- ============================================================

alter table public.rate_limits
  add constraint rate_limits_action_allowlist
  check (action in ('archive_entries_insert', 'reviews_insert', 'segment_reports_insert'));
