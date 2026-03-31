# Portal Architecture

## Goal

Build a fast, secure, expandable admissions portal that replaces spreadsheet-driven UI with a proper web application while preserving reporting flexibility.

## Recommended stack

- Frontend: Next.js app router
- Backend: Next.js server actions and route handlers initially
- Database: PostgreSQL
- ORM: Prisma
- Auth: NextAuth or custom JWT/session with role-based access
- File storage: Google Drive first, S3-compatible storage later
- Deployment: Vercel for frontend, Railway/Render/AWS for database and server

## High-level layers

### 1. Presentation layer

- dashboard
- admission form
- student directory
- student profile
- document verification
- scholarship tracker
- fees and payments
- PRN / SCVT tracker
- undertaking module
- reports
- settings

### 2. Application layer

- admission service
- student service
- eligibility service
- document service
- undertaking service
- finance service
- scholarship service
- PRN / SCVT service
- master data service
- audit service

### 3. Persistence layer

- PostgreSQL tables for primary transactional data
- optional Google Sheets export for reporting
- Drive/S3 for file assets

## Security architecture

- role-based route protection
- masked Aadhaar in list screens
- encrypted Aadhaar fields at rest in final production
- audit log for create/update/verify actions
- document-level access only to allowed roles

## Suggested roles

- `SUPER_ADMIN`
- `ADMIN`
- `ADMISSION_STAFF`
- `DOCUMENT_VERIFIER`
- `SCHOLARSHIP_DESK`
- `FINANCE_DESK`
- `PRN_SCVT_DESK`
- `VIEWER`

## Core module boundaries

### Admission

- creates student record
- captures basic admission details
- creates checklist and fee profile

### Eligibility

- validates minimum requirement of 10th pass
- blocks completion until verified

### Parent and identity

- captures parent identity information
- stores parent Aadhaar separately from student Aadhaar

### Documents

- stores metadata for uploaded files
- supports verification workflow

### Undertaking

- tracks generated undertaking URL, status, print count

### Fees

- tracks fee plan, transactions, due amount, overrides

### Scholarship

- tracks application, query, approval, credit states

### PRN / SCVT

- tracks registration number workflow and verification

## Performance design

- database-first filtering instead of sheet scans
- indexed search fields for students
- pre-aggregated dashboard queries where needed
- paginated student directory
- separate document metadata from student table
- use background jobs later for report generation and bulk sync

## Suggested future integrations

- WhatsApp/SMS reminders
- PDF generation for admission and undertaking
- biometrics or attendance sync
- accounting exports
- API integrations with state/board systems if available
