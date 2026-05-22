# The SOLAR Archive — Client Handoff: Frontend Phase vs Backend Phase

**Document version:** 1.1  
**Product:** S.O.L.A.R. (Sustainable Off-grid Living-labs for Autonomy and Research) — interactive coordinate archive demo  
**Repository:** [WrittenByAli/Solar-System on GitHub](https://github.com/WrittenByAli/Solar-System)  
**Typical deployment:** static build (e.g. Vercel) from the `main` branch after `npm run build`

This document is written for a non-technical or lightly technical client audience. It explains what has been delivered in the **frontend phase** (browser-only demo you can click through today), what is **simulated** with local browser storage, and what **must be built in a backend phase** for a production system with real accounts, moderation, and hosted files.

---

## 1. Executive summary

The current application is a **single-page React site** that demonstrates the archive concept end-to-end in the browser: a multi-layer coordinate grid, multiple scientific “hubs” (planets) that share the same SEG addressing, a Foundation-focused archive route, submission and review flows, tags, difficulty display, and responsive navigation.

**Critical distinction:** Almost all persistence today is **`localStorage` in the visitor’s browser**. Nothing is stored on your servers unless you add a backend. That means submissions, user profiles, leaderboards, and review queues **reset on a different device** and are **not suitable for production truth** without API and database work.

The site can be deployed as static files (e.g. Vercel linked to GitHub); each deploy picks up the latest build. There is **no server-side secret or database** in this frontend-only phase.

**Overall frontend completion (rollup):** the **unweighted mean** of the twenty-seven task scores in **§2.1** is **≈ 86%** — i.e. those percentages averaged together. Use **§2.1** for line-item detail; the rollup is a simple headline for status reports, not a weighted project score.

---

## 2. Product goals (from the client brief)

The following goals drive the design (some are fully demonstrated in UI, others are content or backend-dependent):

| Goal | Frontend phase | Backend phase |
|------|----------------|---------------|
| Coordinate-based archive with eight zoom layers | Implemented (L1–L8) | Content ingestion, versioning, CDN |
| Multiple hubs / “scientific lenses” on one grid | Implemented (hub switcher) | Federated instances, DNS, legal |
| Foundation corpus (policies, canon, projects) | Route `/archive/star` + entry points | CMS, access control, audit log |
| Community submissions with attachments | UI + local demo pipeline | Upload storage, virus scan, quotas |
| Multi-reviewer fact-check before “live” | **3 reviewers** enforced in demo storage | Identity, anti-abuse, assignment |
| Leaderboard, reviewer access by points | Demo thresholds | Server-side scores, fraud prevention |
| Expert / honor tokens per field | UI from local stats | Authoritative rankings |
| Cross-hub links (“same topic, different lens”) | Partial (data-driven where present) | Search, canonical topic IDs |
| “Start archive from image dimensions” | Start archive / host flows (UI) | Packaging, hosting, directory API |
| Federation / `archive.solar` directory | Copy + placeholder config | Registry API, moderation |

### 2.1 Client brief — full task list (completion %)

Each row maps a request from the client brief to **frontend (FE) completeness** in this demo. **Backend (BE)** indicates what still requires server, database, or hosted services for production. Percentages are approximate and agreed for reporting (not a formal SLA).

| # | Task | FE % | Remaining in backend phase |
|---|------|:----:|-----------------------------|
| 1 | Downloadable files (attachments / PDFs / links in grid cells) | **90%** | Signed URLs, virus scan, size limits, CDN; drop `data:` URLs in production |
| 2 | Add images / sketches / graphs on submission | **90%** | Real file upload API, storage bucket, thumbnails |
| 3 | Layer 8 scale: ~15× L7 narrative band (450 segments, 30 fact/source slots) | **100%** | CMS/pipeline to populate content at scale |
| 4 | Foundation logo as small clickable “star” in background → Foundation archive | **100%** | None for routing; optional analytics |
| 5 | Replace “rocket” with foundation logo (no rocket in build; stars + logo markers) | **100%** | — |
| 6 | Custom **A** in SOLAR wordmark | **100%** | Optional asset swap if client supplies new SVG |
| 7 | Layer 7: last **2** segments = aggregated **facts** list for the grid | **95%** | Richer fact mining / automation from corpus |
| 8 | Layer 8: ~**450** segments + **30** facts/sources | **100%** | Editorial workflow / ingestion |
| 9 | Submit: pick **target layer**, preview grid/segment look, **guidelines / tips** | **90%** | Server-side validation; suggested copy versioning |
|10 | **Review queue** after login, gated by **leaderboard points** | **75%** | Real auth, server points, reviewer assignment |
|11 | **≥3** reviewers fact-check + difficulty before archive | **85%** | Identity, anti–sock-puppet, appeals |
|12 | Segments show **difficulty**, ordered **easiest → hardest** | **95%** | Server **consensus** difficulty on published entries |
|13 | Layer 2–3: **4×4** subfield lattice + optional **map file** for subjects | **70%** | Client’s finished map JSON + long-term CMS for taxonomy |
|14 | Layer 7–8: **segment** stepping (not whole-cell grid) on +/- controls | **100%** | — |
|15 | Layer 7–8: **coordinates** + **% segment fill** / empty count in HUD | **100%** | — |
|16 | Empty segments: **dotted / + corners**; **Submit next empty** segment | **100%** | Deeplink persistence after approval |
|17 | **Pan vs select/copy**; control placed between **search** and **theme** (desktop) | **95%** | — |
|18 | Layer 2–3: click lattice **centers** on subject (incl. `SOLAR_STATIC_LAYER_MAP`) | **85%** | Full map-driven focus when client file lands |
|19 | Layer 4: show **title** (not coords only) | **90%** | Ensure all L4 cells have `title` (or CMS) |
|20 | Foundation archive like other planets; naming (**Beacon** vs “Star”) | **95%** | Slug stays `star` for URLs unless redirects added |
|21 | **Submission tags** for navigation / cross-subjects | **100%** | Global tag index & search API |
|22 | Reviewers earn **points**; **gold/silver/bronze** for top contributors & checkers per field | **75%** | Authoritative per-hub leaderboards; season resets |
|23 | **Image → grid dimensions** (pixels = cells) for “your archive” | **60%** | Account linking, `archive.solar` directory, hosting |
|24 | **Single** global archive vs **nine** hubs (product pivot) | **25%** | Routing, config, and business rules — mostly **product + BE** |
|25 | **Cross-planet** “same subject, different lens” links | **65%** | Canonical topic IDs + search |
|26 | **Report** control on segments (L6–L8) | **100%** | Moderation queue API |
|27 | Page: **drop image → download / host** full archive pack | **45%** | ZIP/build pipeline, hosting, registry |

| | **Overall (mean of FE % for tasks 1–27)** | **≈ 86%** | *Line-item “remaining” columns above; backend phase completes persistence, auth, hosting, and federation.* |

**How to read the % column:** **100%** = behaviour or spec is implemented in the current React demo you can open in the browser. Lower % = depends on **your** incoming content (e.g. L2/L3 map), on **localStorage** limits, or on a deliberate **backend** deliverable. Anything marked “remaining in backend phase” is **not** a failure of the frontend — it is out of scope for a static deploy until APIs exist.

**Roll-up math:** (sum of §2.1 FE % values) ÷ 27 ≈ **86.1%**, rounded here to **≈ 86%**.

---

## 3. How to run and verify locally

**Requirements:** Node.js 18+ (recommended), npm.

```bash
git clone https://github.com/WrittenByAli/Solar-System.git
cd Solar-System
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). The app uses **hash routes** (`#/`, `#/map`, `#/archive/sun`, etc.).

**Production build:**

```bash
npm run build
npm run preview
```

Artifacts output to `dist/`. Vercel and similar hosts run `npm run build` and serve `dist`.

**Optional runtime configuration (static files):**

- [`public/layer-config.js`](https://github.com/WrittenByAli/Solar-System) — per-hub layer imagery hooks (`window.SOLAR_LAYER_CONFIG`).
- [`public/data-config.js`](https://github.com/WrittenByAli/Solar-System) — optional override for narrative corpus (`window.SOLAR_CONTENT_DATA`).
- **`window.SOLAR_STATIC_LAYER_MAP`** — optional L2/L3 subject lattice overlay (see [`src/utils/staticLayerMap.js`](../src/utils/staticLayerMap.js)); lets you drop in a JSON map without rebuilding.

---

## 4. Information architecture (routes)

| Route | Purpose |
|-------|---------|
| `#/` | Marketing home, feature overview, domain grid |
| `#/map` | Solar system map; navigate to hubs including Foundation |
| `#/archive/:planetId` | Main archive viewer (e.g. `sun`, `earth`, `star`) |
| `#/archive/beacon` | Redirects to `#/archive/star` (legacy name) |
| `#/submit` | Submit content, attachments, tags; deep links from grid |
| `#/review-queue` | Grade pending submissions (gated by demo points + login) |
| `#/leaderboard` | Demo leaderboard |
| `#/join` | Join / login (local profile) |
| `#/directory` | Archive directory concept |
| `#/create-archive` | Configure grid from image (demo) |
| `#/host-archive` | Host workflow copy (demo) |
| `#/reviews` | Testimonials page |

Navbar hides on archive fullscreen; a **Foundation** shortcut can appear as a small fixed star (`FoundationArchiveStar`) linking to `/archive/star` on non-archive pages.

---

## 5. Feature inventory (what to click in the deployed app)

Legend: **Done** = usable in demo; **Partial** = UI or rules exist but need server/content; **Planned** = specified, not fully built.

| Feature | Status | Where to try it | Key source files | Needs backend? |
|---------|--------|-----------------|------------------|----------------|
| Responsive navbar + theme | Done | All pages except fullscreen archive | `src/components/Navbar.jsx`, `src/index.css` | No |
| Star field (dark) | Done | Home, map, etc. | `src/components/StarField.jsx` | No |
| Clickable Foundation “star” | Done | Corner link to Foundation archive | `src/components/FoundationArchiveStar.jsx` | No |
| Eight archive layers L1–L8 | Done | Archive after “Enter” | `src/pages/ArchiveGrid.jsx`, `src/utils/archiveLayerSpecs.js` | Content scale |
| L2/L3 subject lattice (4×4 drill) | Done | L2 or L3 + panel bottom-left | `SubjectLatticeOverlay` in `ArchiveGrid.jsx` | Optional map JSON |
| L4 cell title + coords | Partial | L4 grid; titles from JSON | `L4Content` in `ArchiveGrid.jsx` | CMS |
| L5–L6 summaries / detail | Done | Deeper layers | Same | CMS |
| L7 narrative + cited facts + grid references | Done | L7 | `L7Content`, specs | CMS |
| L8 ~450 segments + 30 cited slots (bottom row) | Done | L8 | `L8Content`, specs | CMS |
| Segment difficulty + ordering | Done | L7/L8 tiles | `src/utils/segmentDifficulty.js` | Server consensus |
| Segment grid fill % (L7/L8 HUD) | Done | Top HUD band on L7/L8 | `computeSegmentGridFill` | No |
| D-pad / keys step **segments** on L7/L8 | Done | Bottom controls | `segmentNavStep`, `applySegmentNav` | No |
| Pan vs select/copy | Done | Hand / text cursor toggle | Archive HUD (right cluster) | No |
| Search coordinates | Done | Search bar (wide viewports) | `SearchBar` in `ArchiveGrid.jsx` | Server search later |
| Submit entry | Done | `/submit`, empty L4/L5 cells | `src/pages/SubmitArchive.jsx` | Yes (persist) |
| Attachments (image/sketch/graph URL) | Done | Submit form | Same + `submissionStorage` | File hosting |
| Tags | Done | Submit + filters | `normalizeSubmissionTags` | Indexing |
| 3 reviewers to approve | Done (local) | Approve only if 3 pass fact-check | `reviewWorkflow.js`, `submissionStorage.js` | Identity |
| Review queue + points gate | Done (local) | `/review-queue` after login + points | `AuthContext.jsx`, `GradeSubmissions.jsx` | All server |
| Report segment | Done | Report links L6–L8 | `SegmentReportLink` | Ticketing API |
| Alternate hub links (JSON) | Partial | L5 cards when data present | `researchData.json` | Graph service |
| Leaderboard + tokens | Done (local) | `/leaderboard` | `userProfileStorage.js`, `FieldHonorTokens.jsx` | Server |

---

## 6. Layer model (L1–L8) — technical summary

Aligned with [`src/utils/archiveLayerSpecs.js`](../src/utils/archiveLayerSpecs.js):

- **L1:** 1 px conceptual — archive “front” / intro.
- **L2:** 4 px — region overview; 4×4 lattice assists drilling.
- **L3:** 16 px — sector; same lattice pattern.
- **L4:** 64 px — zone; cells show **title** (from data) and coordinates.
- **L5:** 256 px — short summary layer.
- **L6:** 1024 px — detail.
- **L7:** 4096 px — **32** segment slots; first **30** are narrative tiles in an 8-column strip; last **two** are **cited facts** (compact) and **grid references** (cross-coordinate index). D-pad segment steps cover **1–32** (including **31–32**); HUD **fill %** still counts narrative occupancy **1–30** only.
- **L8:** 16384 px — **450** segments in a **30×15-style** band: **narrative** slots first (419), then **final** stitched slot (one cell), then **30** fact/source citation blocks on the **bottom row**.

**Progression (demo):** **Layer 8** narrative authoring is **gated** until **`L7_NARRATIVE_SEGMENT_COUNT` (30)** sentences exist at that hub coordinate in the **merged** cell (**JSON catalog ∪ approved `localStorage` submissions**). That is the operational definition of **“L7 full”** for unlocking L8. **Comprehension difficulty** is a single entry-level scale (easiest-first ordering); the implemented metaphor is **zoom / drill-down** (surface easier tiles on L7, continue the same sentence pool on L8)—**not** automatic segment migration between layers when difficulty changes (confirm with the client if literal cross-layer moves are ever required). Empty narrative tiles on L7/L8 show a **+ Add** control that deep-links to Submit.

Cell **pixel sizes** in the model follow powers-of-four: `1, 4, 16, 64, 256, 1024, 4096, 16384` “px” at that layer’s scale (logical units, not literal screen pixels).

---

## 7. Review, reputation, and security (demo behavior)

**Reviewer count:** [`REVIEWERS_REQUIRED = 3`](../src/constants/reviewWorkflow.js). A submission stays `pending` until three **distinct** reviewers record a grade. If all three pass fact-check, status becomes `approved`; if any fail after three reviews, `rejected` (simplified rule set for demo).

**Gate:** [`MIN_POINTS_REVIEWER_ACCESS`](../src/constants/reviewWorkflow.js) controls visibility of the review queue in the navbar. **New demo accounts** receive starter points in code so reviewers can test without grinding — **this must not ship unchanged in production.**

**Storage:** Profiles and submissions live under `localStorage` keys documented in [`docs/BACKEND_API_AND_DATA_MODEL.md`](./BACKEND_API_AND_DATA_MODEL.md).

**Security:** There is **no password, no OAuth, no HTTPS session**. Anyone who types a username can “log in” as that name locally. **Do not treat this as authentication.**

---

## 8. Privacy, secrets, and repository hygiene

- Environment secrets (API keys, DB URLs) are **out of scope** for the frontend-only build.
- The repo’s `.gitignore` excludes `.env*`, credentials patterns, and common local scratch files.
- Client PDFs and local exports should stay out of Git unless explicitly intended.

---

## 9. Known limitations and honest gaps

1. **No server** — data is local to the browser; collaboration is simulated.
2. **Content depth** — richness of L2/L3 taxonomy depends on `researchData.json` and optional static maps.
3. **File size** — attachments use data URLs in demo; large files are impractical without CDN.
4. **Moderation** — no admin console, no appeal workflow, no SLA.
5. **Search** — coordinate search exists; full-text / semantic search needs backend indexing.
6. **Federation** — `archive.solar` is described as a future directory layer, not implemented.
7. **Single global vs nine hubs** — product decision still affects routing and marketing copy.

---

## 10. Backend phase roadmap (recommended epics)

1. **Identity:** OAuth or email magic links; roles (visitor, contributor, reviewer, moderator, admin).
2. **Submissions API:** CRUD, rate limits, spam filtering, assignment to reviewers.
3. **Reviews API:** Immutable review records; consensus rules; appeals.
4. **Content service:** Canonical SEG grid, versioning, publication workflow, staging.
5. **Object storage:** Image/PDF uploads; virus scanning; signed URLs.
6. **Search:** Tags, hubs, coordinates, full text; cross-hub topic IDs.
7. **Directory / federation:** List third-party archives; verification badges.
8. **Observability:** Logging, metrics, backups, GDPR/CCPA flows as needed.
9. **Admin:** Reports queue, user bans, content takedowns.

Schema sketches aligned with today’s local shapes live in **[`BACKEND_API_AND_DATA_MODEL.md`](./BACKEND_API_AND_DATA_MODEL.md)** — keep that file alongside this PDF for engineering estimates.

---

## 11. How this document becomes a PDF

1. Open this file in any Markdown editor with PDF export (Typora, VS Code extensions).
2. Or install [Pandoc](https://pandoc.org/) and run:  
   `pandoc docs/CLIENT_FRONTEND_VS_BACKEND.md -o SOLAR_Archive_Client_Handoff.pdf`
3. Optionally add a cover page in Word/Google Docs after export.

---

## 12. Appendix A — Glossary

| Term | Meaning |
|------|---------|
| **Hub / planet** | A scientific lens (Sun, Earth, …) sharing the same SEG coordinate system. |
| **SEG grid** | Shared coordinate grid; same address can point to different corpus per hub. |
| **Layer** | Zoom depth L1–L8; cell size grows by powers of four. |
| **Segment** | Sub-area inside a cell on L7/L8 used for long-form decomposition. |
| **Lens** | Same theme viewed through another hub’s research tradition. |
| **Foundation archive** | Institutional knowledge route; slug `star` today with optional display name “Beacon.” |

---

## 13. Appendix B — Contact for technical follow-up

Technical implementation questions should reference **file paths** in this repository and the **deployed URL** (e.g. Vercel project linked to GitHub). For backend estimation, attach this document plus `BACKEND_API_AND_DATA_MODEL.md`.

---

---

## 14. End-to-end walkthrough (acceptance-style)

Use this as a checklist when demonstrating the frontend phase to stakeholders.

1. **Home (`#/`)** — Confirm hero, feature cards, and domain grid render; toggle light/dark from navbar; narrow the viewport and confirm the nav collapses to the drawer.
2. **Map (`#/map`)** — Click a hub; confirm navigation to `#/archive/{id}`; use search for `beacon` or `foundation` and confirm routing to the Foundation hub.
3. **Archive intro** — Enter from the splash screen; confirm grid dimensions label matches the configured instance.
4. **Layers L2–L3** — Open the subject lattice drawer; click a quadrant; confirm the view recenters and deepens to the next layer. If you inject `window.SOLAR_STATIC_LAYER_MAP`, confirm custom titles appear and clicks honor `centerGx` / `centerGy` when provided.
5. **L4** — Verify cells show a title when present in JSON, or a short-summary fallback when the title key is empty.
6. **L5–L6** — Pan with drag, zoom with wheel; use coordinate search where visible.
7. **L7–L8** — Confirm the top-left HUD shows `X/Y`, segment index, and fill percentage; D-pad labels read `ROW/COL` in segment mode; the center header bar omits raw pixel dimensions in favor of coords + segment + fill.
8. **Submit (`#/submit`)** — Log in via Join; choose hub, layer preview, and guidelines; attach a small image; submit and confirm toast or success state.
9. **Review queue (`#/review-queue`)** — With sufficient demo points, expand a pending row and file three distinct reviews from three browser profiles (or reset localStorage between sessions in separate incognito windows) to observe approve/reject.

---

## 15. Static layer map hook (L2/L3 extension)

For client-supplied navigation without a full rebuild, the app reads **`window.SOLAR_STATIC_LAYER_MAP`** at runtime. Shape (minimal example):

```json
{
  "version": 1,
  "planets": {
    "sun": {
      "2": {
        "tiles": [
          { "row": 1, "col": 1, "title": "Photovoltaics overview", "centerGx": 120, "centerGy": 96, "drillLayer": 4 }
        ]
      }
    }
  }
}
```

`centerGx` / `centerGy` are **absolute grid indices** consistent with `researchData` cell keys. Implementation: [`src/utils/staticLayerMap.js`](../src/utils/staticLayerMap.js).

Load via an extra script tag in `index.html` after your bundle or from the browser console during QA.

---

## 16. Deployment (Vercel + GitHub)

Typical flow: connect the GitHub repository, set **Build command** to `npm run build`, **Output directory** to `dist`, install command `npm install`. Environment variables are not required for the static demo; future API base URLs would be injected as `VITE_*` variables and consumed in a second phase.

---

## 17. Accessibility notes

Focus order is reasonable on marketing pages; the archive view is dense. Toolbar buttons include `aria-label` where icons are unlabeled. Select-mode vs pan-mode affects whether the viewport swallows pointer events — document this for reviewers who use dictation or screen readers; production should add a persistent textual hint in the HUD.

---

## 18. Performance notes

The production bundle exceeds 500 KB minified (Vite warning). Mitigations for a later iteration: route-based code splitting (`React.lazy`), moving seldom-used admin pages out of the main chunk, and serving compressed assets (Brotli) from the CDN edge.

---

## 19. Change log (documentation)

| Date | Note |
|------|------|
| 2026-05 | Initial combined client handoff + backend sketch for phase-two planning. |
| 2026-05 | Added §2.1 rollup row; document v1.1 — overall FE mean **≈ 86%**. |

---

*End of client handoff document.*
