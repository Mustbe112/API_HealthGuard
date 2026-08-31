# API Vitals

Upload an API spec (or paste a base URL, including localhost) and run **zero-input** checks on every route. Results are **Working**, **Try manually** (for example 401/403 — the route is up but needs a real login), or **Broken** (5xx / no response). You can also send real requests from **Try endpoints**, like Postman.

One repo, one `package.json`. The Next.js UI (`:3000`) and Express API (`:4000`) still run as two processes; `npm run dev` starts both.

## What it does

- **Discover from base URL** — looks for OpenAPI/Swagger on the host, then probes live JSON routes. If `GET /items` returns a list, it also infers `POST /items` and `GET|PATCH|PUT|DELETE /items/{id}`.
- **Upload OpenAPI or Postman** — parses paths, methods, and documented statuses.
- **Zero-input test run** — throwaway register when possible, fake UUIDs for `{id}`, empty bodies for writes. Does not need you to fill IDs or tokens first.
- **Try endpoints** — path params, headers, JSON body, bearer token, live response.
- **Project env vars** — optional secrets (encrypted at rest) for tokens and Postman `{{variables}}`.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (includes `npm`)
- A **PostgreSQL** database (this project is set up for [Supabase](https://supabase.com/))
- Git

You do **not** install Prisma globally. `npm install` already pulls `prisma` and `@prisma/client`.

## Setup (after `git clone`)

```bash
git clone <this-repo-url>
cd Project
npm install
cp .env.example .env
```

Edit `.env` (see below). Then:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

| App        | URL                     |
| ---------- | ----------------------- |
| Frontend   | http://localhost:3000   |
| Backend    | http://localhost:4000   |
| API health | http://localhost:4000/health |

Open **http://localhost:3000**, sign up, create a project.

### `.env`

One file is used by both servers. Only `NEXT_PUBLIC_*` is exposed to the browser.

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres URI for the app (Supabase **transaction** pooler, port **6543**, with `?pgbouncer=true`) |
| `DIRECT_URL` | Postgres URI for migrations (Supabase **session** pooler, port **5432**) |
| `JWT_SECRET` | Signs login tokens |
| `ENCRYPTION_KEY` | 32-byte key, base64 — encrypts stored API secrets |
| `PORT` | Backend port (default `4000`) |
| `FRONTEND_URL` | Allowed browser origin (default `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Frontend → backend (`http://localhost:4000`) |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Each teammate can use the **same** Supabase project (share the URIs privately) **or** their own project. **Do not commit `.env`.** Rotate passwords if it was ever pushed to GitHub.

If `npx prisma migrate dev` asks for a migration name, use `init` only on an empty database. If migrations already exist in `prisma/migrations`, the command applies them and should not need a new name.

## How to test an API

1. Create a project. Set **base URL** to the API under test, for example `http://localhost:5000` (the **API** process, not this app’s website on `:3000`).
2. Discovery runs automatically when the project has no endpoints. You can also click **Discover from base URL**, or upload an OpenAPI/Postman file.
3. Click **Run tests** (or wait after discover/upload).
4. Read the badges:
   - **Working** — probe got an expected response (2xx, or 400/404/422 on empty/fake data). No need to retest by hand.
   - **Try manually** — **401** / **403**. Route is live; open **Try endpoints** and send a real token.
   - **Broken** — **5xx** or the server did not answer. Check the base URL and that the API is running.

Discovery **GET/OPTIONS** first; extra REST methods on a JSON collection use an empty `{}` body or a missing id so real rows are not deleted.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Backend + frontend together |
| `npm run dev:backend` | Express on `:4000` |
| `npm run dev:frontend` | Next.js on `:3000` |
| `npx prisma generate` | Generate Prisma Client (needed after clone / schema change) |
| `npx prisma migrate dev` | Apply database migrations |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:frontend` | `next build` |
| `npm run build:backend` | Compile Express to `dist/` |

## Folder layout

```
src/app/              Next.js pages
src/index.ts          Express entry
src/controllers/      Route handlers
src/services/         Parsers, discovery, zero-input runner
src/db/               Prisma client
lib/                  Frontend API client, auth, types
components/           UI
prisma/               Schema + migrations
```

`next build` type-checks the whole repo (including backend). `npm run build:backend` uses `tsconfig.backend.json` and writes `dist/`.

## Course / sharing notes

- Classmates only need **Node**, **npm install**, **`.env`**, **`npx prisma generate`**, and **`npx prisma migrate dev`**.
- Point the project base URL at **their** API (`http://localhost:5000`, etc.). This tester’s UI is `:3000` and its own API is `:4000`.
- If the backend cannot reach “localhost”, they may be targeting the Next.js app instead of the API under test.
