"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";

type DocumentRow = {
  id: string;
  studentId: string;
  documentType: string;
  ownerType: string;
  originalName: string;
  fileUrl: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "INCOMPLETE";
  remarks: string | null;
  createdAt: string;
  student: {
    id: string;
    fullName: string;
    enrollmentNumber: string | null;
    mobile: string | null;
    session: string | null;
    yearLabel: string | null;
    status: string;
  };
};

type DocumentListResponse = {
  ok: boolean;
  rows: DocumentRow[];
  counts: Record<string, number>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

const statusOptions = ["PENDING", "VERIFIED", "REJECTED", "INCOMPLETE"] as const;
const documentTypeOptions = [
  "AADHAAR",
  "MARKSHEET",
  "CASTE",
  "INCOME",
  "DOMICILE",
  "PHOTO",
  "SIGNATURE",
  "BANK_PASSBOOK",
  "TC",
  "OTHER"
];

export function DocumentsDesk() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    studentId: "",
    documentType: "OTHER",
    ownerType: "STUDENT",
    remarks: "",
    file: null as File | null
  });

  async function loadRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    const response = await fetch(`/api/documents?${params.toString()}`);
    const result = (await response.json().catch(() => ({ ok: false, rows: [], counts: {}, pagination: null }))) as DocumentListResponse;
    if (!response.ok) {
      showToast({ kind: "error", title: "Documents not loaded", message: result.message || "Unable to load documents." });
      setRows([]);
      setCounts({});
      setLoading(false);
      return;
    }
    setRows(Array.isArray(result.rows) ? result.rows : []);
    setCounts(result.counts || {});
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, [refreshKey]);

  async function updateStatus(row: DocumentRow, nextStatus: (typeof statusOptions)[number]) {
    const defaultRemark =
      nextStatus === "VERIFIED" ? "Verified by document desk" : nextStatus === "REJECTED" ? "Rejected by document desk" : "Requires correction";
    const remarks =
      nextStatus === "PENDING"
        ? window.prompt("Optional remark for marking pending:", row.remarks || "") || ""
        : window.prompt(`Remark for ${nextStatus.toLowerCase()}:`, row.remarks || defaultRemark) || "";
    if ((nextStatus === "REJECTED" || nextStatus === "INCOMPLETE") && !remarks.trim()) {
      showToast({ kind: "error", title: "Remark required", message: `Please add a remark before marking ${nextStatus.toLowerCase()}.` });
      return;
    }
    const response = await fetch(`/api/documents/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, remarks })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({ kind: "error", title: "Status not updated", message: result?.message || "Unable to update verification status." });
      return;
    }
    showToast({ kind: "success", title: "Status updated", message: `${row.student.fullName} - ${nextStatus}` });
    setRefreshKey((current) => current + 1);
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadForm.studentId.trim()) {
      showToast({ kind: "error", title: "Student required", message: "Enter a valid student ID." });
      return;
    }
    if (!uploadForm.file) {
      showToast({ kind: "error", title: "File required", message: "Select a file to upload." });
      return;
    }

    const body = new FormData();
    body.set("studentId", uploadForm.studentId.trim());
    body.set("documentType", uploadForm.documentType);
    body.set("ownerType", uploadForm.ownerType);
    body.set("remarks", uploadForm.remarks);
    body.set("file", uploadForm.file);

    setUploading(true);
    const response = await fetch("/api/documents", { method: "POST", body });
    const result = await response.json().catch(() => null);
    setUploading(false);
    if (!response.ok) {
      showToast({ kind: "error", title: "Upload failed", message: result?.message || "Unable to upload document." });
      return;
    }
    showToast({ kind: "success", title: "Document uploaded", message: "Document added to verification queue." });
    setUploadForm({
      studentId: "",
      documentType: "OTHER",
      ownerType: "STUDENT",
      remarks: "",
      file: null
    });
    setRefreshKey((current) => current + 1);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Documents Module</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">Document Verification Desk</h3>
          <p className="mt-1 text-sm text-slate-600">Verify, reject, remark, and upload documents from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip-warning">Pending: {counts.PENDING || 0}</span>
          <span className="chip-success">Verified: {counts.VERIFIED || 0}</span>
          <span className="chip-danger">Rejected: {counts.REJECTED || 0}</span>
          <span className="chip-neutral">Incomplete: {counts.INCOMPLETE || 0}</span>
        </div>
      </div>

      <form className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4" onSubmit={uploadDocument}>
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Student ID"
          value={uploadForm.studentId}
          onChange={(event) => setUploadForm((current) => ({ ...current, studentId: event.target.value }))}
        />
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={uploadForm.documentType}
          onChange={(event) => setUploadForm((current) => ({ ...current, documentType: event.target.value }))}
        >
          {documentTypeOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={uploadForm.ownerType}
          onChange={(event) => setUploadForm((current) => ({ ...current, ownerType: event.target.value }))}
        >
          <option value="STUDENT">Student</option>
          <option value="PARENT">Parent</option>
        </select>
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Remarks (optional)"
          value={uploadForm.remarks}
          onChange={(event) => setUploadForm((current) => ({ ...current, remarks: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-3"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
        />
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4">
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          placeholder="Search by student, mobile, enrollment, file name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All Status</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
          Apply Filters
        </button>
      </div>

      <div className="mt-4 data-table-wrap rounded-2xl border border-slate-100 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Document</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  Loading documents...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{row.student.fullName}</p>
                      <p className="text-xs text-slate-500">{row.student.enrollmentNumber || row.student.id}</p>
                      <p className="text-xs text-slate-500">{row.student.mobile || "-"}</p>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <p>{row.documentType}</p>
                      <a className="text-xs text-sky-700 underline" href={row.fileUrl} target="_blank" rel="noreferrer">
                        {row.originalName}
                      </a>
                    </div>
                  </td>
                  <td>{row.verificationStatus}</td>
                  <td className="max-w-[280px] text-xs text-slate-600">{row.remarks || "-"}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" onClick={() => void updateStatus(row, "VERIFIED")} type="button">
                        Verify
                      </button>
                      <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800" onClick={() => void updateStatus(row, "REJECTED")} type="button">
                        Reject
                      </button>
                      <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" onClick={() => void updateStatus(row, "INCOMPLETE")} type="button">
                        Incomplete
                      </button>
                      <button className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => void updateStatus(row, "PENDING")} type="button">
                        Pending
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  No document rows found for current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
