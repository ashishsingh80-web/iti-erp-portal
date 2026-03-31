"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";

type FormState = {
  categories: SelectOption[];
  religions: SelectOption[];
  castes: SelectOption[];
  qualifications: SelectOption[];
};

function emptyOption(): SelectOption {
  return { label: "", value: "" };
}

function OptionEditor({
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
              <button
                className="btn-secondary"
                onClick={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export function ClassificationMastersPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [form, setForm] = useState<FormState>({
    categories: [],
    religions: [],
    castes: [],
    qualifications: []
  });

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/classification-masters");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load classification masters");
      setLoading(false);
      return;
    }

    setForm({
      categories: Array.isArray(result.config?.categories) ? result.config.categories : [],
      religions: Array.isArray(result.config?.religions) ? result.config.religions : [],
      castes: Array.isArray(result.config?.castes) ? result.config.castes : [],
      qualifications: Array.isArray(result.config?.qualifications) ? result.config.qualifications : []
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
    const response = await fetch("/api/settings/classification-masters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save classification masters";
      setError(nextError);
      showToast({ kind: "error", title: "Classification masters not saved", message: nextError });
      setSaving(false);
      return;
    }

    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({
      kind: "success",
      title: "Classification masters saved",
      message: "Category, religion, caste, and qualification lists are updated."
    });
    setSaving(false);
  }

  return (
    <section className="surface w-full max-w-full overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Student Classification Masters</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Category, Religion, Caste & Qualification</h3>
          <p className="mt-2 text-sm text-slate-600">
            Keep the core classification lists controlled from settings so admissions, HR, and reporting can use the same master source.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip-success">{form.categories.length} categories</span>
          <span className="chip-warning">{form.qualifications.length} qualifications</span>
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
          <OptionEditor
            title="Category Master"
            helper="Used directly in admissions, documents, scholarship, and reports."
            options={form.categories}
            onChange={(next) => setForm((current) => ({ ...current, categories: next }))}
          />
          <OptionEditor
            title="Qualification Master"
            helper="Used in student admission and staff qualification capture."
            options={form.qualifications}
            onChange={(next) => setForm((current) => ({ ...current, qualifications: next }))}
          />
          <OptionEditor
            title="Religion Master"
            helper="Ready for student profile and future reporting classification."
            options={form.religions}
            onChange={(next) => setForm((current) => ({ ...current, religions: next }))}
          />
          <OptionEditor
            title="Caste Master"
            helper="Ready for student profile, certificate classification, and reporting."
            options={form.castes}
            onChange={(next) => setForm((current) => ({ ...current, castes: next }))}
          />

          {error ? <p className="text-sm text-rose-700 xl:col-span-2">{error}</p> : null}

          <div className="flex flex-wrap gap-3 xl:col-span-2">
            <button className="btn-primary" disabled={saving} onClick={saveConfig} type="button">
              {saving ? "Saving..." : "Save Classification Masters"}
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
