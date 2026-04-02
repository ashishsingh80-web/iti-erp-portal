import dynamic from "next/dynamic";
import { ModuleDeskSkeleton } from "./module-desk-skeleton";

export const LazyDashboardOperations = dynamic(
  () => import("@/components/modules/dashboard-operations").then((m) => ({ default: m.DashboardOperations })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyAdmissionsDesk = dynamic(
  () => import("@/components/admissions/admissions-desk").then((m) => ({ default: m.AdmissionsDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyEnquiryDesk = dynamic(
  () => import("@/components/enquiry/enquiry-desk").then((m) => ({ default: m.EnquiryDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyDocumentsDesk = dynamic(
  () => import("@/components/documents/documents-desk").then((m) => ({ default: m.DocumentsDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyExamStatusDesk = dynamic(
  () => import("@/components/exams/exam-status-desk").then((m) => ({ default: m.ExamStatusDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyAttendanceDesk = dynamic(
  () => import("@/components/attendance/attendance-desk").then((m) => ({ default: m.AttendanceDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyUndertakingDesk = dynamic(
  () => import("@/components/undertaking/undertaking-desk").then((m) => ({ default: m.UndertakingDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyInventoryDesk = dynamic(
  () => import("@/components/inventory/inventory-desk").then((m) => ({ default: m.InventoryDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyLibraryDesk = dynamic(
  () => import("@/components/library/library-desk").then((m) => ({ default: m.LibraryDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyTimetableDesk = dynamic(
  () => import("@/components/timetable/timetable-desk").then((m) => ({ default: m.TimetableDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyCertificatesDesk = dynamic(
  () => import("@/components/certificates/certificates-desk").then((m) => ({ default: m.CertificatesDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyIdCardsDesk = dynamic(
  () => import("@/components/id-cards/id-cards-desk").then((m) => ({ default: m.IdCardsDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyStudentsModuleGroup = dynamic(
  () => import("./students-module-group").then((m) => ({ default: m.StudentsModuleGroup })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyPromotionDesk = dynamic(
  () => import("@/components/students/promotion-desk").then((m) => ({ default: m.PromotionDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyAlumniDesk = dynamic(
  () => import("@/components/students/alumni-desk").then((m) => ({ default: m.AlumniDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyStudentArchiveDesk = dynamic(
  () => import("@/components/students/student-archive-desk").then((m) => ({ default: m.StudentArchiveDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyNoDuesDesk = dynamic(
  () => import("@/components/students/no-dues-desk").then((m) => ({ default: m.NoDuesDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyFeesModuleGroup = dynamic(
  () => import("./fees-module-group").then((m) => ({ default: m.FeesModuleGroup })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyAccountsDesk = dynamic(
  () => import("@/components/accounts/accounts-desk").then((m) => ({ default: m.AccountsDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyHrDesk = dynamic(
  () => import("@/components/hr/hr-desk").then((m) => ({ default: m.HrDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyScholarshipDesk = dynamic(
  () => import("@/components/scholarship/scholarship-desk").then((m) => ({ default: m.ScholarshipDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyScvtDesk = dynamic(
  () => import("@/components/scvt/scvt-desk").then((m) => ({ default: m.ScvtDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyPrnDesk = dynamic(
  () => import("@/components/prn/prn-desk").then((m) => ({ default: m.PrnDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyReportsDashboard = dynamic(
  () => import("@/components/reports/reports-dashboard").then((m) => ({ default: m.ReportsDashboard })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyManagementDashboard = dynamic(
  () => import("@/components/management/management-dashboard").then((m) => ({ default: m.ManagementDashboard })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyAgentsDesk = dynamic(
  () => import("@/components/agents/agents-desk").then((m) => ({ default: m.AgentsDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyCommunicationDesk = dynamic(
  () => import("@/components/communication/communication-desk").then((m) => ({ default: m.CommunicationDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyGrievanceDesk = dynamic(
  () => import("@/components/grievance/grievance-desk").then((m) => ({ default: m.GrievanceDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyPlacementDesk = dynamic(
  () => import("@/components/placement/placement-desk").then((m) => ({ default: m.PlacementDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyBackupDesk = dynamic(
  () => import("@/components/backup/backup-desk").then((m) => ({ default: m.BackupDesk })),
  { loading: () => <ModuleDeskSkeleton /> }
);

export const LazyModuleSettingsContent = dynamic(
  () => import("./module-settings-content").then((m) => ({ default: m.ModuleSettingsContent })),
  { loading: () => <ModuleDeskSkeleton /> }
);
