"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

type Props = {
  entityType: "student" | "staff";
  entityId: string;
  replacementStatus: "NONE" | "REQUESTED" | "APPROVED";
};

export function IdCardReplacementActions({ entityType, entityId, replacementStatus }: Props) {
  const [busy, setBusy] = useState(false);

  async function requestReplacement() {
    const reason = window.prompt("Replacement / lost-card reason", "")?.trim();
    if (!reason) {
      showToast({ kind: "error", title: "Reason required", message: "Please enter the lost or replacement reason." });
      return;
    }
    const fee = window.prompt("Replacement fee if any (₹)", "0")?.trim() || "0";
    const feeAmount = Number(fee || 0);
    if (!Number.isFinite(feeAmount) || feeAmount < 0) {
      showToast({ kind: "error", title: "Invalid fee", message: "Replacement fee must be zero or more." });
      return;
    }
    const paymentMode = feeAmount > 0 ? window.prompt("Payment mode for replacement fee", "CASH")?.trim().toUpperCase() || "CASH" : "";
    const referenceNo = feeAmount > 0 ? window.prompt("Reference no. if any", "")?.trim() || "" : "";
    setBusy(true);
    const response = await fetch("/api/id-cards/register/replacement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        entityType,
        entityId,
        reason,
        fee,
        paymentMode,
        referenceNo
      })
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      showToast({ kind: "error", title: "Replacement not requested", message: result?.message || "Unable to request replacement." });
      return;
    }
    showToast({ kind: "success", title: "Replacement requested", message: "Card moved into replacement workflow." });
    window.location.reload();
  }

  async function approveReplacement() {
    setBusy(true);
    const response = await fetch("/api/id-cards/register/replacement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        entityType,
        entityId
      })
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      showToast({ kind: "error", title: "Approval failed", message: result?.message || "Unable to approve replacement." });
      return;
    }
    showToast({ kind: "success", title: "Replacement approved", message: "Card is active again for the next issue version." });
    window.location.reload();
  }

  async function cancelReplacement() {
    const confirmCancel = window.confirm("Cancel this pending replacement request?");
    if (!confirmCancel) return;
    setBusy(true);
    const response = await fetch("/api/id-cards/register/replacement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        entityType,
        entityId
      })
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      showToast({ kind: "error", title: "Cancel failed", message: result?.message || "Unable to cancel replacement request." });
      return;
    }
    showToast({ kind: "success", title: "Replacement cancelled", message: "Pending replacement request has been removed." });
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {replacementStatus === "NONE" ? (
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" disabled={busy} onClick={() => void requestReplacement()} type="button">
          Request Replacement
        </button>
      ) : null}
      {replacementStatus === "REQUESTED" ? (
        <>
          <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" disabled={busy} onClick={() => void approveReplacement()} type="button">
            Approve Replacement
          </button>
          <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800" disabled={busy} onClick={() => void cancelReplacement()} type="button">
            Cancel Request
          </button>
        </>
      ) : null}
    </div>
  );
}
