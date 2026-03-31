"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

type RuleForm = {
  prefix: string;
  postfix: string;
  includeSession: boolean;
  startNumber: string;
  nextNumber: string;
  padLength: string;
  separator: string;
};

type FormState = {
  student: RuleForm;
  agent: RuleForm;
  employee: RuleForm;
  receipt: RuleForm;
};

function emptyRule(): RuleForm {
  return {
    prefix: "",
    postfix: "",
    includeSession: false,
    startNumber: "1",
    nextNumber: "1",
    padLength: "3",
    separator: "-"
  };
}

export function NumberingControlPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [form, setForm] = useState<FormState>({
    student: emptyRule(),
    agent: emptyRule(),
    employee: emptyRule(),
    receipt: emptyRule()
  });

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/numbering-config");
    const result = await response.json();
    if (!response.ok) {
      setError(result?.message || "Unable to load numbering settings");
      setLoading(false);
      return;
    }

    const config = result.config || {};
    const normalize = (rule: any): RuleForm => ({
      prefix: String(rule?.prefix || ""),
      postfix: String(rule?.postfix || ""),
      includeSession: Boolean(rule?.includeSession),
      startNumber: String(rule?.startNumber || 1),
      nextNumber: String(rule?.nextNumber || 1),
      padLength: String(rule?.padLength || 3),
      separator: String(rule?.separator || "-")
    });

    setForm({
      student: normalize(config.student),
      agent: normalize(config.agent),
      employee: normalize(config.employee),
      receipt: normalize(config.receipt)
    });
    setUpdatedAt(String(config.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/settings/numbering-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student: { ...form.student, startNumber: Number(form.student.startNumber), nextNumber: Number(form.student.nextNumber), padLength: Number(form.student.padLength) },
        agent: { ...form.agent, startNumber: Number(form.agent.startNumber), nextNumber: Number(form.agent.nextNumber), padLength: Number(form.agent.padLength) },
        employee: { ...form.employee, startNumber: Number(form.employee.startNumber), nextNumber: Number(form.employee.nextNumber), padLength: Number(form.employee.padLength) },
        receipt: { ...form.receipt, startNumber: Number(form.receipt.startNumber), nextNumber: Number(form.receipt.nextNumber), padLength: Number(form.receipt.padLength) }
      })
    });
    const result = await response.json();
    if (!response.ok) {
      const nextError = result?.message || "Unable to save numbering settings";
      setError(nextError);
      showToast({ kind: "error", title: "Numbering settings not saved", message: nextError });
      setSaving(false);
      return;
    }
    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({ kind: "success", title: "Numbering settings saved", message: "System-generated codes now follow the updated rules." });
    setSaving(false);
  }

  function updateRule(kind: keyof FormState, patch: Partial<RuleForm>) {
    setForm((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...patch
      }
    }));
  }

  const sections: Array<{ key: keyof FormState; title: string; hint: string }> = [
    { key: "student", title: "Admission / Student Code", hint: "Tokens supported in prefix/postfix: {session}, {institute}, {trade}, {date}, {year}" },
    { key: "employee", title: "Employee Code", hint: "Use prefix and running number for HR staff." },
    { key: "agent", title: "Agent Code", hint: "Auto-fill agent code while registering new agents." },
    { key: "receipt", title: "Receipt Number", hint: "Applied to fee receipts when payments are recorded." }
  ];

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Numbering Control</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">System Code Generation</h3>
          <p className="mt-2 text-sm text-slate-600">Control prefix, postfix, session inclusion, separator, padding, and running numbers for all generated codes.</p>
        </div>
        {updatedAt ? <p className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Updated {new Date(updatedAt).toLocaleString("en-IN")}</p> : null}
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4">
            {sections.map((section) => (
              <div key={section.key} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                <p className="mt-1 text-xs text-slate-500">{section.hint}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Prefix</span>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form[section.key].prefix} onChange={(event) => updateRule(section.key, { prefix: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Postfix</span>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form[section.key].postfix} onChange={(event) => updateRule(section.key, { postfix: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Separator</span>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form[section.key].separator} onChange={(event) => updateRule(section.key, { separator: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Pad Length</span>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form[section.key].padLength} onChange={(event) => updateRule(section.key, { padLength: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Starting Number</span>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form[section.key].startNumber} onChange={(event) => updateRule(section.key, { startNumber: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Next Number</span>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form[section.key].nextNumber} onChange={(event) => updateRule(section.key, { nextNumber: event.target.value })} />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    <input checked={form[section.key].includeSession} onChange={(event) => updateRule(section.key, { includeSession: event.target.checked })} type="checkbox" />
                    Include Session
                  </label>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={saving} onClick={saveConfig} type="button">
              {saving ? "Saving..." : "Save Numbering Settings"}
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
