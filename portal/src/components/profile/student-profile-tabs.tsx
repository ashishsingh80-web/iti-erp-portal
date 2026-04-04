import Link from "next/link";
import type { Route } from "next";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type StudentProfileTabId =
  | "overview"
  | "documents"
  | "undertaking"
  | "scvt"
  | "prn"
  | "scholarship"
  | "fees-exam";

export function StudentProfileTabs({
  lang,
  studentId,
  active,
  visibility
}: {
  lang: AppLanguage;
  studentId: string;
  active: StudentProfileTabId;
  visibility: {
    documents: boolean;
    undertaking: boolean;
    scvt: boolean;
    prn: boolean;
    scholarship: boolean;
    feesExam: boolean;
  };
}) {
  const tabs: { id: StudentProfileTabId; label: string }[] = [{ id: "overview", label: t(lang, "Overview") }];
  if (visibility.documents) tabs.push({ id: "documents", label: t(lang, "Documents") });
  if (visibility.undertaking) tabs.push({ id: "undertaking", label: t(lang, "Undertaking") });
  if (visibility.scvt) tabs.push({ id: "scvt", label: t(lang, "SCVT") });
  if (visibility.prn) tabs.push({ id: "prn", label: t(lang, "PRN") });
  if (visibility.scholarship) tabs.push({ id: "scholarship", label: t(lang, "Scholarship") });
  if (visibility.feesExam) tabs.push({ id: "fees-exam", label: t(lang, "Fees & exams") });

  return (
    <nav className="surface flex flex-wrap gap-2 border border-slate-100 p-3 shadow-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/students/${studentId}?tab=${tab.id}` as Route}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === tab.id ? "bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
