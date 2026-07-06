# Solar Archive — Milestone 2:   
## Phase 2B Backend Proposal

---

**Prepared for:** Jurhuisman (Solar Foundation)
**Prepared by:** Muhammad Ali
**Date:** June 28, 2026
**Prerequisite:** Milestone 1 (Phase 2A) must  be complete
**Full Backend Proposal:** $2,500 (Phase 2, complete scope)
**This Milestone:** $450 (fixed price, see Section 6)
**Cumulative after this milestone:** $800

---

## 0. Delivery Status (updated 2026-07-07)

Verified directly against the current codebase (file/line level), not assumed. **This milestone is mostly not yet delivered** — two of six scope items are effectively covered by the Clerk substitution already used for Milestone 1's auth, the rest are still open.

| Item | Status | Notes |
|---|---|---|
| 2.1 Email Verification on Signup | ⚠️ Partial — **substituted mechanism** | Clerk's own OTP-code and magic-link verification runs during signup (`Join.jsx`) and does gate account creation itself — you cannot get a session without completing it. But there is no separate "unverified account" state anywhere downstream: no `email_verified` column on `users_profile`, no banner, and nothing checks verification status before allowing submissions. The "confirm your email" banner + submission-blocking acceptance criterion specifically is **not built** |
| 2.2 Password Reset via Email | ✅ Done — **substituted mechanism** | Fully implemented via Clerk, not Supabase SMTP as scoped: dedicated forgot/reset views in `Join.jsx`, code-based reset with expiry/attempt limits, anti-enumeration messaging, and forces sign-out of other sessions on reset. Functionally complete |
| 2.3 Role-Based Access (Student/Reviewer/Admin) | ❌ Not done | No `role` column exists on `users_profile` — only `points`. `src/auth/authorization.js` only distinguishes `MEMBER` vs `REVIEWER`, purely by points threshold (2500). **No `admin` role or `/admin` route exists anywhere in the codebase.** Reviewer gating works today, but as a points threshold, not the role system this section describes — and new accounts start at 2600 points (above the threshold), so in practice every account currently qualifies as "reviewer" immediately |
| 2.4 Student Profile Page | ❌ Not done | No `/profile` route exists. `/account` (`AccountSecurity.jsx`) shows avatar, username/email, 2FA/passkey setup, and session management — but not role badge, points, member-since date, or submission history, which is what this section scopes |
| 2.5 Profile Avatar Upload | ❌ Not done | Avatars are Clerk-hosted (`user.imageUrl`) with no upload UI. No Supabase Storage bucket, no custom upload/resize flow exists in this repo |
| 2.6 Branded Auth Email Templates | ❌ Not done | Clerk's default hosted email templates are used for OTP/verification/reset emails. No branded HTML templates exist in this codebase |

**Bottom line:** if the client already accepts Clerk-hosted auth (which Milestone 1 already committed to), items 2.1 and 2.2 are functionally satisfied today at no extra cost. Items 2.3–2.6 (roles, profile page, avatar upload, branded emails) are genuinely unbuilt and represent the real remaining scope of this milestone.

---

## 1. What This Phase Solves

Milestone 1 set up basic auth — students can sign up and log in. But it left major gaps that would prevent real students from trusting or using the platform:

| Problem | Current State (after M1) | After This Milestone |
|---|---|---|
| Fake email addresses accepted | Anyone can sign up with `abc@fake.com` — no verification | Confirmation email sent on signup — only real emails accepted |
| Forgotten password = locked out | No reset mechanism exists | Password reset link delivered to student's email |
| Everyone is a "student" | No way to distinguish reviewers or admins from regular users | Three roles: Student / Reviewer / Admin — each sees different UI and data |
| No profile page | Students have no identity beyond a username | Full profile page: avatar, display name, submission history, points |
| No avatar upload | Profile pictures not possible | Students can upload a photo — stored securely in Supabase Storage |

These are not optional quality-of-life improvements — without email verification, the platform cannot maintain data quality. Without roles, reviewers cannot be granted queue access.

---

## 2. Exact Scope of Work

### 2.1 Email Verification on Signup
Currently students can sign up with any email string and are immediately logged in. There is no check that the email is real.

**What gets built:**
- Supabase SMTP configuration — connects an email provider to Supabase
- On signup, Supabase sends a branded confirmation email to the student
- Student must click the confirmation link before their account is fully activated
- Confirmation link points to `archive.solar/confirm` (or Vercel URL if domain not yet live)
- Unverified accounts are marked as pending in the UI — student sees a banner prompting them to check their email
- Resend verification email button if the email was missed

**Email template:**
- Branded with SOLAR Archive header and logo
- Clear call-to-action button: "Confirm your SOLAR Archive account"
- Fallback plain-text version included

---

### 2.2 Password Reset via Email
If a student forgets their password today, there is no recovery path.

**What gets built:**
- "Forgot password?" link on the login form
- Student enters their email → Supabase sends a reset link
- Reset link points to `archive.solar/reset-password`
- Student sets a new password → redirected to login
- Reset links expire after 1 hour for security

**Email template:**
- Branded with SOLAR Archive header
- Clear button: "Reset your password"
- Security note: "If you didn't request this, ignore this email"

---

### 2.3 Role-Based Access Control (Student / Reviewer / Admin)
Every user currently has identical access. The review workflow (coming in Milestone 4) requires a Reviewer role that can access the grading queue. The Admin role is needed for platform management.

**What gets built:**
- `role` column added to `users_profile` table with three values: `student`, `reviewer`, `admin`
- All new signups receive `student` role automatically
- Role is checked server-side before serving protected pages
- **Reviewer access:** granted by Admin manually, or automatically when a student reaches a points threshold (configured in the database — not hardcoded)
- **Admin access:** granted manually via Supabase dashboard (only the foundation owner holds this)
- Frontend route guards: `/review-queue` redirects non-reviewers, `/admin` redirects non-admins
- Navbar shows/hides links based on role (review queue link only visible to reviewers and admins)

**Database change:**
```
users_profile → add column: role TEXT DEFAULT 'student' CHECK (role IN ('student','reviewer','admin'))
users_profile → add column: points INTEGER DEFAULT 0
users_profile → add column: reviewer_promoted_at TIMESTAMPTZ
```

---

### 2.4 Student Profile Page
There is currently no `/profile` page. Students have no central place to see their identity or activity.

**What gets built:**
- `/profile` route — accessible when logged in
- Displays: avatar, username, email, role badge, member since date
- Displays: total points earned, number of submissions, number approved
- Lists recent submissions with their current status (Pending / Under Review / Approved / Rejected)
- Edit display name (does not change login email)
- Points counter (shows 0 until Milestone 4 wires real scoring — counter is live and will auto-populate)

**Note:** Profile is read-only for submission history until Milestone 3 adds full submission management.

---

### 2.5 Profile Avatar Upload (Supabase Storage)
Students cannot currently upload a profile photo.

**What gets built:**
- Supabase Storage bucket `avatars` created with public read, authenticated write
- Upload button on profile page — accepts JPG, PNG, WebP up to 2MB
- Image is resized to 200×200px before storage (prevents oversized files)
- Avatar CDN URL stored in `users_profile.avatar_url`
- Avatar appears in the Navbar next to the username when logged in
- Fallback: initials-based placeholder if no avatar uploaded

---

### 2.6 Branded Auth Email Templates
Both verification and reset emails use Supabase's default plain template today. These will look unprofessional to students.

**What gets built:**
- HTML email templates with SOLAR Archive branding:
  - Foundation logo at top
  - Dark background matching the site's aesthetic
  - Gold accent color on buttons
  - Footer with archive.solar link
- Templates applied to: email confirmation, password reset, email change notification

---

## 3. What Is Explicitly NOT Included

| Cut Item | Why Cut | When It Gets Built |
|---|---|---|
| Points system (real scoring) | Points come from reviews — reviews don't exist yet | Milestone 4 |
| Reviewer queue and grading | Full workflow built in Milestone 4 | Milestone 4 |
| Admin panel | Separate engagement (Phase 5) | Phase 5 |
| Two-factor authentication | Not required for educational platform at this stage | Future optional |
| OAuth (Google/GitHub login) | Not in original proposal scope | Future optional |
| Student-to-student messaging | Not in original proposal scope | Not planned |
| Email notifications on submission reviewed | Requires review workflow | Milestone 4 |

---

## 4. Acceptance Criteria

This milestone is complete when each of the following can be demonstrated live:

- [x] Signing up with a new email sends a confirmation code/link to that address (via Clerk, not Supabase SMTP)
- [ ] Unverified account sees a "confirm your email" banner and cannot submit entries — **not built**; Clerk's model has no logged-in-but-unverified state, so there's nothing to gate
- [x] Clicking the confirmation link in the email activates the account (Clerk magic-link path)
- [x] "Forgot password?" sends a reset email — student can set a new password and log back in (via Clerk)
- [ ] A user promoted to `reviewer` in the database can see the `/review-queue` link in the navbar — **not built as a role**; reviewer access is a points threshold today, with no `role` column or promotion mechanism
- [ ] A regular student visiting `/review-queue` is redirected away — **not built**; the page renders an in-place "locked" screen rather than redirecting, and there's no role to check regardless
- [ ] `/profile` page shows username, role, member since date, and submission list — **not built**; `/account` exists but shows security settings only (2FA, passkeys, sessions), not this content
- [ ] Uploading an avatar on the profile page saves it and displays it in the navbar — **not built**; avatars are Clerk-hosted only, no custom upload flow
- [ ] Verification and reset emails use SOLAR Archive branded template, not Supabase default — **not built**; Clerk's default hosted templates are used

---

## 5. Timeline

| Day | Work |
|---|---|
| **Day 1** | Configure Supabase SMTP · design email templates (HTML + plain text) |
| **Day 2** | Wire email verification into signup flow · "resend email" button · unverified account banner |
| **Day 3** | Password reset flow — forgot password page · reset page · Supabase trigger · email template |
| **Day 4** | Role system — add `role` + `points` columns · route guards on `/review-queue` and `/admin` · navbar conditional links |
| **Day 5** | Profile page — layout, data fetching from Supabase, submission history list |
| **Day 6** | Avatar upload — Supabase Storage bucket · upload UI · image resize · CDN URL save · navbar avatar |
| **Day 7** | Auth email templates — branded HTML design applied to confirmation and reset emails |
| **Day 8** | Integration testing — full signup → verify → login → reset → profile → avatar flow |
| **Day 9** | Bug fixes from testing · edge case handling (expired links, resend limits) |
| **Day 10** | Final review · handover notes for Milestone 3 |

**Total:** 10 working days from start
**Start:** Within 24 hours of Milestone 1 approval on Fiverr

---

## 6. Investment

```
Milestone 2 — Full Authentication & User System:    $450 (fixed)
```

| Milestone | Budget | Status |
|---|---|---|
| M1 — Kickstarter Demo | $350 | Complete before this starts |
| **M2 — Auth & User System** | **$450** | **This engagement** — see Section 0 |
| M3 — Full Submissions | $500 | Next — L5–L8 submission saving portion already delivered ahead of schedule (2026-07-07), see SOLAR_Phase2A_Kickstarter_Proposal.md Section 0 |
| M4 — Reviews & Leaderboard | $650 | After M3 — reviewer queue, 3-reviewer consensus, and real-points leaderboard already delivered ahead of schedule (2026-07-07); scope remaining here should be re-scoped down accordingly |
| M5 — Security & Production | $550 | Final |
| **Total** | **$2,500** | |

---

## 7. Payment

**Platform:** Fiverr

| Step | Detail |
|---|---|
| Client places order | $450 paid on Fiverr, held in escrow |
| Development begins | Within 24 hours |
| Delivery at Day 10 | Full system delivered via Fiverr |
| Client tests acceptance criteria | All 9 acceptance criteria verified |
| Funds released | Client approves delivery on Fiverr |

Revisions are included until all acceptance criteria pass.

---

## 8. What the Client Must Provide

| Item | Needed By |
|---|---|
| Milestone 1 fully approved on Fiverr | Before M2 starts |
| SMTP provider credentials (or approval to set up a free Resend.com account) | Day 1 |
| Confirmation of points threshold for auto-Reviewer promotion (e.g., 500 points) | Day 4 |
| SOLAR Archive logo file for email templates (SVG or PNG) | Day 1 |

If SMTP credentials are not provided by Day 1, email setup is blocked and the timeline shifts accordingly.

---

## 9. After This Milestone — What Comes Next

With Milestone 2 complete, the platform has a real, trustworthy user system. Every student who signs up has a verified email, a profile, and a role. The foundation is ready for Milestone 3.

**Milestone 3 — Full Submissions System ($500)** builds on this by connecting every archive layer type (L5, L6, L7, L8) to the database, adding draft saving, and giving students full control over their submissions.

---

## Summary

| | |
|---|---|
| **Milestone** | 2 — Full Authentication & User System |
| **Investment** | $450 (fixed) |
| **Timeline** | 10 working days |
| **Prerequisite** | Milestone 1 complete |
| **Cumulative spend** | $800 (M1 + M2) |
| **Monthly infra cost** | $0 (still on Supabase free tier) |

---

*Prepared by: Muhammad Ali*
*Contact: programmerbusiness2@gmail.com*
*Date: June 28, 2026*
*Valid for: 14 days*
