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

The **`vercel-build`** script runs **`prisma generate`** and **`next build`** only. It does **not** run `prisma migrate deploy` during the Vercel build, because that needs a live TCP connection to Postgres and often fails with **P1001** (can’t reach database) when Neon is sleeping, the URL is wrong, or the build environment cannot reach the host.

**Apply schema changes to production:**

1. From your machine (with network), using the **same pooled `DATABASE_URL` as production:**
   ```bash
   cd portal && npx prisma migrate deploy
   ```
2. Or open the Neon dashboard, wake the project if it was suspended, confirm the connection string, then run the command above.

After new migrations exist, deploy the app as usual; the running app uses Prisma Client generated at build time and must match a database that already has those migrations applied.

Optional: if you prefer migrations to run on every Vercel deploy and your Neon URL is reliable from Vercel’s build, set the project **Build Command** to  
`npx prisma migrate deploy && npm run vercel-build`  
(or equivalent) in the Vercel dashboard instead of changing `package.json`.
