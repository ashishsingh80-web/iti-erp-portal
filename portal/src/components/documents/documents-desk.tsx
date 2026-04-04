"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";

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

export function DocumentsDesk({ initialStatus = "" }: { initialStatus?: string }) {
  const lang = useAppLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") ?? initialStatus ?? "";
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(urlStatus);
  const [refreshKey, setRefreshKey] = useState(0);
  const skipUrlReload = useRef(true);
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
      showToast({ kind: "error", title: t(lang, "Documents not loaded"), message: result.message || t(lang, "Unable to load documents.") });
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
    if (skipUrlReload.current) {
      skipUrlReload.current = false;
      return;
    }
    setStatus(urlStatus);
    setRefreshKey((k) => k + 1);
  }, [urlStatus]);

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
      showToast({
        kind: "error",
        title: t(lang, "Remark required"),
        message: `${t(lang, "Please add a remark before marking")} ${nextStatus.toLowerCase()}.`
      });
      return;
    }
    const response = await fetch(`/api/documents/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, remarks })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: t(lang, "Status not updated"),
        message: result?.message || t(lang, "Unable to update verification status.")
      });
      return;
    }
    showToast({ kind: "success", title: t(lang, "Status updated"), message: `${row.student.fullName} - ${nextStatus}` });
    setRefreshKey((current) => current + 1);
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadForm.studentId.trim()) {
      showToast({ kind: "error", title: t(lang, "Student required"), message: t(lang, "Enter a valid student ID.") });
      return;
    }
    if (!uploadForm.file) {
      showToast({ kind: "error", title: t(lang, "File required"), message: t(lang, "Select a file to upload.") });
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
      showToast({ kind: "error", title: t(lang, "Upload failed"), message: result?.message || t(lang, "Unable to upload document.") });
      return;
    }
    showToast({ kind: "success", title: t(lang, "Document uploaded"), message: t(lang, "Document added to verification queue.") });
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
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{t(lang, "Documents Module")}</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{t(lang, "Document Verification Desk")}</h3>
          <p className="mt-1 text-sm text-slate-600">{t(lang, "Verify, reject, remark, and upload documents from one workspace.")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link className="chip-warning transition hover:opacity-90" href={"/modules/documents?status=PENDING" as Route}>
            {t(lang, "Pending")}: {counts.PENDING || 0}
          </Link>
          <Link className="chip-success transition hover:opacity-90" href={"/modules/documents?status=VERIFIED" as Route}>
            {t(lang, "Verified")}: {counts.VERIFIED || 0}
          </Link>
          <Link className="chip-danger transition hover:opacity-90" href={"/modules/documents?status=REJECTED" as Route}>
            {t(lang, "Rejected")}: {counts.REJECTED || 0}
          </Link>
          <Link className="chip-neutral transition hover:opacity-90" href={"/modules/documents?status=INCOMPLETE" as Route}>
            {t(lang, "Incomplete")}: {counts.INCOMPLETE || 0}
          </Link>
          <Link className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:border-emerald-300" href={"/modules/students?tab=verification&queue=docs" as Route}>
            {t(lang, "Verification workbench")}
          </Link>
        </div>
      </div>

      <details className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
          {t(lang, "Upload New Document")}
        </summary>
        <form className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-4" onSubmit={uploadDocument}>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder={t(lang, "Student ID")}
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
            <option value="STUDENT">{t(lang, "STUDENT")}</option>
            <option value="PARENT">{t(lang, "Parent")}</option>
          </select>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder={t(lang, "Remarks (optional)")}
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
            {uploading ? t(lang, "Uploading...") : t(lang, "Upload Document")}
          </button>
        </form>
      </details>

      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4">
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          placeholder={t(lang, "Search by student, mobile, enrollment, file name")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t(lang, "All Status")}</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
          {t(lang, "Apply Filters")}
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
          type="button"
          onClick={() => {
            setSearch("");
            setStatus("");
            router.replace("/modules/documents" as Route);
            setRefreshKey((current) => current + 1);
          }}
        >
          {t(lang, "Reset Filters")}
        </button>
      </div>

      <div className="mt-4 data-table-wrap rounded-2xl border border-slate-100 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t(lang, "Student")}</th>
              <th>{t(lang, "Document")}</th>
              <th>{t(lang, "Status")}</th>
              <th>{t(lang, "Remarks")}</th>
              <th>{t(lang, "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  {t(lang, "Loading documents...")}
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
                        {t(lang, "Verify")}
                      </button>
                      <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800" onClick={() => void updateStatus(row, "REJECTED")} type="button">
                        {t(lang, "Reject")}
                      </button>
                      <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" onClick={() => void updateStatus(row, "INCOMPLETE")} type="button">
                        {t(lang, "Incomplete")}
                      </button>
                      <button className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => void updateStatus(row, "PENDING")} type="button">
                        {t(lang, "Pending")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  {t(lang, "No document rows found for current filters.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
