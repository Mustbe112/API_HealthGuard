# API Management — Combined Project

Backend (Express + Prisma) and frontend (Next.js) living in one repo, one
`package.json`, one `node_modules`. They're still two separate running
processes though — a Next.js dev server and an Express server can't
merge into one process, so you're running two servers either way, just
launched together from one place.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` — see the comments in the file for where each value comes
from (Supabase connection strings, generated secrets, etc). Note that
**one `.env` file now serves both sides**: the backend reads
`DATABASE_URL`/`JWT_SECRET`/`ENCRYPTION_KEY` etc., and the frontend only
ever gets `NEXT_PUBLIC_`-prefixed vars sent to the browser — everything
else stays server-side even though it's in the same file.

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

`npm run dev` starts **both** servers together (backend on :4000,
frontend on :3000) using `concurrently`, with color-coded log prefixes
so you can tell which server printed what. If you'd rather run them in
separate terminals (e.g. to restart one without the other):

```bash
npm run dev:backend    # terminal 1
npm run dev:frontend   # terminal 2
```

## Folder layout

```
src/
  app/            → Next.js pages (frontend)
  config/         → backend config
  controllers/    → backend route handlers
  db/             → Prisma client singleton
  middleware/     → backend Express middleware
  routes/         → backend Express routes
  services/       → backend business logic (parsers, test runner, env vars)
  types/          → backend type augmentation
  utils/          → backend crypto/hash/jwt helpers
  index.ts        → backend Express entry point
lib/              → frontend API client, types, auth context
components/       → frontend UI components
prisma/           → shared database schema
```

## A structural trade-off worth knowing

Because there's one shared `tsconfig.json`, `next build` type-checks
**every** `.ts`/`.tsx` file in the repo, backend included — so a backend
type error will block your frontend build, not just backend work. For a
solo/small project this is a fine trade-off (one less config to
maintain), but if it becomes annoying, ask to have the build scoped to
frontend-only files.

There's also `tsconfig.backend.json` for producing a real compiled
backend build (`npm run build:backend` → `dist/`) for production
deployment, since `next build` only handles the frontend half.
