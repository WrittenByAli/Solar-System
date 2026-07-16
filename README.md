# The SOLAR Archive

An interactive, coordinate-based research archive. Entries are filed onto
planet-themed hub grids across eight depth layers (L1 planetary overview →
L8 narrative entry), submitted by members, and approved through a
three-reviewer consensus workflow with points and a live leaderboard.

## Stack

- **React 18 + Vite 5** single-page app (HashRouter)
- **Clerk** — authentication (sign-up/sign-in, MFA, OAuth, guest mode)
- **Supabase** — Postgres + Storage data backend, called directly from the
  browser (no app server); review consensus and role promotion run as
  Postgres triggers
- **Framer Motion**, **Tailwind CSS**, **Three.js/Vanta** (home backdrop)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Clerk + Supabase keys
npm run dev            # http://localhost:5173
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run lint` | ESLint over `src` and `e2e` |
| `npm run test:e2e` | Playwright suite (boots its own server on :5199 with mocked auth/data) |

## Documentation

`CLAUDE.md` documents the routing table, theme system, layer model, and
backend state in detail.

`HOSTING_GUIDE.md` explains what hosting the archive means (cloud vs home PC),
hardware and cost implications, and the decision between cloud launch, hybrid,
and full self-host.
