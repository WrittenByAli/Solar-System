# SOLAR Archive — Claude Code Instructions

## Commands

```bash
npm run dev       # start dev server (Vite, defaults to :5173)
npm run build     # production build → dist/
npm run preview   # serve the built dist/
```

The project uses `"type": "module"` in package.json — any standalone scripts must use `.mjs` extension or `--input-type=module`.

## Tech Stack

- **React 18** + **Vite 5** SPA
- **React Router v6** — HashRouter (`#/route` URLs)
- **Framer Motion** — page transitions and component animations
- **Tailwind CSS** — utility classes alongside custom CSS
- **Lucide React** — icons
- **Three.js** + **Vanta** (`vanta/dist/vanta.fog.min`) — animated fog backdrop on the home scene (`VantaFogBackground.jsx`); the old `@react-three/fiber`/`drei` scene is gone and those packages are uninstalled
- **Clerk** (`@clerk/clerk-react`) — real authentication (see `AUTH_SETUP.md`)
- **Supabase** (`@supabase/supabase-js`) — profiles + archive entries (see "Backend state" below)

## Routing

All routes are defined in `src/App.jsx` inside `<AnimatedRoutes>`:

| Path | Component |
|---|---|
| `/` | `Home` (immersive, no page-wrap motion) |
| `/map` | `MapView` |
| `/join` | `Join` (sign in / sign up / verify / MFA / password reset) — only public route |
| `/sso-callback` | `SsoCallback` (OAuth completion, public) |
| `/email-link-verified` | `EmailLinkVerified` (email verification link landing, public) |
| `/account` | `AccountSecurity` (MFA enrollment, sessions) |
| `/profile` | `Profile` (identity page, avatar upload, stats, submission history) |
| `/archive/:planetId` | `ArchiveGrid` |
| `/leaderboard` | `Leaderboard` |
| `/reviews` | `Reviews` |
| `/review-queue` | `GradeSubmissions` — reviewer/admin only |
| `/submit` | `SubmitArchive` — new entry, deepen-existing (`updatesEntryId`), edit-existing (`editEntryId`), draft autosave. Keyed in `App.jsx` by `intent`\|`editEntryId`\|`updatesEntryId` (not the full search string) so switching between these mutually-exclusive modes force-remounts and clears stale form state — React Router does not remount a route element on query-only changes, and other params (`archiveLayer`, `tags`, etc.) must NOT trigger a remount mid-edit |
| `/my-submissions` | `MySubmissions` — status badges, expand for full content, reviewer feedback, edit/delete |
| `/create-archive` | `CreateArchive` |
| `/host-archive` | `HostArchive` |
| `/directory` | `ArchiveDirectory` |
| `/admin` | `AdminPanel` — admin only, genuine stub (route + guard exist, no management UI yet) |

All routes except `/join`, `/sso-callback`, and `/email-link-verified` are wrapped in `RequireAuth` (App.jsx) — signed-out users are redirected to `/join`. Auth is real (Clerk); see `AUTH_SETUP.md`.

**Guest mode:** `/join` offers "Continue as guest" — a browse-only localStorage session (`AuthContext.isGuest`; no Clerk account, no Supabase row). Guests pass `RequireAuth` (Home, Map, Archive, Leaderboard, Directory), but contribution routes (`/submit`, `/my-submissions`, `/reviews`, `/account`, `/profile`, `/create-archive`, `/host-archive`) use `RequireMember`, which shows guests an upgrade prompt (`src/components/GuestGate.jsx`). The authorization policy (`src/auth/authorization.js`) has a `GUEST` role holding only `archive:read`. A real sign-in permanently clears the guest flag.

**Submission lifecycle:** `archive_entries` rows move through `pending → approved/rejected` via the `process_review_consensus` trigger (3 reviewer consensus, see Backend state below). `is_draft`/`draft_saved_at` mark an in-progress, not-yet-submitted row (autosaved every 30s from `/submit`, one active draft per user, surfaced as a "continue where you left off" banner). `deleted_at` is a soft-delete marker settable only on `pending`/`rejected` rows (RLS-enforced — see Backend state) — approved entries can never be soft-deleted or mutated via the anon key. Editing a pending/rejected entry (`/submit?editEntryId=<id>` or from `/my-submissions`) soft-deletes the original row and inserts a fresh pending copy rather than mutating in place, so stale reviews never contaminate a new consensus count. Every read of `pending`/`draft` rows (the review queue, `/my-submissions`) must filter `.is('deleted_at', null)`; reads scoped to `status='approved'` are automatically safe since approved rows can never carry a `deleted_at`.

**Role system:** `users_profile.role` (`student` / `reviewer` / `admin`, default `student`) is the sole source of truth for elevated access — `authorization.js`'s `rolesFor()` reads it directly, no points-threshold inference. Promotion is automatic: a Postgres trigger (`auto_promote_reviewer`, fires on every `users_profile` insert/update) flips `student` → `reviewer` the moment `points` crosses the threshold stored in `app_settings.reviewer_points_threshold` (default 2500, DB-configurable, not hardcoded). Admin is manual-only — no promotion path exists in the UI, set `role='admin'` via the Supabase dashboard/service-role. `/review-queue` (`RequireReviewer`) redirects non-reviewers to `/leaderboard`; `/admin` (`RequireAdmin`) redirects non-admins home — both guards live in `App.jsx` alongside `RequireAuth`/`RequireMember`. Admin implies reviewer (`rolesFor` grants both roles to an admin). The Navbar (`Navbar.jsx`) shows "Review queue"/"Admin" links conditionally via `useAuth().canAccessReviewerQueue`/`canAccessAdmin`.

## Theme System

**Context:** `ThemeContext` is exported from `src/App.jsx`. Consume it with the named export `useTheme`:

```js
import { useTheme } from '../App.jsx'
const { theme, toggleTheme } = useTheme()
const isDark = theme === 'dark'
```

**CSS classes:** `App.jsx` adds `.dark` or `.light` to `<html>` when theme changes. All theme-conditional CSS uses these selectors (`.dark .selector`, `.light .selector`).

**Design tokens:** `src/styles/theme-tokens.css` defines all CSS variables under `:root, .dark` and `.light`. Always prefer these variables over hardcoded hex values in CSS.

Key token groups: `--sa-bg`, `--sa-bg-elevated`, `--sa-bg-card`, `--sa-border-*`, `--sa-text`, `--sa-text-secondary`, `--sa-text-muted`, `--sa-accent`, `--sa-nav-*`, `--sa-home-*`.

## Color Rules

**Critical rule: black text in light mode, white text in dark mode.**

| Use case | Dark mode | Light mode |
|---|---|---|
| Primary headings | `#f8fafc` | `#0f172a` |
| Body / card titles | `#f1f5f9` | `#111827` |
| Secondary text | `#94a3b8` | `#334155` |
| Muted labels | `#64748b` | `#475569` |
| Very muted / hints | `#475569` | `#64748b` |

**Never use `#94a3b8` as a light-mode text color** — it is slate-400, nearly invisible on white.  
**Never use `#1e293b` as a dark-mode text color** — it is slate-800, nearly invisible on dark backgrounds.

The wrong pattern that must not be used: `isDark ? '#64748b' : '#94a3b8'`  
The correct pattern for muted text: `isDark ? '#64748b' : '#64748b'` or `isDark ? '#64748b' : '#475569'`

## CSS Architecture

Each page has its own CSS file in `src/styles/`:

| File | Page |
|---|---|
| `theme-tokens.css` | Global design tokens (import in `index.css`) |
| `solar-submit.css` | `/submit` — SubmitArchive |
| `solar-reviews.css` | `/reviews` — Reviews |
| `solar-leaderboard.css` | `/leaderboard` |
| `solar-directory.css` | `/directory` |
| `solar-host.css` | `/host-archive` |
| `solar-map.css` | `/map` |
| `solar-archive-home.css` | `/` Home |
| `solar-page-shell.css` | Shared page shell (`.solar-page`, `.solar-page--center`) |
| `solar-profile.css` | `/profile` — glassmorphism identity dashboard (`.sp-*` classes) |
| `archive-compass-layers.css` | Compass L2/L3 layers |
| `archive-l1-atmosphere.css` | L1 atmosphere view |
| `archive-nav-responsive.css` | Navbar responsive overrides |

Light mode CSS overrides go at the bottom of each page's CSS file under `/* ── Light mode overrides ── */`.

## Component Patterns

### Adding theme support to a new component
```jsx
import { useTheme } from '../App.jsx'

function MyComponent() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  // use isDark for inline style conditionals
}
```

### Page layout
Pages that need vertical centering use the shared shell classes:
```jsx
<div className="solar-page solar-page--center">
  {/* content */}
</div>
```

### Inline card backgrounds
```js
// Dark-mode card inner boxes
background: isDark ? 'rgba(2,4,8,0.55)' : 'rgba(243,244,246,0.9)'

// Score/stat mini-boxes
background: isDark ? 'rgba(2,4,8,0.4)' : 'rgba(243,244,246,0.8)'

// Avatar circles
background: isDark ? 'rgba(7,20,40,0.9)' : 'rgba(240,244,248,0.95)'
```

## Layer Model (Archive)

Entries are filed by depth layer:

| Layer | Name | Description |
|---|---|---|
| L1 | Planetary | Top-level planet/hub overview |
| L2 | Domain | Major topic domain |
| L3 | Sector | Sub-domain sector |
| L4 | Entry | General research entry |
| L5 | Detailed Entry | Expanded entry with sources |
| L6 | Segmented Entry | Entry broken into labeled segments |
| L7 | Deep Entry | Expert-level entry with ranked segments |
| L8 | Narrative Entry | Story/analysis format with stats |

The submit form at `/submit` handles L4–L8. The preview sidebar uses `SubmissionLayerGuide.jsx`.

## Key Files

| File | Purpose |
|---|---|
| `src/App.jsx` | Router, ThemeContext, AppShell |
| `src/styles/theme-tokens.css` | All CSS design tokens |
| `src/components/Navbar.jsx` | Global navigation + theme toggle |
| `src/components/AvatarCircle.jsx` | Circular account avatar with gradient/ring color support |
| `src/pages/Profile.jsx` | Identity dashboard: avatar upload, reputation bar, stat rings, heatmap, achievements, timeline (composes `src/components/profile/*`) |
| `src/utils/profileInsights.js` | Pure derivations for /profile (streaks, heatmap buckets, achievements, timeline) — all from real rows |
| `src/pages/SubmitArchive.jsx` | Submission form (L4–L8): new entry, deepen (`updatesEntryId`), edit (`editEntryId`), draft autosave |
| `src/pages/MySubmissions.jsx` | Submission history/management: status badges, expand, reviewer feedback, edit/delete |
| `src/components/SubmissionLayerGuide.jsx` | Layer preview sidebar |
| `src/context/AuthContext.jsx` | Clerk session + Supabase profile sync |
| `src/utils/archiveLayerSpecs.js` | Layer spec definitions |
| `src/utils/archiveSectionEntries.js` | Archive section entry data |
| `src/utils/rankProfiles.js` | Leaderboard ranking logic (sorts by points DESC, username ASC) |
| `src/utils/planetOptions.js` | Live `/submit` planet dropdown (queries `planets` table) + presentational color map |

## Backend state (Phase 2A)

There is no application server — Clerk is the auth backend and Supabase is the data backend, both called directly from the browser.

- **Auth:** real Clerk accounts (`AuthContext` wraps `useUser`); profiles sync to the Supabase `users_profile` table.
- **Avatar uploads:** Supabase Storage bucket `avatars` (public-read) with permissive Phase 2A write policies (`phase2a_avatars_storage_policy`). `/profile` page handles center-crop resize to 200×200, cache-busting query params, and Supabase profile sync.
- **Archive entries:** seeded subjects + user submissions live in the Supabase `archive_entries` table (`supabase_schema.sql`, `supabase_seed.sql`). `ArchiveGrid` reads approved entries per hub; `ArchiveDirectory` lists them; `/submit` inserts pending entries (or updates a draft/edit-target row); `/profile` and `/my-submissions` list the current user's submission history. `is_draft`/`draft_saved_at`/`deleted_at`/`layer_data` are live: draft autosave, edit-and-resubmit, and soft-delete all ship as of the submission-management feature — see the Submission lifecycle paragraph under Routing above.
- **Submission management writes:** draft autosave (`SubmitArchive.jsx`, 30s interval, one active draft per user), edit-and-resubmit (soft-delete original + insert edited copy, preserving `updates_entry_id` lineage), and soft-delete (`/my-submissions`) all go through the `p2a_entries_update_pending_rejected` UPDATE policy — the first UPDATE policy ever added to `archive_entries`, deliberately scoped so only `pending`/`rejected` rows are ever mutable via the anon key.
- **Roles:** `users_profile.role` (student/reviewer/admin) + `app_settings.reviewer_points_threshold` (DB-configurable auto-promotion threshold) + the `auto_promote_reviewer` trigger — see the Role system paragraph under Routing above.
- **RLS:** enabled with permissive Phase 2A demo policies (migration `phase2a_demo_policies`) on `users_profile`/`archive_entries`/`reviews` + `phase2a_avatars_storage_policy` on `storage.objects` + `phase2a_entries_update_policy` (the pending/rejected-scoped UPDATE policy above); `notifications` has permissive Phase 2A select/update policies (`NotificationBell.jsx` reads them; the consensus trigger writes them); `rate_limits` is deny-all by design (no policies); `planets`/`hubs`/`app_settings` are public-read, service-role-write. `supabase_rls.sql` replaces the permissive policies with strict per-user ones in Phase 2B — read its warning header first.
- **Review workflow + leaderboard + profile rank:** real and Supabase-backed — 3-reviewer consensus with merge-on-approval and points applied by a Postgres trigger (`process_review_consensus`); `/leaderboard` and `/profile` read live points and rank using the same `rankProfiles()` utility (sorts by points DESC, then username ASC). The review queue (`GradeSubmissions.jsx`) filters `status='pending' AND is_draft=false AND deleted_at IS NULL`. The queue updates live without a manual refresh via `useReviewQueueRealtime` (`src/hooks/useReviewQueueRealtime.js`): Realtime subscriptions on `archive_entries` INSERT/UPDATE and `reviews` INSERT (both tables are in the `supabase_realtime` publication) debounce into a reload, with a slow poll as a disconnect-safety fallback — same hybrid pattern as `useNotifications.js`. RLS-gated Realtime delivery on this project has observed latency of ~20-25s (verified via an isolated service-role probe showing <1s when RLS isn't in the loop, vs. ~20-25s through the Clerk-JWT-authenticated path) — the polling fallback exists precisely to bound the worst case, not just cover disconnects.
- **Reference tables:** `planets` now drives the `/submit` planet dropdown live (`src/utils/planetOptions.js`, falls back to the `researchData.json` snapshot on query failure); `hubs` is seeded 1:1 from the same taxonomy but still unused by the UI (grid dimensions still come from `archiveInstanceStorage.js`/localStorage). `notifications` is live — produced by `process_review_consensus` (approve/reject → author), the `notify_reviewers_new_submission` trigger (new review-eligible submission → every reviewer/admin except the author, type `review_requested`), and the `resurface-stale-reviews` edge function (48h-stale entries → reviewer pool); consumed by `NotificationBell.jsx` via `useNotifications`. Notification state is two-tier: `is_seen` drives the bell badge (opening the dropdown marks all seen, badge clears immediately), `is_read` drives per-item unread dots (cleared on click / "Mark all read"). Reviewers can read other users' pending non-draft entries via the `entries_read_pending_as_reviewer` RLS policy — without it the review queue is empty under strict RLS. `rate_limits` still has no producer/consumer.
- **Hosted archives + segment reports:** now Supabase-backed too — `archiveInstanceStorage.js` writes `archive_registry`/`archive_library`/`archive_instances`, and `segmentReports.js` inserts into `segment_reports` (localStorage remains as cache/fallback).
- **Feature inventory:** `PHASE_2A_FEATURES.md` lists everything Phase 2A delivered and its verification status.
