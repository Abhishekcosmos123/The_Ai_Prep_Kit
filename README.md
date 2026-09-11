# The AI Prep Kit

AI-powered interview preparation platform.

Paste a job description, provide a company website URL, and set how many days you have before the interview. The system researches the company, extracts requirements, generates questions and flashcards, **checks coverage in application code**, and builds a **deterministic study schedule**.

> Project name: **The_Ai_Prep_Kit** (not PrepForge).

---

## Overview

The AI Prep Kit is intentionally **not** a single LLM call.

| Responsibility | Owner |
|---|---|
| Understanding JD / summarizing company / writing questions & flashcards | LLM |
| Validation, orchestration, coverage, scheduling, retries, auth, persistence | Application code |

That separation is the core architectural requirement of this project.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind 4 | Already scaffolded in `client/`; App Router fits auth + dashboard + builder routes |
| Backend | Express + TypeScript | Already scaffolded in `server/`; upgraded from Jade boilerplate to a typed API |
| Database | MongoDB + Mongoose | Flexible document storage for evolving kit JSON + generation metadata |
| LLM | OpenAI-compatible API (`openai` SDK) | Works with OpenAI, Groq, Together, etc. via `LLM_BASE_URL` |
| Tests | Vitest | Fast unit tests for deterministic engines |

---

## Setup

### Prerequisites

- Node.js 20+
- MongoDB running locally (default URI below)

### Install

```bash
cd server && npm install
cd ../client && npm install
```

### Environment

Copy examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Server variables (see `server/.env.example`):

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/the_ai_prep_kit
JWT_SECRET=change-me-to-a-long-random-string
CLIENT_ORIGIN=http://localhost:3000
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_PROVIDER=mock   # use "openai" (or omit mock) when LLM_API_KEY is set
MAX_COVERAGE_PASSES=3
ALLOW_LOCAL_URLS=false  # evaluate CLI forces true; needed for http://localhost:8099 fixtures
LOG_LEVEL=info          # set debug for LLM JSON previews + step detail
```

Client:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Never put `LLM_API_KEY` in the Next.js client.**

### Run

Terminal 1 — API:

```bash
cd server
npm run dev
```

Terminal 2 — web:

```bash
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## LLM provider

- **Interface:** `LLMProvider.generateStructured<T>(schema, options)`
- **Production implementation:** OpenAI-compatible chat completions with JSON object responses
- **Default model:** `gpt-4o-mini` (configurable)
- **Local/tests without a key:** `MockLLMProvider` when `LLM_PROVIDER=mock` or `LLM_API_KEY` is empty

### Free-tier limitations

Free / low-tier LLM APIs often enforce strict RPM/TPM limits. The server uses:

- minimum interval throttling (`LLM_MIN_INTERVAL_MS`)
- exponential backoff retries (`LLM_MAX_RETRIES`)
- schema validation + JSON repair/retry on invalid model output

Generation can take minutes for multi-step kits. The UI polls progress so it does not look frozen.

---

## Architecture

```text
client/   Next.js UI (auth, dashboard, builder, practice)
server/
  src/
    routes/ controllers/ middleware/
    models/          User, Kit
    services/
      auth/
      research/      crawl + link ranking + interview search
      generation/    LLM provider + content generators
      pipeline/      multi-step orchestrator
      kits/          persistence + regenerate + practice
    engine/
      coverage/      deterministic coverageChecker
      scheduling/    deterministic scheduleAllocator
      validation/    kitValidator
    cli/evaluate.ts  batch evaluator
```

### Pipeline sequence

1. Validate input (JD, URL, days)
2. Extract requirements from JD (LLM)
3. Research company website (fetch homepage → extract links → rank → crawl)
4. Search public interview discussion (best-effort, non-fatal)
5. Generate company brief (LLM; untrusted page text wrapped as data)
6. Generate questions **per category in separate LLM calls** (technical / behavioural / system-design / company-fit), using hiring + interview research as context
7. **Coverage check (deterministic code)**
8. Gap generation for uncovered requirements (LLM, still category-aware)
9. Coverage check again (up to `MAX_COVERAGE_PASSES`)
10. Generate flashcards (LLM)
11. **Allocate schedule (deterministic code)**
12. Validate kit
13. Persist to MongoDB

```text
LLM = content generation/extraction
Application = validation / coverage / scheduling / orchestration / category routing
```

Hiring-process research is not cosmetic: if a company publishes a take-home or system-design round, that text is passed into the relevant question-generation calls so the kit changes.
---

## Coverage algorithm

Pure function in `server/src/engine/coverage/coverageChecker.ts`:

1. Collect all `requirement_ids` referenced by questions
2. For each requirement, if its ID appears → covered, else → uncovered
3. Return uncovered IDs

The LLM is **never** asked “are all requirements covered?”

### Pass limit

`MAX_COVERAGE_PASSES` (default 3) stops infinite gap-filling loops, controls cost/latency, and forces an honest incomplete/failed outcome if must-have requirements remain uncovered.

---

## Schedule algorithm

Pure function in `server/src/engine/scheduling/scheduleAllocator.ts`:

1. Score questions from linked requirement priorities (`must` ≫ `nice`)
2. Sort by priority DESC, difficulty DESC, id ASC
3. If there are enough questions for the window → round-robin across all days
4. If questions < days → front-load unique questions, then fill remaining days with **spaced review** (reuse higher-priority question ids)
5. Minutes = base + difficulty bonus (computed in code)

Question volume is also scaled in code before the LLM call:

- `targetQuestionCount` ≈ `max(must*2 + nice, days, requirement_count)` capped at 36
- So a 14-day plan aims for ~14 questions, not one-per-requirement only

---

## State management & regeneration

Questions/flashcards may include:

- `state: "generated" | "edited" | "user"`
- `pinned: boolean`

**Regeneration rules:**

- Company brief regenerate → replaces brief/sources only
- Questions regenerate → keeps `edited`, `user`, and `pinned` questions
- Single-category regenerate → replaces only that category’s generated questions; other categories and pinned/edited/user questions survive
- Schedule regenerate → recomputes days from current questions only

Practice history is stored separately on the Kit document and is not wiped by content regeneration.

Duplicate submissions of the same JD + company URL return `409 DUPLICATE_KIT` with the existing kit id. The UI offers “Open existing” or “Create another anyway” (`force=true`).
---

## Research / retrieval

- Homepage fetch (no hard-coded `/about` or `/careers` paths)
- Link extraction + same-host normalization
- Signal-based ranking (`about`, `careers`, `interview`, `engineering`, …)
- Follow top-ranked pages up to `MAX_CRAWL_PAGES`
- Respect `robots.txt`, timeouts, size/content-type limits
- Reject localhost / loopback / private IPs in **production** unless `ALLOW_LOCAL_URLS=true`
- The **evaluate CLI forces local URLs on** so fixtures like `http://localhost:8099/acme/` work (assessment FAQ)
- Dev/test `NODE_ENV` also allows local URLs for convenience
- Treat fetched text as **untrusted data** (prompt-injection safe wrapping)
- Public interview search via DuckDuckGo HTML (optional, non-authoritative)
- Page failures continue; missing hiring pages do not fail the kit by default

Requirement `kind` values follow Appendix A spelling: `technical | behavioural | domain` (plus `experience | other`). American `behavioral` from the LLM is normalized to `behavioural`.

---

## Authentication

- Register / login / logout
- Passwords hashed with bcrypt
- HTTP-only JWT cookie (`tapk_session`)
- Kit routes require auth and enforce `createdBy === currentUser`

---

## API

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/kits
POST   /api/kits
POST   /api/kits/batch
GET    /api/kits/:id
PATCH  /api/kits/:id
DELETE /api/kits/:id
POST   /api/kits/:id/regenerate/company-brief
POST   /api/kits/:id/regenerate/questions
POST   /api/kits/:id/regenerate/schedule
GET    /api/kits/:id/practice
POST   /api/kits/:id/practice

GET    /api/generation/:id/status
GET    /api/health
```

Multi-role prep: use **Create kit → Batch upload** (JSON or CSV with `jd,company_url,days`), or paste again for a single role.

---

## Batch evaluator

Uses the **same** `KitGenerationPipeline` as the web app:

```bash
cd server
npm run evaluate -- --input fixtures/cases.json --output fixtures/kits.json --mock
```

Omit `--mock` when `LLM_API_KEY` is configured for real generation.

- Continues after individual case failures
- Writes one entry per input id (Appendix B shape)
- **Any case that produces a kit is `status: "ok"`** (including partial research / incomplete coverage). Reserve `failed` for `kit: null` only — matching the assessment FAQ
- Enables local company URLs automatically for fixtures like `http://localhost:8099/acme/`
- Target: ~5 cases within 15 minutes including retries

---

## Tests

```bash
cd server
npm test
npm run typecheck
```

Coverage includes:

- all / one / multiple uncovered requirements
- invalid requirement IDs on questions
- 1 / 5 / 60 day schedules
- empty questions, priority/difficulty ordering, integer minutes
- valid kits, duplicate IDs, bad references, uncovered must-haves

---

## Practice ordering

Confidence scores: `1 = weak`, `2 = okay`, `3 = confident`.

Next session sorts flashcards by ascending confidence; cards never practiced are treated as `0` (highest priority). Ties break by flashcard id.

Practice mode also shows **covered vs not covered** (rated at least once vs never rated) before a session starts.
---

## Deployment (Railway)

1. Create a Railway service from this GitHub repo.
2. Set **Root Directory** to `server` (Service → Settings → Root Directory).
3. Set variables (at minimum):

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER/the_ai_prep_kit
JWT_SECRET=long-random-string
CLIENT_ORIGIN=https://YOUR-FRONTEND.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
LLM_API_KEY=
LLM_PROVIDER=mock
ALLOW_LOCAL_URLS=false
```

4. Deploy. Confirm:

```bash
curl https://YOUR-SERVICE.up.railway.app/api/health
# {"ok":true,"service":"the-ai-prep-kit","version":"1.0"}
```

Production start uses `npm run build` → `node dist/index.js` (not `tsx`). If health returns 502, open Railway **Deploy Logs** — the usual causes are wrong Root Directory, missing `MONGODB_URI`, or the process crashing before listen.

On the frontend host (e.g. Vercel):

```env
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app
```

---

## Scripts

**Server**

```bash
npm run dev
npm start
npm test
npm run evaluate -- --input fixtures/cases.json --output out.json
```

**Client**

```bash
npm run dev
npm run build
npm run lint
```
