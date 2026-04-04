import Link from "next/link";
import type { Route } from "next";
import { canUserAccessModule } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";

export async function StudentsModuleQueueShortcuts() {
  const lang = await readAppLanguage();
  const user = await requireUser();
  const links: { href: Route; label: string }[] = [];
  if (canUserAccessModule(user, "documents")) {
    links.push({ href: "/modules/documents" as Route, label: t(lang, "Documents queue") });
  }
  if (canUserAccessModule(user, "undertaking")) {
    links.push({ href: "/modules/undertaking" as Route, label: t(lang, "Undertaking queue") });
  }
  if (canUserAccessModule(user, "scholarship")) {
    links.push({ href: "/modules/scholarship" as Route, label: t(lang, "Scholarship queue") });
  }
  if (canUserAccessModule(user, "scvt")) {
    links.push({ href: "/modules/scvt" as Route, label: t(lang, "SCVT queue") });
  }
  if (canUserAccessModule(user, "prn")) {
    links.push({ href: "/modules/prn" as Route, label: t(lang, "PRN queue") });
  }

  if (!links.length) return null;

  return (
    <section className="surface rounded-2xl border border-slate-100 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{t(lang, "Cross-student queues")}</p>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        {t(lang, "Bulk lists and filters across all students. Use a student profile for documents, undertaking, SCVT, PRN, scholarship, and fees.")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((item) => (
          <Link
            key={item.href}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
