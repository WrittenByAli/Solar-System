# Solar Archive — Milestone 3: Full Submissions System
## Phase 2C Backend Proposal

---

**Prepared for:** Jurhuisman (Solar Foundation)
**Prepared by:** Muhammad Ali
**Date:** June 28, 2026
**Prerequisite:** Milestones 1 and 2 must be complete
**Full Backend Proposal:** $2,500 (Phase 2, complete scope)
**This Milestone:** $500 (fixed price, see Section 6)
**Cumulative after this milestone:** $1,300

---

## 1. What This Phase Solves

After Milestones 1 and 2, students can create accounts and verify their email. But the submission system is critically incomplete:

| Problem | Current State (after M1 + M2) | After This Milestone |
|---|---|---|
| Only L4 saves to database | L5, L6, L7, L8 forms submit into localStorage — data is lost on browser clear | All 5 layer types (L4–L8) save permanently to Supabase |
| Half-finished entries are lost | No draft saving — closing the tab loses all progress | Entries auto-save as drafts every 30 seconds |
| Students cannot fix mistakes | No edit or delete on submitted entries | Students can edit or delete their own pending entries |
| No submission history | No page to see what you've submitted or its status | `/my-submissions` page shows all entries with live status |
| Hub/planet assignment is static | Dropdown values are hardcoded in the frontend | Dropdowns pull from the real database — always in sync |

The submission system is the core action students take on the platform. Until all layers save correctly, the archive cannot grow with real content.

---

## 2. Exact Scope of Work

### 2.1 Database Schema for All Layer Types (L5–L8)
Milestone 1 created a single `archive_entries` table sufficient for L4. Each higher layer type has a distinct field structure that requires its own schema.

**Layer field breakdown:**

| Layer | Unique fields beyond L4 |
|---|---|
| L5 — Detailed Entry | `citations` (array of sources), `extended_analysis` (long text), `methodology` |
| L6 — Segmented Entry | `segments` (JSON array: `[{label, content, order}]`), `segment_count` |
| L7 — Deep Entry | `ranked_segments` (JSON array: `[{label, content, difficulty_rank, expert_note}]`), `consensus_difficulty` |
| L8 — Narrative Entry | `narrative_format` (story/analysis/hybrid), `stats_block` (JSON: key metrics), `alternate_perspectives` (array) |

**Database changes:**
```
archive_entries → add column: layer_data JSONB  (stores layer-specific fields)
archive_entries → add column: layer_type TEXT CHECK (layer_type IN ('L4','L5','L6','L7','L8'))
archive_entries → add column: is_draft BOOLEAN DEFAULT false
archive_entries → add column: draft_saved_at TIMESTAMPTZ
archive_entries → add column: citations JSONB
archive_entries → add column: segment_count INTEGER
```

All layer-specific content is stored in the `layer_data` JSONB column — one table, flexible content, no separate tables per layer. This keeps queries simple and the schema extensible.

---

### 2.2 Connect L5, L6, L7, L8 Submit Forms to Supabase
The submit form at `/submit` already renders different field sets per layer type (the UI is built). What's missing is the API call that saves them.

**What gets built for each layer:**

**L5 — Detailed Entry:**
- `extended_analysis` text field → `layer_data.extended_analysis`
- Citations list (add/remove citations) → `layer_data.citations[]`
- Methodology field → `layer_data.methodology`
- On submit: full entry saved to `archive_entries` with `layer_type = 'L5'`

**L6 — Segmented Entry:**
- Segment builder (add segment, label it, write content, reorder) → `layer_data.segments[]`
- Segment count auto-calculated → `segment_count`
- On submit: entry saved with ordered segments array intact

**L7 — Deep Entry:**
- Ranked segment builder (same as L6 + difficulty ranking per segment) → `layer_data.ranked_segments[]`
- Consensus difficulty field → `consensus_difficulty`
- Expert note per segment → `layer_data.ranked_segments[].expert_note`
- On submit: entry saved with full ranked structure

**L8 — Narrative Entry:**
- Narrative format selector (story / analysis / hybrid) → `layer_data.narrative_format`
- Stats block builder (add key: value pairs) → `layer_data.stats_block`
- Alternate perspectives list → `layer_data.alternate_perspectives[]`
- On submit: full narrative entry saved

All layer types:
- Status set to `pending` on submit
- `submitted_by` set to the logged-in user's ID (requires M2 auth)
- `planet_id` and `hub_id` set from the dropdown selection

---

### 2.3 Draft Saving (Auto-Save Every 30 Seconds)
If a student spends 45 minutes writing an L8 Narrative Entry and closes the tab, they lose everything today.

**What gets built:**
- Auto-save triggers every 30 seconds while the student is typing in the submit form
- Draft is saved to `archive_entries` with `is_draft = true` and `status = 'draft'`
- "Saved draft" toast notification appears briefly (bottom right corner) when auto-save completes
- On page load, if the student has an in-progress draft for the selected layer type, a banner appears: "You have an unfinished draft — continue writing?"
- Student can click "Continue Draft" to reload their saved progress
- Student can click "Start fresh" to discard the draft and begin new
- Submitting the form (clicking the submit button) converts `is_draft` from `true` to `false` and sets `status` to `pending`
- A student can only have one active draft per layer type at a time

---

### 2.4 Edit Own Submission (While Pending)
Once submitted, students currently have no way to correct a typo or update their content.

**What gets built:**
- On the `/my-submissions` page (built in 2.6), each entry shows an "Edit" button if `status = 'pending'`
- Clicking Edit reopens the submit form pre-filled with the entry's saved content
- Student edits and resubmits → entry is updated in Supabase, status stays `pending`
- Edit is disabled once an entry moves to `under_review` or beyond — the reviewer is already working on it
- Confirmation dialog before overwriting: "Are you sure you want to update this submission?"

---

### 2.5 Delete Own Submission (While Pending)
Students have no ability to remove an entry they no longer want to submit.

**What gets built:**
- "Delete" button on each pending entry in `/my-submissions`
- Confirmation dialog: "Delete this submission permanently? This cannot be undone."
- On confirm: entry is soft-deleted (`deleted_at` timestamp set, not permanently removed from DB)
- Entry disappears from the student's view immediately
- Soft delete (not hard delete) ensures data is recoverable by an admin if needed
- Delete is disabled for entries in `under_review`, `approved`, or `rejected` status

---

### 2.6 Submission History Page (`/my-submissions`)
There is currently no page where students can see all their submitted entries.

**What gets built:**
- `/my-submissions` route — accessible to logged-in students only
- Lists all entries submitted by the logged-in student, sorted by most recent
- Each entry shows: title, layer type badge (L4/L5/L6/L7/L8), planet assigned, submission date, current status
- Status badge with color coding:
  - Draft (grey) — auto-saved, not yet submitted
  - Pending (yellow) — submitted, waiting for review
  - Under Review (blue) — a reviewer has claimed it
  - Approved (green) — accepted into the archive
  - Rejected (red) — not accepted, with reviewer feedback visible
- Clicking an entry expands it to show the full content submitted
- For Approved entries: a link to view it in the archive
- For Rejected entries: the reviewer's feedback is shown so the student can revise and resubmit

---

### 2.7 Planet and Hub Dropdowns from Database
Currently the planet and hub dropdowns in the submit form are hardcoded arrays in the frontend React code. If a new planet or hub is added to the database, the dropdown does not update automatically.

**What gets built:**
- `planets` and `hubs` tables created in Supabase (seeded with the existing taxonomy)
- Submit form fetches planet list from `planets` table on load
- Selecting a planet filters the hub dropdown to only show hubs belonging to that planet
- Coordinate fields (X, Y) are validated against the selected planet's grid dimensions
- If a new planet or hub is added to the Supabase database by an admin, it automatically appears in the dropdown — no code change required

**Database tables created:**
```
planets   → id, name, slug, grid_width, grid_height, description, display_order
hubs      → id, planet_id, name, slug, layer_range, description
```

---

## 3. What Is Explicitly NOT Included

| Cut Item | Why Cut | When It Gets Built |
|---|---|---|
| Review and grading of submissions | Submissions exist but no one can review them yet | Milestone 4 |
| Approved entries appearing in archive map | Requires review approval workflow | Milestone 4 |
| Points awarded for approved submissions | Points come from review scores | Milestone 4 |
| Reviewer notifications about new submissions | Requires notification system | Milestone 4 |
| Bulk submission import | Not in original proposal scope | Not planned |
| File attachments on submissions | Supabase Storage for attachments is post-MVP | Future optional |
| Admin ability to edit any submission | Admin panel is Phase 5 | Phase 5 |

---

## 4. Acceptance Criteria

This milestone is complete when each of the following can be demonstrated live:

- [ ] A logged-in student submits an L5 entry — it appears in Supabase under `archive_entries` with `layer_type = 'L5'` and correct `layer_data`
- [ ] A logged-in student submits an L6 entry with 3 segments — all 3 segments are stored correctly in `layer_data.segments`
- [ ] A logged-in student submits an L7 entry — ranked segments with difficulty scores saved correctly
- [ ] A logged-in student submits an L8 entry — narrative format, stats block, and alternate perspectives saved correctly
- [ ] Starting an L4 submission, waiting 30 seconds, then closing and reopening the page shows a "Continue Draft?" banner
- [ ] Continuing the draft reloads all previously typed content
- [ ] A pending submission can be edited and resubmitted — the update is reflected in Supabase
- [ ] A pending submission can be deleted — it disappears from the student's submission list
- [ ] `/my-submissions` shows all entries for the logged-in student with correct status badges
- [ ] Planet and hub dropdowns on the submit form load from the database (verifiable by adding a test planet in Supabase and seeing it appear in the dropdown)

---

## 5. Timeline

| Day | Work |
|---|---|
| **Day 1** | Database schema changes — `layer_data` JSONB column, `is_draft`, `planets` and `hubs` tables, seed data |
| **Day 2** | L5 submission API — connect extended analysis, citations, methodology fields to Supabase |
| **Day 3** | L6 submission API — segment builder connected, segments array saved to `layer_data` |
| **Day 4** | L7 submission API — ranked segments with difficulty + expert notes connected |
| **Day 5** | L8 submission API — narrative format, stats block, alternate perspectives connected |
| **Day 6** | Draft saving — auto-save timer, draft detection on page load, continue/discard flow |
| **Day 7** | Edit submission — pre-fill form with saved data, resubmit updates DB |
| **Day 8** | Delete submission — soft delete, confirmation dialog, status-based lock |
| **Day 9** | `/my-submissions` page — full list with status badges, expanded entry view, reviewer feedback display |
| **Day 10** | Planet/hub dropdowns from DB · integration test full L4–L8 submit cycle · bug fixes |

**Total:** 10 working days from start
**Start:** Within 24 hours of Milestone 2 approval on Fiverr

---

## 6. Investment

```
Milestone 3 — Full Submissions System:    $500 (fixed)
```

| Milestone | Budget | Status |
|---|---|---|
| M1 — Kickstarter Demo | $350 | Complete |
| M2 — Auth & User System | $450 | Complete before this starts |
| **M3 — Full Submissions** | **$500** | **This engagement** |
| M4 — Reviews & Leaderboard | $650 | Next |
| M5 — Security & Production | $550 | Final |
| **Total** | **$2,500** | |

---

## 7. Payment

**Platform:** Fiverr

| Step | Detail |
|---|---|
| Client places order | $500 paid on Fiverr, held in escrow |
| Development begins | Within 24 hours |
| Delivery at Day 10 | Full system delivered via Fiverr |
| Client tests acceptance criteria | All 10 acceptance criteria verified |
| Funds released | Client approves delivery on Fiverr |

Revisions are included until all acceptance criteria pass.

---

## 8. What the Client Must Provide

| Item | Needed By |
|---|---|
| Milestone 2 fully approved on Fiverr | Before M3 starts |
| Confirmation of final planet and hub taxonomy (names, slugs, descriptions) | Day 1 (needed for planet/hub seeding) |
| Confirmation of grid dimensions per planet (how wide/tall each planet's archive grid is) | Day 1 |

If planet taxonomy is not confirmed by Day 1, the existing static data from the frontend will be used as-is for the seed.

---

## 9. After This Milestone — What Comes Next

With Milestone 3 complete, the submission pipeline is fully operational. Students can submit any layer type, save drafts, edit, and track their entries. However all entries sit at `pending` status forever — no one can review or approve them yet.

**Milestone 4 — Reviews & Live Leaderboard ($650)** builds the reviewer workflow: queue, grading, scoring, notifications, and the real leaderboard from actual scores. Approved entries will appear in the archive map.

---

## Summary

| | |
|---|---|
| **Milestone** | 3 — Full Submissions System |
| **Investment** | $500 (fixed) |
| **Timeline** | 10 working days |
| **Prerequisite** | Milestones 1 and 2 complete |
| **Cumulative spend** | $1,300 (M1 + M2 + M3) |
| **Monthly infra cost** | $0 (still on Supabase free tier) |

---

*Prepared by: Muhammad Ali*
*Contact: programmerbusiness2@gmail.com*
*Date: June 28, 2026*
*Valid for: 14 days*
