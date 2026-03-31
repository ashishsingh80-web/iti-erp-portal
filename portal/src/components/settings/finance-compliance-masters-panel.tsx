"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";

type FormState = {
  feeHeads: SelectOption[];
  scholarshipSchemes: SelectOption[];
  documentTypes: SelectOption[];
};

function emptyOption(): SelectOption {
  return { label: "", value: "" };
}

function OptionList({
  title,
  helper,
  options,
  onChange
}: {
  title: string;
  helper: string;
  options: SelectOption[];
  onChange: (next: SelectOption[]) => void;
}) {
  return (
    <details className="rounded-3xl border border-slate-100 bg-white p-5" open>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">{title}</p>
            <p className="mt-2 text-sm text-slate-600">{helper}</p>
          </div>
          <div className="flex gap-2">
            <span className="chip-neutral">{options.length} items</span>
            <span className="chip-success">Expand</span>
          </div>
        </div>
      </summary>

      <div className="mt-4 grid gap-3">
        <div className="flex justify-end">
          <button className="btn-secondary" onClick={() => onChange([...options, emptyOption()])} type="button">
            Add
          </button>
        </div>
        {options.map((option, index) => (
          <div key={`${title}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input
              label="Label"
              value={option.label}
              onChange={(event) =>
                onChange(options.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)))
              }
            />
            <Input
              label="Value"
              value={option.value}
              onChange={(event) =>
                onChange(options.map((item, itemIndex) => (itemIndex === index ? { ...item, value: event.target.value.toUpperCase() } : item)))
              }
            />
            <div className="flex items-end">
              <button className="btn-secondary" onClick={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))} type="button">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export function FinanceComplianceMastersPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [form, setForm] = useState<FormState>({
    feeHeads: [],
    scholarshipSchemes: [],
    documentTypes: []
  });

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/finance-compliance-masters");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load finance and compliance masters");
      setLoading(false);
      return;
    }

    setForm({
      feeHeads: Array.isArray(result.config?.feeHeads) ? result.config.feeHeads : [],
      scholarshipSchemes: Array.isArray(result.config?.scholarshipSchemes) ? result.config.scholarshipSchemes : [],
      documentTypes: Array.isArray(result.config?.documentTypes) ? result.config.documentTypes : []
    });
    setUpdatedAt(String(result.config?.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/settings/finance-compliance-masters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save finance and compliance masters";
      setError(nextError);
      showToast({ kind: "error", title: "Finance masters not saved", message: nextError });
      setSaving(false);
      return;
    }

    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({
      kind: "success",
      title: "Finance and compliance masters saved",
      message: "Fee heads, scholarship schemes, and document types are updated."
    });
    setSaving(false);
  }

  return (
    <section className="surface w-full max-w-full overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Finance & Compliance Masters</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Fee Heads, Scholarship Schemes & Document Types</h3>
          <p className="mt-2 text-sm text-slate-600">
            Keep finance and document selections in one place so fee setup, scholarship setup, and document upload all follow the same master list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip-success">{form.feeHeads.length} fee heads</span>
          <span className="chip-warning">{form.documentTypes.length} document types</span>
          {updatedAt ? (
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Updated {new Date(updatedAt).toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <OptionList
            title="Fee Head Master"
            helper="Ready for fee planning, fee breakdowns, and future receipt-level classification."
            options={form.feeHeads}
            onChange={(next) => setForm((current) => ({ ...current, feeHeads: next }))}
          />
          <OptionList
            title="Document Type Master"
            helper="Used directly in the document upload desk and future required-document setup."
            options={form.documentTypes}
            onChange={(next) => setForm((current) => ({ ...current, documentTypes: next }))}
          />
          <OptionList
            title="Scholarship Scheme Master"
            helper="Ready for scholarship planning, reporting, and future scheme-wise student mapping."
            options={form.scholarshipSchemes}
            onChange={(next) => setForm((current) => ({ ...current, scholarshipSchemes: next }))}
          />

          {error ? <p className="text-sm text-rose-700 xl:col-span-2">{error}</p> : null}

          <div className="flex flex-wrap gap-3 xl:col-span-2">
            <button className="btn-primary" disabled={saving} onClick={saveConfig} type="button">
              {saving ? "Saving..." : "Save Finance & Compliance Masters"}
            </button>
            <button className="btn-secondary" onClick={() => void loadConfig()} type="button">
              Reload
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
