"use client";

import Link from "next/link";
import { showToast } from "@/lib/toast";

export function StaffIdCardPrintActions({
  staffId,
  printCount = 0,
  status = "ACTIVE"
}: {
  staffId: string;
  printCount?: number;
  status?: "ACTIVE" | "CANCELLED" | "REPLACED";
}) {
  async function handlePrint() {
    if (status !== "ACTIVE") {
      showToast({
        kind: "error",
        title: "Print blocked",
        message: `This ID card is ${status.toLowerCase()}. Reactivate it from the ID card register before printing again.`
      });
      return;
    }

    const reason =
      printCount > 0
        ? window.prompt("Reissue / duplicate print reason", "Duplicate / Reissue")?.trim()
        : "Initial Issue";

    if (printCount > 0 && !reason) {
      showToast({ kind: "error", title: "Reason required", message: "Please enter a reissue reason before printing again." });
      return;
    }

    const response = await fetch("/api/id-cards/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "staff", entityId: staffId, reason })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      showToast({ kind: "error", title: "ID card log failed", message: result?.message || "Unable to update print register." });
      return;
    }
    window.print();
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3 print:hidden">
      <button
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        disabled={status !== "ACTIVE"}
        onClick={() => void handlePrint()}
        type="button"
      >
        {printCount > 0 ? "Reprint ID Card" : "Print ID Card"}
      </button>
      <Link className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700" href="/modules/hr">
        Back To HR
      </Link>
      <Link className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700" href={`/profile`}>
        Profile
      </Link>
    </div>
  );
}
