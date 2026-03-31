"use client";

import { useState, type ReactNode } from "react";

export function ExpandableSettingsSection({
  title,
  eyebrow,
  description,
  badges = [],
  defaultOpen = false,
  children
}: {
  title: string;
  eyebrow: string;
  description: string;
  badges?: Array<{ label: string; tone?: "success" | "warning" | "neutral" }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  function badgeClass(tone?: "success" | "warning" | "neutral") {
    if (tone === "success") return "chip-success";
    if (tone === "warning") return "chip-warning";
    return "rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600";
  }

  return (
    <section className="surface min-w-0 overflow-hidden p-0">
      <button
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div>
          <p className="eyebrow-compact">{eyebrow}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {badges.map((badge) => (
            <span key={badge.label} className={badgeClass(badge.tone)}>
              {badge.label}
            </span>
          ))}
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            {open ? "Collapse" : "Expand"}
          </span>
        </div>
      </button>
      {open ? <div className="min-w-0 border-t border-slate-100 p-6">{children}</div> : null}
    </section>
  );
}
