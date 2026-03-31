"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

type AdmissionStatusActionsProps = {
  studentId: string;
  currentStatus: string | null;
};

export function AdmissionStatusActions({ studentId, currentStatus }: AdmissionStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const [openAction, setOpenAction] = useState<"CANCELED" | "DROPPED" | "TRANSFERRED" | null>(null);
  const [note, setNote] = useState("");
  const disabled = loading || ["CANCELED", "DROPPED", "TRANSFERRED"].includes(currentStatus || "");

  async function runAction(action: "CANCELED" | "DROPPED" | "TRANSFERRED") {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      showToast({
        kind: "error",
        title: "Note required",
        message: "Please enter a reason note before confirming"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/admission-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          note: trimmedNote
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Unable to update admission status");
      }

      showToast({
        kind: "success",
        title: "Admission status updated",
        message: `${result.student?.studentCode || ""} marked as ${action.replaceAll("_", " ")}`
      });
      setOpenAction(null);
      setNote("");
      window.location.reload();
    } catch (error) {
      showToast({
        kind: "error",
        title: "Admission status not updated",
        message: error instanceof Error ? error.message : "Unable to update admission status"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={() => {
          setOpenAction("CANCELED");
          setNote("");
        }} type="button">
          Cancel
        </button>
        <button className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={() => {
          setOpenAction("DROPPED");
          setNote("");
        }} type="button">
          Drop Out
        </button>
        <button className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={() => {
          setOpenAction("TRANSFERRED");
          setNote("Transferred to another institute / trade");
        }} type="button">
          Transfer
        </button>
      </div>
      {openAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admission Status</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Mark as {openAction.replaceAll("_", " ")}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Add a clear reason note for this status update.
            </p>
            <textarea
              className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Enter reason note"
              value={note}
            />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                disabled={loading}
                onClick={() => setOpenAction(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                onClick={() => void runAction(openAction)}
                type="button"
              >
                {loading ? "Saving..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
