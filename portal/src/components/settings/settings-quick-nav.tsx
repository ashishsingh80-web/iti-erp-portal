"use client";

const SETTING_SECTIONS = [
  { id: "settings-master-control", label: "Master Control Overview" },
  { id: "settings-institute-academic", label: "Institute & Academic Setup" },
  { id: "settings-geography-finance", label: "Geography, Finance & Templates" },
  { id: "settings-security-admin", label: "Security & Administration" }
] as const;

export function SettingsQuickNav() {
  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[250px] flex-1">
          <p className="eyebrow-compact">Settings Navigator</p>
          <label className="mt-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Choose a settings section</label>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            defaultValue=""
            onChange={(event) => {
              const targetId = event.target.value;
              if (!targetId) return;
              const node = document.getElementById(targetId);
              node?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <option value="">Select section</option>
            {SETTING_SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
