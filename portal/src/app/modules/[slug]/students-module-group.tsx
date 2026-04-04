import { HistoricalUploadDesk } from "@/components/students/historical-upload-desk";
import { StudentDirectoryPreview } from "@/components/students/student-directory-preview";
import { StudentWorkbenchDesk } from "@/components/students/student-workbench-desk";
import { StudentsModuleQueueShortcuts } from "@/components/students/students-module-queue-shortcuts";
import { StudentsModuleTabs, type StudentsModuleTabId } from "@/components/students/students-module-tabs";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";

const VALID_TABS = new Set<StudentsModuleTabId>(["directory", "verification", "import"]);

export async function StudentsModuleGroup({
  tab,
  workbenchQueue,
  workbenchSession
}: {
  tab: string;
  workbenchQueue: string;
  workbenchSession: string;
}) {
  const lang = await readAppLanguage();
  const active: StudentsModuleTabId = VALID_TABS.has(tab as StudentsModuleTabId) ? (tab as StudentsModuleTabId) : "directory";

  return (
    <div className="grid gap-4">
      <StudentsModuleQueueShortcuts />
      <StudentsModuleTabs lang={lang} active={active} />
      {active === "directory" ? <StudentDirectoryPreview /> : null}
      {active === "verification" ? (
        <StudentWorkbenchDesk initialQueue={workbenchQueue} initialSession={workbenchSession} />
      ) : null}
      {active === "import" ? (
        <section className="surface p-6">
          <p className="eyebrow-compact">{t(lang, "Data migration")}</p>
          <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-950">{t(lang, "Historical student import")}</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {t(lang, "Upload legacy CSV rows into the student archive pipeline. Use Directory or Verification for day-to-day work.")}
          </p>
          <div className="mt-6">
            <HistoricalUploadDesk />
          </div>
        </section>
      ) : null}
    </div>
  );
}
