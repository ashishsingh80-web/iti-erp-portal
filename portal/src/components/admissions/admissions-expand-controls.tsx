"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";

type AdmissionsExpandControlsProps = {
  targetId: string;
};

export function AdmissionsExpandControls({ targetId }: AdmissionsExpandControlsProps) {
  const lang = useAppLanguage();
  const [expandedCount, setExpandedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  function syncCounts() {
    const container = document.getElementById(targetId);
    if (!container) {
      setExpandedCount(0);
      setTotalCount(0);
      return;
    }
    const sections = Array.from(container.querySelectorAll("details")) as HTMLDetailsElement[];
    setTotalCount(sections.length);
    setExpandedCount(sections.filter((item) => item.open).length);
  }

  function setAll(open: boolean) {
    const container = document.getElementById(targetId);
    if (!container) return;
    const sections = container.querySelectorAll("details");
    sections.forEach((node) => {
      (node as HTMLDetailsElement).open = open;
    });
    syncCounts();
  }

  useEffect(() => {
    syncCounts();
    const container = document.getElementById(targetId);
    if (!container) return;
    const handleToggle = () => syncCounts();
    container.addEventListener("toggle", handleToggle, true);
    return () => {
      container.removeEventListener("toggle", handleToggle, true);
    };
  }, [targetId]);

  const statusLabel = useMemo(() => {
    if (!totalCount) return t(lang, "No sections");
    return `${expandedCount}/${totalCount} ${t(lang, "expanded")}`;
  }, [expandedCount, totalCount, lang]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
        onClick={() => setAll(true)}
        type="button"
      >
        {t(lang, "Expand all")}
      </button>
      <button
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
        onClick={() => setAll(false)}
        type="button"
      >
        {t(lang, "Collapse all")}
      </button>
      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        {statusLabel}
      </span>
    </div>
  );
}
