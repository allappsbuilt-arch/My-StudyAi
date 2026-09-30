# Supabase (database, auth, storage)

Everything MyStudyAI needs on the Supabase side lives here.

| Path | What it is |
|---|---|
| `migrations/20260927000100_schema.sql` | Tables, indexes, triggers (profile row on sign-up, `updated_at`) |
| `migrations/20260927000200_rls.sql` | Row Level Security: students only reach their own rows; social tables readable when signed in; quiz answer keys readable by the backend only |
| `migrations/20260927000300_storage.sql` | Storage buckets `materials` (private), `avatars` and `posts` (public) + policies |
| `seed.sql` | Starter communities |
| `config.toml` | Supabase CLI settings for local development |

All files are idempotent (safe to run again).

## Apply to your hosted project

**Option A - Supabase CLI** (recommended)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then run `seed.sql` once in the SQL Editor (or `npx supabase db reset` on a local stack).

**Option B - SQL Editor**

Supabase dashboard -> SQL Editor -> run the three files in `migrations/` **in order**, then `seed.sql`.

## Dashboard settings

- **Authentication -> Sign In / Providers**
  - Email: on. Turn *Confirm email* off during development if you want instant log-in.
  - *Allow anonymous sign-ins*: on (needed for skip-login mode, `VITE_SKIP_LOGIN=true`).
  - Google / Apple: optional, for the "Or continue with" buttons.
- **Authentication -> URL Configuration**: Site URL `http://localhost:3000`, redirect URL `http://localhost:3000/**` (password-reset and OAuth links).

## Keys

Project Settings -> API:

| Key | Goes in | Notes |
|---|---|---|
| Project URL | `frontend/.env.local` (`VITE_SUPABASE_URL`) and `backend/.env` (`SUPABASE_URL`) | |
| anon / publishable key | `frontend/.env.local` (`VITE_SUPABASE_ANON_KEY`) and `backend/.env` (`SUPABASE_ANON_KEY`) | Safe for the browser - RLS protects the data |
| service_role / secret key | `backend/.env` **only** (`SUPABASE_SERVICE_ROLE_KEY`) | Bypasses RLS. Never put it in the frontend |
