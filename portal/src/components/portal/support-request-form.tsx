"use client";

import { useState } from "react";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Props = {
  endpoint: string;
  lang: AppLanguage;
};

const priorityOptions = [
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" }
];

export function SupportRequestForm({ endpoint, lang }: Props) {
  const [category, setCategory] = useState(t(lang, "Portal Support"));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setSaving(true);
    setMessage("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title, description, priority })
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(result?.message || "Unable to raise support request");
      return;
    }

    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setMessage(`Support request saved: ${result.grievanceNo}`);
  }

  return (
    <div className="mt-4 space-y-3">
      <input
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        onChange={(event) => setCategory(event.target.value)}
        placeholder={t(lang, "Category")}
        value={category}
      />
      <input
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t(lang, "Issue title")}
        value={title}
      />
      <textarea
        className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        onChange={(event) => setDescription(event.target.value)}
        placeholder={t(lang, "Describe the issue")}
        value={description}
      />
      <select
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        onChange={(event) => setPriority(event.target.value)}
        value={priority}
      >
        {priorityOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{message || t(lang, "The office team will see this in Complaint / Grievance.")}</p>
        <button
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={saving}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {saving ? t(lang, "Saving...") : t(lang, "Raise Request")}
        </button>
      </div>
    </div>
  );
}
