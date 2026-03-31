"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

type Props = {
  entityType: "student" | "staff";
  entityId: string;
  status: "ACTIVE" | "CANCELLED" | "REPLACED";
};

export function IdCardStatusActions({ entityType, entityId, status }: Props) {
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function saveStatus() {
    if (value === status) {
      showToast({ kind: "info", title: "No change", message: "ID card status is already set." });
      return;
    }

    const note =
      value === "ACTIVE"
        ? window.prompt("Activation note", "Card active again")?.trim() || ""
        : window.prompt(`${value === "CANCELLED" ? "Cancellation" : "Replacement"} note`, "")?.trim();

    if ((value === "CANCELLED" || value === "REPLACED") && !note) {
      showToast({ kind: "error", title: "Note required", message: "Please enter a note for cancelled or replaced cards." });
      return;
    }

    setBusy(true);
    const response = await fetch("/api/id-cards/register/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        status: value,
        statusNote: note || ""
      })
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Status not updated", message: result?.message || "Unable to save ID card status." });
      return;
    }

    showToast({ kind: "success", title: "Status updated", message: value.replaceAll("_", " ") });
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        disabled={busy}
        onChange={(event) => setValue(event.target.value as Props["status"])}
        value={value}
      >
        <option value="ACTIVE">Active</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="REPLACED">Replaced</option>
      </select>
      <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" disabled={busy} onClick={() => void saveStatus()} type="button">
        Save
      </button>
    </div>
  );
}
