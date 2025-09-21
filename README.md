# AI Phone Screening Assistant — README

A judge-ready demo that runs a consistent, JD-aware screening, captures baseline answers (salary, notice, reason for leaving, motivation, career expectations), extracts **SPARC** evidence, and produces a clear **fit score** and report.

This guide is for both non-technical and technical users. Follow the “Non-tech quick start” if you just want to run it locally; use the detailed sections for configuration and deployment.

---

## ✨ What you get

- **Create Screening** → upload JD/CV (seeded for the demo)
- **Live Screening Chat** (text + optional mic/voice) with **RAG** over JD/CV/Q-bank
- **Auto Finish** → **Report** with SPARC table, baseline answers, risk flags, and **Advance / Hold / Reject** badge
- **Config Panel** → live knobs for fit weights & thresholds
- **Admin Reset** → one-click reseed for fresh demos
- **Zero-cost friendly**: Works in **stub mode** without AI keys; upgrades to Groq/OpenRouter if keys are provided

---

## 🧭 Non-tech quick start (local)

1. Install:

- Node 18+ and **pnpm**
- (Optional) A Turso account for the DB (free tier)

2. Clone & install:

```bash
pnpm install
```

3. Create `.env.local` (copy/paste and fill if you have values; otherwise keep blanks for stub mode):

```bash
DATABASE_URL="libsql://<your-db>.turso.io"
DATABASE_AUTH_TOKEN="<turso-auth-token>"

LLM_PROVIDER=groq                  # or openrouter
GROQ_API_KEY=                      # optional (stub mode if empty)
OPENROUTER_API_KEY=                # optional
GROQ_MODEL=llama-3.3-70b-versatile
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct

DEMO_ADMIN_TOKEN="change-me-super-secret"
```

4. Initialize the database:

```bash
pnpm db:migrate   # creates FTS + config tables
pnpm db:seed      # seeds JD, candidate CV, and question bank
```

5. Run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

> No AI keys? No problem — the chat streams from a **stub** and the final extraction uses a **rule-based fallback**. Add keys later for full LLM behavior.

---

## 🧱 Tech stack

- **Next.js (App Router, TS)** — UI + APIs
- **Turso / libSQL (SQLite)** + **Drizzle ORM**
- **SQLite FTS5** for lightweight RAG (no embeddings needed)
- Optional AI: **Groq** (Llama 3.x) or **OpenRouter** (OpenAI-compatible)
- Optional voice: Browser **STT/TTS** (Chrome recommended)
- Hosting: **Vercel**

---

## 📁 Project structure (high level)

```
src/
  app/
    (marketing)/            # optional landing
    page.tsx                # simple launcher
    dashboard/page.tsx      # list of screenings
    config/page.tsx         # fit weights / thresholds
    screening/[id]/page.tsx # chat UI
    report/[id]/page.tsx    # final report
    api/
      screenings/route.ts
      screenings/[id]/start/route.ts
      screenings/[id]/turn/route.ts
      screenings/[id]/chat/route.ts
      screenings/[id]/finish/route.ts
      screenings/[id]/route.ts
      config/route.ts
      admin/reset/route.ts
  db/
    client.ts
    schema.ts
    seed.ts
    migrate.ts
    migrations/
      001_fts.sql
      002_config.sql
  lib/
    ai.ts                 # extraction (LLM or stub)
    ai_stub_extraction.ts # no-key fallback
    fit.ts                # scoring functions
    llm.ts                # OpenAI-compatible streaming helper
    rag.ts                # FTS retrieval
    useSpeech.ts          # STT/TTS hooks
```

---

## ⚙️ Environment variables

| Var                   | Description                                 |
| --------------------- | ------------------------------------------- |
| `DATABASE_URL`        | Turso libSQL URL `libsql://<name>.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso auth token                            |
| `LLM_PROVIDER`        | `groq` or `openrouter`                      |
| `GROQ_API_KEY`        | Groq API key (optional)                     |
| `OPENROUTER_API_KEY`  | OpenRouter key (optional)                   |
| `GROQ_MODEL`          | default `llama-3.3-70b-versatile`           |
| `OPENROUTER_MODEL`    | default `meta-llama/llama-3.1-70b-instruct` |
| `DEMO_ADMIN_TOKEN`    | bearer token to protect admin operations    |

> **Stub mode:** If no AI keys are provided, the assistant still streams a canned prompt and the finish step uses deterministic extraction. Great for offline demos.

---

## 🗃️ Database setup

1. Create a Turso DB (web UI or CLI), get `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
2. Run migrations & seed:

```bash
pnpm db:generate  # generates db schema
pnpm db:migrate   # runs extra db migrations
pnpm db:seed      # seeds db with mock data
```

**Drizzle:** We use Drizzle for the main tables; FTS is created via raw SQL migration.

---

## ▶️ Running locally (tech)

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

**Local flow:**

1. Home → paste **jobId** and **candidateId** (from seed output) → **Create Screening**
2. Open **Screening Chat** → click **Ask Next** (streams) → type or **Mic** your answer
3. Click **Auto-Finish → Report**
4. Explore **Dashboard** and **Config**

---

## 🚀 First deployment (Vercel)

1. Push to a Git repo (private is fine).
2. Import to **Vercel**.
3. Add **Environment Variables** in Vercel (same as `.env.local`).
4. Deploy.
5. Initialize DB in prod (either):

   - Call **Admin Reset** (see below) to auto-seed, or
   - Run the migrations script from a one-off job locally pointing to prod DB.

> If the reset endpoint returns 401, ensure you set `DEMO_ADMIN_TOKEN` in Vercel and pass it in the Authorization header.

---

## 🔐 Admin actions

### 1) Reset demo (wipe & reseed everything)

**Endpoint**

```
POST /api/admin/reset
Authorization: Bearer <DEMO_ADMIN_TOKEN>
```

**curl**

```bash
curl -X POST https://<your-domain>/api/admin/reset \
  -H "Authorization: Bearer change-me-super-secret"
```

**What it does**

- Deletes: `qa_turns`, `sparc_items`, `screenings`, `candidates`, `jobs`, `search_index`
- Reseeds: 1 JD, 1 Candidate CV, question bank into FTS

### 2) Update fit weights & thresholds (Config)

**Page:** `/config`

- Adjust:

  - `w_backend`, `w_leadership`, `w_scaling` (must total ≈ 1.0; not enforced)
  - `th_advance` (default 75)
  - `th_hold_min` (default 60)

- Click **Save** (requires `DEMO_ADMIN_TOKEN`)

**API**

```
GET  /api/config
POST /api/config   (auth required)
```

---

## 🔌 Public endpoints (for reference)

- `POST /api/screenings` → `{ jobId, candidateId, mode? }` → `{ id }`
- `POST /api/screenings/:id/start` → generates plan (array of questions)
- `POST /api/screenings/:id/turn` → `{ role: "assistant"|"candidate"|"system", content }`
- `POST /api/screenings/:id/chat` → **streams** the next assistant question (text/plain)
- `POST /api/screenings/:id/finish` → `{ transcript }` → extracts baseline + SPARC + computes fit
- `GET  /api/screenings/:id` → returns screening + job + candidate + SPARC + turns
- `GET  /api/config` → current weights & thresholds
- `POST /api/config` → update weights & thresholds (auth)
- `POST /api/admin/reset` → wipe & reseed (auth)

> UI pages:
> `/` (home), `/dashboard`, `/screening/:id`, `/report/:id`, `/config`

---

## 🧪 How to demo (60–90 seconds)

1. (Optional) **Reset** the demo.
2. Home → **Create Screening** → **Open Screening Chat**.
3. Click **Ask Next** (streams a RAG-aware question).
4. Answer with **Mic** or type (e.g., `salary: 55k EGP`, `notice: two weeks`, then a SPARC story).
5. **Auto-Finish → Report** → show badge (**Advance**), SPARC table, baseline answers.
6. (Optional) Tune **Config** weights to show control over scoring.
7. (Optional) Show **Dashboard** with latest runs.

---

## 🧪 Sample transcript lines (for easy finishing)

Paste into the transcript box or speak them:

```
salary: 55k EGP
notice: two weeks
reason: looking for growth in ownership
motivation: backend scale and DevOps maturity
expectations: Senior IC with leadership scope

SPARC: We reduced p95 from 800ms to 200ms by adding Redis caching, tuning SQL, and configuring HPA on Kubernetes. I led 3 engineers, we measured conversion uplift of ~3%.
```

---

## 🧩 Fit scoring (transparent)

- **Weights**: backend (default 0.4), leadership (0.3), scaling (0.3)
- **Score**: weighted average of SPARC item scores by theme
- **Thresholds**:

  - **Advance** ≥ 75
  - **Hold** 60–74
  - **Reject** < 60

Edit on `/config`.

---

## 🎙️ Voice (optional)

- **Mic** button uses browser **SpeechRecognition** (best in Chrome)
- Assistant messages are read via **speechSynthesis** (TTS)
- If STT isn’t supported, the button will inform you; continue typing normally

---

## 🧠 RAG (context retrieval)

- Uses **SQLite FTS5** to search JD, CV, and a seeded **question bank**
- Query = last candidate answer **or** the next planned question
- Injected into the assistant’s system prompt (no embeddings needed)

---

## 🧯 Troubleshooting

- **`SQLITE_UNKNOWN: no such column: Baseline`**
  Caused by `:` in FTS MATCH queries. We already sanitize inputs and filter by `owner_type` in `WHERE`. Make sure you use the provided `rag.ts`.

- **Streaming shows nothing**
  If no AI key is set, the assistant still streams **stub text**. If you added keys, verify `LLM_PROVIDER` matches the key (e.g., `groq`) and that your model names are correct.

- **401 on reset/config**
  Add `DEMO_ADMIN_TOKEN` to `.env.local` or Vercel and include `Authorization: Bearer <token>`.

- **FTS not searching**
  Ensure you ran `pnpm db:migrate` and `pnpm db:seed` at least once; this creates `search_index` and inserts data.

---

## 📜 Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:generate": "drizzle-kit generate --config ./drizze.config.ts",
    "db:push": "drizzle-kit push --config ./drizze.config.ts",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

---

## 🔒 Notes on security (demo-friendly)

- Keys are **server-side** only; never expose them client-side
- Admin routes require `DEMO_ADMIN_TOKEN`
- This is demo software: no PII retention policy, no auth — add NextAuth or passwordless if needed

---

## 🧭 Roadmap (if time allows)

- PDF export for reports
- Multi-candidate imports
- ATS webhook export
- Better semantic retrieval (embeddings)
- Real-time “chips” capturing salary/notice as you type
