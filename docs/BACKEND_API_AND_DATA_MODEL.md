# Backend API and data model (draft for phase 2)

This document derives a **target** API and persistence shape from the **frontend prototype** so backend engineers can estimate work without reverse‑engineering every file.

**Source of truth today:** browser `localStorage` keys and JSON shapes described below. Production should **not** expose raw localStorage; it is a stand‑in for `POST /v1/...` endpoints.

---

## 1. Storage keys used in the demo

| Key pattern | Purpose |
|-------------|---------|
| `submittedArchiveEntries` | JSON array of submission rows |
| `solarArchiveUserProfile:{username}` | Per-user profile (points, counts) |
| `solarArchiveSession` | `{ username }` pseudo-session |
| Segment report helper keys | See `src/utils/segmentReports.js` |

Replace with database tables and JWT/session cookies in production.

---

## 2. Submission entity (canonical)

Aligned with `appendPendingSubmission` / `migrateSubmission` in `src/utils/submissionStorage.js`.

### 2.1 Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Server-generated |
| `status` | `pending` \| `approved` \| `rejected` | |
| `authorUsername` | string | FK to user in production |
| `createdAt` | ISO 8601 | |
| `planet` | string | Hub id (`sun`, `earth`, `star`, …) |
| `coordX`, `coordY` | string (zero-padded) or int | Display coordinates |
| `subject` | string | Title |
| `summary` | string | Short abstract |
| `detail` | string | Long body |
| `difficulty` | 1–5 | Author suggestion |
| `tags` | string[] | Normalized slugs |
| `archiveLayer` | number optional | 5–8 when segment-specific |
| `nextSegmentSlot` | number optional | L7/L8 narrative slot hint |
| `attachments` | Attachment[] | See below |
| `reviews` | Review[] | See § |
| `consensusDifficulty` | number optional | Set on approval |

### 2.2 Attachment object

As used in submit / archive rendering:

```json
{
  "id": "uuid",
  "kind": "image|sketch|graph|other",
  "label": "file-or-url-label",
  "url": "https://... or data: URL in prototype only",
  "mime": "image/png",
  "download": false
}
```

**Backend:** store `storageKey` + `cdnUrl` instead of inline data URLs; max size enforced server-side.

### 2.3 Review object

From `addReviewToSubmission` in `submissionStorage.js`:

```json
{
  "reviewerUsername": "string",
  "factCheckPass": true,
  "difficulty": 3,
  "notes": "string <= REVIEW_RECOMMENDATION_MAX_CHARS",
  "at": "ISO-8601"
}
```

**Consensus (current demo):** when `reviews.length >= REVIEWERS_REQUIRED` (3), if every `factCheckPass` is true → `approved`; else → `rejected`. Production may want majority rules, abstains, or moderator override.

---

## 3. User profile entity

From `src/utils/userProfileStorage.js`:

| Field | Type |
|-------|------|
| `username` | string (unique) |
| `email` | string |
| `points` | integer ≥ 0 |
| `reviewsCompleted` | integer |
| `contributionsByPlanet` | Record&lt;planetId, number&gt; |
| `reviewsByPlanet` | Record&lt;planetId, number&gt; |

**Backend:** split into `users`, `reputation_events`, and materialized leaderboards per hub.

---

## 4. Suggested REST API (v1)

All endpoints require auth except public read of **published** archive slices.

### 4.1 Auth

- `POST /v1/auth/register` — email + password or OAuth code exchange  
- `POST /v1/auth/login` — returns access + refresh token  
- `POST /v1/auth/logout`  
- `GET /v1/me` — profile + roles  

### 4.2 Submissions

- `POST /v1/submissions` — create pending submission; body matches §2  
- `GET /v1/submissions/:id`  
- `GET /v1/submissions?status=pending&planet=sun` — reviewer queue (authorized)  
- `POST /v1/submissions/:id/reviews` — append one review (idempotent per reviewer)  

### 4.3 Published archive

- `GET /v1/hubs/{hubId}/cells/{x}/{y}` — merged canonical content for coordinate  
- `GET /v1/hubs/{hubId}/layers/{n}/bundle` — optional bulk export  

### 4.4 Reports

- `POST /v1/reports/segments` — formalize `SegmentReportLink` payloads  

### 4.5 Directory (federation)

- `GET /v1/directory/archives` — public listings  
- `POST /v1/directory/archives` — claim / register hosted instance  

---

## 5. Events for analytics (optional)

- `submission_created`, `review_submitted`, `submission_approved`  
- Emit to queue (Kafka, Pub/Sub) for badges and anti-abuse scoring.

---

## 6. Migration note

To preserve demo content during early backend bring‑up, accept one‑time **import** from exported JSON of `submittedArchiveEntries` with server‑assigned user ids.

---

*Prepared as a working draft for engineering estimation — not a final OpenAPI spec.*
