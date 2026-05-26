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
- No backend — all data is static or in-memory/localStorage

## Routing

All routes are defined in `src/App.jsx` inside `<AnimatedRoutes>`:

| Path | Component |
|---|---|
| `/` | `Home` (immersive, no page-wrap motion) |
| `/map` | `MapView` |
| `/join` | `Join` (sign in / sign up) |
| `/archive/:planetId` | `ArchiveGrid` |
| `/leaderboard` | `Leaderboard` |
| `/reviews` | `Reviews` |
| `/review-queue` | `GradeSubmissions` |
| `/submit` | `SubmitArchive` |
| `/create-archive` | `CreateArchive` |
| `/host-archive` | `HostArchive` |
| `/directory` | `ArchiveDirectory` |

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

## No Backend

There is currently no backend. Authentication is mock (stores username in memory via `AuthContext`). Submissions are stored in `localStorage` via `src/utils/archiveInstanceStorage.js`. All leaderboard, review, and directory data is static/demo data defined inline in the page files.
