import { notFound } from "next/navigation";
import { AccountsDesk } from "@/components/accounts/accounts-desk";
import { AdmissionFormPreview } from "@/components/admissions/admission-form-preview";
import { AdmissionsDesk } from "@/components/admissions/admissions-desk";
import { AgentsDesk } from "@/components/agents/agents-desk";
import { AttendanceDesk } from "@/components/attendance/attendance-desk";
import { BackupDesk } from "@/components/backup/backup-desk";
import { AuditLogPanel } from "@/components/audit/audit-log-panel";
import { CertificatesDesk } from "@/components/certificates/certificates-desk";
import { CommunicationDesk } from "@/components/communication/communication-desk";
import { DocumentsDesk } from "@/components/documents/documents-desk";
import { EnquiryDesk } from "@/components/enquiry/enquiry-desk";
import { ExamStatusDesk } from "@/components/exams/exam-status-desk";
import { AgentLedgerPanel } from "@/components/fees/agent-ledger-panel";
import { AgentOutstandingPanel } from "@/components/fees/agent-outstanding-panel";
import { FeeCollectionDesk } from "@/components/fees/fee-collection-desk";
import { GrievanceDesk } from "@/components/grievance/grievance-desk";
import { HrDesk } from "@/components/hr/hr-desk";
import { IdCardsDesk } from "@/components/id-cards/id-cards-desk";
import { InventoryDesk } from "@/components/inventory/inventory-desk";
import { LibraryDesk } from "@/components/library/library-desk";
import { ManagementDashboard } from "@/components/management/management-dashboard";
import { OcrImportDesk } from "@/components/modules/ocr-import-desk";
import { DashboardOperations } from "@/components/modules/dashboard-operations";
import { StageBoard } from "@/components/modules/stage-board";
import { PlacementDesk } from "@/components/placement/placement-desk";
import { PrnDesk } from "@/components/prn/prn-desk";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { ScvtDesk } from "@/components/scvt/scvt-desk";
import { ScholarshipDesk } from "@/components/scholarship/scholarship-desk";
import { AddressMasterPanel } from "@/components/settings/address-master-panel";
import { ClassificationMastersPanel } from "@/components/settings/classification-masters-panel";
import { ExpandableSettingsSection } from "@/components/settings/expandable-settings-section";
import { FinanceComplianceMastersPanel } from "@/components/settings/finance-compliance-masters-panel";
import { InstituteBrandingPanel } from "@/components/settings/institute-branding-panel";
import { MasterControlPanel } from "@/components/settings/master-control-panel";
import { NumberingControlPanel } from "@/components/settings/numbering-control-panel";
import { RecycleBinPanel } from "@/components/settings/recycle-bin-panel";
import { SessionControlPanel } from "@/components/settings/session-control-panel";
import { InstituteMasterPanel } from "@/components/settings/institute-master-panel";
import { UndertakingTemplatePanel } from "@/components/settings/undertaking-template-panel";
import { UserManagementPanel } from "@/components/settings/user-management-panel";
import { TimetableDesk } from "@/components/timetable/timetable-desk";
import { UndertakingDesk } from "@/components/undertaking/undertaking-desk";
import { HistoricalUploadDesk } from "@/components/students/historical-upload-desk";
import { AlumniDesk } from "@/components/students/alumni-desk";
import { NoDuesDesk } from "@/components/students/no-dues-desk";
import { PromotionDesk } from "@/components/students/promotion-desk";
import { StudentArchiveDesk } from "@/components/students/student-archive-desk";
import { StudentDirectoryPreview } from "@/components/students/student-directory-preview";
import { canUserAccessModule } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { portalModules } from "@/lib/module-config";
import {
  getDocumentsStageBoard,
  getExamStatusStageBoard,
  getFeesStageBoard,
  getPrnStageBoard,
  getScvtStageBoard,
  getScholarshipStageBoard,
  getUndertakingStageBoard
} from "@/lib/services/module-stage-service";

export default async function ModulePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const lang = await readAppLanguage();
  const module = portalModules.find((item) => item.slug === slug);

  if (!module) notFound();
  if (!canUserAccessModule(user, slug)) notFound();

  const liveBoard =
    slug === "documents"
      ? await getDocumentsStageBoard()
      : slug === "fees"
        ? await getFeesStageBoard()
        : slug === "scholarship"
          ? await getScholarshipStageBoard()
          : slug === "exam-status"
            ? await getExamStatusStageBoard()
          : slug === "scvt"
            ? await getScvtStageBoard()
            : slug === "prn"
              ? await getPrnStageBoard()
              : slug === "undertaking"
                ? await getUndertakingStageBoard()
                : null;

  return (
    <div className="space-y-6">
      {slug !== "dashboard" ? (
        <section className="surface flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="eyebrow-compact">{t(lang, module.group.replace("-", " "))}</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-950">{t(lang, module.title)}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {module.highlights.map((item) => (
              <span key={item} className="chip-success">
                {t(lang, item)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {slug === "dashboard" ? <DashboardOperations /> : null}
      {slug === "admissions" ? (
        <AdmissionsDesk
          filters={{
            search: typeof query.search === "string" ? query.search : "",
            instituteCode: typeof query.instituteCode === "string" ? query.instituteCode : "",
            tradeValue: typeof query.tradeValue === "string" ? query.tradeValue : "",
            session: typeof query.session === "string" ? query.session : "",
            yearLabel: typeof query.yearLabel === "string" ? query.yearLabel : "",
            category: typeof query.category === "string" ? query.category : "",
            status: typeof query.status === "string" ? query.status : "",
            assignment: typeof query.assignment === "string" ? query.assignment : "",
            unitNumber: typeof query.unitNumber === "string" ? query.unitNumber : "",
            view: typeof query.view === "string" ? query.view : ""
          }}
        />
      ) : null}
      {slug === "enquiry" ? <EnquiryDesk /> : null}
      {slug === "documents" ? <DocumentsDesk /> : null}
      {slug === "exam-status" ? <ExamStatusDesk search={typeof query.search === "string" ? query.search : ""} /> : null}
      {slug === "attendance" ? <AttendanceDesk /> : null}
      {slug === "undertaking" ? <UndertakingDesk /> : null}
      {slug === "inventory" ? <InventoryDesk /> : null}
      {slug === "library" ? <LibraryDesk /> : null}
      {slug === "timetable" ? <TimetableDesk /> : null}
      {slug === "certificates" ? <CertificatesDesk /> : null}
      {slug === "id-cards" ? (
        <IdCardsDesk
          search={typeof query.search === "string" ? query.search : ""}
          registerSearch={typeof query.registerSearch === "string" ? query.registerSearch : ""}
          registerType={typeof query.registerType === "string" ? query.registerType : ""}
          registerScope={typeof query.registerScope === "string" ? query.registerScope : "all"}
          registerStatus={typeof query.registerStatus === "string" ? query.registerStatus : ""}
          registerReplacementStatus={typeof query.registerReplacementStatus === "string" ? query.registerReplacementStatus : ""}
        />
      ) : null}
      {slug === "students" ? (
        <>
          <HistoricalUploadDesk />
          <StudentDirectoryPreview />
        </>
      ) : null}
      {slug === "promote" ? <PromotionDesk /> : null}
      {slug === "alumni" ? <AlumniDesk /> : null}
      {slug === "student-archive" ? <StudentArchiveDesk /> : null}
      {slug === "no-dues" ? <NoDuesDesk /> : null}
      {slug === "fees" ? (
        <>
          <FeeCollectionDesk />
          <AgentLedgerPanel
            initialFilters={{
              agentCode: typeof query.agentCode === "string" ? query.agentCode : "",
              search: typeof query.search === "string" ? query.search : "",
              session: typeof query.session === "string" ? query.session : "",
              yearLabel: typeof query.yearLabel === "string" ? query.yearLabel : ""
            }}
          />
          <AgentOutstandingPanel />
        </>
      ) : null}
      {slug === "accounts" ? (
        <AccountsDesk
          initialFilters={{
            entryType: typeof query.entryType === "string" ? query.entryType : "",
            month: typeof query.filterMonth === "string" ? query.filterMonth : "",
            dateFrom: typeof query.filterDateFrom === "string" ? query.filterDateFrom : "",
            dateTo: typeof query.filterDateTo === "string" ? query.filterDateTo : "",
            vendorSearch: typeof query.vendorSearch === "string" ? query.vendorSearch : "",
            reportPeriod: typeof query.reportPeriod === "string" ? query.reportPeriod : "",
            reportDate: typeof query.reportDate === "string" ? query.reportDate : "",
            reportWeekDate: typeof query.reportWeekDate === "string" ? query.reportWeekDate : "",
            reportMonth: typeof query.reportMonth === "string" ? query.reportMonth : "",
            reportFromDate: typeof query.reportFromDate === "string" ? query.reportFromDate : "",
            reportToDate: typeof query.reportToDate === "string" ? query.reportToDate : ""
          }}
        />
      ) : null}
      {slug === "hr" ? <HrDesk /> : null}
      {slug === "scholarship" ? <ScholarshipDesk /> : null}
      {slug === "scvt" ? <ScvtDesk /> : null}
      {slug === "prn" ? <PrnDesk /> : null}
      {slug === "reports" ? (
        <ReportsDashboard
          filters={{
            report: typeof query.report === "string" ? query.report : "",
            search: typeof query.search === "string" ? query.search : "",
            instituteCode: typeof query.instituteCode === "string" ? query.instituteCode : "",
            session: typeof query.session === "string" ? query.session : "",
            yearLabel: typeof query.yearLabel === "string" ? query.yearLabel : "",
            tradeValue: typeof query.tradeValue === "string" ? query.tradeValue : "",
            admissionMode: typeof query.admissionMode === "string" ? query.admissionMode : "",
            paymentMode: typeof query.paymentMode === "string" ? query.paymentMode : "",
            studentStatus: typeof query.studentStatus === "string" ? query.studentStatus : "",
            documentStatus: typeof query.documentStatus === "string" ? query.documentStatus : "",
            paymentStatus: typeof query.paymentStatus === "string" ? query.paymentStatus : "",
            scholarshipStatus: typeof query.scholarshipStatus === "string" ? query.scholarshipStatus : "",
            enquiryStatus: typeof query.enquiryStatus === "string" ? query.enquiryStatus : "",
            dateFrom: typeof query.dateFrom === "string" ? query.dateFrom : "",
            dateTo: typeof query.dateTo === "string" ? query.dateTo : "",
            sortBy: typeof query.sortBy === "string" ? query.sortBy : "",
            sortDir: typeof query.sortDir === "string" ? query.sortDir : "",
            page: typeof query.page === "string" ? query.page : "",
            pageSize: typeof query.pageSize === "string" ? query.pageSize : ""
          }}
        />
      ) : null}
      {slug === "management" ? (
        <ManagementDashboard
          filters={{
            session: typeof query.session === "string" ? query.session : ""
          }}
        />
      ) : null}
      {slug === "agents" ? <AgentsDesk /> : null}
      {slug === "communication" ? <CommunicationDesk /> : null}
      {slug === "grievance" ? <GrievanceDesk /> : null}
      {slug === "placement" ? <PlacementDesk /> : null}
      {slug === "backup" ? <BackupDesk /> : null}
      {slug === "settings" && ["SUPER_ADMIN", "ADMIN"].includes(user.role) ? (
        <div className="grid gap-6">
          <ExpandableSettingsSection
            badges={[
              { label: "Master overview", tone: "success" },
              { label: "Expand master map", tone: "neutral" }
            ]}
            defaultOpen
            description="See the institute setup map, live masters, and remaining setup areas in one expandable control block."
            eyebrow="Master Control"
            title="Institute Setup Overview"
          >
            <MasterControlPanel />
          </ExpandableSettingsSection>

          <ExpandableSettingsSection
            badges={[
              { label: "Institute master live", tone: "success" },
              { label: "Session master live", tone: "success" },
              { label: "Unit / shift live", tone: "success" }
            ]}
            defaultOpen
            description="Institute identity, affiliation-linked codes, trade master, academic session, and working academic structure in one expandable section."
            eyebrow="Section 1"
            title="Institute & Academic Setup"
          >
            <div className="grid gap-6">
              <InstituteMasterPanel />
              <InstituteBrandingPanel />
              <SessionControlPanel />
              <ClassificationMastersPanel />
              <FinanceComplianceMastersPanel />
            </div>
          </ExpandableSettingsSection>

          <ExpandableSettingsSection
            badges={[
              { label: "Address master live", tone: "success" },
              { label: "Numbering live", tone: "success" },
              { label: "Template live", tone: "success" }
            ]}
            description="Location masters, numbering control, and print-template setup that support admissions, fees, and document generation."
            eyebrow="Section 2"
            title="Geography, Finance & Templates"
          >
            <div className="grid gap-6">
              <AddressMasterPanel />
              <NumberingControlPanel />
              <UndertakingTemplatePanel />
            </div>
          </ExpandableSettingsSection>

          <ExpandableSettingsSection
            badges={[
              { label: "Users live", tone: "success" },
              { label: "Recycle bin live", tone: "success" },
              { label: "Audit live", tone: "success" }
            ]}
            description="User access, recovery, and audit controls for safe institute operations."
            eyebrow="Section 3"
            title="Security & Administration"
          >
            <div className="grid gap-6">
              <UserManagementPanel />
              <RecycleBinPanel />
              <AuditLogPanel />
            </div>
          </ExpandableSettingsSection>
        </div>
      ) : null}
      {liveBoard ? <StageBoard board={liveBoard} /> : null}
    </div>
  );
}
