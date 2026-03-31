"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

function buildSessionOptions(selectedValue: string) {
  const currentYear = new Date().getFullYear() % 100;
  const options = new Set<string>();

  for (let offset = -1; offset <= 3; offset += 1) {
    const start = currentYear + offset;
    options.add(`${String(start).padStart(2, "0")}-${String(start + 1).padStart(2, "0")}`);
    options.add(`${String(start).padStart(2, "0")}-${String(start + 2).padStart(2, "0")}`);
  }

  if (selectedValue.trim()) {
    options.add(selectedValue.trim());
  }

  return Array.from(options).sort();
}

export function SessionControlPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [form, setForm] = useState({
    activeOneYearSession: "",
    activeTwoYearSession: ""
  });
  const [oneYearMode, setOneYearMode] = useState<"choose" | "create">("choose");
  const [twoYearMode, setTwoYearMode] = useState<"choose" | "create">("choose");

  const oneYearOptions = buildSessionOptions(form.activeOneYearSession);
  const twoYearOptions = buildSessionOptions(form.activeTwoYearSession);

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/session-config");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load session settings");
      setLoading(false);
      return;
    }

    setForm({
      activeOneYearSession: String(result.config?.activeOneYearSession || ""),
      activeTwoYearSession: String(result.config?.activeTwoYearSession || "")
    });
    setOneYearMode("choose");
    setTwoYearMode("choose");
    setUpdatedAt(String(result.config?.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    setError("");

    const response = await fetch("/api/settings/session-config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save session settings";
      setError(nextError);
      showToast({ kind: "error", title: "Session settings not saved", message: nextError });
      setSaving(false);
      return;
    }

    setForm({
      activeOneYearSession: String(result.config?.activeOneYearSession || ""),
      activeTwoYearSession: String(result.config?.activeTwoYearSession || "")
    });
    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({ kind: "success", title: "Session settings saved", message: "Admission and dashboard now use the updated active sessions." });
    setSaving(false);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Session Control</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Active Admission Sessions</h3>
          <p className="mt-2 text-sm text-slate-600">Admission auto-selects session from these values. Dashboard activity is also shown for these active sessions.</p>
        </div>
        {updatedAt ? (
          <p className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Updated {new Date(updatedAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">1-Year Trade Session</label>
                <div className="flex gap-2 text-xs">
                  <button
                    className={`rounded-full px-3 py-1 font-semibold ${oneYearMode === "choose" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                    onClick={() => setOneYearMode("choose")}
                    type="button"
                  >
                    Choose
                  </button>
                  <button
                    className={`rounded-full px-3 py-1 font-semibold ${oneYearMode === "create" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                    onClick={() => setOneYearMode("create")}
                    type="button"
                  >
                    Create
                  </button>
                </div>
              </div>
              {oneYearMode === "choose" ? (
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  value={form.activeOneYearSession}
                  onChange={(event) => setForm((current) => ({ ...current, activeOneYearSession: event.target.value }))}
                >
                  {oneYearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  placeholder="2026-27"
                  value={form.activeOneYearSession}
                  onChange={(event) => setForm((current) => ({ ...current, activeOneYearSession: event.target.value }))}
                />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">2-Year Trade Session</label>
                <div className="flex gap-2 text-xs">
                  <button
                    className={`rounded-full px-3 py-1 font-semibold ${twoYearMode === "choose" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                    onClick={() => setTwoYearMode("choose")}
                    type="button"
                  >
                    Choose
                  </button>
                  <button
                    className={`rounded-full px-3 py-1 font-semibold ${twoYearMode === "create" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                    onClick={() => setTwoYearMode("create")}
                    type="button"
                  >
                    Create
                  </button>
                </div>
              </div>
              {twoYearMode === "choose" ? (
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  value={form.activeTwoYearSession}
                  onChange={(event) => setForm((current) => ({ ...current, activeTwoYearSession: event.target.value }))}
                >
                  {twoYearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  placeholder="2026-28"
                  value={form.activeTwoYearSession}
                  onChange={(event) => setForm((current) => ({ ...current, activeTwoYearSession: event.target.value }))}
                />
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Current 1-Year Session</p>
              <p className="mt-1">{form.activeOneYearSession || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Current 2-Year Session</p>
              <p className="mt-1">{form.activeTwoYearSession || "-"}</p>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={saveConfig}
              type="button"
            >
              {saving ? "Saving..." : "Save Session Settings"}
            </button>
            <button
              className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800"
              onClick={() => void loadConfig()}
              type="button"
            >
              Reload
            </button>
          </div>
        </>
      )}
    </section>
  );
}
