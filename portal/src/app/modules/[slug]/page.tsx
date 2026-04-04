import { notFound, redirect } from "next/navigation";
import { StageBoard } from "@/components/modules/stage-board";
import { canUserAccessModule } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { portalModules, type PortalModule } from "@/lib/module-config";

const MODULE_GROUP_EYEBROW: Record<PortalModule["group"], string> = {
  dashboard: "Dashboard",
  operations: "Operations",
  finance: "Finance",
  compliance: "Compliance",
  reports: "Reports",
  administration: "Administration"
};
import {
  getDocumentsStageBoard,
  getExamStatusStageBoard,
  getFeesStageBoard,
  getPrnStageBoard,
  getScvtStageBoard,
  getScholarshipStageBoard,
  getUndertakingStageBoard
} from "@/lib/services/module-stage-service";
import {
  LazyAccountsDesk,
  LazyAdmissionsDesk,
  LazyAgentsDesk,
  LazyAlumniDesk,
  LazyAttendanceDesk,
  LazyBackupDesk,
  LazyCertificatesDesk,
  LazyCommunicationDesk,
  LazyDashboardOperations,
  LazyDocumentsDesk,
  LazyEnquiryDesk,
  LazyExamStatusDesk,
  LazyFeesModuleGroup,
  LazyGrievanceDesk,
  LazyHrDesk,
  LazyIdCardsDesk,
  LazyInventoryDesk,
  LazyLibraryDesk,
  LazyManagementDashboard,
  LazyModuleSettingsContent,
  LazyNoDuesDesk,
  LazyPlacementDesk,
  LazyPrnDesk,
  LazyPromotionDesk,
  LazyReportsDashboard,
  LazyScholarshipDesk,
  LazyScvtDesk,
  LazyStudentArchiveDesk,
  LazyStudentsModuleGroup,
  LazyTimetableDesk,
  LazyUndertakingDesk
} from "./lazy-module-desks";

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

  if (slug === "student-workbench") {
    if (!canUserAccessModule(user, "students")) notFound();
    const p = new URLSearchParams();
    p.set("tab", "verification");
    for (const key of ["queue", "session", "search", "page"] as const) {
      const v = query[key];
      if (typeof v === "string" && v.trim()) p.set(key, v.trim());
    }
    redirect(`/modules/students?${p.toString()}`);
  }

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
            <p className="eyebrow-compact">{t(lang, MODULE_GROUP_EYEBROW[module.group])}</p>
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

      {slug === "dashboard" ? <LazyDashboardOperations /> : null}
      {slug === "admissions" ? (
        <LazyAdmissionsDesk
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
            view: typeof query.view === "string" ? query.view : "",
            section: typeof query.section === "string" ? query.section : ""
          }}
        />
      ) : null}
      {slug === "enquiry" ? <LazyEnquiryDesk /> : null}
      {slug === "documents" ? (
        <LazyDocumentsDesk initialStatus={typeof query.status === "string" ? query.status : ""} />
      ) : null}
      {slug === "exam-status" ? <LazyExamStatusDesk search={typeof query.search === "string" ? query.search : ""} /> : null}
      {slug === "attendance" ? <LazyAttendanceDesk /> : null}
      {slug === "undertaking" ? <LazyUndertakingDesk /> : null}
      {slug === "inventory" ? <LazyInventoryDesk /> : null}
      {slug === "library" ? <LazyLibraryDesk /> : null}
      {slug === "timetable" ? <LazyTimetableDesk /> : null}
      {slug === "certificates" ? <LazyCertificatesDesk /> : null}
      {slug === "id-cards" ? (
        <LazyIdCardsDesk
          search={typeof query.search === "string" ? query.search : ""}
          registerSearch={typeof query.registerSearch === "string" ? query.registerSearch : ""}
          registerType={typeof query.registerType === "string" ? query.registerType : ""}
          registerScope={typeof query.registerScope === "string" ? query.registerScope : "all"}
          registerStatus={typeof query.registerStatus === "string" ? query.registerStatus : ""}
          registerReplacementStatus={typeof query.registerReplacementStatus === "string" ? query.registerReplacementStatus : ""}
        />
      ) : null}
      {slug === "students" ? (
        <LazyStudentsModuleGroup
          tab={typeof query.tab === "string" ? query.tab : "directory"}
          workbenchQueue={typeof query.queue === "string" ? query.queue : ""}
          workbenchSession={typeof query.session === "string" ? query.session : ""}
        />
      ) : null}
      {slug === "promote" ? <LazyPromotionDesk /> : null}
      {slug === "alumni" ? <LazyAlumniDesk /> : null}
      {slug === "student-archive" ? <LazyStudentArchiveDesk /> : null}
      {slug === "no-dues" ? <LazyNoDuesDesk /> : null}
      {slug === "fees" ? (
        <LazyFeesModuleGroup
          tab={typeof query.tab === "string" ? query.tab : "collect"}
          ledgerFilters={{
            agentCode: typeof query.agentCode === "string" ? query.agentCode : "",
            search: typeof query.search === "string" ? query.search : "",
            session: typeof query.session === "string" ? query.session : "",
            yearLabel: typeof query.yearLabel === "string" ? query.yearLabel : ""
          }}
        />
      ) : null}
      {slug === "accounts" ? (
        <LazyAccountsDesk
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
      {slug === "hr" ? <LazyHrDesk /> : null}
      {slug === "scholarship" ? (
        <LazyScholarshipDesk initialStatus={typeof query.status === "string" ? query.status : ""} />
      ) : null}
      {slug === "scvt" ? <LazyScvtDesk /> : null}
      {slug === "prn" ? <LazyPrnDesk /> : null}
      {slug === "reports" ? (
        <LazyReportsDashboard
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
        <LazyManagementDashboard
          filters={{
            session: typeof query.session === "string" ? query.session : ""
          }}
        />
      ) : null}
      {slug === "agents" ? <LazyAgentsDesk /> : null}
      {slug === "communication" ? <LazyCommunicationDesk /> : null}
      {slug === "grievance" ? <LazyGrievanceDesk /> : null}
      {slug === "placement" ? <LazyPlacementDesk /> : null}
      {slug === "backup" ? <LazyBackupDesk /> : null}
      {slug === "settings" && ["SUPER_ADMIN", "ADMIN"].includes(user.role) ? (
        <LazyModuleSettingsContent user={user} />
      ) : null}
      {liveBoard ? <StageBoard board={liveBoard} /> : null}
    </div>
  );
}
