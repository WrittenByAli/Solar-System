# Solar Archive — Milestone 4: Reviews, Grading & Live Leaderboard
## Phase 2D Backend Proposal

---

**Prepared for:** Jurhuisman (Solar Foundation)
**Prepared by:** Muhammad Ali
**Date:** June 28, 2026
**Prerequisite:** Milestones 1, 2, and 3 must be complete
**Full Backend Proposal:** $2,500 (Phase 2, complete scope)
**This Milestone:** $650 (fixed price, see Section 6)
**Cumulative after this milestone:** $1,950

---

## 1. What This Phase Solves

After Milestones 1–3, students can sign up, verify their email, and submit any archive layer type. But every submission sits at `pending` forever — there is no one to review it, no score awarded, and no way for the entry to reach the archive or the leaderboard:

| Problem | Current State (after M1–M3) | After This Milestone |
|---|---|---|
| Submissions pile up unreviewed | Entries stay at "Pending" indefinitely | Reviewers see a live queue and can claim, grade, and approve entries |
| No scoring system | No points exist — leaderboard has no real data | Reviewers assign scores 1–10 · students earn points per approved entry |
| Students get no feedback | Submissions vanish into a queue with no response | Students receive an in-app notification when their entry is reviewed, with the score and written feedback |
| Leaderboard is fake | Static demo data hardcoded in the frontend | Real-time rankings generated from actual student scores in the database |
| Archive shows only seeded data | Only the 64 manually seeded subjects appear | Approved student submissions appear in the archive map and directory |
| No content lifecycle | No path from submitted → reviewed → live | Full workflow: Pending → Under Review → Approved/Rejected → Archive |

This milestone closes the loop. For the first time, a student submits, a reviewer scores it, and the entry appears in the archive with the student on the leaderboard.

---

## 2. Exact Scope of Work

### 2.1 Reviewer Queue (`/review-queue` connected to Supabase)
The `/review-queue` page exists in the frontend but currently shows static placeholder data.

**What gets built:**
- Reviewer queue fetches all `pending` entries from Supabase, oldest first
- Each entry card shows: title, layer type, planet, hub, submission date, student username
- Reviewer can preview the full submission content before claiming
- "Claim Entry" button assigns the entry to the reviewer (`under_review` status, `claimed_by = reviewer_id`, `claimed_at = now()`)
- Once claimed, the entry disappears from other reviewers' queues — preventing duplicate reviews
- If a reviewer abandons a claimed entry for more than 48 hours, it is automatically released back to the queue (Edge Function scheduled job)
- Queue shows count of pending entries at the top
- Filter by layer type (L4, L5, L6, L7, L8) and by planet

**Database changes:**
```
archive_entries → add column: claimed_by UUID REFERENCES users_profile(id)
archive_entries → add column: claimed_at TIMESTAMPTZ
archive_entries → add column: review_released_at TIMESTAMPTZ
```

---

### 2.2 Grading Workflow (Score, Feedback, Approve/Reject)
Once a reviewer claims an entry, they need a structured way to evaluate and respond to it.

**What gets built:**
- Grading panel opens when a reviewer claims an entry
- Reviewer reads the full submission (all fields displayed per layer type)
- Reviewer fills in:
  - **Score** (1–10 integer slider) — required
  - **Written feedback** (textarea, minimum 50 characters) — required
  - **Decision** (Approve / Reject radio) — required
- Submit button sends the review to Supabase via Edge Function
- Edge Function on review submit:
  1. Updates `archive_entries.status` to `approved` or `rejected`
  2. Writes a new row to `reviews` table (reviewer_id, entry_id, score, feedback, decision, reviewed_at)
  3. If approved: calculates points from score (score × layer multiplier) and adds to `users_profile.points`
  4. Triggers a notification for the student (see 2.3)
- Reviewer cannot change a submitted review (audit trail must be immutable)

**Points formula per layer:**
| Layer | Score multiplier |
|---|---|
| L4 | Score × 1 |
| L5 | Score × 1.5 |
| L6 | Score × 2 |
| L7 | Score × 2.5 |
| L8 | Score × 3 |

Example: L7 entry scored 8 → 8 × 2.5 = 20 points added to student's total.

**Database tables created:**
```
reviews → id, entry_id, reviewer_id, score, feedback, decision, reviewed_at
```

---

### 2.3 Student Notification on Review
Students have no way to know when their entry has been reviewed.

**What gets built:**
- In-app notification system — notifications stored in Supabase, polled by the frontend every 60 seconds
- When a review is submitted (via the Edge Function in 2.2), a notification row is created:
  - "Your L5 entry 'Black Hole Formation' was reviewed. Score: 7/10. Status: Approved. +10 points earned."
  - "Your L6 entry 'Quantum Entanglement' was reviewed. Score: 4/10. Status: Rejected. Feedback attached."
- Navbar shows an unread notification badge (red dot) when new notifications exist
- Notification dropdown lists last 10 notifications, newest first
- Clicking a notification marks it as read and links to the full review in `/my-submissions`

**Database table created:**
```
notifications → id, user_id, message, entry_id, is_read, created_at
```

---

### 2.4 Review Audit Trail
Every review decision must be traceable — who reviewed what, when, with what score.

**What gets built:**
- `reviews` table (created in 2.2) stores the complete record of every review
- Reviewer cannot delete or edit a submitted review
- Each `archive_entries` row stores `reviewed_by` and `reviewed_at` for quick reference
- If a student disputes a review, the admin can look up the full review record in Supabase dashboard

**Database changes to `archive_entries`:**
```
archive_entries → add column: reviewed_by UUID REFERENCES users_profile(id)
archive_entries → add column: reviewed_at TIMESTAMPTZ
archive_entries → add column: review_score INTEGER CHECK (review_score BETWEEN 1 AND 10)
archive_entries → add column: reviewer_feedback TEXT
```

---

### 2.5 Real-Time Leaderboard from Actual Scores
The leaderboard at `/leaderboard` currently shows hardcoded fake names and scores.

**What gets built:**
- Leaderboard query: ranks all `users_profile` rows by `points DESC`
- Top 100 students displayed (paginated)
- Each row shows: rank, avatar, username, total points, number of approved entries, highest layer type approved
- Filter controls (connected to Supabase):
  - By planet (shows leaderboard only for entries submitted to that planet)
  - By hub (narrows to a specific discipline)
  - By layer type (who has the most approved L8 entries, etc.)
- Leaderboard is cached in Supabase using a materialized view — refreshes every 5 minutes
- Manual refresh button forces immediate recalculation

**Database view created:**
```sql
CREATE MATERIALIZED VIEW leaderboard_view AS
SELECT
  u.id, u.username, u.avatar_url, u.points,
  COUNT(e.id) FILTER (WHERE e.status = 'approved') AS approved_count,
  MAX(e.layer_type) AS highest_layer,
  RANK() OVER (ORDER BY u.points DESC) AS rank
FROM users_profile u
LEFT JOIN archive_entries e ON e.submitted_by = u.id
GROUP BY u.id, u.username, u.avatar_url, u.points;
```

---

### 2.6 Approved Entries Appear in Archive
Currently the archive map and directory only show the 64 seeded subjects from Milestone 1. Approved student submissions do not appear.

**What gets built:**
- `ArchiveGrid` (the planet map view) queries Supabase for all `approved` entries for the selected planet, not just seeded data
- `ArchiveDirectory` fetches all approved entries across all planets, filterable by layer type, hub, planet, and keyword search
- Approved entries appear at the grid coordinates the student specified on submission
- If a coordinate is already occupied by a seeded entry, the new approved entry is placed at the nearest available coordinate
- Search is powered by PostgreSQL full-text search on `title`, `content`, and `tags` columns

**Database index created:**
```sql
CREATE INDEX idx_archive_entries_fts ON archive_entries
USING GIN(to_tsvector('english', title || ' ' || coalesce(content, '')));
```

---

### 2.7 Points Update on Student Profile
Points earned from approved reviews must appear on the student's profile page (built in Milestone 2).

**What gets built:**
- `users_profile.points` is updated by the Edge Function on every review approval
- Profile page displays the updated points total in real time
- Points history is not itemized on profile (full history view is an admin panel feature — Phase 5)
- Leaderboard position is shown on profile: "You are ranked #47 on the SOLAR Archive"

---

## 3. What Is Explicitly NOT Included

| Cut Item | Why Cut | When It Gets Built |
|---|---|---|
| Email notifications on review | In-app notifications are sufficient for MVP; email notification adds SMTP complexity | Future optional |
| Reviewer performance metrics | (e.g., how many entries they've reviewed) — admin panel feature | Phase 5 |
| Student appeal process (dispute a review) | Complex workflow — not in original proposal | Not planned |
| AI-assisted grading suggestions | Phase 3 (AI features) | Phase 3 |
| Batch approve/reject by admin | Admin panel feature | Phase 5 |
| Security hardening (RLS enforcement) | Done in Milestone 5 | Milestone 5 |
| Archive search with autocomplete | Requires more complex indexing — basic search included here | Future optional |

---

## 4. Acceptance Criteria

This milestone is complete when each of the following can be demonstrated live:

- [ ] A reviewer logs in and sees the review queue populated with pending submissions from Milestone 3
- [ ] Clicking "Claim Entry" changes the entry status to `under_review` in Supabase and removes it from other reviewers' queues
- [ ] Reviewer fills in score (1–10), feedback, and clicks "Approve" — entry status changes to `approved` in Supabase
- [ ] The approved entry's submitting student receives a notification in the navbar with the score and feedback
- [ ] The student's `points` value in `users_profile` increases by the correct formula amount (score × layer multiplier)
- [ ] The leaderboard at `/leaderboard` shows the student ranked by their real points total
- [ ] The approved entry appears on the `/archive/:planetId` map at the coordinates specified on submission
- [ ] The approved entry appears in `/directory` search results when searching for its title keyword
- [ ] Clicking "Reject" with feedback — entry status becomes `rejected`, student receives notification with reviewer feedback
- [ ] The rejected entry shows the reviewer's feedback in the student's `/my-submissions` page
- [ ] A reviewer cannot claim an entry already claimed by another reviewer (it does not appear in their queue)

---

## 5. Timeline

| Day | Work |
|---|---|
| **Day 1** | Database schema — `reviews` table, `notifications` table, new columns on `archive_entries` · leaderboard materialized view |
| **Day 2** | Reviewer queue — fetch pending entries from Supabase, claim logic, queue filters |
| **Day 3** | Grading panel — score slider, feedback textarea, approve/reject UI wired to Supabase |
| **Day 4** | Edge Function: review submit → update entry status → calculate points → write `reviews` row |
| **Day 5** | Edge Function continued: write notification row · update `users_profile.points` |
| **Day 6** | In-app notification system — notification table polling, navbar badge, dropdown list, mark as read |
| **Day 7** | Leaderboard — real query from `leaderboard_view`, filters by planet/hub/layer, cache + manual refresh |
| **Day 8** | Approved entries in `ArchiveGrid` and `ArchiveDirectory` — live queries replacing static data |
| **Day 9** | Full-text search on archive directory · profile page points + leaderboard rank display |
| **Day 10** | Scheduled Edge Function: auto-release abandoned claims after 48h |
| **Day 11** | Integration test — full cycle: submit L7 → reviewer claims → reviewer approves → student gets notification → leaderboard updates → entry appears in archive |
| **Day 12** | Rejection flow testing · edge case handling · bug fixes |
| **Day 13** | Performance testing — leaderboard query under load · cache validation |
| **Day 14** | Final review · handover notes for Milestone 5 |

**Total:** 14 working days from start
**Start:** Within 24 hours of Milestone 3 approval on Fiverr

---

## 6. Investment

```
Milestone 4 — Reviews, Grading & Live Leaderboard:    $650 (fixed)
```

| Milestone | Budget | Status |
|---|---|---|
| M1 — Kickstarter Demo | $350 | Complete |
| M2 — Auth & User System | $450 | Complete |
| M3 — Full Submissions | $500 | Complete before this starts |
| **M4 — Reviews & Leaderboard** | **$650** | **This engagement** |
| M5 — Security & Production | $550 | Final |
| **Total** | **$2,500** | |

---

## 7. Payment

**Platform:** Fiverr

| Step | Detail |
|---|---|
| Client places order | $650 paid on Fiverr, held in escrow |
| Development begins | Within 24 hours |
| Delivery at Day 14 | Full system delivered via Fiverr |
| Client tests acceptance criteria | All 11 acceptance criteria verified |
| Funds released | Client approves delivery on Fiverr |

Revisions are included until all acceptance criteria pass.

---

## 8. What the Client Must Provide

| Item | Needed By |
|---|---|
| Milestone 3 fully approved on Fiverr | Before M4 starts |
| Confirmation of points formula (score × layer multiplier values) | Day 1 — defaults in Section 2.2 are used if not specified |
| Confirmation of auto-abandon timeout (default: 48 hours) | Day 10 |

---

## 9. After This Milestone — What Comes Next

With Milestone 4 complete, the archive is alive. Real students submit, real reviewers grade, real scores populate the leaderboard, and approved entries appear on the archive map. The platform works end-to-end.

However it is not yet production-safe. The database has no row-level security enforced, there is no CI/CD pipeline, the domain is not fully configured, and there is no error monitoring.

**Milestone 5 — Security & Production Launch ($550)** locks down the database, automates deployments, connects `archive.solar`, sets up monitoring, and delivers the final production-grade platform.

---

## Summary

| | |
|---|---|
| **Milestone** | 4 — Reviews, Grading & Live Leaderboard |
| **Investment** | $650 (fixed) |
| **Timeline** | 14 working days |
| **Prerequisite** | Milestones 1, 2, and 3 complete |
| **Cumulative spend** | $1,950 (M1 + M2 + M3 + M4) |
| **Monthly infra cost** | $0 (Supabase free tier still sufficient) |

---

*Prepared by: Muhammad Ali*
*Contact: programmerbusiness2@gmail.com*
*Date: June 28, 2026*
*Valid for: 14 days*
