// Review-queue stale-review resurfacing (FEATURE_STALE_REVIEW_RESURFACING.md).
//
// Invoked exclusively by pg_cron/pg_net on a fixed schedule (never by the
// browser). Notifies every active reviewer/admin the moment a pending,
// non-draft, non-deleted archive_entries row crosses 48 hours with no
// review activity -- the same "no review activity" definition
// GradeSubmissions.jsx's client-side isStale flag already uses
// (lastActivity = greatest(created_at, max(reviews.created_at))).
//
// Atomicity/idempotency: candidate staleness is computed here in JS,
// mirroring GradeSubmissions.jsx's own JS calculation exactly (there is no
// shared constant file between a Deno function and the Vite-bundled React
// app, so STALE_MS below must be kept in sync with GradeSubmissions.jsx's
// STALE_MS by hand if it ever changes). The actual claim -- the step that
// must be race-safe against a second concurrent invocation -- is a single
// `INSERT ... ON CONFLICT (entry_id) DO NOTHING RETURNING entry_id`
// (expressed here as upsert + ignoreDuplicates + select), which is atomic
// at the Postgres unique-constraint level regardless of how the candidate
// set upstream of it was computed. Only entries that come back from that
// claim are ever notified about, so a given entry can never be notified
// about twice, even if the schedule fires twice for the same window.
import { createClient } from 'npm:@supabase/supabase-js@2'

const STALE_MS = 48 * 60 * 60 * 1000 // keep in sync with GradeSubmissions.jsx's STALE_MS

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Constant-time string compare so a caller can't probe the secret one
// character at a time via response-timing differences.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ba = enc.encode(a)
  const bb = enc.encode(b)
  if (ba.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i]
  return diff === 0
}

Deno.serve(async (req: Request) => {
  try {
    // Caller verification. This function runs with the service-role key
    // (bypasses ALL RLS), so it must never be openly invocable. It is called
    // only by the pg_cron job, which sends a shared secret in x-cron-secret
    // (sourced from Supabase Vault -- see supabase_schema.sql cron.schedule).
    // Fail CLOSED: if CRON_SECRET isn't configured, refuse rather than run
    // unauthenticated. Deploy order: set the CRON_SECRET function secret and
    // the matching Vault secret BEFORE/with deploying this function, or the
    // cron will start returning 401 until they agree.
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret) {
      return json({ error: 'CRON_SECRET is not configured' }, 500)
    }
    const provided = req.headers.get('x-cron-secret') ?? ''
    if (!timingSafeEqual(provided, cronSecret)) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, 500)
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Cheap, indexable pre-filter: entries old enough that they *might* be
    // stale. The true lastActivity check (including reviews) happens below,
    // so an entry that's old but has a recent review is correctly excluded.
    const cutoffIso = new Date(Date.now() - STALE_MS).toISOString()
    const { data: candidates, error: candidatesErr } = await supabase
      .from('archive_entries')
      .select('id, title, layer, created_at')
      .eq('status', 'pending')
      .eq('is_draft', false)
      .is('deleted_at', null)
      .lt('created_at', cutoffIso)

    if (candidatesErr) throw candidatesErr
    if (!candidates || candidates.length === 0) {
      return json({ entriesResurfaced: 0, notificationsSent: 0 })
    }

    const candidateIds = candidates.map((c) => c.id)

    // Reviews for those candidates -- needed to compute the true
    // lastActivity (greatest(created_at, max(reviews.created_at))),
    // identical to GradeSubmissions.jsx's isStale calculation.
    const { data: reviewRows, error: reviewsErr } = await supabase
      .from('reviews')
      .select('entry_id, created_at')
      .in('entry_id', candidateIds)

    if (reviewsErr) throw reviewsErr

    const lastActivityByEntry = new Map<string, number>(
      candidates.map((c) => [c.id, new Date(c.created_at).getTime() || 0]),
    )
    for (const r of reviewRows || []) {
      const t = new Date(r.created_at).getTime() || 0
      const prev = lastActivityByEntry.get(r.entry_id) ?? 0
      if (t > prev) lastActivityByEntry.set(r.entry_id, t)
    }

    const now = Date.now()
    const trulyStale = candidates.filter((c) => now - (lastActivityByEntry.get(c.id) ?? 0) > STALE_MS)

    if (trulyStale.length === 0) {
      return json({ entriesResurfaced: 0, notificationsSent: 0 })
    }

    // Atomic claim: INSERT ... ON CONFLICT (entry_id) DO NOTHING RETURNING
    // entry_id. Entries already present in stale_review_notified (already
    // notified, or claimed by a concurrent invocation) are silently
    // skipped -- Postgres's own unique-constraint enforcement is the
    // concurrency primitive here, not application-level locking.
    const { data: claimed, error: claimErr } = await supabase
      .from('stale_review_notified')
      .upsert(
        trulyStale.map((c) => ({ entry_id: c.id })),
        { onConflict: 'entry_id', ignoreDuplicates: true },
      )
      .select('entry_id')

    if (claimErr) throw claimErr
    if (!claimed || claimed.length === 0) {
      return json({ entriesResurfaced: 0, notificationsSent: 0 })
    }

    const claimedIds = new Set(claimed.map((c) => c.entry_id as string))
    const claimedEntries = trulyStale.filter((c) => claimedIds.has(c.id))

    // Eligible reviewer pool -- any reviewer or admin may grade any pending
    // entry (reviews.unique(entry_id, reviewer_id) confirms there is no
    // per-reviewer assignment concept), so "resurfacing" means notifying
    // the whole pool, not reassigning a claim.
    const { data: reviewers, error: reviewersErr } = await supabase
      .from('users_profile')
      .select('id')
      .in('role', ['reviewer', 'admin'])

    if (reviewersErr) throw reviewersErr

    let notificationsSent = 0
    if (reviewers && reviewers.length > 0) {
      const rows = []
      for (const entry of claimedEntries) {
        const message = `L${entry.layer} entry "${entry.title}" has been waiting 48+ hours for review.`
        for (const reviewer of reviewers) {
          rows.push({
            user_id: reviewer.id,
            message,
            entry_id: entry.id,
            type: 'stale_review',
          })
        }
      }
      if (rows.length > 0) {
        const { error: insertErr } = await supabase.from('notifications').insert(rows)
        // Partial-failure: the claim above already succeeded, so these
        // entries stay marked "notified" even if this insert fails. This
        // is an accepted, documented edge case (no notifications sent,
        // but the entry is never lost -- GradeSubmissions.jsx's own
        // client-side stale-sort is independent and unaffected).
        if (insertErr) throw insertErr
        notificationsSent = rows.length
      }
    }

    return json({ entriesResurfaced: claimedEntries.length, notificationsSent })
  } catch (err) {
    console.error('resurface-stale-reviews failed:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
