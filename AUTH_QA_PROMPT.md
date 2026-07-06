# Auth QA & Pre-Deployment Verification Prompt

Paste this into a Claude Code session (with the dev server running) to finish
verifying the Clerk auth flow before deployment. It picks up where automated
testing had to stop.

---

## Context for Claude

The SOLAR Archive app uses Clerk (test-mode keys) for auth — see
`AUTH_SETUP.md`. Apple OAuth has been removed; only Google and GitHub remain.

**Automated Playwright testing already confirmed:**
- `/join` loads with no console errors; Clerk SDK, dev_browser, environment,
  and client endpoints all respond 200.
- OAuth buttons render as exactly `Google` + `GitHub` on both the sign-in and
  sign-up tabs (Apple button is gone, no dead `oauth_apple` references remain).
- Client-side validation works live: password checklist, strength meter, and
  the common-password blocklist (e.g. a password containing "solar" is
  correctly rejected before any network call).
- Production build (`npm run build`) succeeds with no errors (only a
  bundle-size advisory, not a blocker).

**What automation could NOT complete, and why:** submitting the sign-up or
sign-in form triggers Clerk's Cloudflare Turnstile bot-protection challenge.
Turnstile correctly detects the Playwright/CDP-driven browser as automation
(in both headless and headed mode) and never issues a token, so
`signUp.create()` / `signIn.create()` hang waiting on it. **This is the bot
protection working as intended** — it should NOT be bypassed or spoofed. It
does mean the actual account-creation and login round trip needs a real
human click-through, which is what this prompt walks through.

## Task

Drive the browser yourself (ask the user to click through if you can't
control a real browser session), and verify each item below. Report pass/fail
per item, not just a summary.

### 1. Sign-up
- [ ] Go to `/#/join`, Sign Up tab.
- [ ] Fill first/last name, a fresh email, a password meeting all 5 rules
      and NOT containing a common token (see `src/auth/validation.js`
      `COMMON_TOKENS`).
- [ ] Complete the Cloudflare Turnstile widget if shown.
- [ ] Submit → should reach "Check your email" with a 6-digit code screen.
- [ ] Enter the real code from the inbox → should land on "Account Created!"
      then redirect to `/`.
- [ ] Confirm a row was created in Supabase `users_profile` (matching
      `clerk_id`) — check the Supabase table editor.

### 2. Sign-in
- [ ] Log out (navbar avatar menu → Sign out).
- [ ] Go to `/#/join`, Login tab, sign in with the same email/password.
- [ ] Should land on "Welcome Back!" then redirect to `/`.
- [ ] Confirm wrong password shows "Invalid email or password." (not a
      revealing message).

### 3. Forgot / reset password
- [ ] From sign-in, click "Forgot password?", submit the email.
- [ ] Confirm the neutral message shows regardless of whether the email
      exists (no account enumeration).
- [ ] Enter the emailed code + a new password → should reset and sign in,
      and should sign out all other sessions (`signOutOfOtherSessions`).

### 4. MFA (only if enabled in Clerk dashboard for this account)
- [ ] Enroll TOTP at `/account`, then sign out and sign back in — confirm
      the second-factor screen appears and accepts the authenticator code.
- [ ] Confirm a backup code also works as a fallback.

### 5. OAuth (Google / GitHub)
- [ ] Click each button from `/join` → should redirect to the provider, then
      back to `/#/sso-callback`, then to `/`. Should NOT land on a Clerk
      hosted `accounts.dev` page (that would mean the production/dev redirect
      URL isn't registered — see `AUTH_SETUP.md` §2.1).
- [ ] Confirm no Apple button appears anywhere on `/join`.

### 6. Deployment readiness
- [ ] `.env` currently has **test-mode** Clerk keys (`pk_test_...`,
      `sk_test_...`). Before going live, swap to production keys and set
      them in Vercel's environment variables (not committed to git).
- [ ] Register the production origin's redirect URL in Clerk (Configure →
      Paths, or the `curl` command in `AUTH_SETUP.md` §2.1):
      `https://<production-domain>/#/sso-callback`.
- [ ] Confirm `vercel.json` rewrites (`/index.html` catch-all) and security
      headers are present — already verified, no action needed unless the
      routing changes.
- [ ] Decide on the CSP in `AUTH_SETUP.md` §"Content-Security-Policy" once
      the production domain is known; test as `Report-Only` first.
- [ ] If enabling Supabase RLS, follow the exact order in `AUTH_SETUP.md`
      §5 — enabling the SQL policies before wiring third-party auth breaks
      all reads/writes.

Report each checklist item as pass/fail with a one-line note. If something
fails, include the exact error text/screen shown, not just "it didn't work."
