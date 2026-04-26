# دليل النبك (Nabk Directory)

Arabic-first (RTL) city business directory for النبك, Syria.

## Tech stack

- Next.js 16 App Router (TypeScript strict, output: standalone)
- Tailwind CSS v4 + shadcn/ui-inspired components
- Prisma 6 + PostgreSQL
- NextAuth v5 (database sessions, Credentials + optional Google)
- Resend for transactional email (optional in dev)
- sharp for image processing

## Local development

```bash
pnpm --filter @workspace/nabk-directory install
cd artifacts/nabk-directory
cp .env.example .env  # fill in DATABASE_URL + AUTH_SECRET
pnpm exec prisma db push
pnpm exec tsx prisma/seed.ts
pnpm dev
```

Default seeded credentials:
- Admin: `admin@nabk.local` / `Admin123!`
- Owner: `owner@nabk.local` / `Owner123!`

## Self-hosting (Docker / nginx)

```bash
cp artifacts/nabk-directory/.env.example artifacts/nabk-directory/.env
# fill in real secrets
artifacts/nabk-directory/deploy.sh
```

This brings up Postgres + the standalone Next.js app + nginx reverse proxy.
TLS is configured via the commented `:443` block in `nginx.conf`.

## Project structure

```
src/
  app/            # App Router pages (RTL-only)
    api/          # NextAuth + health endpoints
    businesses/   # Browse + detail pages
    category/     # Category landing pages
    sign-in,
    sign-up,      # Auth pages with server actions
    dashboard/    # Owner dashboard
  components/     # UI primitives + layout + business cards
  features/       # Server actions + queries
  lib/            # prisma, auth, email, storage, utils
prisma/
  schema.prisma   # full data model
  seed.ts         # demo data
```

## Notes / status

- Browsing flow (homepage, category, detail), search, ratings display, working
  hours, "open now" pill, sign-in/sign-up/sign-out, and the public REST health
  endpoint are implemented.
- Listing-creation wizard, ratings/comments submission, admin panel, image
  uploads, and notification triggers are scaffolded but not yet wired —
  these are the planned follow-ups.
