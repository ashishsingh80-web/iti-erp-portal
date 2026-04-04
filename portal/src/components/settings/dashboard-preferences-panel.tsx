"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/lib/toast";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

type Widget = {
  id: string;
  label: string;
};

export function DashboardPreferencesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);

  const selectedCount = useMemo(() => visibleWidgets.length, [visibleWidgets.length]);

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/dashboard-preferences");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load dashboard preferences");
      setLoading(false);
      return;
    }

    const nextWidgets = Array.isArray(result.widgets) ? (result.widgets as Widget[]) : [];
    setWidgets(nextWidgets);
    setVisibleWidgets(Array.isArray(result.config?.visibleWidgets) ? result.config.visibleWidgets : []);
    setUpdatedAt(String(result.config?.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  function toggleWidget(widgetId: string) {
    setVisibleWidgets((current) => {
      if (current.includes(widgetId)) return current.filter((id) => id !== widgetId);
      return [...current, widgetId];
    });
  }

  async function saveConfig() {
    setSaving(true);
    setError("");

    const response = await fetch("/api/settings/dashboard-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleWidgets })
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save dashboard preferences";
      setError(nextError);
      showToast({ kind: "error", title: "Dashboard settings not saved", message: nextError });
      setSaving(false);
      return;
    }

    setVisibleWidgets(Array.isArray(result.config?.visibleWidgets) ? result.config.visibleWidgets : []);
    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({ kind: "success", title: "Dashboard settings saved", message: "Dashboard view has been updated." });
    setSaving(false);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Dashboard Menu</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Choose Dashboard Widgets</h3>
          <p className="mt-2 text-sm text-slate-600">Select exactly what should be visible on dashboard for a cleaner view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip-neutral">{selectedCount} selected</span>
          {updatedAt ? (
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Updated {new Date(updatedAt).toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {widgets.map((widget) => {
              const checked = visibleWidgets.includes(widget.id);
              return (
                <label key={widget.id} className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">{widget.label}</span>
                  <input checked={checked} onChange={() => toggleWidget(widget.id)} type="checkbox" />
                </label>
              );
            })}
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={saving} onClick={saveConfig} type="button">
              {saving ? "Saving..." : "Save Dashboard Settings"}
            </button>
            <button className="btn-secondary" onClick={() => void loadConfig()} type="button">
              Reload
            </button>
          </div>
        </>
      )}
    </section>
  );
}
