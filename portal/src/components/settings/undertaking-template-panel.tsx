"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

const placeholderHints = [
  "{{student_name}}",
  "{{student_code}}",
  "{{trade_name}}",
  "{{session}}",
  "{{year_label}}",
  "{{student_mobile}}",
  "{{student_email}}",
  "{{student_aadhaar}}",
  "{{parent_name}}",
  "{{parent_relation}}",
  "{{parent_mobile}}",
  "{{prn_number}}",
  "{{scvt_number}}",
  "{{scholarship_status}}",
  "{{scholarship_id}}",
  "{{fees_if_scholarship}}",
  "{{fees_if_no_scholarship}}",
  "{{final_fee}}",
  "{{due_amount}}",
  "{{current_date}}",
  "{{place}}",
  "{{institute_name}}",
  "{{institute_code}}",
  "{{institute_address}}",
  "{{authorized_signatory}}"
];

export function UndertakingTemplatePanel() {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadTemplate() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/settings/undertaking-template");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load undertaking template");
      setLoading(false);
      return;
    }

    setTemplate(String(result.template?.template || ""));
    setUpdatedAt(String(result.template?.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadTemplate();
  }, []);

  async function saveTemplate() {
    setSaving(true);
    setError("");

    const response = await fetch("/api/settings/undertaking-template", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ template })
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save undertaking template";
      setError(nextError);
      showToast({ kind: "error", title: "Template not saved", message: nextError });
      setSaving(false);
      return;
    }

    setTemplate(String(result.template?.template || ""));
    setUpdatedAt(String(result.template?.updatedAt || ""));
    showToast({ kind: "success", title: "Template updated", message: "Undertaking print format updated for staff." });
    setSaving(false);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Undertaking Format</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Admin Template Editor</h3>
          <p className="mt-2 text-sm text-slate-600">Only admin can edit this format. Staff only get the prefilled print view and signed upload flow.</p>
        </div>
        {updatedAt ? (
          <p className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Updated {new Date(updatedAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-80" />
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Available Placeholders</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {placeholderHints.map((hint) => (
                <span key={hint} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {hint}
                </span>
              ))}
            </div>
          </div>

          <textarea
            className="mt-6 min-h-[420px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          />

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={saveTemplate}
              type="button"
            >
              {saving ? "Saving..." : "Save Undertaking Format"}
            </button>
            <button
              className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800"
              onClick={() => void loadTemplate()}
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
