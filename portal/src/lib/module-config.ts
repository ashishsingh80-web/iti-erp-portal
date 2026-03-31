export type PortalModule = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  highlights: string[];
  group: "dashboard" | "operations" | "finance" | "compliance" | "reports" | "administration";
};

export type PortalNavigationGroup = {
  key: PortalModule["group"];
  title: string;
  slugs: string[];
};

export const portalModules: PortalModule[] = [
  {
    slug: "dashboard",
    title: "Dashboard",
    shortTitle: "Dashboard",
    description: "Main control room for active session KPIs, queues, finance, and follow-up work.",
    highlights: ["Live KPIs", "Queue shortcuts", "Charts"],
    group: "dashboard"
  },
  {
    slug: "admissions",
    title: "Admissions",
    shortTitle: "Admissions",
    description: "Student onboarding, seat control, eligibility, photo, and qualification capture.",
    highlights: ["Seat units", "Eligibility", "Uploads"],
    group: "operations"
  },
  {
    slug: "enquiry",
    title: "Enquiry",
    shortTitle: "Enquiry",
    description: "Lead capture, follow-up pipeline, counselling notes, and conversion into admission.",
    highlights: ["Leads", "Follow-up", "Convert"],
    group: "operations"
  },
  {
    slug: "students",
    title: "Student Directory",
    shortTitle: "Students",
    description: "Searchable student directory with profile, workflow, and action history.",
    highlights: ["Search", "Profile", "Queue"],
    group: "operations"
  },
  {
    slug: "promote",
    title: "Promote Students",
    shortTitle: "Promote",
    description: "Promote 1st year students into 2nd year next-session records.",
    highlights: ["1st to 2nd", "Next session", "Student lifecycle"],
    group: "operations"
  },
  {
    slug: "alumni",
    title: "Alumni",
    shortTitle: "Alumni",
    description: "Send completed 2nd year students into alumni records.",
    highlights: ["2nd year", "Complete", "Alumni move"],
    group: "operations"
  },
  {
    slug: "student-archive",
    title: "Student Archive",
    shortTitle: "Archive",
    description: "Track suspected students, inactive-left cases, and legal-priority scholarship due cases.",
    highlights: ["Suspected", "Inactive", "Legal warning"],
    group: "operations"
  },
  {
    slug: "exam-status",
    title: "Exam Status",
    shortTitle: "Exam Status",
    description: "Track practical and theory result, appearance, re-attempt dates, and 4-attempt eligibility rule.",
    highlights: ["Practical", "Theory", "Re-attempts"],
    group: "operations"
  },
  {
    slug: "no-dues",
    title: "No Dues",
    shortTitle: "No Dues",
    description: "Department-wise student clearances for accounts, workshop, store, library, documents, and ID card.",
    highlights: ["Accounts", "Departments", "Clearance"],
    group: "operations"
  },
  {
    slug: "attendance",
    title: "Attendance",
    shortTitle: "Attendance",
    description: "Student and staff attendance with quick code entry, photo verification, and QR-ready cards.",
    highlights: ["Students", "Staff", "Quick mark"],
    group: "operations"
  },
  {
    slug: "inventory",
    title: "Inventory & Workshop",
    shortTitle: "Inventory",
    description: "Store and workshop item master, student issue-return register, and stock-linked no dues support.",
    highlights: ["Stock", "Issue Return", "Workshop"],
    group: "operations"
  },
  {
    slug: "library",
    title: "Library",
    shortTitle: "Library",
    description: "Book master, student issue-return register, and library-linked no dues blocking.",
    highlights: ["Books", "Issue Return", "Library"],
    group: "operations"
  },
  {
    slug: "communication",
    title: "Communication",
    shortTitle: "Communication",
    description: "Template bank, reminder queue, and prepared communication logs for institute follow-up work.",
    highlights: ["Templates", "Reminder Queue", "Logs"],
    group: "administration"
  },
  {
    slug: "grievance",
    title: "Complaint & Grievance",
    shortTitle: "Grievance",
    description: "Complaint register with linked student or staff cases, priority, status, and resolution tracking.",
    highlights: ["Cases", "Priority", "Resolution"],
    group: "administration"
  },
  {
    slug: "placement",
    title: "Placement & Apprenticeship",
    shortTitle: "Placement",
    description: "Company master, student placement records, apprenticeship workflow, and joining outcome tracking.",
    highlights: ["Companies", "Placement", "Apprenticeship"],
    group: "administration"
  },
  {
    slug: "backup",
    title: "Backup & Restore",
    shortTitle: "Backup",
    description: "System snapshot export, recovery register, and restore controls for local ERP backup safety.",
    highlights: ["Snapshots", "Recovery", "Downloads"],
    group: "administration"
  },
  {
    slug: "timetable",
    title: "Timetable",
    shortTitle: "Timetable",
    description: "Academic planning desk for session-wise trade schedule, faculty, room, and time slots.",
    highlights: ["Day-wise", "Trades", "Academic plan"],
    group: "operations"
  },
  {
    slug: "documents",
    title: "Documents",
    shortTitle: "Documents",
    description: "Verification desk for Aadhaar, marksheets, caste, income, and supporting documents.",
    highlights: ["Verify", "Pending", "Remarks"],
    group: "operations"
  },
  {
    slug: "undertaking",
    title: "Undertaking",
    shortTitle: "Undertaking",
    description: "Generate, print, upload signed copy, and complete admin review.",
    highlights: ["Print", "Upload", "Approval"],
    group: "operations"
  },
  {
    slug: "certificates",
    title: "Certificates",
    shortTitle: "Certificates",
    description: "Issue bonafide, character, no dues, and practical permission certificates with print logs.",
    highlights: ["Bonafide", "No Dues", "Print Log"],
    group: "operations"
  },
  {
    slug: "id-cards",
    title: "ID Cards",
    shortTitle: "ID Cards",
    description: "Search students and staff, then open printable identity cards with institute branding.",
    highlights: ["Students", "Staff", "Print"],
    group: "compliance"
  },
  {
    slug: "fees",
    title: "Fees",
    shortTitle: "Fees",
    description: "Student fees, agent collections, installment tracking, and due control.",
    highlights: ["Collections", "Due", "Agent ledger"],
    group: "finance"
  },
  {
    slug: "accounts",
    title: "Accounts",
    shortTitle: "Accounts",
    description: "Cashbook, bankbook, expenses, vendor bills, deposits, and finance reports.",
    highlights: ["Cashbook", "Expenses", "Vendors"],
    group: "finance"
  },
  {
    slug: "hr",
    title: "HR",
    shortTitle: "HR",
    description: "Staff registry, salary setup, and salary/payment history records.",
    highlights: ["Staff entry", "Salary", "Payment history"],
    group: "administration"
  },
  {
    slug: "scholarship",
    title: "Scholarship",
    shortTitle: "Scholarship",
    description: "Application, query, approval, and credited amount tracking.",
    highlights: ["Applied", "Query", "Approved"],
    group: "compliance"
  },
  {
    slug: "scvt",
    title: "SCVT",
    shortTitle: "SCVT",
    description: "SCVT registration desk for entry roll, admission status, and SCVT number completion.",
    highlights: ["SCVT", "Roll No.", "Verified"],
    group: "compliance"
  },
  {
    slug: "prn",
    title: "PRN",
    shortTitle: "PRN",
    description: "PRN desk that opens only after SCVT registration is completed.",
    highlights: ["PRN", "Locked by SCVT", "Verified"],
    group: "compliance"
  },
  {
    slug: "reports",
    title: "Reports & Export",
    shortTitle: "Reports",
    description: "Operational, finance, vendor, agent, and compliance report exports.",
    highlights: ["CSV", "Filters", "Quick downloads"],
    group: "reports"
  },
  {
    slug: "management",
    title: "Management Dashboard",
    shortTitle: "Management",
    description: "Executive dashboard for institute comparison, trade demand, session finance, and monthly review.",
    highlights: ["Executive view", "Comparisons", "Print summary"],
    group: "reports"
  },
  {
    slug: "agents",
    title: "Agents",
    shortTitle: "Agents",
    description: "Register agents, keep contact details, and control active status.",
    highlights: ["Register", "Edit", "Active status"],
    group: "administration"
  },
  {
    slug: "settings",
    title: "Masters & Admin",
    shortTitle: "Masters",
    description: "Institute setup, master controls, numbering, templates, users, audit, and admin recovery tools.",
    highlights: ["Institute Setup", "Masters", "Users"],
    group: "administration"
  }
];

export const portalNavigationGroups: PortalNavigationGroup[] = [
  { key: "dashboard", title: "Control Room", slugs: ["dashboard"] },
  { key: "operations", title: "Admissions & Counselling", slugs: ["admissions", "enquiry"] },
  {
    key: "operations",
    title: "Students & Lifecycle",
    slugs: ["students", "promote", "alumni", "student-archive", "attendance"]
  },
  {
    key: "compliance",
    title: "Compliance & Certification",
    slugs: ["documents", "scholarship", "scvt", "prn", "undertaking", "exam-status", "no-dues", "certificates", "id-cards"]
  },
  {
    key: "operations",
    title: "Academic & Campus",
    slugs: ["timetable", "inventory", "library", "placement"]
  },
  { key: "finance", title: "Finance & HR", slugs: ["fees", "accounts", "agents", "hr"] },
  { key: "reports", title: "Reports & Management", slugs: ["reports", "management"] },
  { key: "administration", title: "Administration", slugs: ["communication", "grievance", "backup", "settings"] }
];
