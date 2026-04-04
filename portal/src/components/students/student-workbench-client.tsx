"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { WorkbenchQueue, WorkbenchStudentRow } from "@/lib/services/student-workbench-service";
import { showToast } from "@/lib/toast";

const VALID_QUEUES: WorkbenchQueue[] = ["all", "pending_any", "docs", "upload", "form", "eligibility"];

function normalizeWorkbenchQueue(raw: string): WorkbenchQueue {
  const q = raw.trim();
  return VALID_QUEUES.includes(q as WorkbenchQueue) ? (q as WorkbenchQueue) : "pending_any";
}

const QUEUE_TABS: { id: WorkbenchQueue; label: string; hint: string }[] = [
  { id: "pending_any", label: "All pending", hint: "Form, docs, or 10th check" },
  { id: "docs", label: "Docs", hint: "Document column not verified" },
  { id: "upload", label: "Photo upload", hint: "Docs not verified and no student photo file yet" },
  { id: "form", label: "Admission form", hint: "Form not verified" },
  { id: "eligibility", label: "10th / eligibility", hint: "Eligibility not verified" },
  { id: "all", label: "Everyone", hint: "Active & promoted (filtered)" }
];

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "STUDENT_PHOTO", label: "Student photo" },
  { value: "STUDENT_AADHAAR", label: "Student Aadhaar" },
  { value: "PARENT_AADHAAR", label: "Parent Aadhaar" },
  { value: "TENTH_MARKSHEET", label: "10th marksheet" },
  { value: "CASTE_CERTIFICATE", label: "Caste certificate" },
  { value: "INCOME_CERTIFICATE", label: "Income certificate" },
  { value: "BANK_PASSBOOK", label: "Bank passbook" },
  { value: "OTHER", label: "Other" }
];

function statusDot(ok: boolean) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`}
      title={ok ? "Verified" : "Pending"}
    />
  );
}

type DocRow = {
  id: string;
  documentType: string;
  originalName: string;
  verificationStatus: string;
  createdAt: string;
};

export function StudentWorkbenchClient({
  initialQueue,
  initialSession,
  canBulkVerify,
  canUploadDocuments
}: {
  initialQueue: string;
  initialSession: string;
  canBulkVerify: boolean;
  canUploadDocuments: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const queueFromUrl = normalizeWorkbenchQueue(sp.get("queue") || initialQueue || "pending_any");
  const sessionFilter = sp.get("session") ?? initialSession ?? "";

  const [queueState, setQueueState] = useState<WorkbenchQueue>(queueFromUrl);
  const [sessionDraft, setSessionDraft] = useState(sessionFilter);
  const [searchInput, setSearchInput] = useState(sp.get("search") || "");
  const [search, setSearch] = useState(sp.get("search") || "");
  const [page, setPage] = useState(Math.max(1, Number(sp.get("page") || "1")));
  const [rows, setRows] = useState<WorkbenchStudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("TENTH_MARKSHEET");
  const [bulkWorking, setBulkWorking] = useState(false);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSessionDraft(sp.get("session") ?? initialSession ?? "");
  }, [sp, initialSession]);

  useEffect(() => {
    setQueueState(queueFromUrl);
  }, [queueFromUrl]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);
  const selectedIndex = useMemo(() => rows.findIndex((r) => r.id === selectedId), [rows, selectedId]);

  const syncUrl = useCallback(
    (next: { queue?: WorkbenchQueue; session?: string; search?: string; page?: number }) => {
      const p = new URLSearchParams();
      const q = next.queue ?? queueState;
      const s = next.session ?? sessionFilter;
      const se = next.search ?? search;
      const pg = next.page ?? page;
      if (q && q !== "pending_any") p.set("queue", q);
      if (s) p.set("session", s);
      if (se) p.set("search", se);
      if (pg > 1) p.set("page", String(pg));
      p.set("tab", "verification");
      const qs = p.toString();
      router.replace(`/modules/students?${qs}`, { scroll: false });
    },
    [queueState, sessionFilter, search, page, router]
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("queue", queueState);
      if (sessionFilter) p.set("session", sessionFilter);
      if (search) p.set("search", search);
      p.set("page", String(page));
      p.set("pageSize", "40");
      const res = await fetch(`/api/students/workbench?${p.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Load failed");
      setRows(data.rows);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSelectedId((prev) => {
        if (!data.rows.length) return null;
        if (prev && data.rows.some((r: WorkbenchStudentRow) => r.id === prev)) return prev;
        return data.rows[0].id;
      });
    } catch (e) {
      showToast({ kind: "error", title: e instanceof Error ? e.message : "Could not load list" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [queueState, sessionFilter, search, page]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const loadDocs = useCallback(async (studentId: string) => {
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/documents?studentId=${encodeURIComponent(studentId)}&pageSize=50`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Documents failed");
      setDocs(
        (data.rows || []).map((d: { id: string; documentType: string; originalName: string; verificationStatus: string; createdAt: string }) => ({
          id: d.id,
          documentType: d.documentType,
          originalName: d.originalName,
          verificationStatus: d.verificationStatus,
          createdAt: d.createdAt
        }))
      );
    } catch {
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDocs(selectedId);
    else setDocs([]);
  }, [selectedId, loadDocs]);

  useEffect(() => {
    if (queueState !== "upload" || !canUploadDocuments || !selectedId || loading) return;
    const el = uploadSectionRef.current;
    if (!el) return;
    window.requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, [queueState, canUploadDocuments, selectedId, loading, rows.length]);

  const goNext = () => {
    if (selectedIndex < 0 || selectedIndex >= rows.length - 1) return;
    setSelectedId(rows[selectedIndex + 1].id);
  };

  const goPrev = () => {
    if (selectedIndex <= 0) return;
    setSelectedId(rows[selectedIndex - 1].id);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPage = () => {
    setSelectedIds(new Set(rows.map((r) => r.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulkVerify = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      showToast({ kind: "error", title: "Select at least one student" });
      return;
    }
    setBulkWorking(true);
    try {
      const res = await fetch("/api/admissions/bulk-desk-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Bulk verify failed");
      showToast({ kind: "success", title: `Updated ${data.updatedCount} student(s)` });
      clearSelection();
      await loadRows();
      if (selectedId) void loadDocs(selectedId);
    } catch (e) {
      showToast({ kind: "error", title: e instanceof Error ? e.message : "Bulk verify failed" });
    } finally {
      setBulkWorking(false);
    }
  };

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId || !canUploadDocuments) return;
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast({ kind: "error", title: "Choose a file" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("studentId", selectedId);
      fd.set("documentType", docType);
      fd.set("ownerType", "STUDENT");
      fd.set("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Upload failed");
      showToast({ kind: "success", title: "Document uploaded" });
      fileInput.value = "";
      void loadDocs(selectedId);
      void loadRows();
    } catch (err) {
      showToast({ kind: "error", title: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
    syncUrl({ search: searchInput.trim(), page: 1 });
  };

  const setQueueTab = (id: WorkbenchQueue) => {
    setQueueState(id);
    setPage(1);
    syncUrl({ queue: id, page: 1 });
  };

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow-compact">Operations</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">Student verification workbench</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              One screen for the admission register: see form, document, and eligibility status together, upload files per student, use Next/Previous to
              move through the queue, or verify many selected students at once (desk completion).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary text-sm" href="/modules/admissions?section=register&view=register">
              Classic admission list
            </Link>
            <Link className="btn-secondary text-sm" href="/modules/documents">
              Documents queue
            </Link>
            <Link
              className="btn-secondary text-sm"
              href={
                sessionFilter
                  ? `/modules/students?tab=directory&session=${encodeURIComponent(sessionFilter)}`
                  : "/modules/students?tab=directory"
              }
            >
              Student directory
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {QUEUE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                queueState === tab.id ? "bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setQueueTab(tab.id)}
              title={tab.hint}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Session filter (optional)</span>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[200px] rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                value={sessionDraft}
                onChange={(e) => setSessionDraft(e.target.value)}
                placeholder="e.g. 2026-28"
              />
              <button
                type="button"
                className="btn-secondary px-4 py-2.5 text-sm"
                onClick={() => {
                  setPage(1);
                  syncUrl({ session: sessionDraft.trim(), page: 1 });
                }}
              >
                Apply session
              </button>
            </div>
          </label>
          <label className="grid min-w-[220px] flex-1 gap-1 text-sm">
            <span className="font-medium text-slate-700">Search name / code / mobile</span>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
              <button type="button" className="btn-secondary shrink-0 px-4 py-2.5 text-sm" onClick={applySearch}>
                Search
              </button>
            </div>
          </label>
        </div>

        {canBulkVerify ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm">
            <span className="font-semibold text-amber-950">{selectedIds.size} selected</span>
            <button type="button" className="btn-secondary text-xs" onClick={selectAllPage}>
              Select page
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={clearSelection}>
              Clear
            </button>
            <button
              type="button"
              disabled={bulkWorking || !selectedIds.size}
              className="rounded-full bg-amber-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() => void runBulkVerify()}
            >
              {bulkWorking ? "Working…" : "Verify selected (desk)"}
            </button>
            <span className="text-xs text-amber-900/80">Marks form, documents, eligibility verified and admission completed.</span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <section className="surface flex max-h-[min(70vh,720px)] flex-col overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
            {loading ? "Loading…" : `${total} student(s) · page ${page} / ${totalPages}`}
          </div>
          <div className="flex-1 overflow-y-auto">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  selectedId === row.id ? "bg-emerald-50/90" : ""
                }`}
              >
                {canBulkVerify ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                    checked={selectedIds.has(row.id)}
                    onChange={(ev) => {
                      ev.stopPropagation();
                      toggleSelect(row.id);
                    }}
                    onClick={(ev) => ev.stopPropagation()}
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-sm font-bold text-slate-700">
                    {row.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{row.fullName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {row.studentCode} · {row.session} / {row.yearLabel}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.tradeName} · {row.instituteName}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {statusDot(row.admissionFormStatus === "VERIFIED")}
                      {statusDot(row.documentsStatus === "VERIFIED")}
                      {statusDot(row.eligibilityStatus === "VERIFIED")}
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">form · docs · 10th</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {!loading && !rows.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">No students match this filter.</p> : null}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={page <= 1 || loading}
              onClick={() => {
                const np = page - 1;
                setPage(np);
                syncUrl({ page: np });
              }}
            >
              Prev page
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const np = page + 1;
                setPage(np);
                syncUrl({ page: np });
              }}
            >
              Next page
            </button>
          </div>
        </section>

        <section className="surface p-6">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a student from the list to upload documents and open shortcuts.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl font-semibold text-slate-950">{selected.fullName}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selected.studentCode} · {selected.mobile} · {selected.session} / {selected.yearLabel}
                  </p>
                  <p className="text-sm text-slate-600">
                    {selected.tradeName} · {selected.instituteName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      {statusDot(selected.admissionFormStatus === "VERIFIED")}
                      Form: {selected.admissionFormStatus}
                    </span>
                    <span className="flex items-center gap-2">
                      {statusDot(selected.documentsStatus === "VERIFIED")}
                      Docs: {selected.documentsStatus}
                    </span>
                    <span className="flex items-center gap-2">
                      {statusDot(selected.eligibilityStatus === "VERIFIED")}
                      Eligibility: {selected.eligibilityStatus}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-sm" onClick={goPrev} disabled={selectedIndex <= 0}>
                    ← Previous student
                  </button>
                  <button type="button" className="btn-secondary text-sm" onClick={goNext} disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1}>
                    Next student →
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link className="chip-success text-sm" href={`/students/${selected.id}`}>
                  Full profile
                </Link>
                <Link className="chip-success text-sm" href={`/students/${selected.id}?tab=documents`}>
                  Documents tab
                </Link>
                <Link className="chip-success text-sm" href={`/admissions/${selected.id}`}>
                  Admission print
                </Link>
                <Link className="chip-success text-sm" href={`/modules/documents?search=${encodeURIComponent(selected.studentCode)}`}>
                  Find in documents queue
                </Link>
                <Link className="chip-success text-sm" href={`/students/${selected.id}?tab=undertaking`}>
                  Undertaking tab
                </Link>
              </div>

              {canUploadDocuments ? (
                <div
                  id="workbench-upload"
                  ref={uploadSectionRef}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 scroll-mt-24"
                >
                  <h4 className="text-sm font-semibold text-slate-900">Upload document for this student</h4>
                  <p className="mt-1 text-xs text-slate-600">PDF, PNG, or JPEG up to 10 MB. After upload, review in the Documents desk if needed.</p>
                  <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={onUpload}>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">Document type</span>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                      >
                        {DOC_TYPES.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">
                      <span className="font-medium text-slate-700">File</span>
                      <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" className="text-sm" />
                    </label>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
                    >
                      {uploading ? "Uploading…" : "Upload"}
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-sm text-slate-500">You do not have permission to upload documents. Ask an admin for Documents → Add access.</p>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-900">Files on record</h4>
                {docsLoading ? (
                  <p className="mt-2 text-sm text-slate-500">Loading documents…</p>
                ) : docs.length ? (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {docs.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-800">{d.documentType.replace(/_/g, " ")}</span>
                        <span className="text-slate-600">{d.originalName}</span>
                        <span className={`text-xs font-semibold ${d.verificationStatus === "VERIFIED" ? "text-emerald-700" : "text-amber-700"}`}>
                          {d.verificationStatus}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No documents uploaded yet for this student.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
