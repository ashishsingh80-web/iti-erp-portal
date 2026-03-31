"use client";

import { useEffect, useState } from "react";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";

type DeletedStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  deletedAt: string;
};

type DeletedDocument = {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  documentType: string;
  originalName: string;
  deletedAt: string;
};

export function RecycleBinPanel() {
  const [students, setStudents] = useState<DeletedStudent[]>([]);
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRecycleBin() {
    setLoading(true);
    const response = await fetch("/api/recycle-bin");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load recycle bin");
      setLoading(false);
      return;
    }

    setStudents(result.students || []);
    setDocuments(result.documents || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadRecycleBin();
  }, []);

  async function restoreStudentRecord(studentId: string) {
    const response = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "restore" })
    });

    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to restore student";
      setError(nextError);
      showToast({ kind: "error", title: "Student not restored", message: nextError });
      return;
    }

    setStudents((current) => current.filter((item) => item.id !== studentId));
    showToast({ kind: "success", title: "Student restored" });
  }

  async function restoreDocumentRecord(documentId: string) {
    const response = await fetch("/api/recycle-bin", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "document",
        id: documentId
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to restore document";
      setError(nextError);
      showToast({ kind: "error", title: "Document not restored", message: nextError });
      return;
    }

    setDocuments((current) => current.filter((item) => item.id !== documentId));
    showToast({ kind: "success", title: "Document restored" });
  }

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Recovery</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Recycle Bin</h3>
        <p className="mt-2 text-sm text-slate-600">Restore soft-deleted students and documents.</p>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-100 bg-white p-5">
          <h4 className="font-semibold text-slate-900">Deleted Students</h4>
          <div className="mt-4 space-y-3">
            {loading ? (
              [1, 2].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 px-4 py-3">
                  <SkeletonBlock className="h-5 w-52" />
                  <SkeletonBlock className="mt-2 h-4 w-40" />
                  <SkeletonBlock className="mt-2 h-4 w-48" />
                  <SkeletonBlock className="mt-3 h-10 w-36" />
                </div>
              ))
            ) : students.length ? students.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                <p className="font-semibold text-slate-900">{item.studentCode} • {item.fullName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.instituteName} • {item.tradeName}</p>
                <p className="mt-1 text-xs text-slate-500">Deleted on {new Date(item.deletedAt).toLocaleString("en-IN")}</p>
                <button className="mt-3 rounded-2xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" onClick={() => void restoreStudentRecord(item.id)} type="button">
                  Restore Student
                </button>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No deleted students right now.</div>}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-white p-5">
          <h4 className="font-semibold text-slate-900">Deleted Documents</h4>
          <div className="mt-4 space-y-3">
            {loading ? (
              [1, 2].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 px-4 py-3">
                  <SkeletonBlock className="h-5 w-52" />
                  <SkeletonBlock className="mt-2 h-4 w-40" />
                  <SkeletonBlock className="mt-2 h-4 w-48" />
                  <SkeletonBlock className="mt-3 h-10 w-36" />
                </div>
              ))
            ) : documents.length ? documents.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                <p className="font-semibold text-slate-900">{item.documentType} • {item.originalName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.studentCode} • {item.studentName}</p>
                <p className="mt-1 text-xs text-slate-500">Deleted on {new Date(item.deletedAt).toLocaleString("en-IN")}</p>
                <button className="mt-3 rounded-2xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" onClick={() => void restoreDocumentRecord(item.id)} type="button">
                  Restore Document
                </button>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No deleted documents right now.</div>}
          </div>
        </article>
      </div>
    </section>
  );
}
