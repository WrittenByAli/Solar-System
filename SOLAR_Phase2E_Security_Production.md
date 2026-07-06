# Solar Archive — Milestone 5: Security, DevOps & Production Launch
## Phase 2E Backend Proposal

---

**Prepared for:** Jurhuisman (Solar Foundation)
**Prepared by:** Muhammad Ali
**Date:** June 28, 2026
**Prerequisite:** Milestones 1, 2, 3, and 4 must be complete
**Full Backend Proposal:** $2,500 (Phase 2, complete scope)
**This Milestone:** $550 (fixed price, see Section 6)
**Cumulative after this milestone:** $2,500 — Final product delivered

---

## 1. What This Phase Solves

After Milestones 1–4, every feature of the archive works correctly. But the platform is not production-safe. A fully functional system that can be compromised, has no automated recovery, and goes unmonitored is not a product — it is a liability:

| Problem | Current State (after M1–M4) | After This Milestone |
|---|---|---|
| Database has no access rules at DB level | If the API is bypassed, any user can read or write any data | Row Level Security enforced — the database itself refuses unauthorized access |
| No protection against spam or abuse | A bot could submit 1,000 entries or attempt 10,000 logins | Rate limiting blocks abuse before it reaches the database |
| Manual deployment | Every code update requires manual Vercel redeploy | Every GitHub push auto-deploys in under 60 seconds — no manual steps |
| No safe test environment | Changes are tested directly on the live site | Staging environment mirrors production — updates tested before students see them |
| Site runs on Vercel URL only | archive.solar is not connected | archive.solar goes live — SSL, www redirect, auth emails point to the domain |
| No error visibility | If a student hits a bug, no one knows until someone reports it | Sentry captures every error instantly and alerts the developer |
| No traffic data | Impossible to know how many students visit or which pages fail | Vercel Analytics tracks visits, performance, and drop-off points |
| Data has no backup | A database incident could permanently destroy all student submissions and scores | Supabase Pro daily backups — 7-day retention — fully automatic |

This milestone takes a working product and makes it a trustworthy production platform.

---


### 2.1 Row Level Security (RLS) — Database-Level Access Control
Currently all security lives in the API layer. If someone calls Supabase directly (bypassing the React frontend), they can read or write any row in any table.

**What gets built:**
RLS policies written directly in PostgreSQL that enforce access rules even if the API is bypassed:

**`users_profile` policies:**
- Students can read their own profile only
- Students can update their own profile only (not other users')
- No user can change their own `role` column or `points` column — only the Edge Function can write those
- Admins can read all profiles

**`archive_entries` policies:**
- Any authenticated user can read `approved` entries (public archive content)
- A student can read their own entries at any status
- A student can insert new entries (`submitted_by` must match their own user ID)
- A student can update their own entries only when `status = 'pending'` (cannot edit after review starts)
- A reviewer can update `status`, `claimed_by`, `reviewed_by`, `review_score`, `reviewer_feedback` on entries they have claimed
- No one can delete entries directly — only soft delete via the Edge Function

**`reviews` policies:**
- Reviewers can insert their own reviews
- Reviews are immutable after insert — no one can update or delete a review row
- Any authenticated user can read reviews (transparency)

**`notifications` policies:**
- Users can only read their own notifications
- Only Edge Functions can insert notifications
- Users can update `is_read` on their own notifications only

---

### 2.2 Rate Limiting
Without rate limiting, a single bad actor can flood the platform with fake submissions, overwhelm the review queue, or brute-force student passwords.

**What gets built:**
- **Login rate limit:** maximum 10 failed login attempts per IP per 15 minutes → account temporarily locked, CAPTCHA required
- **Submission rate limit:** maximum 5 new submissions per student per 24 hours (prevents queue flooding)
- **Review rate limit:** maximum 20 reviews per reviewer per hour (prevents bot-grading)
- **API rate limit:** maximum 100 requests per IP per minute across all endpoints

Implementation: Supabase Edge Function middleware that checks request count in a `rate_limits` table before processing.

**Database table created:**
```
rate_limits → id, identifier (IP or user_id), action, request_count, window_start, blocked_until
```

---

### 2.3 Input Validation and Sanitization
Every form field in the React frontend is validated client-side (in the browser). But client-side validation can be bypassed by anyone with browser dev tools.

**What gets built:**
Server-side validation added to every Edge Function and Supabase insert:

- **Submission fields:** title length (10–200 chars), content length (100–50,000 chars), layer type must be one of L4/L5/L6/L7/L8, planet_id and hub_id must exist in the database
- **Review fields:** score must be integer 1–10, feedback minimum 50 chars, reviewer must hold `reviewer` or `admin` role
- **Auth fields:** email must be valid format, password minimum 8 chars with at least one number
- **XSS prevention:** all text content is sanitized before storage — HTML tags stripped
- **SQL injection:** not possible through Supabase parameterized queries (already safe), confirmed via validation tests
- All validation errors return structured error messages the frontend can display to the user

---

### 2.4 CI/CD Pipeline (GitHub Actions)
Currently deploying an update means manually triggering Vercel. There are no automated tests, and a broken push goes live immediately.

**What gets built:**

**GitHub Actions workflow (`.github/workflows/deploy.yml`):**
```
On every push to main branch:
  Step 1 → Install dependencies
  Step 2 → Run build (npm run build)
  Step 3 → If build fails → deployment blocked, developer notified
  Step 4 → If build passes → Vercel deployment triggered automatically
  Step 5 → Deployment confirmation sent to developer via GitHub notification
```

**Staging workflow (`.github/workflows/staging.yml`):**
```
On every push to staging branch:
  Step 1–3 → Same as above
  Step 4 → Deploy to staging Vercel project (separate URL, not archive.solar)
```

**Result:** No broken code ever reaches students. Updates go live in under 60 seconds without manual steps.

---

### 2.5 Staging Environment
There is currently no safe place to test changes before they affect real students.

**What gets built:**
- Separate Vercel project: `staging.archive.solar` (or a Vercel preview URL)
- Separate Supabase project: staging database with identical schema but no real student data
- All code changes are deployed to staging first via the `staging` GitHub branch
- Developer tests all features on staging before merging to `main`
- Staging uses its own `.env.staging` environment variables — completely isolated from production
- Client can preview upcoming changes on the staging URL before they go live

---

### 2.6 Domain Setup — `archive.solar`
The platform currently runs on a Vercel-generated URL. `archive.solar` is not yet connected.

**What gets built:**
- DNS records configured at the domain registrar to point `archive.solar` to Vercel
- `www.archive.solar` → permanent redirect to `archive.solar`
- SSL/HTTPS certificate — automatic via Vercel, renews forever, zero manual steps
- All Supabase auth email links updated to use `archive.solar`:
  - Email verification link: `https://archive.solar/confirm`
  - Password reset link: `https://archive.solar/reset-password`
- Vercel project configured with `archive.solar` as the production domain

**Requires:** DNS access to the domain registrar (Jurhuisman must provide login or add DNS records).

---

### 2.7 Supabase Pro Upgrade + Daily Backups
Supabase free tier has no automated backups. If the database is accidentally corrupted or a table is wrongly deleted, all student data is permanently lost.

**What gets built:**
- Supabase project upgraded to Pro plan ($25/month — billed directly to the client's Supabase account)
- Automatic daily backups enabled — full database snapshot every day at midnight
- 7-day backup retention — any point in the last 7 days can be restored
- Backup restoration procedure documented and handed over to the client
- Database size monitoring set up — alert sent at 70% of Pro tier storage limit

**Note:** The $25/month Supabase Pro cost is billed directly to the client's account — it is not included in the development fee.

---

### 2.8 Sentry Error Tracking
When a student encounters an error (page crash, failed submission, broken API call), no one currently knows unless the student manually reports it.

**What gets built:**
- Sentry project created and connected to the React frontend and Edge Functions
- Every unhandled error is captured with:
  - Exact error message and stack trace
  - Which page the student was on
  - What action they were taking (submitting, reviewing, browsing)
  - Browser and device type
- Developer receives instant email alert for new error types
- Errors grouped by type — 50 students hitting the same bug appears as one issue, not 50 alerts
- Sentry free tier: 5,000 events/month — sufficient for the platform's expected scale
- Error dashboard reviewed weekly; critical errors addressed within 24 hours (under 30-day post-delivery support)

---

### 2.9 Vercel Analytics
There is no data on how many students use the platform, which pages they visit, or where they drop off.

**What gets built:**
- Vercel Analytics enabled on the production Vercel project (free tier)
- Dashboard shows:
  - Daily and weekly unique visitors
  - Page views per route (`/`, `/map`, `/archive/:planet`, `/submit`, `/leaderboard`, `/directory`)
  - Top-performing pages and drop-off points
  - Average page load time per route
  - Visitor breakdown by country
- GDPR compliant: no personal data collected, no cookie banner required under Netherlands law
- Analytics dashboard accessible to the client via the Vercel dashboard

---

### 2.10 Uptime Monitoring
If the site goes down at 3am, no one currently knows until a student reports it.

**What gets built:**
- Uptime Robot (free tier) configured to check `archive.solar` every 5 minutes
- If the site fails to respond: developer and client both receive an email alert within 5 minutes
- If the site recovers: a recovery notification is sent
- Monthly uptime report available via Uptime Robot dashboard
- Status page (optional): `status.archive.solar` — public page students can check if the site is unreachable

---

### 2.11 Final Security Audit + Documentation
Before handover, a systematic check of all attack surfaces.

**What gets audited:**
- All RLS policies tested: attempt to read/write other users' data as a non-admin, confirm it is blocked
- Rate limits tested: simulate spam submission and brute-force login, confirm blocks activate
- All API endpoints tested for missing authentication checks
- Environment variables confirmed: no secrets in source code, all in `.env` files excluded from git
- Supabase dashboard access: only the client's email has owner access
- GitHub repository: developer access downgraded to Collaborator after handover

**Documentation delivered:**
- Complete list of all environment variables and where to find/rotate them
- How to restore the database from a backup (step-by-step)
- How to promote a user to Reviewer or Admin via Supabase dashboard
- How to view and respond to Sentry errors
- Monthly maintenance checklist (backup check, storage usage, Sentry error review)
- Emergency contact guide: what to do if the site goes down

---

## 3. What Is Explicitly NOT Included

| Cut Item | Why Cut | When It Gets Built |
|---|---|---|
| Admin panel (UI for managing users/submissions) | Separate phase — client uses Supabase dashboard for now | Phase 5 (optional) |
| Two-factor authentication | Not in original proposal scope | Future optional |
| GDPR data export / right to erasure workflow | Not in original proposal | Future optional |
| Load testing at 10,000+ concurrent users | Platform will not reach this scale at launch | Revisit when needed |
| WAF (Web Application Firewall) beyond Cloudflare | Enterprise-level protection — not needed at this stage | Future if required |
| Mobile application | Separate product | Phase 4 (optional, $3,000–$5,000) |
| AI features (smart search, recommendations) | Separate phase | Phase 3 (optional, $500–$800) |

---

## 4. Acceptance Criteria

This milestone is complete when each of the following can be demonstrated live:

- [ ] Attempting to read another student's `pending` submission via the Supabase API (without a valid session) returns a 403 error
- [ ] Attempting to change a `users_profile.role` directly via the API returns a 403 error
- [ ] Submitting more than 5 entries in 24 hours as the same user triggers a rate limit error on the 6th attempt
- [ ] Pushing a code update to the `main` branch on GitHub triggers an automatic Vercel deployment without any manual step
- [ ] Pushing to the `staging` branch deploys to the staging URL without affecting `archive.solar`
- [ ] `archive.solar` loads correctly with HTTPS — no browser security warning
- [ ] `www.archive.solar` redirects to `archive.solar`
- [ ] The email verification link in the signup email points to `https://archive.solar/confirm`
- [ ] Supabase dashboard shows "Backups" tab with a completed backup from today (requires Pro plan active)
- [ ] Intentionally triggering a frontend error (e.g., navigating to `/archive/nonexistent`) creates an event in the Sentry dashboard
- [ ] Client receives a test downtime alert from Uptime Robot within 5 minutes of the test monitor being paused
- [ ] Client has been added as owner to: GitHub repo, Vercel project, Supabase project, Sentry project

---

## 5. Timeline

| Day | Work |
|---|---|
| **Day 1** | RLS policies — `users_profile` table: self-read, self-update, role protection |
| **Day 2** | RLS policies — `archive_entries` table: student insert/update rules, reviewer claim/review rules, approved public read |
| **Day 3** | RLS policies — `reviews` (immutable) and `notifications` (self-read only) · full RLS test suite |
| **Day 4** | Rate limiting — Edge Function middleware, `rate_limits` table, login/submission/review limits |
| **Day 5** | Input validation — server-side validation on all Edge Functions and insert paths · XSS sanitization |
| **Day 6** | CI/CD — GitHub Actions workflows for `main` and `staging` branches · test build pipeline |
| **Day 7** | Staging environment — separate Vercel project, separate Supabase project, `.env.staging` configuration |
| **Day 8** | Domain setup — DNS records, `archive.solar` on Vercel, `www` redirect, SSL verification |
| **Day 9** | Supabase Pro upgrade · daily backup enabled · restoration procedure documented |
| **Day 10** | Sentry setup — frontend integration, Edge Function integration, error grouping, alert rules |
| **Day 11** | Vercel Analytics setup · Uptime Robot monitoring · status page |
| **Day 12** | Final security audit — penetration test RLS, rate limits, API endpoints · fix any gaps |
| **Day 13** | Documentation — env vars guide, backup restore guide, maintenance checklist, emergency guide |
| **Day 14** | Client handover — transfer ownership of all accounts · final demo session · Q&A |

**Total:** 14 working days from start
**Start:** Within 24 hours of Milestone 4 approval on Fiverr

---

## 6. Investment

```
Milestone 5 — Security, DevOps & Production Launch:    $550 (fixed)
```

| Milestone | Budget | Status |
|---|---|---|
| M1 — Kickstarter Demo | $350 | Complete |
| M2 — Auth & User System | $450 | Complete |
| M3 — Full Submissions | $500 | Complete |
| M4 — Reviews & Leaderboard | $650 | Complete before this starts |
| **M5 — Security & Production** | **$550** | **This engagement — Final** |
| **Total** | **$2,500** | **Full backend delivered** |

---

## 7. Payment

**Platform:** Fiverr

| Step | Detail |
|---|---|
| Client places order | $550 paid on Fiverr, held in escrow |
| Development begins | Within 24 hours |
| Delivery at Day 14 | Full production platform delivered via Fiverr |
| Client tests acceptance criteria | All 12 acceptance criteria verified |
| Client receives all account ownerships | GitHub, Vercel, Supabase, Sentry transferred |
| Funds released | Client approves delivery on Fiverr |

Revisions are included until all acceptance criteria pass.

**30-day post-delivery support (free):**
- Bug fixes for any issues discovered after handover
- Minor configuration adjustments
- Email support with 24-hour response time

---

## 8. What the Client Must Provide

| Item | Needed By |
|---|---|
| Milestone 4 fully approved on Fiverr | Before M5 starts |
| DNS access to the domain registrar for `archive.solar` | Day 8 — without this, domain setup cannot be completed |
| Supabase account (client's email) for Pro upgrade — client activates billing | Day 9 |
| GitHub account for ownership transfer | Day 14 |
| Vercel account for ownership transfer | Day 14 |

**Critical:** DNS access must be provided by Day 8. If unavailable, the domain setup step is skipped and the Vercel URL remains the production URL. All other deliverables are unaffected.

---

## 9. After Final Delivery — Optional Future Phases

The $2,500 backend is now complete. The following are optional additions quoted separately:

| Phase | Description | Budget |
|---|---|---|
| **Phase 3 — AI Features** | Smart search, entry recommendations, auto-tagging by topic | $500–$800 |
| **Phase 5 — Admin Panel** | Full UI dashboard for managing users, submissions, and reviews | $500–$800 |
| **Phase 4 — Mobile App** | React Native iOS + Android app for students | $3,000–$5,000 |

---

## Summary

| | |
|---|---|
| **Milestone** | 5 — Security, DevOps & Production Launch |
| **Investment** | $550 (fixed) |
| **Timeline** | 14 working days |
| **Prerequisite** | Milestones 1, 2, 3, and 4 complete |
| **Cumulative total** | $2,500 — Full backend complete |
| **Monthly infra cost after delivery** | ~$25/month (Supabase Pro — billed to client directly) |
| **Post-delivery support** | 30 days free · then $200/month optional retainer |

---

*Prepared by: Muhammad Ali*
*Contact: programmerbusiness2@gmail.com*
*Date: June 28, 2026*
*Valid for: 14 days*
