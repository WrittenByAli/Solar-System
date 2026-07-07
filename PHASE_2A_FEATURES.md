# SOLAR Archive — Phase 2A: Delivered Functionality

**Status (2026-07-08):** 6 of 7 acceptance criteria complete and verified live.
The only open item is public deployment to Vercel (deliberately deferred).
Phase 2A took the archive from a frontend-only demo to a working product with a
real auth backend (Clerk) and a real data backend (Supabase) — no application
server; both are called directly from the browser.

---

## 1. Real Authentication (Clerk)

All flows are custom-built UI on `/join` (no Clerk pre-made components), backed
by Clerk's API for everything security-critical.

### 1.1 Sign up (email + password)

- First name, last name, email, password, confirm password, and two required
  consent checkboxes (Terms & Conditions, Privacy Policy)
- **Client-side validation** (`src/auth/validation.js`, single source of truth):
  - Names: required, 2–50 characters, whitespace-normalized
  - Email: required, ≤ 254 chars, format-checked, trimmed + lowercased before
    any network call
  - Password: **all five rules required** — ≥ 12 characters, an uppercase
    letter, a lowercase letter, a number, a special character; ≤ 128 chars
  - **Common-password rejection**: blocks passwords containing any of ~30
    known-weak tokens (`password`, `qwerty`, `123456`, `solar`, `archive`, …),
    single-repeated-character strings, and straight keyboard/alphabet runs
  - **Live UX**: per-rule checklist that ticks as you type, plus a 4-level
    strength meter (Weak / Fair / Good / Strong; Strong requires all rules
    + ≥ 16 chars; common passwords cap at Weak)
- **Server-side enforcement by Clerk**: password hashing, uniqueness, and
  HaveIBeenPwned breach checking — a breached password is rejected with a
  friendly message ("This password appears in a known data breach…")
- **Graceful degradation**: if the Clerk instance has a field disabled (names,
  legal consent, username), the submit retries stripping exactly the rejected
  parameter instead of failing outright; dashboard-required fields the form
  cannot satisfy (e.g. phone number) are detected **before** a verification
  email is sent, with an actionable error naming the exact dashboard setting

### 1.2 Email verification

- **6-digit code flow** (primary): custom OTP input with paste support,
  keyboard navigation, and ARIA labels; auto-submits when 6 digits are entered
- **Anti-abuse limits** (client-side, on top of Clerk's server limits):
  - Codes expire after **10 minutes** (countdown-aware UI)
  - **5 wrong attempts** per code, then a new code is required
  - **60-second cooldown** between resends (live countdown on the button)
  - **5 resends per rolling hour** per email address
- **Magic-link alternative**: "Email me a verification link" starts a Clerk
  email-link flow with a live waiting panel — the page continues automatically
  the moment the link is opened on **any** device; dedicated
  `/email-link-verified` landing page; flow is cancellable back to code entry
- **Truthful error handling** (hardened this phase): only a genuinely wrong or
  expired code consumes an attempt and says "Incorrect code"; failures *after*
  Clerk accepts the code (e.g. a blocked network call) tell the user their
  account was created and direct them to the Login tab

### 1.3 Sign in

- Email + password with the same normalization rules
- **Account-enumeration protection**: every credential failure reads exactly
  "Invalid email or password." — the UI never reveals whether the email exists
- OAuth-only accounts (no password) get a targeted hint to use the
  Google/GitHub buttons instead of a misleading failure

### 1.4 New-device verification (Clerk Client Trust)

- Clerk instances created after Nov 2025 have Client Trust enabled: a correct
  password from an unrecognized browser requires an emailed 6-digit code even
  with no MFA enrolled
- The app detects this case (no TOTP/backup factor offered; handles both the
  `needs_second_factor` and newer `needs_client_trust` API statuses) and shows
  an honest **"Verify it's you"** screen — explains the browser isn't
  recognized, warns the email may take a minute or land in spam
- **Resend button** with the same 60 s cooldown (previously a lost email was a
  hard dead-end)
- Once verified, that browser is trusted and future logins skip the step

### 1.5 Multi-factor authentication (MFA)

- **Second-factor login** adapts to whatever the account actually has
  enrolled: TOTP authenticator app, SMS code, email code, or backup code —
  OTP strategies are prepared (sent) automatically, with a "use a backup code
  instead" switch when backup codes exist
- **Enrollment UI at `/account`** (AccountSecurity):
  - TOTP setup with QR code + manual secret, verified before activation
  - Backup-code generation and regeneration
  - Passkey registration
  - **Active-session management**: list of signed-in devices with the ability
    to revoke a single session or all other sessions

### 1.6 Forgot / reset password

- Request flow always shows the same neutral message ("If an account exists
  for that email…") and swallows lookup errors — no enumeration signal
- Reset form: emailed 6-digit code + new password (same full policy,
  checklist, and confirm field), same expiry/attempt/resend limits
- On success the app passes `signOutOfOtherSessions: true` — **every other
  device is logged out**, so a stolen-then-reset account can't stay hijacked

### 1.7 OAuth (Google + GitHub)

- `authenticateWithRedirect` from either the sign-in or sign-up context
- Dedicated `/sso-callback` completion page handles the redirect round-trip
- Redirect-URL allowlist requirement diagnosed and documented (silent
  fallback to Clerk's hosted portal otherwise); local-dev URLs registered,
  production registration step documented in `AUTH_SETUP.md` §2.1

### 1.8 Session & route protection

- All routes except `/join`, `/sso-callback`, `/email-link-verified` are
  wrapped in `RequireAuth` — signed-out users are redirected to `/join`
- Already-signed-in visitors to `/join` are bounced home
- Global logout in the navbar (clears profile state, then Clerk `signOut`)

### 1.9 Browser autofill disabled

- Sign-in, sign-up, and forgot-password email fields use `autocomplete="off"`;
  password fields use `autocomplete="new-password"` (the only value Chrome
  respects for suppressing saved-credential autofill); forms opt out at the
  form level — the browser no longer pre-fills stored credentials

---

## 2. User Profiles (Supabase `users_profile`)

- **Schema**: `id` (uuid PK), `clerk_id` (unique, links to Clerk),
  `username`, `email`, `first_name`, `last_name`, `points`,
  `created_at` / `updated_at`
- Created at signup (with names) and **self-healing**: if the row is missing
  for any reason, `AuthContext` recreates it on the next login using
  conflict-safe upserts (`ON CONFLICT DO NOTHING` — never clobbers the
  signup-chosen username; race between select and insert is handled)
- Profile writes are **best-effort by design**: a failed or blocked Supabase
  call can never abort a signup that Clerk already completed
- New accounts start with **2,600 points** (demo ledger — enough to cross the
  reviewer threshold; replaced by server logic in production)
- `useAuth()` API exposes: `session`, `profile`, `isLoggedIn`, `authLoaded`,
  `username`, `email`, `avatarUrl`, `points`, `logout`, `refreshProfile`, and
  the permission check `can()`

### 2.1 Authorization policy (`src/auth/authorization.js`)

- Single central policy — pages never hardcode role logic:
  - **Roles**: `member` (any authenticated user), `reviewer` (earned at
    **≥ 2,500 points**)
  - **Permissions**: `archive:read`, `archive:submit`, `archive:host` →
    member+; `review:grade` → reviewer only
- Explicitly documented as a **UX guardrail, not a security boundary** — true
  enforcement belongs to the data layer (RLS, §6.5)

---

## 3. Live Archive Content (Supabase `archive_entries`)

- **Schema**: `title`, `content`, `short_summary`, `layer` (CHECK 4–8),
  `planet_id` + `hub_id`, `coord_x` / `coord_y` grid coordinates, `status`
  (CHECK `pending` / `approved` / `rejected`), `submitted_by` (FK →
  `users_profile`, `ON DELETE SET NULL`), `tags[]`, `attachments` (jsonb),
  `alternate_perspectives` (jsonb), `difficulty` (CHECK 1–5), timestamps
- **Indexes** for the two hot paths: `(planet_id, status)` for per-hub grid
  reads, `(submitted_by)` for directory/leaderboard; `updated_at` maintained
  by a DB trigger
- **64 seeded subjects** matching the proposal's exact distribution —
  **20 L4, 16 L5, 12 L6, 10 L7, 6 L8** — balanced across all 10 hubs (6–8
  each, fixing earlier 2-entry hubs), with real multi-sentence content
  authored for the L6 segmented, L7 ranked-segment, and L8 narrative formats
- **Coordinate-collision fix**: the compiled L2/L3 compass taxonomy occupies
  grid box `lx/ly ∈ [-4, 4]` in every hub; seed coordinates were shifted
  +20/+20 (now at 18–21) after discovering DB entries were silently
  overwriting real taxonomy topics at ~80 % of tested coordinates —
  zero overlap verified computationally; the constraint is documented in
  `supabase_seed.sql`'s header for future seed edits
- **`ArchiveGrid`** (`/archive/:planetId`) reads approved entries per hub and
  merges them onto the coordinate grid alongside the static taxonomy
- **`ArchiveDirectory`** (`/directory`) lists approved entries from the live DB
- Homepage "64 Subjects" marketing copy is now factually accurate

---

## 4. Real Submissions (`/submit`)

- Writes real rows to Supabase with `status='pending'`, tied to the signed-in
  user via `submitted_by`
- Handles all five entry layers (L4–L8) with layer-aware fields and the
  `SubmissionLayerGuide` preview sidebar
- Coordinate picker offers only unoccupied slots; the summary field
  requirement for L6+ at empty coordinates now matches validation (an L7/L8
  submission was previously **silently impossible** — required field never
  rendered; fixed and all layers verified inserting correctly)
- Post-submission confirmation screen shows the submitted coordinates
  (fixed: a missing-import crash after every submission, and a cleared-state
  bug that blanked the displayed coordinates)

---

## 5. Layer Deepening + Review Workflow

- **Progressive deepening**: one topic can grow L4 → L8 **at the same
  coordinate** through reviewer-gated merges, instead of every submission
  creating an independent entry
- **`reviews` table** (live in Supabase): `entry_id`, `reviewer_id`,
  `fact_check_pass` (boolean), `difficulty` (1–5), `notes` (≤ 1,200 chars
  shown to the submitter)
- **Consensus rules** (`src/constants/reviewWorkflow.js`):
  - **3 independent reviewers** required before an entry can go live
  - Reviewer earns **85 points** per completed grade
  - Author earns **220 points** when their entry clears all reviews
- **Merge-on-approval and point awards run in a Postgres trigger** — the
  client only inserts review rows; the database applies the consensus outcome
  (until the Clerk↔Supabase JWT bridge exists in Phase 2B, per-user
  enforcement of "3 *distinct* reviewers" can't be done via RLS alone)
- **Reviewer queue** at `/review-queue`, gated by the `review:grade`
  permission (≥ 2,500 points)
- **Leaderboard** (`/leaderboard`) reads real per-user points from Supabase
  (was localStorage)

---

## 6. Security — Full Detail

### 6.1 Who enforces what

| Concern | Enforced by |
|---|---|
| Password hashing, breach (HIBP) checks | Clerk API |
| Session cookies (Secure, HttpOnly, SameSite) | Clerk — managed on Clerk's domain, nothing to configure client-side |
| Session rotation / revocation | Clerk + `/account` UI (revoke one or all other devices) |
| Rate limiting on auth endpoints | Clerk API, plus the client-side budgets in §1.2 |
| Account enumeration | App code (uniform error/neutral messages, swallowed lookups) |
| Bot signups | Clerk Smart CAPTCHA (Cloudflare Turnstile) via the required `<div id="clerk-captcha">` mount |
| New-device hijack protection | Clerk Client Trust (§1.4) |
| Password-reset token safety | Clerk single-use email code; reset signs out all other sessions |
| Row-level data access | Supabase RLS (§6.5) |
| Transport/browser hardening | `vercel.json` headers (§6.4) |

### 6.2 Application-code measures

- **XSS**: JSX auto-escaping everywhere; **zero** uses of
  `dangerouslySetInnerHTML`; all identity inputs normalized (trim/lowercase)
  before use
- **CSRF**: no cookie-authenticated same-origin API of our own exists (no app
  server); Clerk's SDK handles its own token transport
- **Sensitive logging**: auth diagnostics (`src/auth/logger.js`) are
  **dev-only no-ops in production** — no emails, passwords, tokens, or codes
  are ever logged
- **Secrets**: `CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` never ship
  in the bundle or repo history; only `VITE_`-prefixed public keys reach the
  client, and both clients **fail fast at boot** if their public vars are
  missing
- Client-side permission checks are explicitly UX-only (§2.1) — the design
  assumes a hostile user controls their own browser

### 6.3 Auth-flow abuse limits (client-side, complementing Clerk's)

| Limit | Value |
|---|---|
| Verification-code lifetime | 10 minutes |
| Wrong attempts per code | 5, then a new code is forced |
| Resend cooldown | 60 seconds (live countdown) |
| Resend budget | 5 per rolling hour per email |
| Attempt accounting | Only genuinely wrong codes consume attempts (network failures don't) |

### 6.4 HTTP security headers (`vercel.json`, applied on deploy)

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years, preload-eligible |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leak control |
| `Permissions-Policy` | camera, microphone, geolocation, payment all `()` | Disable unneeded browser APIs |
| `X-XSS-Protection` | `0` | Deliberate — the legacy auditor is itself an attack vector; CSP is the modern control |

Plus SPA rewrites that exclude `/assets/`, and immutable 1-year caching for
hashed assets.

**CSP is documented but deliberately not shipped yet**: a strict policy needs
the exact production domains (Clerk frontend API, Supabase URL, Cloudflare
Turnstile). The recommended value and a report-only rollout plan are in
`AUTH_SETUP.md` §4 — enabling it blind takes the whole app down.

### 6.5 Row Level Security

- **Current state (Phase 2A)**: RLS is **enabled** on both tables with
  permissive demo policies (migration `phase2a_demo_policies`) so the app
  works on the anon key alone:
  - public read on `users_profile` and `archive_entries`
  - open profile writes
  - entry inserts restricted to `status='pending'` (nobody can insert
    pre-approved content, even now)
- **Staged strict policies** (`supabase_rls.sql`, for Phase 2B) — the file
  first drops the demo policies (leaving them would OR with and defeat the
  strict ones), then installs:
  - profiles: read for any authenticated user; **insert/update only your own
    row** (`clerk_id = auth.jwt()->>'sub'`)
  - entries: approved entries public; authors always see their own
    pending/rejected entries; inserts tied to the submitting user
- **Gated runbook** (do in order, documented in the file's warning header):
  1. Supabase dashboard → add **Clerk as third-party auth provider**
  2. Set `VITE_SUPABASE_THIRD_PARTY_AUTH=true` so the client attaches the
     Clerk JWT to every request
  3. Verify signup/login/submit still work
  4. Only then run `supabase_rls.sql` — running it first breaks every
     read/write in the app
- **Known accepted risk for the demo phase** (flagged, deferred to 2B by the
  proposal itself): the permissive profile-write policy means any anon request
  could modify profile rows — this is exactly what the strict policies close

### 6.6 Deliberate scope boundaries (documented, not oversights)

- **"Remember me" checkbox** — omitted; Clerk sessions are persistent by
  default and per-login persistence isn't exposed in custom flows
- **Entry approval transitions** — service-role only; no client path can
  approve its own entry once strict RLS is on
- **Server-side rate limiting beyond Clerk's** — requires a backend (Phase 2
  full scope)

---

## 7. Reliability Hardening (from brutal end-to-end testing)

Issues found by driving the real app against the live Clerk instance and
Supabase project, then fixed and re-verified:

1. **Client Trust mislabeled as 2FA** — device verification showed a
   "Two-factor authentication" screen with no resend; now an accurate
   "Verify it's you" screen with resend (§1.4)
2. **`needs_client_trust` unhandled** — newer Clerk API versions' status
   would have fallen through to "Invalid email or password."; now handled
3. **"Incorrect code" lie** — a failure *after* successful code verification
   (e.g. an extension blocking `supabase.co` mid-signup) surfaced as
   "Incorrect code", sending users into a hopeless retype loop while their
   account already existed; error handling now distinguishes wrong-code,
   network, and post-completion failures across verify, MFA, and reset flows
4. **Profile save could abort a completed signup** — now structurally
   impossible (§2)
5. **Captcha stall feedback** — Turnstile can stall 30–60 s on localhost with
   zero feedback; after 8 s the form now explains a security check is running
6. **L7/L8 submission dead-end, confirmation-screen crash,
   blank coordinates, seed/taxonomy coordinate collision** — all fixed (§3, §4)

**Verified live**: signup → email code → session → profile row; login →
device verification → home; archive grid/directory reads; pending submission
insert (all layers); leaderboard — including a run with all Supabase traffic
blocked to prove signup still completes.

---

## 8. Documentation & QA Tooling

- **`AUTH_SETUP.md`** — auth architecture and file map, Clerk dashboard
  checklist (verification methods, OAuth, MFA, bot protection, Client Trust,
  redirect-URL registration), env var reference, the who-enforces-what
  security model, CSP plan, RLS runbook, and known scope boundaries
- **`supabase_schema.sql`** — tables, constraints, indexes, triggers;
  idempotent (safe to re-run, includes column migrations)
- **`supabase_seed.sql`** — the 64-subject seed with the coordinate-offset
  constraint documented in its header
- **`supabase_rls.sql`** — strict Phase 2B policies behind a prominent
  warning gate
- **Playwright QA scripts** (repo root, run with the dev server up):
  - `qa-full-loop.mjs` — login → archive → directory → submit → leaderboard
    regression
  - `qa-verify-step.mjs` — full signup + verification E2E, using Clerk
    testing tokens + Turnstile blocking to make the captcha automatable;
    optional `block-supabase` arg reproduces the blocked-network failure mode
  - Test emails: any `+clerk_test` address accepts code `424242` with no real
    email sent

---

## Known Limitations (deliberate Phase 2A scope, not bugs)

| Item | Status |
|---|---|
| Public deployment (Vercel) | Ready to run; deferred by choice — the last open acceptance criterion |
| Strict per-user RLS | Phase 2B (`supabase_rls.sql` staged; requires the Clerk↔Supabase third-party auth bridge first) |
| Review consensus enforcement via RLS | Runs in a Postgres trigger; per-user verification needs the JWT bridge (Phase 2B) |
| Hosted-archive registry, segment reports | Still localStorage/demo (`archiveInstanceStorage.js` + inline page data) |
| Bot-protection CAPTCHA on localhost | Turnstile can stall 30–60 s in dev; toggle off in Clerk Dashboard → Configure → Security → Attack protection for local work, keep ON in production |
| Content-Security-Policy header | Documented with a rollout plan, ships after the production domain exists |
| "Remember me" checkbox | Omitted — Clerk sessions are persistent by default |
