# Vercel Deployment Guide (ITI ERP Portal)

This project is now prepared for Vercel deployment with Prisma.

## 1) Create Production Postgres

Use one of:
- Neon
- Supabase
- Railway Postgres

Copy the connection string as `DATABASE_URL`.

## 2) Push Code to Git

Push this `portal` project to GitHub/GitLab/Bitbucket.

## 3) Create Vercel Project

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your repository
4. Set **Root Directory** to `portal`
5. In **Build & Output Settings**, set:
   - Install Command: `npm install`
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next` (default)

## 4) Add Environment Variables (Vercel -> Project -> Settings -> Environment Variables)

Use at least:

- `DATABASE_URL` = your production Postgres URL
- `AUTH_SECRET` = strong random secret
- `NEXTAUTH_SECRET` = strong random secret
- `NEXTAUTH_URL` = your production app URL (for example `https://your-domain.vercel.app`)
- `AADHAAR_ENCRYPTION_KEY` = strong key used by your app

Optional (if used):

- `NOTIFY_SMS_WEBHOOK_URL`
- `NOTIFY_WHATSAPP_WEBHOOK_URL`
- `NOTIFY_EMAIL_WEBHOOK_URL`
- `NOTIFY_WEBHOOK_BEARER_TOKEN`

## 5) Deploy

Trigger the first deployment from Vercel.

`npm run vercel-build` will:
- run `prisma migrate deploy` (needs **`DATABASE_URL`** set for Production on Vercel)
- run `prisma generate`
- run `next build`

To run only migrations from your machine using env stored in Vercel: `npm run migrate:vercel-production` (after `npx vercel link`).

## 6) Verify After Deploy

1. Login works
2. Dashboard loads
3. Admissions create flow works
4. Fee collection works
5. At least one report loads

## Important Production Note (File Uploads)

This codebase writes some files into `public/uploads` on disk. Vercel serverless file storage is ephemeral and not suitable for persistent uploads.

Before production go-live, move runtime uploads to persistent storage (for example S3/R2/Supabase Storage/Cloudinary), then store only URLs in DB.

## Useful Commands

- Local generate Prisma client: `npm run prisma:generate`
- Run dev migrations locally: `npm run prisma:migrate`
- Run prod-safe migrations: `npm run prisma:migrate:deploy`
