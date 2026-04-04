# ITI ERP Custom Portal

This folder contains a production-oriented starter for a custom ITI ERP portal.

Stack:

- Next.js 15 style app router structure
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Role-based module layout

Included:

- architecture documentation
- module documentation
- complete Prisma schema
- starter UI pages for all major ERP modules
- API route structure for admissions, students, dashboard, documents, and reports

## Main folders

- `docs/`: architecture and workflow documents
- `prisma/`: database schema
- `src/app/`: pages and route handlers
- `src/components/`: reusable UI
- `src/lib/`: module metadata and example dashboard data

## Before running

Install dependencies after creating the project locally or on your server:

1. `npm install`
2. set `.env`
3. `npx prisma generate`
4. `npx prisma migrate dev`
5. `npm run dev`

## Notes

- This is a scaffold, not a fully wired production backend yet.
- The schema and modules are designed to cover your full process so nothing critical stays undefined.
- Sensitive fields like Aadhaar should be masked in UI and encrypted at rest in the final implementation.

## Vercel and database performance

- Set **`DATABASE_URL`** in Vercel to your **pooled** Postgres URL (Neon shows this in the dashboard; it is tuned for serverless and many short connections).
- Put **Vercel** and **Neon** in the **same region** when you can. A database in another region adds network latency to every Prisma query and makes the portal feel slow even when the app code is fine.
- **`AUTH_SECRET`** must be set for production builds (see `src/lib/auth.ts`).

### Match Neon and Vercel regions

Neon’s region is fixed when the project is created. After that, set **Vercel → Project → Settings → Functions → Function Region** (or `regions` in `vercel.json`) to the code in the right column below.

| Neon (AWS) region | Vercel region code | Notes |
|-------------------|--------------------|--------|
| US East (N. Virginia) `aws-us-east-1` | `iad1` | Common default; pairs with many Neon setups |
| US East (Ohio) `aws-us-east-2` | `cle1` | |
| US West (Oregon) `aws-us-west-2` | `pdx1` or `sfo1` | Prefer `pdx1` (Oregon); `sfo1` if `pdx1` is unavailable |
| Europe (Frankfurt) `aws-eu-central-1` | `fra1` | |
| Europe (London) `aws-eu-west-2` | `lhr1` | |
| Asia Pacific (Singapore) `aws-ap-southeast-1` | `sin1` | |
| Asia Pacific (Sydney) `aws-ap-southeast-2` | `syd1` | |
| South America (São Paulo) `aws-sa-east-1` | `gru1` | |

This repo’s **`portal/vercel.json`** sets `"regions": ["sin1"]` so Vercel functions run in **Singapore**, matching Neon **Asia Pacific (Singapore)** (`aws-ap-southeast-1`). If your Neon project uses another row in the table, change `regions` to match that column.

If your Neon region is not listed, open **Vercel → Functions** docs for the full region list and pick the city closest to your Neon AWS region.

### Vercel build and Prisma migrations

The **`vercel-build`** script runs **`prisma migrate deploy`**, then **`prisma generate`**, then **`next build`**. Each production deploy applies pending migrations against the database in **`DATABASE_URL`**.

**Requirements**

- Link this folder to the correct Vercel project (production is **`iti-erp-portal`**, not a generic `portal` project):  
  `npx vercel link --project iti-erp-portal`
- Set **`DATABASE_URL`** on that Vercel project (Production) to your Neon URI (Vercel **Neon** integration or paste from Neon **Connection details**).
- Neon must accept TCP from Vercel’s build network. If a deploy fails with **P1001**, wake the Neon project or use a connection string that allows the build to connect (some teams use a non-pooled “direct” URI only for migrations via a separate env var and a custom build script).

**Apply migrations from your laptop (same DB as production)**

```bash
cd portal && npm run migrate:vercel-production
```

This pulls Production env with the Vercel CLI (after `npx vercel link`) and runs `prisma migrate deploy`. You can instead set `DATABASE_URL` manually:

```bash
cd portal && DATABASE_URL="postgresql://…" npx prisma migrate deploy
```
