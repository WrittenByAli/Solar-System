# SOLAR Archive — Authentication Setup & Security Notes

Stack: **React 18 + Vite SPA · Clerk (auth) · Supabase (data) · HashRouter**.
There is no application server — Clerk's API is the auth backend.

---

## 1. File map

| File | Responsibility |
|---|---|
| `src/auth/validation.js` | All client-side validation rules (names, email, password policy, common-password rejection, strength scoring) |
| `src/components/auth/OtpInput.jsx` | Reusable 6-box OTP input (paste, keyboard nav, ARIA) |
| `src/pages/Join.jsx` | Sign in, sign up, email verification (code or magic link), MFA second factor, Client Trust device verification, forgot/reset password, OAuth start |
| `src/pages/SsoCallback.jsx` | OAuth redirect completion (`/sso-callback`) |
| `src/pages/EmailLinkVerified.jsx` | Email-verification-link landing page (`/email-link-verified`) |
| `src/pages/AccountSecurity.jsx` | MFA enrollment (TOTP, backup codes, passkeys) + active session management (`/account`) |
| `src/context/AuthContext.jsx` | Session state, Supabase profile sync, `useAuth()` API |
| `src/utils/supabaseClient.js` | Supabase client; optional Clerk-token mode for RLS |
| `supabase_schema.sql` | Tables (`users_profile`, `archive_entries`) + migrations |
| `supabase_rls.sql` | Row Level Security policies — **gated, read the warning header** |
| `vercel.json` | SPA rewrites + security headers |

## 2. Clerk dashboard checklist (client action)

| Setting | Where | Value |
|---|---|---|
| Email + password sign-in | User & Authentication → Email, Phone, Username | Email: required; Password: on |
| Email verification code | Same page → Verification methods | Email verification code: on |
| Email verification link | Same page → Verification methods | On — enables the "Email me a verification link" option at signup (the UI degrades gracefully to code-only while this is off) |
| Name fields (optional) | User & Authentication → Personal information | First/Last name: on (the app degrades gracefully if off) |
| Google OAuth | SSO Connections → Add Google | Needed for the Google button |
| GitHub OAuth | SSO Connections → Add GitHub | Needed for the GitHub button |
| Authenticator app (TOTP) | User & Authentication → Multi-factor | On — enables 2FA setup at `/account` |
| Backup codes | Same page | On |
| Passkeys | User & Authentication → Passkeys | On (optional) |
| Bot protection | Security → Attack protection | Keep on — the form has the required `clerk-captcha` mount |
| **Redirect URLs (OAuth + email link)** | **Configure → Paths, or via Backend API `/v1/redirect_urls`** | **Must include `<origin>/#/sso-callback` AND `<origin>/#/email-link-verified` for every origin the app runs on** |

### 2.0 Client Trust (device verification) — why login asks for an email code

Clerk apps created after Nov 14 2025 have **Client Trust** enabled by
default (Dashboard → Configure → Security → Attack protection). When a
user signs in with a **correct password from an unrecognized browser**,
Clerk returns `needs_second_factor` (newer API versions:
`needs_client_trust`) with an `email_code` factor — even when the
account has **no MFA enrolled**. The response carries
`client_trust_state: "new"`; after the emailed code is verified it
becomes `"known"` and that browser skips the step on future logins.

`Join.jsx` handles both statuses: it detects the device-verification
case (no TOTP/backup factor enrolled), shows a "Verify it's you"
screen instead of "Two-factor authentication", and offers a resend
button (60 s cooldown). Codes to `+clerk_test` addresses accept
`424242` without sending mail.

If the emailed codes are unwanted friction in development, toggle
Client Trust off on the same Attack protection page (dashboard-only —
not exposed via the Backend API).

### 2.2 Bot sign-up protection — why signup can hang for ~30 s on localhost

The signup CAPTCHA (Cloudflare Turnstile, "smart" mode) frequently
fails on localhost with client-side error `300010` plus
`postMessage`/sandboxed-iframe console noise, retries for tens of
seconds, and only then lets `signUp.create()` proceed. This is
environmental (Turnstile vs. localhost/extensions/headless), not app
code — the required `<div id="clerk-captcha">` mount is present. For
fast local signups, turn **Bot sign-up protection** off in Dashboard →
Configure → Security → Attack protection (dashboard-only setting);
keep it ON in production.

### 2.1 OAuth redirect URLs — required or Google/GitHub buttons silently fail

`signIn.authenticateWithRedirect()` passes a custom `redirectUrl`
(`<origin>/#/sso-callback`). Clerk only honors that URL if it's on the
instance's **redirect_urls allowlist** — if the list is empty or missing
the current origin, Clerk silently falls back to its own hosted Account
Portal (`https://<instance>.accounts.dev/sign-up`) instead of returning
the user to this app. This was diagnosed and fixed for local dev by
registering:

```
http://localhost:5173/#/sso-callback
http://localhost:4173/#/sso-callback   (npm run preview)
http://localhost:5173/#/email-link-verified
http://localhost:4173/#/email-link-verified
```

**Whoever deploys to Vercel must add the production URLs the same way**
(both `/#/sso-callback` and `/#/email-link-verified`),
either in the dashboard (Configure → Paths → Redirect URLs) or via:

```bash
curl -X POST https://api.clerk.com/v1/redirect_urls \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<your-production-domain>/#/sso-callback"}'
```

Skipping this step is the #1 cause of "Google sign-in redirects to a
Clerk page instead of my site" reports.

## 3. Environment variables

```
VITE_CLERK_PUBLISHABLE_KEY=pk_...        # public — safe in the bundle
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...# public — safe in the bundle
VITE_SUPABASE_THIRD_PARTY_AUTH=          # set to "true" ONLY after §5
```

Secrets that must NEVER ship in the frontend bundle or repo:
`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (dashboard/server use only).
Both clients throw at boot if their public vars are missing (fail-fast env validation).

## 4. Security model — what enforces what

| Concern | Enforced by | Notes |
|---|---|---|
| Password hashing, breach checks | Clerk API | `form_password_pwned` surfaced with a friendly message |
| Session cookies (Secure, HttpOnly, SameSite) | Clerk | Managed on Clerk's domain; nothing to configure client-side |
| Session rotation / revocation | Clerk | `/account` lists devices; revoke one or all others |
| Rate limiting (auth endpoints) | Clerk API | Plus client-side: 60 s resend cooldown, 5 resends/hour, 5 OTP attempts per code, 10-min code expiry |
| Account enumeration | App code | Sign-in always says "Invalid email or password."; forgot-password always shows the same neutral message and swallows lookup errors |
| Password reset token | Clerk | Single-use email code; on reset the app passes `signOutOfOtherSessions: true` → all other devices are logged out |
| CSRF | Architecture | No cookie-authenticated same-origin API of our own; Clerk's SDK uses its own token handling |
| XSS | React + code review | JSX auto-escaping; no `dangerouslySetInnerHTML`; inputs normalized (trim/lowercase) before use |
| Bot signups | Clerk Smart CAPTCHA | Mounted via `<div id="clerk-captcha">` in the signup form |
| Clickjacking / MIME sniffing / referrer leaks | `vercel.json` headers | HSTS, XFO DENY, nosniff, strict referrer, permissions-policy |
| Row-level data access | `supabase_rls.sql` | See §5 — apply only after third-party auth is wired |
| Sensitive logging | Code review | No emails, passwords, tokens, or codes are ever logged |

### Content-Security-Policy (deliberately not shipped yet)
A strict CSP needs the exact production domains (Clerk frontend API,
Supabase project URL, Cloudflare Turnstile). Recommended value once the
Vercel domain is known:

```
default-src 'self';
script-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com;
connect-src 'self' https://*.clerk.accounts.dev https://<ref>.supabase.co;
img-src 'self' https://img.clerk.com data:;
style-src 'self' 'unsafe-inline';
frame-src https://challenges.cloudflare.com;
```

Test in `Content-Security-Policy-Report-Only` first — a wrong CSP takes
the whole app down, which is why it's documented rather than enabled blind.

## 5. Enabling Row Level Security (do this in order)

**Current state (Phase 2A):** RLS is ON with permissive demo policies
(migration `phase2a_demo_policies`): public read on both tables, open
profile writes, and entry inserts restricted to `status='pending'`.
This keeps the app working on the anon key alone. `supabase_rls.sql`
drops these demo policies before installing the strict per-user ones.

1. Supabase dashboard → Authentication → Sign In / Up → **Third-party auth** → add **Clerk**, enter the Clerk domain.
2. Set `VITE_SUPABASE_THIRD_PARTY_AUTH=true` in `.env` (and Vercel env), redeploy.
3. Verify signup, login, and submissions still work (requests now carry the Clerk JWT).
4. Run `supabase_rls.sql` in the SQL editor.

Skipping step 1–3 and running the SQL first will break every read/write in the app.

## 6. Known scope boundaries (deliberate, not oversights)

- **"Remember me" checkbox** — omitted. Clerk sessions are persistent by
  default and per-login persistence isn't exposed in custom flows; a fake
  checkbox would be placeholder logic.
- **Entry review/approval transitions** — service-role only (no client
  path can approve its own entry once RLS is on).
- **Server-side rate limiting beyond Clerk's** — requires a backend
  (full Phase 2 scope).
