# API Vitals

Create a project with an **API Base URL** (including localhost), then run **zero-input** checks on every route. Upload an OpenAPI or Postman spec if discovery only found GET routes. Results are **Working**, **Try manually** (for example 401/403 — the route is up but needs a real login), or **Broken** (5xx / no response). You can also send real requests from **Try endpoints**, like Postman. The workbench maps those to **Healthy** / **Warning** / **Unhealthy**.

One repo, one `package.json`. The Next.js UI (`src/app`, `:3000`) and Express API (`backend/src`, `:4000`) still run as two processes; `npm run dev` starts both.

## What it does

- **Discover from base URL (at create)** — looks for OpenAPI/Swagger on the host, then probes live JSON routes. If `GET /items` returns a list, it also infers `POST /items` and `GET|PATCH|PUT|DELETE /items/{id}`. The Base URL is **locked** after the project is created; a different API needs a new project.
- **Upload OpenAPI or Postman** — parses paths, methods, and documented statuses. Use **Import** after create when live discovery only found GET routes. The spec does not change the project Base URL.
- **Zero-input test run** — throwaway register when possible, fake UUIDs for `{id}`, empty bodies for writes. Does not need you to fill IDs or tokens first.
- **One health result per endpoint** — a route can get more than one probe in a run. The workbench keeps the **worst** outcome (Broken beats Needs a login, which beats Working) so counts and badges are per route, not per probe.
- **API map** — tree of routes on the locked host, colored from the last health check. Click a method to open that endpoint.
- **Explain** — optional plain-language summary of a run or one endpoint (needs `GROQ_API_KEY` in the root `.env`). Scoring and probes stay rule-based; this only explains results already stored.
- **Try endpoints** — path params, headers, JSON body, bearer token, live response.
- **Project env vars** — optional secrets (encrypted at rest) for tokens and Postman `{{variables}}`.

## Prerequisites

- **Node.js 20.9+** (this repo will not run on Node 18). Check with `node -v`.
  - Install: [nodejs.org](https://nodejs.org) → LTS 20, **or** `nvm install 20 && nvm use 20`
- A **PostgreSQL** database (this project is set up for [Supabase](https://supabase.com/))
- Git

You do **not** install Prisma globally. `npm install` already pulls `prisma` and `@prisma/client`.

## Classmate setup (copy this)

The `.env` file is **not** enough by itself. Dependencies are not in Git. Everyone must use **Node 20** and run setup once.

```bash
git clone <this-repo-url>
cd API_HealthGuard

# If node -v is not v20.x:
#   nvm install 20 && nvm use 20
# or install Node 20 LTS from https://nodejs.org then reopen the terminal.

# Put the shared .env in this folder (same folder as package.json).
# Or:  cp .env.example .env   and fill DATABASE_URL, DIRECT_URL, JWT_SECRET, ENCRYPTION_KEY

npm run setup
npm run dev
```

Then open **http://localhost:3000**.

If `npm run setup` says the Node version is wrong, do **not** keep going with `npm run dev`. Install Node 20 first. Mixing Node 18 / 22 / 24 with this lockfile is what usually breaks `argon2` and Next.js.

If an old install is already broken:

```bash
rm -rf node_modules .next
npm run setup
npm run dev
```

Use **npm**, not yarn or pnpm — this repo’s lockfile is `package-lock.json`.

## Setup (after `git clone`)

```bash
git clone <this-repo-url>
cd API_HealthGuard
npm run setup
```

`npm run setup` runs `npm install`, `npx prisma generate`, and `npx prisma migrate deploy`. Then:

```bash
npm run dev
```

| App        | URL                     |
| ---------- | ----------------------- |
| Frontend   | http://localhost:3000   |
| Backend    | http://localhost:4000   |
| API health | http://localhost:4000/health |

Open **http://localhost:3000**, sign up, create a project.

### `.env`

Copy `.env.example` to `.env` at the repo root. Next, Express, and Prisma all read that file. Only `NEXT_PUBLIC_*` is exposed to the browser. **Do not commit `.env`.**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Frontend → backend (`http://localhost:4000`) |
| `DATABASE_URL` | Postgres URI (Supabase **transaction** pooler, port **6543**, with `?pgbouncer=true`) |
| `DIRECT_URL` | Postgres URI for migrations (Supabase **session** pooler, port **5432**) |
| `JWT_SECRET` | Signs login tokens |
| `ENCRYPTION_KEY` | 32-byte key, base64 — encrypts stored API secrets |
| `PORT` | Backend port (default `4000`) |
| `FRONTEND_URL` | Extra allowed browser origin (the API always allows `http://localhost:3000` and `http://localhost:5173`) |
| `GROQ_API_KEY` | Optional. Enables **Explain this run** / **Explain this result**. Leave empty if you do not need explanations. |
| `GROQ_MODEL` | Optional chat model (default `openai/gpt-oss-20b`). Used only when `GROQ_API_KEY` is set. |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Each teammate can use the **same** Supabase project (share the URIs privately) **or** their own project. **Do not commit `.env`.** Rotate passwords if it was ever pushed to GitHub.

If `npx prisma migrate dev` asks for a migration name, use `init` only on an empty database. If migrations already exist in `prisma/migrations`, the command applies them and should not need a new name.

## How to test an API

1. Create a project. Set **API Base URL** to the API under test, for example `http://localhost:5000` (the **API** process, not this app’s website on `:3000`). You cannot change that URL later.
2. Discovery runs automatically when the project has no endpoints. If you need POST/PUT/PATCH/DELETE, click **Import** and upload an OpenAPI/Postman file (same project).
3. Click **Run health check** (or wait after discover/upload).
4. Read the badges (one per endpoint; if several probes ran, the worst one is kept):
   - **Working** — probe got an expected response (2xx, or 400/404/422 on empty/fake data). No need to retest by hand.
   - **Try manually** / **Needs a login** — **401** / **403**. Route is live; open **Try endpoints** and send a real token.
   - **Broken** — **5xx** or the server did not answer. Check the base URL and that the API is running.
5. Open **API map** in the rail (or **View API map** on the endpoints list) to see routes grouped by path. Color is from that last check.
6. Optional: click **Explain this run** on the dashboard, or **Explain this result** on an endpoint, if `GROQ_API_KEY` is set. Restart the backend after adding the key.

Discovery **GET/OPTIONS** first; extra REST methods on a JSON collection use an empty `{}` body or a missing id so real rows are not deleted.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run setup` | Check Node 20, install packages, generate Prisma, apply migrations |
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
src/app/                    Next.js pages (including /map)
backend/src/index.ts         Express entry
backend/src/                 Controllers, routes, discovery, zero-input runner
backend/src/services/explain Optional Groq explanation of stored results
lib/                        Frontend API client, auth, outcome rollup, types
components/workbench/       Health banner, API map, explain panel
prisma/                     Schema + migrations
```

`next build` type-checks the whole repo (including backend). `npm run build:backend` uses `tsconfig.backend.json` and writes `dist/`.

## Course / sharing notes

- Classmates need **Node 20**, a **`.env`** in the repo root, then **`npm run setup`** and **`npm run dev`**.
- Point the project base URL at **their** API (`http://localhost:5000`, etc.). This tester’s UI is `:3000` and its own API is `:4000`.
- If the backend cannot reach “localhost”, they may be targeting the Next.js app instead of the API under test.
- To monitor a different API, create a **new project**. Do not retarget an existing one.
