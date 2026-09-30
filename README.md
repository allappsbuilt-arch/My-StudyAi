# MyStudyAI – AI-Powered Study Assistant

Upload study material and get AI study guides, chat with an AI tutor, make quizzes and flashcards, scan & solve questions, translate, record lectures, plan your week, post in study communities, play learning games and track progress.

| Layer | Tech | Responsibility |
|---|---|---|
| **Frontend** (`frontend/`) | React 19 + Vite, :3000 | UI only. Uses Supabase **Auth** for sign-in/sessions; every data request goes to the backend |
| **Backend** (`backend/`) | Node.js + Express 5, :5000 | Business logic and secure server-side work: validation, streaks, spaced repetition, quiz grading, feeds, rankings, file handling, AI |
| **Supabase** (`backend/supabase/`) | Postgres, Auth, Storage | Database (with Row Level Security), authentication, file storage; migrations live in `backend/supabase/migrations` |
| **AI** | Anthropic Claude (`claude-opus-5`) | Called only from the backend |

---

## Architecture

```
 Browser (React, UI only)
   │  supabase-js  ── Auth only (sign-up / sign-in / session / password reset / OAuth) ──► Supabase Auth
   │
   │  HTTPS /api/*  + "Authorization: Bearer <Supabase access token>"
   ▼
 Backend (Express)
   middleware/auth.js   verifies the token with Supabase → req.user, req.db
   routes → controllers → services (business logic)
   lib/supabase.js
     forUser(token)  anon key + student's token  → every query runs under Row Level Security
     admin()         service-role key (server only) → quiz answer keys, AI results, Storage
   │
   ▼
 Supabase: Postgres (RLS) · Storage (materials private; avatars/posts public) · Auth
```

**Security rules**

- The **service-role key exists only in `backend/.env`**. The frontend only has the public anon key.
- The backend queries as the signed-in student (`forUser`), so Row Level Security still applies even to server code. The service role is used only where students must *not* have direct access (e.g. quiz answer keys, which have no RLS policy at all).
- Files are uploaded to the backend, validated (type/size), then stored in Supabase Storage under `<user id>/...`. Private files are opened with short-lived signed URLs.
- Rate limits per student (300 req/min overall, 30 AI req/min), Helmet security headers, CORS allow-list.

---

## Folder structure

```
My studyai/
├── backend/
│   ├── server.js                        starts the server (graceful shutdown)
│   ├── app.js                           Express app: helmet, CORS, health, routes, errors
│   ├── .env / .env.example              SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY
│   ├── config/index.js                  env loading + validation
│   ├── lib/supabase.js                  admin() + forUser(token) clients, error mapping
│   ├── lib/context.js                   request context + student's local-time helpers
│   ├── middleware/                      auth, upload (multer, memory), rateLimits, validate, errorHandler
│   ├── routes/                          profile, materials, notes, quiz, chat (ai), progress+plan, flashcards+games, social, tools
│   ├── controllers/                     profile, study, practice, social, tools
│   ├── services/                        profile, material (+analysis), note, chat, quiz, progress, plan,
│   │                                    flashcard, social, game, data, storage, ai, extract
│   └── supabase/
│       ├── config.toml                  Supabase CLI config (local dev)
│       ├── migrations/
│       │   ├── 20260927000100_schema.sql    tables, indexes, triggers
│       │   ├── 20260927000200_rls.sql       Row Level Security policies
│       │   └── 20260927000300_storage.sql   storage buckets + policies
│       ├── seed.sql                     starter communities
│       └── README.md                    how to apply + dashboard settings
│
└── frontend/
    ├── .env                             VITE_SKIP_LOGIN, optional VITE_API_URL
    ├── .env.local / .env.example        VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (git-ignored)
    └── src/
        ├── lib/supabase.js              Supabase client - authentication only
        ├── services/api.js              HTTP client for the backend (all data)
        ├── context/                     Auth, Theme, I18n (EN/HI/ES), Toast
        ├── navigation/, screens/, components/, hooks/, utils/, assets/
```

---

## Setup (Windows)

You need **Node.js 18+** and a free **Supabase** project (https://supabase.com).

### 1. Install
```powershell
cd backend; npm install; cd ..\rontend; npm install; cd ..
```

### 2. Create the database
Apply `backend/supabase/migrations/*` (in order) and `backend/supabase/seed.sql` – see **backend/supabase/README.md** (CLI `npx supabase db push`, or paste them into the SQL Editor).

In the Supabase dashboard also:
- **Authentication → Sign In / Providers**: enable *Allow anonymous sign-ins* (needed while `VITE_SKIP_LOGIN=true`); optionally turn off *Confirm email* for development; optionally enable Google / Apple.
- **Authentication → URL Configuration**: add `http://localhost:3000/**` as a redirect URL.

### 3. Add your keys (Project Settings → API)

`backend/.env`
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>
AI_API_KEY=<Anthropic key>           # optional - only AI features need it
```

`frontend/.env.local`
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

### 4. Run (two terminals)
```powershell
cd backend; npm run dev
```
```powershell
cd frontend; npm run dev
```
Open http://localhost:3000. If something is missing (keys, server, tables), the app shows a setup screen that says exactly what to fix. `http://localhost:5000/api/health` reports readiness.

---

## API overview (all require `Authorization: Bearer <access token>`)

| Area | Endpoints |
|---|---|
| Account | `GET /api/me`, `GET/PUT /api/profile`, `POST /api/profile/avatar`, `GET /api/profile/export` |
| Materials | `GET/POST /api/materials`, `GET/DELETE /api/materials/:id`, `GET /api/materials/:id/file-url`, `GET/POST /api/materials/:id/analysis` |
| Notes | `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/:id` |
| Quizzes | `POST /api/quiz/generate`, `GET /api/quiz/:id`, `POST /api/quiz/:id/submit`, `GET /api/quiz/attempt/:id`, `GET /api/quiz/history` |
| AI Tutor | `POST /api/ai/chat`, `GET/DELETE /api/ai/conversations[/:id]` |
| Progress & plan | `GET /api/progress`, `GET /api/progress/weekly`, `POST /api/progress/study-time`, `GET /api/plan`, `POST/PATCH/DELETE /api/plan/tasks[/:id]` |
| Flashcards | `GET/POST /api/flashcards/decks`, `GET/PUT/DELETE /api/flashcards/decks/:id`, `POST …/decks/:id/cards`, `PUT/DELETE /api/flashcards/cards/:id`, `POST …/cards/:id/review`, `POST /api/flashcards/generate` |
| Games | `GET /api/games/stats`, `GET /api/games/leaderboard`, `GET /api/games/pairs`, `POST /api/games/scores` |
| Socials | `GET /api/social/feed`, `POST /api/social/posts`, `DELETE /api/social/posts/:id`, `PUT …/posts/:id/like`, `GET/POST …/posts/:id/comments`, `GET /api/social/communities[/:slug]`, `PUT …/communities/:id/membership`, `GET /api/social/users/:id`, `PUT …/users/:id/follow` |
| AI tools | `POST /api/tools/solve`, `/translate`, `/summarize`, `/essay`, `/lecture-notes` |

Voice features (lecture transcript, voice-to-text, spelling bee audio) use the browser's speech APIs: best in Chrome or Edge.
