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
- **Three.js** + `@react-three/fiber` + `@react-three/drei` — 3D home page scene
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
| `/archive/:planetId` | `ArchiveGrid` |
| `/leaderboard` | `Leaderboard` |
| `/reviews` | `Reviews` |
| `/review-queue` | `GradeSubmissions` |
| `/submit` | `SubmitArchive` |
| `/create-archive` | `CreateArchive` |
| `/host-archive` | `HostArchive` |
| `/directory` | `ArchiveDirectory` |

All routes except `/join`, `/sso-callback`, and `/email-link-verified` are wrapped in `RequireAuth` (App.jsx) — signed-out users are redirected to `/join`. Auth is real (Clerk); see `AUTH_SETUP.md`.

**Guest mode:** `/join` offers "Continue as guest" — a browse-only localStorage session (`AuthContext.isGuest`; no Clerk account, no Supabase row). Guests pass `RequireAuth` (Home, Map, Archive, Leaderboard, Directory), but contribution routes (`/submit`, `/reviews`, `/review-queue`, `/account`, `/create-archive`, `/host-archive`) use `RequireMember`, which shows guests an upgrade prompt (`src/components/GuestGate.jsx`). The authorization policy (`src/auth/authorization.js`) has a `GUEST` role holding only `archive:read`. A real sign-in permanently clears the guest flag.

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
| `src/pages/SubmitArchive.jsx` | Submission form (L4–L8) |
| `src/components/SubmissionLayerGuide.jsx` | Layer preview sidebar |
| `src/context/AuthContext.jsx` | Mock auth (login/logout, username) |
| `src/utils/archiveLayerSpecs.js` | Layer spec definitions |
| `src/utils/archiveSectionEntries.js` | Archive section entry data |

## Backend state (Phase 2A)

There is no application server — Clerk is the auth backend and Supabase is the data backend, both called directly from the browser.

- **Auth:** real Clerk accounts (`AuthContext` wraps `useUser`); profiles sync to the Supabase `users_profile` table.
- **Archive entries:** seeded subjects + user submissions live in the Supabase `archive_entries` table (`supabase_schema.sql`, `supabase_seed.sql`). `ArchiveGrid` reads approved entries per hub; `ArchiveDirectory` lists them; `/submit` inserts pending entries.
- **RLS:** enabled with permissive Phase 2A demo policies (migration `phase2a_demo_policies`); `supabase_rls.sql` replaces them with strict per-user policies in Phase 2B — read its warning header first.
- **Review workflow + leaderboard:** real and Supabase-backed — 3-reviewer consensus with merge-on-approval and points applied by a Postgres trigger; `/leaderboard` reads live points.
- **Still localStorage/demo:** hosted-archive registry and segment reports (`archiveInstanceStorage.js` + inline page data).
- **Feature inventory:** `PHASE_2A_FEATURES.md` lists everything Phase 2A delivered and its verification status.
