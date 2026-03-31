"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInr } from "@/lib/currency";
import { showToast } from "@/lib/toast";
import { certificateTypeOptions } from "@/lib/services/certificate-service";

type StudentRow = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  dueAmount: string;
  status: string;
};

type CertificateLogRow = {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  printCount: number;
  lastPrintedAt: string;
  certificateType: string;
  issueDate: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  instituteName: string;
  tradeName: string;
};

export function CertificatesDesk() {
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [logs, setLogs] = useState<CertificateLogRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [certificateType, setCertificateType] = useState("BONAFIDE");
  const [note, setNote] = useState("");

  async function loadData(nextSearch = search) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    const [studentsResponse, logsResponse] = await Promise.all([
      fetch(`/api/students?${params.toString()}`),
      fetch("/api/certificates/logs")
    ]);
    const [studentsResult, logsResult] = await Promise.all([
      studentsResponse.json(),
      logsResponse.json()
    ]);

    setStudents(studentsResult.rows || []);
    setLogs(logsResult.rows || []);
    if (!selectedStudentId && studentsResult.rows?.[0]?.id) {
      setSelectedStudentId(studentsResult.rows[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function issue() {
    if (!selectedStudentId) return;
    setIssuing(true);
    const response = await fetch("/api/certificates/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudentId,
        certificateType,
        note
      })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Certificate not issued", message: result?.message || "Unable to issue certificate" });
      setIssuing(false);
      return;
    }

    showToast({ kind: "success", title: "Certificate issued", message: result.certificateNumber });
    setNote("");
    await loadData(search);
    window.open(result.printUrl, "_blank", "noopener,noreferrer");
    setIssuing(false);
  }

  const selectedStudent = students.find((item) => item.id === selectedStudentId) || null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="surface p-6">
        <div>
          <p className="eyebrow-compact">Certificate Desk</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Issue Institute Certificates</h3>
          <p className="mt-2 text-sm text-slate-600">Generate bonafide, character, no dues, and practical permission documents with a proper print log and certificate number.</p>
        </div>

        <div className="mt-6 grid gap-4">
          <Input label="Search Student" placeholder="Student name, code, mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button className="btn-secondary w-fit" onClick={() => void loadData(search)} type="button">
            Search
          </button>
          <Select
            label="Student"
            required
            options={students.map((item) => ({
              label: `${item.studentCode} • ${item.fullName}`,
              value: item.id
            }))}
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
          />
          <Select label="Certificate Type" required options={certificateTypeOptions.map((item) => ({ label: item.label, value: item.value }))} value={certificateType} onChange={(event) => setCertificateType(event.target.value)} />
          <Input label="Issue Note" helperText="Optional" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        {selectedStudent ? (
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected Student</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{selectedStudent.fullName}</p>
            <p className="mt-1 text-sm text-slate-600">{selectedStudent.studentCode} • {selectedStudent.tradeName}</p>
            <p className="mt-1 text-sm text-slate-600">{selectedStudent.session} • {selectedStudent.yearLabel}</p>
            <p className="mt-1 text-sm text-slate-600">Due Amount: {formatInr(selectedStudent.dueAmount)}</p>
            <div className="mt-3">
              <StatusBadge status={selectedStudent.status} prefix="Student" />
            </div>
            <div className="mt-4">
              <a className="btn-secondary" href={`/id-cards/${selectedStudent.id}`} target="_blank" rel="noreferrer">
                Open ID Card
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={!selectedStudentId || issuing} onClick={() => void issue()} type="button">
            {issuing ? "Issuing..." : "Issue & Print"}
          </button>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Recent Print Log</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Certificate Register</h3>
          </div>
          <span className="chip-success">{logs.length} recent</span>
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {logs.length ? (
              logs.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.certificateNumber}</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.studentName}</h4>
                      <p className="mt-1 text-sm text-slate-600">{item.studentCode} • {item.tradeName}</p>
                      <p className="mt-1 text-sm text-slate-500">{new Date(item.issueDate).toLocaleDateString("en-IN")}</p>
                      <p className="mt-1 text-xs text-slate-500">Verify Code: {item.verificationCode}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Print Count: {item.printCount}
                        {item.lastPrintedAt ? ` • Last print ${new Date(item.lastPrintedAt).toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={item.certificateType} />
                      <a className="btn-secondary" href={`/certificates/verify?code=${encodeURIComponent(item.verificationCode)}`} target="_blank" rel="noreferrer">
                        Verify
                      </a>
                      <a className="btn-secondary" href={`/certificates/${item.id}`} target="_blank" rel="noreferrer">
                        Open Print
                      </a>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No certificates issued yet.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
