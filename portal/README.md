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
