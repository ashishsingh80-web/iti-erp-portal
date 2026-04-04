import type { PortalModule } from "@/lib/module-config";

export type BlueprintSidebarItem = {
  label: string;
  slug?: PortalModule["slug"];
  href?: string;
  status: "live" | "partial" | "planned";
};

export type BlueprintSidebarSection = {
  key: string;
  title: string;
  items: BlueprintSidebarItem[];
};

export const blueprintSidebarSections: BlueprintSidebarSection[] = [
  {
    key: "foundation",
    title: "Phase 1 Foundation",
    items: [
      { label: "Dashboard", slug: "dashboard", href: "/", status: "live" },
      { label: "Masters & Admin", slug: "settings", href: "/modules/settings", status: "partial" },
      { label: "Reports & Export", slug: "reports", href: "/modules/reports", status: "partial" },
      { label: "Audit Trail", slug: "settings", href: "/modules/settings", status: "live" },
      { label: "Backup & Restore", slug: "backup", href: "/modules/backup", status: "live" }
    ]
  },
  {
    key: "admissions",
    title: "Admissions & Students",
    items: [
      { label: "Admissions", slug: "admissions", href: "/modules/admissions", status: "live" },
      { label: "Enquiry", slug: "enquiry", href: "/modules/enquiry", status: "live" },
      { label: "Student Directory", slug: "students", href: "/modules/students", status: "live" },
      { label: "Promote Students", slug: "promote", href: "/modules/promote", status: "live" },
      { label: "Alumni", slug: "alumni", href: "/modules/alumni", status: "live" },
      { label: "Student Archive", slug: "student-archive", href: "/modules/student-archive", status: "live" }
    ]
  },
  {
    key: "compliance",
    title: "Compliance & Exams",
    items: [
      { label: "Documents", slug: "documents", href: "/modules/documents", status: "live" },
      { label: "Scholarship", slug: "scholarship", href: "/modules/scholarship", status: "live" },
      { label: "SCVT", slug: "scvt", href: "/modules/scvt", status: "live" },
      { label: "PRN", slug: "prn", href: "/modules/prn", status: "live" },
      { label: "Undertaking", slug: "undertaking", href: "/modules/undertaking", status: "live" },
      { label: "Exam Status", slug: "exam-status", href: "/modules/exam-status", status: "live" },
      { label: "No Dues", slug: "no-dues", href: "/modules/no-dues", status: "live" },
      { label: "Certificate Generation", slug: "certificates", href: "/modules/certificates", status: "live" }
    ]
  },
  {
    key: "finance",
    title: "Finance & Operations",
    items: [
      { label: "Fees", slug: "fees", href: "/modules/fees?tab=collect", status: "live" },
      { label: "Accounts", slug: "accounts", href: "/modules/accounts", status: "partial" },
      { label: "Attendance", slug: "attendance", href: "/modules/attendance", status: "live" },
      { label: "Agents", slug: "agents", href: "/modules/agents", status: "live" }
    ]
  },
  {
    key: "admin-growth",
    title: "Admin & Growth",
    items: [
      { label: "HR", slug: "hr", href: "/modules/hr", status: "partial" },
      { label: "Timetable", slug: "timetable", href: "/modules/timetable", status: "live" },
      { label: "Inventory & Workshop", slug: "inventory", href: "/modules/inventory", status: "live" },
      { label: "Library", slug: "library", href: "/modules/library", status: "live" },
      { label: "Communication", slug: "communication", href: "/modules/communication", status: "live" },
      { label: "Grievance", slug: "grievance", href: "/modules/grievance", status: "live" },
      { label: "Placement", slug: "placement", href: "/modules/placement", status: "live" }
    ]
  }
];

export const blueprintCompletionAudit = [
  { area: "Institute Setup & Master Control", status: "PARTIAL", note: "Session, numbering, address, users, and template controls exist; institute and trade master CRUD started now." },
  { area: "User Management & Role Permissions", status: "LIVE", note: "Role/module/action controls, login, profile, audit, and custom access are working." },
  { area: "Admission Management", status: "LIVE", note: "Structured admissions, seat/unit control, uploads, DOB, sessions, and OCR-linked institute data are working." },
  { area: "Inquiry & Lead Management", status: "LIVE", note: "Lead capture, follow-up, conversion to admission, dashboard metrics, and enquiry reports are now active." },
  { area: "Document Verification", status: "LIVE", note: "Upload, verify, reject, incomplete, restore, and student-linked document control are active." },
  { area: "Student Master & Lifecycle", status: "LIVE", note: "Student 360, promote, alumni, archive, and lifecycle queue controls are active." },
  { area: "Fees Management", status: "LIVE", note: "Receipts, agent ledger, due logic, scholarship-linked fee logic, and finance linkage are active." },
  { area: "Attendance Management", status: "LIVE", note: "Student/staff attendance, quick entry, QR-ready, and camera scan flow are active." },
  { area: "Timetable & Academic Planning", status: "LIVE", note: "Session-wise institute/trade timetable desk with day, time, instructor, room, batch, and practical/theory planning is active." },
  { area: "Staff & HR", status: "PARTIAL", note: "Staff registry, qualifications, documents, salary/payment and attendance exist; leave/payroll depth still pending." },
  { area: "Scholarship Management", status: "LIVE", note: "Applied/query/approved/credited tracking and OCR import desk are active." },
  { area: "Undertaking & Legal Document Management", status: "LIVE", note: "Template, print, signed upload, admin approval, and duplicate detection are active." },
  { area: "Examination Management", status: "PARTIAL", note: "Exam status and reappear logic exist; full eligibility/no-dues/result workflow still pending." },
  { area: "No Dues Management", status: "LIVE", note: "Department-wise clearance desk with ready/pending status and fee awareness is active." },
  { area: "Certificate & Document Generation", status: "PARTIAL", note: "Institute certificates are active, but template editing, QR, and more certificate types are still pending." },
  { area: "Inventory, Store & Workshop Tools", status: "LIVE", note: "Stock master, issue-return register, and no-dues-linked pending return blocking are now active." },
  { area: "Library", status: "LIVE", note: "Book master, issue-return register, and no-dues-linked pending book blocking are now active." },
  { area: "Communication", status: "PARTIAL", note: "Template bank, reminder queue, and prepared communication logs are active; external SMS/WhatsApp/email delivery is still pending." },
  { area: "Complaint & Grievance", status: "LIVE", note: "Case register with linked student/staff grievances, priority, status, and resolution tracking is now active." },
  { area: "Placement & Apprenticeship", status: "LIVE", note: "Company master, student placement register, apprenticeship status, and joining outcome tracking are active." },
  { area: "Alumni & Pass-out Tracking", status: "LIVE", note: "Alumni module and pass-out handling exist." },
  { area: "Dashboard & MIS Reports", status: "PARTIAL", note: "Strong dashboard/reporting exists, but more module-wise MIS can still be added." },
  { area: "Audit Log & History", status: "LIVE", note: "Audit log and sensitive action tracking are active." },
  { area: "Settings & Configuration", status: "PARTIAL", note: "Strong foundation exists, but complete master control is still expanding." },
  { area: "Backup & Restore", status: "LIVE", note: "Local JSON snapshot export, backup register, download, and destructive restore workflow are active." },
  { area: "Mobile & Responsive Access", status: "PARTIAL", note: "Responsive polish exists, but mobile-specific workflow optimization is still pending." }
];
