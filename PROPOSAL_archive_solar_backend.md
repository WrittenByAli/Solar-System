# Backend Development Proposal
## Solar Archive — archive.solar

---

**Prepared for:** Solar Archive Owner (Jurhuisman)
**Prepared by:** Solar Archive Developer (Muhammad Ali)
**Date:** May 30, 2026
**Project Phase:** Phase 2 — Backend Development

---

## 1. Introduction

Thank you for trusting me with the Solar Archive project. The frontend of archive.solar has been successfully completed and delivered. This proposal outlines the full scope, timeline, investment, and delivery plan for the backend development phase — the final step to making archive.solar a fully live, production-ready platform for students worldwide.

---

## 2. Project Overview

**Platform:** Solar Archive — an educational research archive platform
**Domain:** archive.solar
**Current Status:** Frontend complete, UI/UX delivered
**Goal of this phase:** Build the complete backend so real students can sign up, submit archive entries, get reviewed, and appear on the leaderboard

### What the backend enables:
- Real student accounts (sign up, login, profiles)
- Live archive submissions (all 8 layer types: L1–L8)
- Review and grading workflow for submitted entries
- Real-time leaderboard rankings based on actual scores
- Archive directory powered by a real database
- Full security, monitoring, and deployment pipeline

---

## 3. Technology Stack

### 3.1 Database — PostgreSQL (via Supabase)
**What it is:** PostgreSQL is the world's most advanced open-source relational database. Used by Apple, Instagram, Spotify, and thousands of universities.

**How we use it:**
- Every student account, submission, review, score, and archive entry is stored here
- Tables are connected with relationships (a submission belongs to a user, a review belongs to a submission)
- Flexible JSON columns store the unique content fields for each archive layer type (L4–L8)
- Indexed for fast search and filtering across millions of entries

**Why not others:**
- MongoDB (document DB) — no relationships, bad for leaderboards and reviews
- MySQL — weaker JSON support, less powerful
- Firebase — not a real database, limited querying

---

### 3.2 Authentication — Supabase Auth
**What it is:** A complete authentication system built into Supabase. Handles everything related to user identity and sessions.

**How we use it:**
- Students sign up with email and password
- Confirmation email is sent automatically to verify the address
- Secure login generates a JWT token (a digital key the student's browser stores)
- Every API request carries this token — the server knows exactly who is making the request
- Password reset emails sent directly to archive.solar links
- Role system: Student / Reviewer / Admin — each role sees different data

**Why not build it ourselves:** Authentication security is extremely complex. Building it from scratch introduces risk of data breaches. Supabase Auth is battle-tested by millions of users.

---

### 3.3 Backend API — Supabase Auto-API + Edge Functions
**What it is:** Supabase automatically generates a REST API from your database tables. Edge Functions are small TypeScript functions that run custom business logic.

**How we use it:**
- The React frontend calls the API to fetch submissions, leaderboard data, and archive entries
- Edge Functions handle complex operations: calculating scores, sending notifications, processing review approvals
- All communication happens over HTTPS — fully encrypted
- The Supabase JavaScript SDK (installed in the React app) makes these calls simple and secure

**Example flow — student submits an archive entry:**
```
Student fills form → React sends data to Supabase API →
API validates and saves to PostgreSQL → Edge Function triggers →
Reviewer gets notified → Entry appears in review queue
```

---

### 3.4 File Storage — Supabase Storage
**What it is:** A secure file hosting system built into Supabase, similar to Amazon S3.

**How we use it:**
- Student profile avatars are uploaded and stored here
- Any media files attached to archive entries
- Files are served via a fast CDN URL
- Access rules ensure students can only access their own files

---

### 3.5 Frontend Hosting — Vercel
**What it is:** The world's leading platform for hosting React applications. Used by the world's largest companies.

**How we use it:**
- The React frontend (already built) is deployed here
- Connected to the GitHub repository — every code update auto-deploys in under 60 seconds
- archive.solar domain is pointed here via DNS
- Serves the site from 100+ global locations — fast for students in Netherlands, Asia, or anywhere

**Performance:** Vercel's global edge network means archive.solar loads in under 1 second for students anywhere in the world.

---

### 3.6 Security — Row Level Security (RLS) + Cloudflare
**What it is:** Two layers of security working together.

**Row Level Security (RLS) — Database Layer:**
- Rules written directly in the database that control who can see what data
- Example rule: "A student can only read and edit their own submissions"
- Even if someone bypasses the API, the database refuses to show them other users' data
- This is military-grade access control used by banks and healthcare systems

**Cloudflare — Network Layer:**
- Sits in front of archive.solar and filters all incoming traffic
- Blocks DDoS attacks (attempts to flood the site with fake traffic)
- Hides the real server IP address — hackers cannot target the server directly
- Free SSL certificate — all traffic is encrypted (HTTPS)
- Caches static files globally for faster load times

---

### 3.7 CI/CD Pipeline — GitHub Actions
**What it is:** An automation system built into GitHub that runs tasks automatically when code changes.

**How we use it:**
- Developer pushes code update to GitHub
- GitHub Actions automatically runs tests
- If tests pass, it deploys the update to archive.solar within 60 seconds
- If tests fail, deployment is blocked — broken code never reaches students
- Zero manual deployment steps — the pipeline handles everything

**Result:** Updates and bug fixes go live safely and instantly without touching the server manually.

---

### 3.8 Monitoring — Sentry + Vercel Analytics
**What it is:** Two tools that watch the live platform 24/7 and report problems.

**Sentry — Error Tracking:**
- If any student encounters an error (page crash, failed submission, etc.), Sentry captures it instantly
- Developer receives an alert with the exact error, which line of code caused it, and what the student was doing
- Errors are fixed before most students even notice them
- Free tier covers up to 5,000 errors per month

**Vercel Analytics — Usage Tracking:**
- How many students visit each day and week
- Which pages are most popular
- Where students drop off (useful for improving the experience)
- Page load times across different countries
- No personal data collected — fully privacy compliant (important for Netherlands/GDPR)

---

### 3.9 CDN — Cloudflare
**What it is:** Content Delivery Network — a global network of servers that store copies of archive.solar's files close to every student.

**How we use it:**
- Static files (images, fonts, CSS, JavaScript) are cached in 300+ locations worldwide
- A student in Netherlands loads files from a nearby Amsterdam server, not from a distant US server
- Reduces load on the main server by 70–80%
- Automatic compression — files are smaller, pages load faster

---

### 3.10 Backups — Supabase Pro (Automatic Daily Backups)
**What it is:** Automatic snapshots of the entire database taken every day.

**How we use it:**
- Every day at midnight, a full backup of all data is saved automatically
- Backups are retained for 7 days (Pro plan)
- If anything goes wrong (accidental deletion, data corruption), the database can be restored to any point within the last 7 days
- No manual work required — fully automatic

**Why this matters:** Student submissions, scores, and accounts represent months of real work. Backups ensure this data is never permanently lost.

---

### Summary Table

| Layer | Technology | Monthly Cost |
|---|---|---|
| Database | PostgreSQL via Supabase | Included in $25/mo |
| Authentication | Supabase Auth | Included in $25/mo |
| Backend API | Supabase Auto-API + Edge Functions | Included in $25/mo |
| File Storage | Supabase Storage (1GB) | Included in $25/mo |
| Frontend Hosting | Vercel | $0 (free tier) |
| Security (DB level) | Row Level Security | Included in $25/mo |
| Security (Network) | Cloudflare | $0 (free tier) |
| CI/CD Pipeline | GitHub Actions | $0 (free tier) |
| Error Monitoring | Sentry | $0 (free tier) |
| Analytics | Vercel Analytics | $0 (free tier) |
| CDN | Cloudflare | $0 (free tier) |
| Backups | Supabase Pro (daily) | Included in $25/mo |
| **Total** | | **$25/month** |

**Why this stack:**
- No expensive servers to manage — Supabase is managed infrastructure
- Scales automatically from 100 to 100,000 students with no code changes
- Your data stays in a standard PostgreSQL database — you own it completely
- Every component has a free tier — cost stays at $25/month for the first 5,000 students
- GDPR compliant — important for Netherlands-based platform and European student data

---

## 4. Full Scope of Work

### 4.1 Database Architecture
- Design and implement all database tables (users, submissions, reviews, scores, hubs, archive entries)
- Define relationships, indexes, and constraints for fast queries
- Flexible JSON storage for all 8 archive layer types (L4–L8 content fields)
- Data migration of existing static content into the live database

### 4.2 Authentication System
- Student registration with email and password
- Email verification (confirmation link sent on signup)
- Secure login and logout
- Password reset via email
- Role-based access control: Student / Reviewer / Admin
- JWT session management (auto-expiry and refresh)

### 4.3 Submissions System
- Submit archive entries across all layer types (L4, L5, L6, L7, L8)
- Draft saving (students can save and return later)
- Edit and delete own submissions
- Submission status tracking: Pending → Under Review → Approved / Rejected
- Planet and hub assignment for each submission

### 4.4 Reviews & Grading System
- Grading queue for reviewers
- Score and detailed feedback submission
- Approve or reject workflow
- Automatic notification to student when their entry is reviewed
- Review history and audit trail

### 4.5 Leaderboard
- Live rankings generated from real submission scores
- Filter by field, hub, and planet
- Cached for high performance under heavy student traffic
- Automatic update when new scores are submitted

### 4.6 Archive Directory
- Full archive directory powered by live database data
- Search and filter by topic, layer, hub, and planet
- Hub taxonomy fully connected to database
- Replaces all current static/demo data with real content

### 4.7 Security Implementation
- Row Level Security (RLS) — students can only read/write their own data
- Rate limiting on submissions to prevent spam
- Full input validation and sanitization on all API endpoints
- Protection against SQL injection, XSS, and CSRF attacks
- Secure environment variable management (no secrets in code)

### 4.8 Domain & Hosting Setup
- Connect archive.solar to Vercel (DNS configuration)
- SSL/HTTPS certificate — automatic, renews forever
- www.archive.solar redirect to archive.solar
- Configure Supabase auth to use archive.solar for all email links
  (email verification, password reset links point to archive.solar)

### 4.9 CI/CD Pipeline
- GitHub Actions workflow — automatic deployment on every push
- Staging environment for safe testing before going live
- Production environment at archive.solar

### 4.10 Monitoring & Analytics
- Sentry error tracking — instant alerts when errors occur
- Uptime monitoring — immediate notification if site goes down
- Vercel Analytics — track student visits, page performance, traffic trends
- Supabase dashboard — view all data, manage users, track submissions

---

## 5. Implementation Timeline — 7 Weeks

| Week | Work Delivered |
|---|---|
| **Week 1** | Database schema design + Supabase project setup + environment configuration |
| **Week 2** | Complete authentication system (signup, login, reset, email verification, roles) |
| **Week 3** | Submissions API — all L4–L8 layer types, draft saving, status tracking |
| **Week 4** | Reviews & grading system — full workflow, notifications, audit trail |
| **Week 5** | Leaderboard (real data) + Archive directory (real data) + search/filter |
| **Week 6** | Security policies (RLS) + rate limiting + full testing on staging |
| **Week 7** | DevOps, CI/CD pipeline, domain setup (archive.solar), production deployment |

**Start date:** Upon the acceptance of order
**Estimated completion:** 7 weeks from start date

---

## 6. Investment

### Development Fee (One-Time)

```
Backend Development (Phase 2):    $2500 - $3000 (Note: You will get the final deployed product, No extra payement for deployment.)
```

This is a fixed price — no hidden costs, no hourly surprises (Still we will negotiate based on your budget).
All scope items listed in Section 4 are fully included.

### What is NOT included (available as separate quotes):
- AI-powered features (smart search, recommendations, auto-tagging)
- Mobile application (iOS / Android)
- Additional feature requests beyond the scope above
- Third-party service fees (hosting, email provider, etc.)

---

## 7. Payment

**Platform:** All payments are processed securely through **Fiverr**.

| Step | What Happens |
|---|---|
| **Client places order** | Full project amount ($2,500) is paid upfront on Fiverr |
| **Fiverr holds funds** | Payment is held in escrow — safe for both parties |
| **Development begins** | Work starts immediately after order is confirmed |
| **Delivery submitted** | Completed work is delivered through Fiverr |
| **Client reviews & approves** | Client accepts the delivery on Fiverr |
| **Funds released** | Payment is released to the developer |

> **Note:** Fiverr protects both the client and the developer. The client's money is held securely and only released after they are satisfied with the delivery. If any revision is needed, it is handled before funds are released.

---

## 8. Delivery & Handover

Upon final delivery, the client receives:

### Access & Credentials
- ✅ Live production site at **https://archive.solar**
- ✅ GitHub repository — full source code (client ownership)
- ✅ Supabase dashboard access — view and manage all data
- ✅ Vercel dashboard access — manage deployments and analytics
- ✅ All environment variables and API keys documented securely

### Handover Session
- Video call walkthrough of the complete system
- Live demonstration of all features (submissions, reviews, leaderboard)
- Guide on how to: manage users, approve entries, reset passwords, view analytics
- Q&A session

### Documentation Provided
- How to add new archive hubs and planets
- How to manage student submissions from the dashboard
- How to promote a user to Reviewer or Admin role
- Monthly maintenance checklist

---

## 9. Monthly Running Costs (After Delivery)

The client is responsible for these infrastructure costs directly:

| Service | Provider | Monthly Cost |
|---|---|---|
| Database + Auth + API + Storage | Supabase Pro | $25/mo |
| Frontend Hosting | Vercel | $0 (free tier) |
| CDN + DDoS Protection | Cloudflare | $0 (free tier) |
| Error Monitoring | Sentry | $0 (free tier) |
| **Total** | | **~$25/month** |

This covers up to approximately 10,000 active students per month. In future, 

---

## 10. Post-Delivery Support

### Included (Free — 30 Days)
- Bug fixes for any issues discovered after launch
- Minor configuration adjustments
- Email support with 24-hour response time


## 11. Future Phases (Optional — Quoted Separately)

| Phase | Description | Estimated Investment |
|---|---|---|
| **Phase 3 — AI Features** | Smart search, entry recommendations, auto-tagging by topic | $500 – $800 |
| **Phase 4 — Mobile App** | React Native app for students on iOS and Android | $3,000 – $5,000 |
| **Phase 5 — Admin Panel** | Advanced dashboard for managing the full archive | $500 – $800 |

---

## 12. Terms & Conditions

1. **Fixed Scope:** This proposal covers exactly the features listed in Section 4. Additional features will be quoted separately.
2. **Payment:** All payments are processed through Fiverr. Full payment is collected upfront and held in escrow. Funds are released upon client approval of the final delivery.
3. **Revisions:** Unlimited until client get the desired product.
4. **Delays:** If the client delays feedback by more than 5 business days, the timeline extends accordingly.
5. **Ownership:** Upon final payment, the client owns 100% of the source code and all associated accounts.
6. **Confidentiality:** All project details, code, and client information are kept strictly confidential.


---

## 13. Next Steps

To proceed:

1. **Review** this proposal and confirm acceptance
2. **Place the order on Fiverr** — full payment of $2,500 is held securely by Fiverr
3. **Development begins** within 24 hours of order confirmation
4. **Weekly progress updates** shared every Friday via Fiverr messages
5. **Delivery submitted** through Fiverr after 7 weeks
6. **Approve delivery** on Fiverr to release funds

---

## Summary

| | |
|---|---|
| **Project** | Solar Archive — archive.solar |
| **Phase** | Backend Development (Phase 2) |
| **Investment** | $2,500 (fixed price) |
| **Timeline** | 7 weeks |
| **Monthly cost to client** | ~$25/month |
| **Post-delivery support** | 30 days free, then $200/mo optional |

---

*This proposal is valid for 14 days from the date above.*

*For questions or to proceed, please reply to this document.*

---

**Prepared by:** Solar Archive Developer (Muhammad Ali)
**Contact:** programmerbusiness2@gmail.com
**Date:** May 30, 2026
