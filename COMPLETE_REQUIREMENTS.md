# ITI ERP Staff Panel Complete Requirements

This document defines the complete functional, technical, data, and performance requirements for the ITI ERP Staff Panel so the system can be built and reviewed end to end without leaving hidden work for later.

## 1. Goal

The system must help ITI staff manage student admissions, documents, undertakings, fees, scholarship tracking, PRN/SCVT status, agent-linked admissions, and operational dashboards using:

- Google Sheets as the primary datastore
- Google Apps Script as the application backend
- HTML/CSS/JavaScript as the frontend
- Google Drive for document storage
- Google Docs template flow for undertaking generation

The system must be:

- fast in save and filter operations
- easy for staff to use
- visually attractive
- safe for sheet formula columns
- modular enough that each workflow is understandable on its own

## 2. Core Objectives

- Maintain `STUDENTS_MASTER` as the source of truth.
- Prevent accidental overwrite of formula-driven columns.
- Support fast student admission entry.
- Show filtered student lists quickly.
- Generate meaningful operational dashboards.
- Support document upload per student.
- Support undertaking generation tracking.
- Provide visibility into incomplete admissions and pending work.
- Keep all important modules visible so the owner can understand how the ERP works in full.

## 3. Users

### 3.1 Admission Staff

- create student records
- update form completion
- upload documents
- track pending admission steps

### 3.2 Admission Desk

- review student list
- verify documents
- track undertaking status
- monitor dashboard activity

### 3.3 Scholarship / PRN Desk

- update scholarship stages
- update PRN and SCVT numbers
- resolve pending query cases

### 3.4 Admin / Owner

- view all modules
- inspect dashboards
- validate formulas and linked sheets
- monitor staff workflow health

## 4. System Modules

The system must include the following modules.

### 4.1 Dashboard Module

Purpose:
- give a fast operational summary

Must show:
- total students
- pending admissions
- documents pending
- undertakings pending
- PRN pending
- SCVT pending
- scholarship queries
- due students
- recent admissions table
- pending work table
- due list table

Rules:
- dashboard reads from valid student records only
- dashboard values must exclude blank/broken rows
- recent admissions should show the latest 10 records
- pending work should show the first 20 actionable records
- due list should show the first 20 records with due amount greater than zero

### 4.2 Admission Form Module

Purpose:
- create a student admission record quickly and safely

Required fields:
- `Institute_ID`
- `Student_Name`
- `Trade`
- `Session`
- `Year`
- `Mobile`

Optional fields:
- father and mother name
- gender
- category
- address
- email
- Aadhaar number
- bank details
- agent ID
- payment mode
- scholarship status
- document flags
- admission status flags
- undertaking status
- completion metadata

Rules:
- the form must not write into formula columns directly
- required fields must be validated before save
- staff should get clear error messages
- save button must prevent double-submit
- form reset must clear visible user inputs

### 4.3 Student List Module

Purpose:
- allow staff to find and inspect students quickly

Must support filters:
- text search
- institute
- trade
- session
- year
- admission status

Must show:
- Student ID
- name
- institute
- trade
- session
- year
- mobile
- admission status
- document status
- undertaking status
- due amount
- undertaking link if present

Rules:
- filters must work without page reload
- search should be debounced
- empty state must be shown when no records match

### 4.4 Document Upload Module

Purpose:
- upload student-related files into Drive

Supported document types:
- photo
- Aadhaar
- caste certificate
- income certificate

Rules:
- upload happens after student save
- files must be saved inside a student-specific folder
- folder naming format:
  `Student_Name - Student_ID`
- upload errors must not erase the student save success

### 4.5 Undertaking Module

Purpose:
- track generated undertaking documents and their status

Must support:
- storing generated document URL
- storing generation status
- storing generated timestamp
- storing print count
- surfacing undertaking link in student list and dashboard flows

Future-ready requirement:
- if template generation is automated later, output must still write back only to the configured undertaking columns

### 4.6 Fees Module

Purpose:
- track fee-related status per student

Must support:
- fees if scholarship
- fees if no scholarship
- final fees
- paid amount
- due amount

Rules:
- formula-driven fee outputs should remain controlled by the sheet where applicable
- UI must display due amount in the list and dashboard

### 4.7 Scholarship Module

Purpose:
- track scholarship lifecycle

Must support:
- scholarship application status
- scholarship ID
- scholarship query text
- query submission date
- scholarship approved date
- scholarship credited amount
- scholarship credit date

Rules:
- dashboard must count `Query by Deptt.` cases
- scholarship desk must be able to identify pending records quickly

### 4.8 PRN / SCVT Module

Purpose:
- track state registration and PRN completion

Must support:
- PRN number
- SCVTUP registration number

Rules:
- missing PRN must count in dashboard
- missing SCVT must count in dashboard

### 4.9 Agent / Payment Module

Purpose:
- support direct and agent-based admissions

Must support:
- agent ID
- payment mode
- agreement status
- agreement effective date
- agreement revision number

Rules:
- if agent ID is present it must exist in `AGENTS_MASTER`
- if payment mode is present it must match supported modes

### 4.10 Validation / Master Data Module

Purpose:
- ensure user-entered values match valid masters

Masters used:
- `INSTITUTE_MASTER`
- `TRADE_MASTER`
- `AGENTS_MASTER`
- static option sets for gender, category, statuses, payment mode

Rules:
- institute validation must use `Institute_ID`
- trade validation must use `Trade`
- agent validation must use `Agent_ID`
- master data must be cached for speed

## 5. Sheet Architecture

## 5.1 Source of Truth

Primary source:
- `STUDENTS_MASTER`

Supporting sheets:
- `INSTITUTE_MASTER`
- `TRADE_MASTER`
- `AGENTS_MASTER`
- `ADMISSION_DESK`
- `SCHOLARSHIP_TRACKER`
- `PRN_TRACKER`
- `DOCUMENTS_CHECKLIST`
- `PRACTICAL_EXAM_CONTROL`
- `UNDERTAKING_AUTOMATION_SETUP`
- other finance and agent logs already present in the workbook

## 5.2 Mandatory Sheet Behavior

- `STUDENTS_MASTER` must preserve formula columns
- app writes must update manual fields only
- `ADMISSION_DESK` must mirror status-friendly columns from `STUDENTS_MASTER`
- mirror formulas must be allowed enough rows to spill
- all list and dashboard reads must ignore blank partial rows

## 5.3 ADMISSION_DESK Mapping

Expected headers:
- `Entry_Date`
- `Student_Name`
- `Mobile`
- `Trade`
- `Institute_ID`
- `Session`
- `Year`
- `Document_Status`
- `Undertaking_Status`
- `Admission_Status`
- `Student_ID`
- `Generated_Undertaking_Link`

Row 2 formulas:

- `A2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",""))`
- `B2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!C2:C))`
- `C2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!G2:G))`
- `D2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!D2:D))`
- `E2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!B2:B))`
- `F2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!E2:E))`
- `G2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!F2:F))`
- `H2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!AY2:AY))`
- `I2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!AZ2:AZ))`
- `J2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!BA2:BA))`
- `K2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!A2:A))`
- `L2` = `=ARRAYFORMULA(IF(STUDENTS_MASTER!B2:B="","",STUDENTS_MASTER!AT2:AT))`

Operational note:
- `ADMISSION_DESK` row count must always be greater than or equal to `STUDENTS_MASTER` row count

## 6. Data Write Rules

The backend must never use full-row `appendRow()` into `STUDENTS_MASTER` if formula columns exist in that sheet.

Write logic must:
- validate required fields
- validate master references
- acquire lock before save
- determine writable row safely
- write only manual fields
- flush once
- clear caches after save

Manual field set includes:
- institute and student identity
- demographic fields
- bank and scholarship fields
- operational statuses
- completion metadata

Formula-driven fields that must remain untouched by app writes include:
- `Student_ID`
- `Final_Fees`
- `Due_Amount`
- calculated status outputs
- undertaking output columns if formula-driven in future

## 7. Performance Requirements

The system must be optimized for speed from the first release.

### 7.1 Save Performance

Target:
- student save should feel immediate for normal rows
- user feedback should appear instantly while backend completes

Required optimizations:
- use `LockService`
- cache master data validation
- group contiguous cell writes
- avoid unnecessary full-sheet reads after save
- avoid reloading modules not currently visible

### 7.2 Filter Performance

Target:
- student list filtering should feel near-instant for common searches

Required optimizations:
- cache lightweight student list data
- read only required columns for listing when possible
- debounce text search
- avoid recomputing full dashboard on every filter event

### 7.3 Dashboard Performance

Target:
- dashboard should load fast enough for operational use

Required optimizations:
- compute from cached valid student data
- avoid repeated master lookups for dashboard rendering
- limit large tables to recent or top 20 records

### 7.4 Scaling Requirements

System must remain workable when:
- `STUDENTS_MASTER` grows beyond 10,000 rows
- multiple staff save admissions concurrently
- filters are used heavily during working hours

Recommended strategy for large scale:
- maintain a lightweight list-view cache or mirror sheet
- refresh cache on save
- use `ADMISSION_DESK` or a dedicated list-view sheet for operational read screens

## 8. UI / UX Requirements

The app must be attractive and easy to operate.

Must include:
- modern navigation
- clean dashboard cards
- responsive layout
- clear buttons
- loading states
- empty states
- success and error banners
- mobile-friendly stacking

Visual direction:
- warm, professional, modern
- clear status colors
- not a plain spreadsheet-like screen

Interaction requirements:
- prevent double-submit on save
- show record count in student list
- allow quick filter reset
- support direct navigation between dashboard, admission, and students

## 9. Technical Architecture

### 9.1 Backend

Platform:
- Google Apps Script V8

Responsibilities:
- serve HTML frontend
- read sheet data
- validate data
- save manual student fields
- upload files to Drive
- provide dashboard payloads
- provide filterable student list payloads

### 9.2 Frontend

Responsibilities:
- initialize app
- render dashboard
- render student list
- populate master dropdowns
- collect form data
- collect files
- call Apps Script backend
- render success and failure states

### 9.3 Drive Storage

Root folder:
- configured Drive folder ID

Responsibilities:
- create or reuse per-student folder
- store uploaded files
- return URLs after upload

## 10. Complete Module Flow

### 10.1 App Load Flow

1. user opens web app
2. frontend requests bootstrap payload
3. backend returns:
   - app title
   - masters
   - dashboard data
   - initial student list
4. frontend renders all visible sections

### 10.2 Admission Save Flow

1. user fills form
2. frontend validates required fields
3. frontend disables save button
4. backend validates masters
5. backend saves manual fields into `STUDENTS_MASTER`
6. backend returns generated student ID
7. frontend uploads selected files
8. frontend shows success or partial-success message
9. dashboard and student list refresh only as needed

### 10.3 Student Filter Flow

1. user types search or changes filter
2. frontend debounces if needed
3. backend receives filter object
4. backend filters cached student list
5. frontend renders table rows

### 10.4 Dashboard Flow

1. backend reads cached valid students
2. backend computes card metrics
3. backend computes recent admissions, pending work, due list
4. frontend renders cards and tables

### 10.5 Undertaking Flow

1. student record contains undertaking URL and status fields
2. `ADMISSION_DESK` mirrors link and statuses
3. student list shows open link when present

## 11. Error Handling Requirements

System must handle:
- sheet not found
- missing headers
- invalid institute / trade / agent
- save lock timeout
- upload failure
- empty result filters
- broken dashboard data
- spill range `#REF!` in mirrored sheets

Error behavior:
- show readable message to user
- do not silently fail
- do not wipe already-saved student data if upload fails later

## 12. Security / Data Safety Requirements

- only write to expected sheet names
- do not overwrite formula columns
- sanitize frontend-rendered text
- validate incoming data on backend
- prevent duplicate save clicks
- use lock during save to reduce collisions

## 13. Configuration Requirements

The following configuration must be explicit in code:

- sheet names
- Drive root folder ID
- app title
- cache keys
- manual field list
- required field list

Optional future config:
- undertaking template doc ID
- generated folder ID
- list-view mirror sheet name

## 14. Testing Requirements

Before sign-off, verify:

1. create one new student from UI
2. confirm student ID appears from formula
3. confirm student appears in student list
4. confirm search works by name, ID, and mobile
5. confirm institute and trade filters work
6. confirm uploaded documents appear in Drive folder
7. confirm `ADMISSION_DESK` mirrors the new record
8. confirm dashboard counts change meaningfully
9. confirm save button blocks duplicate submit
10. confirm error appears for invalid required fields

## 15. Known Operational Dependencies

- `STUDENTS_MASTER` formulas must remain intact
- `ADMISSION_DESK` formulas must continue to spill cleanly
- row count in mirror sheets must be sufficient
- sheet headers must match backend expectations exactly
- Drive folder must remain accessible to the Apps Script account

## 16. Recommended Next Build Priorities

These should be treated as part of the complete implementation, not optional leftovers.

### Priority 1

- optimize `getStudents()` using cached lightweight data
- optimize save flow to avoid unnecessary refreshes
- finalize Apps Script deployment with the real Drive folder ID

### Priority 2

- add dedicated list-view mirror sheet for very fast filtering
- separate dashboard metrics from full record payloads

### Priority 3

- add edit-student flow
- add detailed student profile view
- add undertaking generation action inside UI
- add fees transaction history view
- add scholarship detail view

## 17. Full Visibility Requirement

Because the owner wants to understand all modules, the final delivered app must make each major module visible either:

- as a top-level navigation page
- as a visible dashboard section
- or as a documented linked workflow

Nothing critical should remain hidden behind undocumented sheet logic.

Minimum visible modules in final app navigation or documentation:

- dashboard
- admission
- students
- documents
- undertaking
- scholarship
- PRN / SCVT
- fees
- agents / payment
- configuration and masters

## 18. Final Definition of Done

The system is complete only when:

- all core modules above are defined and understandable
- save flow is safe and fast
- filtering is fast and stable
- dashboard is meaningful
- sheet formulas are aligned
- document folder is configured
- no critical workflow is left as an undefined future task
- the owner can inspect how every module works

