"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { showToast } from "@/lib/toast";

type GrievanceRow = {
  id: string;
  grievanceNo: string;
  targetType: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedByName: string;
  reportedByMobile: string;
  assignedToName: string;
  actionTaken: string;
  resolutionNote: string;
  resolvedAt: string;
  createdByName: string;
  createdAt: string;
};

type LinkedOption = {
  id: string;
  label: string;
  value?: string;
};

const targetOptions = [
  { label: "General", value: "GENERAL" },
  { label: "Student", value: "STUDENT" },
  { label: "Staff", value: "STAFF" }
];

const priorityOptions = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" }
];

const statusOptions = [
  { label: "Open", value: "OPEN" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Action In Progress", value: "ACTION_IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" }
];

const defaultForm = {
  targetType: "GENERAL",
  studentId: "",
  staffId: "",
  category: "",
  title: "",
  description: "",
  priority: "MEDIUM",
  reportedByName: "",
  reportedByMobile: "",
  assignedToName: ""
};

export function GrievanceDesk() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<GrievanceRow[]>([]);
  const [students, setStudents] = useState<LinkedOption[]>([]);
  const [staff, setStaff] = useState<LinkedOption[]>([]);
  const [form, setForm] = useState(defaultForm);

  async function loadData(nextSearch = search, nextStatus = statusFilter) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);
    const response = await fetch(`/api/grievance?${params.toString()}`);
    const result = await response.json();
    setRows(result.grievances || []);
    setStudents(result.students || []);
    setStaff(result.staff || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate() {
    setSaving(true);
    const response = await fetch("/api/grievance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Case not saved", message: result?.message || "Unable to save grievance case" });
      return;
    }

    showToast({ kind: "success", title: "Case saved", message: result.grievance?.grievanceNo || "" });
    setForm(defaultForm);
    await loadData();
  }

  async function handleUpdate(row: GrievanceRow) {
    setUpdatingId(row.id);
    const response = await fetch(`/api/grievance/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: row.status,
        priority: row.priority,
        assignedToName: row.assignedToName,
        actionTaken: row.actionTaken,
        resolutionNote: row.resolutionNote
      })
    });
    const result = await response.json();
    setUpdatingId("");

    if (!response.ok) {
      showToast({ kind: "error", title: "Case not updated", message: result?.message || "Unable to update grievance case" });
      return;
    }

    showToast({ kind: "success", title: "Case updated", message: row.grievanceNo });
    await loadData();
  }

  const openCount = useMemo(() => rows.filter((item) => item.status !== "RESOLVED" && item.status !== "CLOSED").length, [rows]);
  const criticalCount = useMemo(() => rows.filter((item) => item.priority === "CRITICAL").length, [rows]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Complaint & Grievance</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Case Register and Resolution Desk</h3>
            <p className="mt-2 text-sm text-slate-600">Capture complaints, link them to students or staff, assign ownership, and move them through review, action, and closure.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-warning">{openCount} open</span>
            <span className={criticalCount ? "chip-danger" : "chip-success"}>{criticalCount} critical</span>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input label="Search" placeholder="Case no, title, student, staff" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select label="Status" options={statusOptions} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} placeholder="All statuses" />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadData(search, statusFilter)} type="button">
              Apply
            </button>
          </div>
        </div>
      </section>

      <section className="surface p-6">
        <p className="eyebrow-compact">New Case</p>
        <h4 className="mt-2 text-xl font-semibold text-slate-900">Create Complaint / Grievance</h4>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Select label="Target Type" options={targetOptions} value={form.targetType} onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value, studentId: "", staffId: "" }))} />
          {form.targetType === "STUDENT" ? (
            <Select label="Student" required options={students.map((item) => ({ label: item.label, value: item.id }))} value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))} />
          ) : null}
          {form.targetType === "STAFF" ? (
            <Select label="Staff" required options={staff.map((item) => ({ label: item.label, value: item.id }))} value={form.staffId} onChange={(event) => setForm((current) => ({ ...current, staffId: event.target.value }))} />
          ) : null}
          <Input label="Category" required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
          <Input label="Title" required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <Select label="Priority" options={priorityOptions} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} />
          <Input label="Reported By" helperText="Optional" value={form.reportedByName} onChange={(event) => setForm((current) => ({ ...current, reportedByName: event.target.value }))} />
          <Input label="Reporter Mobile" helperText="Optional" value={form.reportedByMobile} onChange={(event) => setForm((current) => ({ ...current, reportedByMobile: event.target.value }))} />
          <Input label="Assigned To" helperText="Optional" value={form.assignedToName} onChange={(event) => setForm((current) => ({ ...current, assignedToName: event.target.value }))} />
        </div>
        <div className="mt-3">
          <Textarea label="Description" required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" disabled={saving} onClick={() => void handleCreate()} type="button">
            {saving ? "Saving..." : "Save Case"}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : (
        <section className="surface p-6">
          <p className="eyebrow-compact">Case Register</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Active and Closed Cases</h4>
          <div className="mt-5 space-y-4">
            {rows.map((row) => (
              <article key={row.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-lg font-semibold text-slate-900">{row.title}</h5>
                      <StatusBadge status={row.status} />
                      <StatusBadge status={row.priority} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {row.grievanceNo} • {row.category} • {row.targetType}
                      {row.studentName ? ` • ${row.studentCode} ${row.studentName}` : ""}
                      {row.staffName ? ` • ${row.staffCode} ${row.staffName}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{row.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Reported by {row.reportedByName || "Unknown"} {row.reportedByMobile ? `• ${row.reportedByMobile}` : ""} • Created {row.createdAt}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Select
                    label="Status"
                    options={statusOptions}
                    value={row.status}
                    onChange={(event) =>
                      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status: event.target.value } : item)))
                    }
                  />
                  <Select
                    label="Priority"
                    options={priorityOptions}
                    value={row.priority}
                    onChange={(event) =>
                      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, priority: event.target.value } : item)))
                    }
                  />
                  <Input
                    label="Assigned To"
                    helperText="Optional"
                    value={row.assignedToName}
                    onChange={(event) =>
                      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, assignedToName: event.target.value } : item)))
                    }
                  />
                  <Input
                    label="Action Taken"
                    helperText="Optional"
                    value={row.actionTaken}
                    onChange={(event) =>
                      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, actionTaken: event.target.value } : item)))
                    }
                  />
                </div>
                <div className="mt-3">
                  <Textarea
                    label="Resolution Note"
                    helperText="Optional"
                    value={row.resolutionNote}
                    onChange={(event) =>
                      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, resolutionNote: event.target.value } : item)))
                    }
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="btn-primary" disabled={updatingId === row.id} onClick={() => void handleUpdate(row)} type="button">
                    {updatingId === row.id ? "Saving..." : "Save Update"}
                  </button>
                </div>
              </article>
            ))}

            {!rows.length ? <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No grievance cases found for current filters.</section> : null}
          </div>
        </section>
      )}
    </div>
  );
}
