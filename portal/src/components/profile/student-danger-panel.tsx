"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function StudentDangerPanel({ studentId, studentCode }: { studentId: string; studentCode: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function deleteStudent() {
    const response = await fetch(`/api/students/${studentId}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to delete student");
      return;
    }

    setConfirmOpen(false);
    router.push("/modules/settings");
    router.refresh();
  }

  return (
    <section className="surface p-6">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Danger Zone</p>
      <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Soft Delete Student</h3>
      <p className="mt-2 text-sm text-slate-600">This removes the student from normal lists but keeps the record restorable from admin settings.</p>
      {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <button className="mt-4 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white" onClick={() => setConfirmOpen(true)} type="button">
        Delete Student
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Student"
        message={`Soft delete student ${studentCode}? This can be restored later from the recycle bin.`}
        confirmLabel="Delete Student"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void deleteStudent()}
      />
    </section>
  );
}
