🌌 The SOLAR Archive

An interactive, coordinate-based research archive. Entries are organized onto planet-themed hub grids across eight depth layers (L1 planetary overview → L8 narrative entry). Members can submit entries, which are approved through a three-reviewer consensus workflow with points and a live leaderboard.

Live demo: solar-system-sandy-ten.vercel.app

✨ Key Features
Coordinate-based archive structure — content is organized across 8 depth layers (L1 planetary overview → L8 narrative entry), navigated through planet-themed hub grids.
Member submission system — users can submit entries to the archive.
Three-reviewer consensus workflow — submissions are approved through peer review, with consensus and role promotion logic running as PostgreSQL triggers on the backend.
Points & live leaderboard — reviewer/contributor activity is tracked and ranked.
Full authentication flow — sign-up, sign-in, MFA, OAuth, and guest mode via Clerk.
Serverless data layer — Supabase (PostgreSQL + Storage) is called directly from the browser, with no dedicated app server.
Animated, themed UI — Framer Motion transitions, Tailwind styling, and a Three.js/Vanta backdrop on the home page.
End-to-end tested — Playwright suite covering the app with mocked auth and data.
🛠️ Tech Stack
React 18 + Vite 5 — Single-page application (HashRouter)
Clerk — Authentication (sign-up/sign-in, MFA, OAuth, guest mode)
Supabase — PostgreSQL + Storage backend, accessed directly from the browser
PostgreSQL Triggers — Review consensus and role promotion workflows
Framer Motion + Tailwind CSS + Three.js/Vanta — Interactive UI and visual effects
🚀 Getting Started
Prerequisites
Node.js and npm installed
A Clerk account and project
A Supabase project
Installation
bash
git clone <repository-url>
cd solar-archive
npm install
cp .env.example .env   # Add your Clerk + Supabase keys
npm run dev            # Start development server

The app will be available at http://localhost:5173.

📜 Available Scripts
Command	Purpose
npm run dev	Start the Vite dev server
npm run build	Production build → dist/
npm run preview	Serve the built dist/ locally
npm run lint	Run ESLint over src and e2e
npm run test:e2e	Run the Playwright suite (boots its own server on :5199 with mocked auth/data)
📚 Documentation
CLAUDE.md — detailed documentation of the routing table, theme system, layer model, and backend state.
HOSTING_GUIDE.md — explains what hosting the archive involves (cloud vs. home PC), hardware and cost implications, and the tradeoffs between cloud launch, hybrid, and full self-hosting.
🔭 Future Improvements

Add planned features or known limitations here — e.g. additional layer types, mobile optimizations, expanded reviewer tooling, etc.

🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page for this repository.
