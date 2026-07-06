# Solar Archive — Complete Development Milestones
## From Current Frontend to Final Production Product

---

**Prepared for:** Jurhuisman (Solar Foundation)
**Prepared by:** Muhammad Ali
**Date:** June 28, 2026
**Current status:** Frontend complete · No backend · Mock auth · Static data

---

## Overview

| Milestone | Name | Budget | Duration | Cumulative Total |
|---|---|---|---|---|
| M1 | Kickstarter Demo | $350 | 7 days | $350 |
| M2 | Full Submission System | $700 | 3 weeks | $1,050 |
| M3 | Reviews & Live Leaderboard | $650 | 2 weeks | $1,700 |
| M4 | Security & Production Launch | $550 | 2 weeks | $2,250 |
| M5 | Admin Panel & Handover | $600 | 2 weeks | $2,850 |
| | **Total to final product** | **$2,850** | **~11 weeks** | |

> Monthly infrastructure cost to client after M4: **~$25/month** (Supabase Pro)

---

## Milestone 1 — Kickstarter Demo
**Budget:** $350 · **Duration:** 7 days · **Status:** Proposed (current engagement)

### What gets built
- Supabase project setup — database, environment configuration, SDK installed
- Real authentication — email + password signup/login/logout replacing mock localStorage auth
- 64 archive subjects seeded into Supabase, distributed across L4–L8 and all planets
- `ArchiveGrid` and `ArchiveDirectory` read from live database (fixes clustering)
- L4 submission connected to Supabase (form already built, wired to real DB)
- Vercel deployment — site live at a public URL

### What the client sees at the end of M1
- A user can sign up, log in, and log out with a real account
- The archive map shows 64 subjects properly spread across planets and layers
- Submitting an L4 entry saves it to Supabase (visible in Supabase dashboard)
- Site is accessible at a live URL — not localhost

### What is NOT yet done
- Only L4 submissions save to DB (L5–L8 still go to localStorage)
- No email verification or password reset
- No review or grading workflow
- Leaderboard is still demo/static data
- No security hardening

---

## Milestone 2 — Full Submission System
**Budget:** $700 · **Duration:** 3 weeks · **Starts after M1**

### What gets built
- **All layer types connected** — L4, L5, L6, L7, L8 submissions all save to Supabase
  - Each layer has its own field structure (segments, ranked segments, stats, story format)
  - All fields are stored correctly in the database
- **Draft saving** — students can save a submission mid-way and return to it later
- **Edit and delete own submissions** — students can manage their own entries
- **Submission status tracking** — each entry shows its status: Pending → Under Review → Approved / Rejected
- **Email verification** — real confirmation email sent on signup via Supabase Auth
- **Password reset** — student can request a reset link to their email
- **Profile page** — username, submission count, points (placeholder until M3 wires real scores)
- **File/avatar uploads** — Supabase Storage connected for profile picture uploads

### What the client sees at the end of M2
- Students can submit any archive layer type (L4 through L8)
- A student can start a submission, save it as a draft, come back and finish it
- Signup sends a real confirmation email to the student
- Forgotten password → reset link arrives by email
- Students have a profile page showing their entries and status

### What is NOT yet done
- No reviewer workflow — entries sit at Pending status with no one to review them
- Leaderboard still shows static data (scores don't exist yet)
- No admin panel

---

## Milestone 3 — Reviews & Live Leaderboard
**Budget:** $650 · **Duration:** 2 weeks · **Starts after M2**

### What gets built
- **Role system** — Student / Reviewer / Admin roles assigned in the database
  - Reviewer access is earned: students who reach a certain points threshold can be promoted
  - Admin can promote any user manually
- **Reviewer queue** — Reviewers see all Pending entries, claim one to review
- **Grading workflow** — Reviewer scores an entry (1–10), writes feedback, marks Approved or Rejected
- **Student notification** — student receives notification when their entry is reviewed
- **Review audit trail** — who reviewed what, when, with what score — fully logged
- **Real leaderboard** — rankings generated live from actual submission scores in the database
  - Filterable by planet, hub, and layer
  - Updates automatically when new scores are submitted
  - Cached for fast performance under high traffic
- **Approved entries appear in archive** — once approved, an L4–L8 entry shows on the archive map at the correct planet and layer position

### What the client sees at the end of M3
- The full content lifecycle works end to end: submit → reviewed → scored → appears in archive
- The leaderboard shows real student rankings from real scores
- Reviewers have a working queue and grading interface (already built in the frontend at `/review-queue`)
- The archive map and directory show only approved, real content

### What is NOT yet done
- No security hardening (RLS policies not yet enforced)
- CI/CD pipeline not yet set up
- archive.solar domain not yet connected
- Monitoring not yet active
- No admin panel

---

## Milestone 4 — Security & Production Launch
**Budget:** $550 · **Duration:** 2 weeks · **Starts after M3**

### What gets built
- **Row Level Security (RLS)** — database-level rules enforced:
  - Students can only read/edit their own submissions
  - Reviewers can only update review fields, not submission content
  - No one can read another user's private data even if the API is bypassed
- **Rate limiting** — prevents submission spam and brute-force login attempts
- **Input validation and sanitization** — all API endpoints protected against XSS, SQL injection, CSRF
- **Environment variables secured** — no secrets in code, proper Supabase Pro configuration
- **Supabase Pro upgrade** — daily automatic backups, 7-day retention, increased limits
- **CI/CD pipeline (GitHub Actions)** — automatic deployment on every code push, blocked if tests fail
- **Staging environment** — safe place to test updates before they go live to students
- **archive.solar domain** — DNS configured, Vercel pointed to the domain, HTTPS automatic
- **www.archive.solar redirect** — both URLs work
- **Sentry error tracking** — instant alert when any student encounters an error
- **Vercel Analytics** — daily/weekly visitor counts, page performance, traffic trends
- **Uptime monitoring** — immediate notification if the site goes down

### What the client sees at the end of M4
- archive.solar is live for real students — fully secure and production-ready
- Any code update auto-deploys in under 60 seconds without manual intervention
- If something breaks, the developer knows before most students do
- Daily database backups running automatically — student data is protected
- The platform is GDPR-compliant (important for Netherlands)

### What is NOT yet done
- No admin panel (viewing/managing data still happens via Supabase dashboard)

---

## Milestone 5 — Admin Panel & Final Handover
**Budget:** $600 · **Duration:** 2 weeks · **Starts after M4**

### What gets built
- **Admin dashboard** at `/admin` (accessible only to Admin role):
  - View all users, promote to Reviewer / Admin, suspend accounts
  - View all submissions with search and filter (by planet, layer, status, date)
  - Manually approve or reject any submission
  - View full leaderboard data with export option
  - View review history and audit trail
  - See platform stats: total users, submissions per day, most active planets
- **Archive hub management** — add new planets, hubs, or layers without touching code
- **Full handover session** (video call):
  - Live walkthrough of the complete system
  - Demonstration of every feature from the admin perspective
  - How to manage users, approve entries, reset passwords, view analytics
  - Q&A session
- **Handover documentation**:
  - How to add new archive hubs and planets
  - How to manage student submissions
  - How to promote users to Reviewer or Admin
  - Monthly maintenance checklist
  - All credentials and access keys documented securely

### What the client sees at the end of M5
- Complete platform with no reliance on the Supabase dashboard for day-to-day management
- Client can manage the entire platform independently
- All source code owned 100% by the client (GitHub)
- Access to: GitHub, Supabase, Vercel, Cloudflare, Sentry dashboards
- 30 days of free post-delivery bug fixes included

---

## Complete Investment Summary

| Milestone | What It Unlocks | Budget |
|---|---|---|
| M1 — Kickstarter Demo | Real auth · archive in DB · L4 submit · live URL | $350 |
| M2 — Full Submission System | All layers · drafts · email verification · profiles | $700 |
| M3 — Reviews & Live Leaderboard | Full content lifecycle · real scores · real rankings | $650 |
| M4 — Security & Production Launch | archive.solar live · secure · monitored · auto-deploy | $550 |
| M5 — Admin Panel & Handover | Client manages everything independently · full handover | $600 |
| **Final product** | | **$2,850** |

---

## Payment Schedule

Payments are processed per milestone through **Fiverr** (funds held in escrow until milestone delivery is approved).

| When | Amount | Trigger |
|---|---|---|
| Before M1 starts | $350 | M1 order placed on Fiverr |
| Before M2 starts | $700 | M1 approved on Fiverr |
| Before M3 starts | $650 | M2 approved on Fiverr |
| Before M4 starts | $550 | M3 approved on Fiverr |
| Before M5 starts | $600 | M4 approved on Fiverr |

No milestone begins until the previous one is approved and the next payment is placed. Client is never paying for work they have not yet seen.

---

## Total Timeline

```
Week 1       → M1 complete  (Kickstarter demo live)
Weeks 2–4    → M2 complete  (full submission system)
Weeks 5–6    → M3 complete  (reviews + real leaderboard)
Weeks 7–8    → M4 complete  (archive.solar production launch)
Weeks 9–10   → M5 complete  (admin panel + final handover)
```

**Estimated total duration:** 10 weeks from M1 start to final handover

---

## Optional Future Phases (Quoted Separately)

| Phase | Description | Estimated Budget |
|---|---|---|
| Phase 3 — AI Features | Smart search, entry recommendations, auto-tagging | $500–$800 |
| Phase 4 — Mobile App | React Native iOS + Android app for students | $3,000–$5,000 |

These are not included in the $2,850 final product figure above.

---

*Prepared by: Muhammad Ali*
*Contact: programmerbusiness2@gmail.com*
*Date: June 28, 2026*
