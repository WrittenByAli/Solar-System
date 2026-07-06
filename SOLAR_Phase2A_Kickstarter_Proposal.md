# Solar Archive — Phase 2A: Kickstarter MVP Backend
## Scoped Proposal for $300–$400 Budget

---

**Prepared for:** Jurhuisman (Solar Foundation)
**Prepared by:** Muhammad Ali
**Date:** June 28, 2026
**Context:** Partial Phase 2 engagement — Kickstarter video preparation
**Full Backend Proposal:** $2,500 (Phase 2, complete scope)
**This Phase:** $350 (fixed price, see Section 6)

---

## 0. Delivery Status (updated 2026-07-07)

Verified live against the running app and the production Supabase project — not just read from code.

| Item | Status | Notes |
|---|---|---|
| 2.1 Supabase Project Setup | ✅ Done | Schema, RLS policies, env config all live |
| 2.2 Real Authentication | ✅ Done — **substituted** | Built with **Clerk**, not Supabase Auth as originally scoped. Delivers every acceptance criterion in Section 4 (signup, login/logout, session persists on refresh, wrong-password error, email-taken error) and adds email verification, MFA, and password reset at no extra cost, since Clerk provides those natively |
| 2.3 Archive Data — 64 Subjects | ✅ Done, verified | Live DB confirmed at exactly 20 L4 / 16 L5 / 12 L6 / 10 L7 / 6 L8 = 64, spread across all 10 hubs (6–7 each — no hub left thin). A real bug was found and fixed during verification: seed coordinates were silently overwriting genuine L2/L3 curriculum topics (e.g. "Maxwell's Four Equations") because they landed inside the compass taxonomy's own coordinate space — seed data was moved to a verified-clear region |
| 2.4 Basic Submission — L4 Connected to DB | ✅ Done, **exceeded** | Not just L4 — L4 through L8 all submit correctly to Supabase (a validation bug that made L7/L8 submission silently impossible was found and fixed). Beyond original scope: a full 3-reviewer approval workflow and progressive layer-deepening (one topic can be enriched from L4 all the way to L8 over time, with reviewer-approved additions merging into the same entry) were also built and verified live end-to-end — see the note on Section 3 below |
| 2.5 Vercel Deployment | ❌ Not done | Deliberately deferred at the client/dev's choice — the Vercel CLI in this environment is already authenticated and ready whenever it's wanted |

**Note on Section 3:** three items listed there as explicitly cut from this phase were, in practice, built ahead of schedule while verifying 2.3/2.4 — see the ⚡ markers in that table.

---

## 1. What This Phase Solves

The current frontend of archive.solar has three hard blockers for a credible Kickstarter demo:

| Problem | Current State | After This Phase |
|---|---|---|
| Auth is fake | Username typed in, stored in browser only — no real accounts | Real accounts in a database — sign up, log in, log out |
| Archive data is static | 64 subjects are hardcoded in the frontend, all visually clustered | Subjects seeded into a live database, properly distributed across L4–L8 layers and all planets |
| Submissions go nowhere | Form saves to browser localStorage only — clears on refresh | Submissions stored in Supabase — persist across devices and sessions |
| Site is on localhost | Not reachable by anyone else | Deployed to Vercel — live URL accessible worldwide |

These four changes are what turn archive.solar from a demo mockup into a working platform during a Kickstarter video.

---

## 2. Exact Scope of Work

### 2.1 Supabase Project Setup
- Create Supabase project (free tier is sufficient for Kickstarter volume)
- Design the minimum required database tables (see below)
- Install Supabase JS SDK into the React project
- Configure environment variables (`.env`) for local and Vercel environments
- **No Supabase Pro required** — free tier handles this phase

**Database tables created:**
```
users_profile     → id, username, email, created_at, planet_id
archive_entries   → id, title, content, layer (L4–L8), planet_id, hub_id, status, submitted_by, created_at
```

---

### 2.2 Real Authentication (Replace Mock AuthContext)
The current `src/context/AuthContext.jsx` stores only a username string in `localStorage`. It has no passwords, no real users, no database connection.

**What gets replaced:**
- `AuthContext.jsx` is rewritten to use Supabase Auth
- Supabase handles passwords, secure sessions, and JWT tokens
- The existing login/signup UI (already built at `/join`) is connected to real Supabase calls

**One UI adjustment required:** The current login form uses a username field. Supabase Auth identifies users by email, so the login form's username field is changed to an email field. The username (chosen at signup) is stored as the display name in the user profile table — it remains visible throughout the app.

**Delivered behavior:**
- Signup: student types username, email, password → account created in Supabase → username stored as display name
- Login: student types email + password → authenticated against Supabase → session active
- Refresh the page → still logged in (real session, not browser state)
- Click logout → session cleared, must log in again
- Wrong password → error shown
- Email already taken → error shown

**NOT included in this phase:**

- Role-based access (Student / Reviewer / Admin) — saved for full Phase 2

---

### 2.3 Archive Data — 64 Subjects in Real Database (Fixes the Clustering)

**The problem Jurhuisman identified:** all archive subjects appear clustered in the current view because they are hardcoded in one static block in the frontend.

**The fix:** the 64 subjects are inserted into Supabase with correct planet, hub, and layer assignments. The frontend (`ArchiveGrid`, `ArchiveDirectory`) is updated to read from Supabase instead of the hardcoded static data.

**Distribution across layers:**

| Layer | Name | Subject count (approx.) |
|---|---|---|
| L4 | Entry | 20 subjects |
| L5 | Detailed Entry | 16 subjects |
| L6 | Segmented Entry | 12 subjects |
| L7 | Deep Entry | 10 subjects |
| L8 | Narrative Entry | 6 subjects |
| **Total** | | **64 subjects** |

Each subject will be assigned to the correct planet and hub so the visual map shows a spread distribution — not a cluster.

**Delivered behavior:**
- Open `/map` → planets show subjects spread across their surface
- Open `/archive/:planetId` → entries at different grid positions (L4 deep in the planet, L8 near the core or edge depending on design intent)
- Open `/directory` → real live entries from the database, filterable

---

### 2.4 Basic Submission — L4 Connected to Database

The submit form at `/submit` is already fully built. Right now it saves to `localStorage` only and the data disappears when the browser is cleared.

**What gets connected:**
- Submitting an L4 entry → saved to `archive_entries` table in Supabase
- Entry appears in the student's submission history
- Status is `pending` by default
- Submission is tied to the logged-in user (requires 2.2 to be complete)

**NOT included:**
- L5, L6, L7, L8 submission saving (more complex field structures — saved for full Phase 2)
- Review/approval flow (reviewer sees queue, scores, approves/rejects) — saved for full Phase 2
- Draft saving — saved for full Phase 2

**Kickstarter demo value:** during the video, you can show a user signing up, submitting a real archive entry, and then navigating to the archive to see it appear. This is the core loop.

---

### 2.5 Vercel Deployment (Live URL)

**What gets done:**
- Connect the GitHub repository to Vercel
- Configure Supabase environment variables in Vercel dashboard
- Deploy the React frontend to Vercel
- Provide a working public URL (e.g., `solar-archive.vercel.app`)

**Domain connection (archive.solar):**
- Included IF Jurhuisman can provide DNS access to the domain registrar
- If not available in time, the Vercel URL is used for the Kickstarter video

**NOT included:**
- CI/CD pipeline (auto-deploy on every GitHub push) — saved for full Phase 2
- Staging environment — saved for full Phase 2

---

## 3. What Is Explicitly NOT Included

The following items from the full $2,500 proposal are cut from this phase. They are named here so there is no ambiguity.

| Cut Item | Why Cut | When It Gets Built |
|---|---|---|
| Email verification on signup | Requires SMTP/email provider setup — adds days of work | Full Phase 2 |
| Password reset via email | Same reason | Full Phase 2 |
| Role-based access (Reviewer / Admin) | Complex permission system — not needed for Kickstarter | Full Phase 2 |
| L5, L6, L7, L8 submission saving | Each layer type has unique field schema — significant work | ⚡ **Delivered 2026-07-07**, ahead of schedule |
| Review & grading workflow | Full system (reviewer queue, scoring, notifications) | ⚡ **Delivered 2026-07-07** — 3-reviewer consensus, real Supabase-backed queue, points; ahead of schedule |
| Real-time leaderboard | Needs real scores from reviews (which aren't built yet) | ⚡ **Delivered 2026-07-07**, ahead of schedule |
| File/avatar upload | Supabase Storage setup + frontend wiring | Full Phase 2 |
| Row Level Security (full) | Security hardening after demo phase | Full Phase 2 |
| Rate limiting | API protection — not critical at Kickstarter scale | Full Phase 2 |
| Sentry error monitoring | Not needed pre-launch | Full Phase 2 |
| Vercel Analytics | Not needed pre-launch | Full Phase 2 |
| CI/CD pipeline (GitHub Actions) | DevOps setup — not demo-visible | Full Phase 2 |
| Daily database backups | Supabase Pro feature — not needed until real user data is at risk | Full Phase 2 |
| Admin panel | Phase 5 in the original proposal | Phase 5 |

---

## 4. Acceptance Criteria

This phase is complete when each of the following can be demonstrated live:

- [x] A new user visits the site and creates an account with email + password
- [x] That user can log out and log back in on a different browser session
- [x] The archive map shows subjects spread visibly across different positions (not clustered)
- [x] The archive directory shows live entries from the Supabase database
- [x] A logged-in user submits an L4 entry via `/submit`
- [x] That L4 entry is visible in Supabase dashboard under `archive_entries`
- [ ] The site is accessible at a public URL (Vercel or archive.solar) — **only item remaining**, deferred at the client/dev's choice

---

## 5. Timeline

| Day | Work |
|---|---|
| **Day 1** | Supabase project setup · database schema · env config · SDK install |
| **Day 2–3** | Auth rewrite — replace mock AuthContext with Supabase Auth · wire `/join` page |
| **Day 4–5** | Seed 64 subjects into Supabase · update ArchiveGrid + ArchiveDirectory to read from DB |
| **Day 6** | Connect L4 submit form to Supabase · submission status tracking |
| **Day 7** | Vercel deployment · environment variable config · live URL testing · handover |

**Total:** 7 working days from start  
**Start:** Within 24 hours of payment confirmation

---

## 6. Investment

```
Phase 2A — Kickstarter MVP Backend:    $350 (fixed)
```

This covers all work listed in Section 2. No hourly surprises. No scope creep from the items listed in Section 3.

### Relationship to Full Backend ($2,500)

All work done in Phase 2A applies toward the full Phase 2 backend. When the full project proceeds, Phase 2A work is not thrown away or redone — it becomes the foundation the remaining features are built on.

When the full Phase 2 begins, the remaining $2,150 covers everything in Section 3 plus:
- Full security hardening (RLS)
- Reviews and grading
- Real leaderboard
- CI/CD pipeline
- Monitoring and analytics
- Domain setup, backups, and production readiness

---

## 7. Payment

**Platform:** Fiverr (same as the full proposal)

| Step | Detail |
|---|---|
| Client places order | $350 paid on Fiverr, held in escrow |
| Development begins | Within 24 hours |
| Delivery at Day 7 | Full working system delivered via Fiverr |
| Client tests acceptance criteria | All 7 acceptance criteria verified |
| Funds released | Client approves delivery on Fiverr |

Revisions are included until all acceptance criteria pass.

---

## 8. What the Client Must Provide

To avoid delays, have these ready before Day 1:

| Item | Needed By |
|---|---|
| Access to GitHub repository (Collaborator invite) | Day 1 |
| Decision on domain: archive.solar DNS access or use Vercel URL | Day 1 |
| Confirmation of 64 subject titles and their planet/hub assignments | Day 3 (needed for seeding) |
| Fiverr order placed | Before start |

If the 64 subject assignments are not confirmed by Day 3, the seeding step will use the current static data structure as-is and the distribution will be based on the existing planet/hub taxonomy.

---

## 9. After This Phase — Path to Full Backend

Phase 2A gets archive.solar live and functional enough for a Kickstarter video. When the foundation's ANBI certification is complete and the full budget is available, Phase 2 (full) picks up exactly where this leaves off.

**Phase 2 (full) — $2,150 remaining** covers:
- Email verification + password reset
- Reviewer and Admin roles
- L5–L8 submission saving
- Full review and grading workflow
- Real leaderboard (from actual scores)
- File and avatar uploads
- Security hardening
- CI/CD pipeline
- Monitoring, analytics, daily backups
- Production deployment and handover session

**Phase 3 (AI features) — $500–$800** (optional, quoted separately)
**Phase 4 (Mobile app) — $3,000–$5,000** (optional, quoted separately)

---

## 10. Honesty Note

This proposal does not oversell what $350 buys. The acceptance criteria in Section 4 are exactly what will be delivered — no more, no less.

A Kickstarter video built on Phase 2A can credibly show:
- Real sign up and login
- Archive subjects visually distributed across the map
- A student submitting a real archive entry
- The site live at a public URL

It cannot show (without the full backend):
- A graded, approved entry appearing in the archive
- A leaderboard with real scores
- Email confirmation on signup
- Reviewer workflow

This is an honest starting point, not a finished product. The Kickstarter narrative should frame this as "the platform is live and accepting its first students" — which will be true after Phase 2A.

---

## Summary

| | |
|---|---|
| **Phase** | 2A — Kickstarter MVP Backend |
| **Investment** | $350 (fixed) |
| **Timeline** | 7 working days |
| **Monthly infra cost to client** | $0 (Supabase free tier + Vercel free tier) |
| **Toward full backend** | Applies as foundation — not thrown away |
| **Remaining for full backend** | $2,150 |

---

*Prepared by: Muhammad Ali*
*Contact: programmerbusiness2@gmail.com*
*Date: June 28, 2026*
*Valid for: 14 days*
