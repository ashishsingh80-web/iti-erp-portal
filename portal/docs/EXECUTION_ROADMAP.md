# ITI ERP Portal Execution Roadmap

## Current Status

### Completed Modules and Features

#### 1. Core Platform
- Login and logout
- Role-based access control
- Per-user module allow/disallow by admin
- Per-user action access: `view`, `add`, `edit`, `delete`
- Audit log
- Recycle bin
- Soft delete for students and documents

#### 2. Admissions
- Admission form with validation
- Institute-wise trade filtering
- Direct and agent admission modes
- 10th-pass requirement support
- Real database-backed student creation
- Student code generation
- Optional email support
- Optional parent Aadhaar support

#### 3. Student Directory and Profile
- Fast searchable student list
- Student profile page
- Institute and trade visibility
- Live student lifecycle data
- Dashboard-to-student filtered navigation

#### 4. Documents
- Document upload
- Verify / reject / incomplete actions
- Document delete and restore
- Student profile document panel

#### 5. Fees
- Student fee profile
- Installment support
- Scholarship-sensitive fee logic
- Agent-sensitive fee logic
- Agent-to-institute conversion fields
- Reminder count and conversion reason tracking
- Practical exam eligibility with admin override
- Student-wise and bulk fee collection desk
- Agent ledger desk
- Equal distribution for selected students
- Agent + session + year based distribution filters

#### 6. Scholarship
- Scholarship status update flow
- Query / approval / credit fields
- Fee effect after scholarship approval

#### 7. PRN / SCVT
- PRN and SCVT update flow
- Pending tracking

#### 8. Undertaking
- Undertaking tracking
- Upload/status support

#### 9. Reports
- Reports dashboard
- CSV export

#### 10. Accounts
- Accounts module
- Expense entry
- Income entry
- Cash deposit in bank
- Head and sub-head support
- Edit and delete
- Date and month filters
- Printable cashbook-style screen
- Payment mode totals

#### 11. Dashboard
- Live dashboard metrics
- Stage boards
- Queue navigation
- Today's available cash
- Payment mode helper summary

## Remaining Work

### Phase 1: Finance Completion
Priority: Critical
Estimated effort: 6-8 days
Owner: Codex + finance validation from user

#### Features
- Opening balance and closing balance
- Daily cashbook closing
- Separate bankbook
- Contra handling for cash-to-bank and bank-to-cash movement
- Voucher number / receipt number generation
- Vendor / party ledger
- Auto-post fee receipts into accounts
- Agent outstanding ledger
- Re-allocation of unallocated agent balance
- Agent statement report
- Daily finance reports

#### Success Criteria
- Every fee and account entry can be reconciled
- Cash on hand is always explainable
- Bank deposits are traceable
- Agent dues and collections are visible student-wise and agent-wise

### Phase 2: Masters and Settings Completion
Priority: Critical
Estimated effort: 4-5 days
Owner: Codex + user for business rules

#### Features
- Institute CRUD
- Trade CRUD
- Agent CRUD
- Session management
- Payment mode management
- Account head management
- Account sub-head management
- Fee configuration screen
- Scholarship fee rules
- Practical exam rule settings

#### Success Criteria
- Major business rules are no longer hardcoded
- Admin can update masters without code changes

### Phase 3: Workflow Automation
Priority: High
Estimated effort: 4-6 days
Owner: Codex

#### Features
- Required document rules engine
- Student completion automation
- Fee due automation
- Scholarship checklist automation
- PRN / SCVT pending automation
- Undertaking completion automation
- Pending blocker indicators on profile

#### Success Criteria
- Staff do less manual checking
- Incomplete cases surface automatically

### Phase 4: Follow-Up and Reminder System
Priority: High
Estimated effort: 3-4 days
Owner: Codex

#### Features
- Fee reminder log
- Agent reminder log
- Scholarship follow-up log
- Document pending follow-up log
- Callback / next action date
- Desk-wise task queue

#### Success Criteria
- No important pending case depends only on memory

### Phase 5: Reporting Package
Priority: High
Estimated effort: 4-5 days
Owner: Codex + user for output format approval

#### Features
- Admission reports
- Fee collection reports
- Due balance reports
- Agent collection and outstanding reports
- Expense reports
- Income reports
- Scholarship reports
- PRN / SCVT reports
- Daily summary
- Monthly summary

#### Success Criteria
- Management can track operations without checking raw tables

### Phase 6: File Storage Hardening
Priority: Medium
Estimated effort: 3-4 days
Owner: Codex

#### Features
- Move uploads from local storage to Google Drive or S3
- Folder structure standardization
- Safer document URLs
- Backup/export support

#### Success Criteria
- Documents are production-safe and not tied to local development only

### Phase 7: Production Readiness
Priority: Critical before launch
Estimated effort: 3-5 days
Owner: Codex + user

#### Features
- Production deployment
- Production database setup
- Environment configuration
- Backup strategy
- Restore process
- Admin-first production seed
- Go-live checklist

#### Success Criteria
- Portal is safe to run outside localhost

## Recommended Immediate Execution Order

### Sprint 1
- Opening balance / closing balance
- Cashbook and bankbook
- Auto-post fees into accounts
- Agent outstanding ledger

### Sprint 2
- Masters and settings UI
- Session management
- Payment mode management
- Account head and sub-head management

### Sprint 3
- Workflow automation
- Reminder system
- Follow-up registers

### Sprint 4
- Reports package
- Finance exports
- Agent reports
- Scholarship and PRN / SCVT exports

### Sprint 5
- File storage hardening
- Production deployment
- Launch checklist

## Working Task Board

| Phase | Feature | Priority | Status | Owner | Effort |
|---|---|---|---|---|---|
| Finance | Opening and closing balance | Critical | Pending | Codex | 1 day |
| Finance | Cashbook and bankbook | Critical | Pending | Codex | 1-2 days |
| Finance | Auto-post fee receipts into accounts | Critical | Pending | Codex | 1 day |
| Finance | Agent outstanding ledger | Critical | Pending | Codex | 1-2 days |
| Finance | Agent re-allocation flow | High | Pending | Codex | 1 day |
| Masters | Institute/trade/agent CRUD | Critical | Pending | Codex | 1-2 days |
| Masters | Session/payment mode management | Critical | Pending | Codex | 1 day |
| Masters | Account head/sub-head management | Critical | Pending | Codex | 1 day |
| Workflow | Document rules engine | High | Pending | Codex | 1-2 days |
| Workflow | Completion automation | High | Pending | Codex | 1 day |
| Follow-up | Reminder registers | High | Pending | Codex | 1 day |
| Reports | Finance and operational reports | High | Pending | Codex | 2 days |
| Storage | Drive or S3 migration | Medium | Pending | Codex | 2 days |
| Launch | Production deployment | Critical | Pending | Codex + User | 2 days |

## Definition of Completion

The ERP should be treated as fully complete only when:
- all major modules are working
- finance and fees are reconciled
- heads/sub-heads and masters are admin-manageable
- reminders and follow-up are operational
- reports are exportable
- file storage is production-safe
- deployment and backup are complete
