"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { admissionModeOptions, categoryOptions, instituteOptions, qualificationOptions, tradeOptions } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";
import { enquiryPayloadSchema } from "@/lib/validations/enquiry";

type EnquiryRow = {
  id: string;
  fullName: string;
  mobile: string;
  parentMobile: string | null;
  instituteCode: string | null;
  tradeId: string | null;
  qualification: string | null;
  category: string | null;
  address: string | null;
  source: string;
  enquiryDate: string;
  status: string;
  nextFollowUpDate: string;
  lastContactDate: string;
  assignedCounsellor: string | null;
  budgetConcern: string | null;
  scholarshipInterest: boolean;
  admissionMode: string | null;
  agentName: string | null;
  notes: string | null;
  followUpNotes: string | null;
  lostReason: string | null;
  convertedAt: string | null;
  convertedStudentId: string | null;
  convertedStudentCode: string | null;
};

const enquiryStatusOptions: SelectOption[] = [
  { label: "New", value: "NEW" },
  { label: "Follow Up", value: "FOLLOW_UP" },
  { label: "Visit Scheduled", value: "VISIT_SCHEDULED" },
  { label: "Counselled", value: "COUNSELLED" },
  { label: "Interested", value: "INTERESTED" },
  { label: "Documents Pending", value: "DOCUMENTS_PENDING" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Lost", value: "LOST" }
];

const enquirySourceOptions: SelectOption[] = [
  { label: "Walk-In", value: "WALK_IN" },
  { label: "Call", value: "CALL" },
  { label: "Agent", value: "AGENT" },
  { label: "Referral", value: "REFERRAL" },
  { label: "Camp", value: "CAMP" },
  { label: "Social Media", value: "SOCIAL_MEDIA" },
  { label: "Other", value: "OTHER" }
];

const initialForm = {
  fullName: "",
  mobile: "",
  parentMobile: "",
  instituteCode: "",
  tradeId: "",
  qualification: "",
  category: "",
  address: "",
  source: "WALK_IN",
  enquiryDate: new Date().toISOString().slice(0, 10),
  status: "NEW",
  nextFollowUpDate: "",
  lastContactDate: "",
  assignedCounsellor: "",
  budgetConcern: "",
  scholarshipInterest: false,
  admissionMode: "",
  agentName: "",
  notes: "",
  followUpNotes: "",
  lostReason: ""
};

export function EnquiryDesk() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dynamicInstituteOptions, setDynamicInstituteOptions] = useState<SelectOption[]>(instituteOptions);
  const [dynamicTradeOptions, setDynamicTradeOptions] = useState<SelectOption[]>(tradeOptions);

  const filteredTradeOptions = useMemo(() => {
    if (!form.instituteCode) return dynamicTradeOptions;
    return dynamicTradeOptions.filter((item) => item.value.startsWith(`${form.instituteCode}::`));
  }, [form.instituteCode, dynamicTradeOptions]);

  async function loadMasters() {
    const response = await fetch("/api/masters");
    const result = await response.json();
    if (Array.isArray(result?.institutes) && result.institutes.length) {
      setDynamicInstituteOptions(result.institutes as SelectOption[]);
    }
    if (Array.isArray(result?.trades) && result.trades.length) {
      setDynamicTradeOptions(result.trades as SelectOption[]);
    }
  }

  async function loadEnquiries(nextSearch = search, nextStatus = statusFilter) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);

    const response = await fetch(`/api/enquiries?${params.toString()}`);
    const result = await response.json();
    if (!response.ok) {
      setError(result?.message || "Unable to load enquiries");
      setLoading(false);
      return;
    }

    setRows(Array.isArray(result?.rows) ? result.rows : []);
    setSummary(result?.summary || {});
    setLoading(false);
  }

  useEffect(() => {
    void Promise.all([loadMasters(), loadEnquiries()]);
  }, []);

  async function saveEnquiry() {
    setSaving(true);
    setError("");

    const parsed = enquiryPayloadSchema.safeParse(form);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Please fix enquiry form validation errors";
      setError(firstIssue);
      showToast({ kind: "error", title: "Enquiry not saved", message: firstIssue });
      setSaving(false);
      return;
    }

    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save enquiry";
      setError(nextError);
      showToast({ kind: "error", title: "Enquiry not saved", message: nextError });
      setSaving(false);
      return;
    }

    setForm(initialForm);
    showToast({ kind: "success", title: "Enquiry saved", message: `${result.enquiry?.fullName || "Lead"} added to follow-up desk.` });
    await loadEnquiries();
    setSaving(false);
  }

  async function updateRow(enquiryId: string, payload: Partial<EnquiryRow>) {
    const response = await fetch(`/api/enquiries/${enquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "Enquiry not updated", message: result?.message || "Unable to update enquiry" });
      return;
    }

    setRows((current) =>
      current.map((item) =>
        item.id === enquiryId
          ? {
              ...item,
              ...result.enquiry
            }
          : item
      )
    );
    showToast({ kind: "success", title: "Follow-up updated", message: "Enquiry status saved." });
    await loadEnquiries();
  }

  async function openAdmission(enquiryId: string) {
    const response = await fetch(`/api/enquiries/${enquiryId}/convert`, {
      method: "POST"
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "Admission handoff failed", message: result?.message || "Unable to open admission" });
      return;
    }

    router.push(result.prefillUrl);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Lead Capture</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">New Enquiry</h3>
          </div>
          <span className="chip-warning">{rows.length} tracked</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Student Name" required value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          <Input label="Mobile" required value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} />
          <Input label="Parent Mobile" value={form.parentMobile} onChange={(event) => setForm((current) => ({ ...current, parentMobile: event.target.value }))} />
          <Input label="Enquiry Date" required type="date" value={form.enquiryDate} onChange={(event) => setForm((current) => ({ ...current, enquiryDate: event.target.value }))} />
          <Select label="Institute Interested" options={dynamicInstituteOptions} value={form.instituteCode} onChange={(event) => setForm((current) => ({ ...current, instituteCode: event.target.value, tradeId: "" }))} />
          <Select label="Trade Interested" options={filteredTradeOptions} value={form.tradeId} onChange={(event) => setForm((current) => ({ ...current, tradeId: event.target.value }))} />
          <Select label="Qualification" options={qualificationOptions} value={form.qualification} onChange={(event) => setForm((current) => ({ ...current, qualification: event.target.value }))} />
          <Select label="Category" options={categoryOptions} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
          <Select label="Source" options={enquirySourceOptions} value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
          <Select label="Admission Mode" options={admissionModeOptions} helperText="Optional" value={form.admissionMode} onChange={(event) => setForm((current) => ({ ...current, admissionMode: event.target.value }))} />
          <Input label="Assigned Counsellor" helperText="Optional" value={form.assignedCounsellor} onChange={(event) => setForm((current) => ({ ...current, assignedCounsellor: event.target.value }))} />
          <Input label="Budget Concern" helperText="Optional" value={form.budgetConcern} onChange={(event) => setForm((current) => ({ ...current, budgetConcern: event.target.value }))} />
          <Input className="md:col-span-2" label="Address / Location" helperText="Optional" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          {form.admissionMode === "AGENT" ? <Input label="Agent Name" helperText="Optional" value={form.agentName} onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))} /> : null}
        </div>

        <div className="mt-4">
          <ToggleSwitch checked={form.scholarshipInterest} label={form.scholarshipInterest ? "Scholarship interested" : "Scholarship not discussed"} onChange={(nextValue) => setForm((current) => ({ ...current, scholarshipInterest: nextValue }))} variant="warning" />
        </div>

        <div className="mt-4 grid gap-4">
          <Textarea label="Enquiry Notes" helperText="Optional" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          <Textarea label="First Follow-Up Note" helperText="Optional" value={form.followUpNotes} onChange={(event) => setForm((current) => ({ ...current, followUpNotes: event.target.value }))} />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={saving} onClick={() => void saveEnquiry()} type="button">
            {saving ? "Saving..." : "Save Enquiry"}
          </button>
          <button className="btn-secondary" onClick={() => setForm(initialForm)} type="button">
            Reset
          </button>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Follow-Up Desk</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Pipeline & Conversion</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {enquiryStatusOptions.map((item) => (
              <span key={item.value} className="chip-neutral">
                {item.label}: {summary[item.value] || 0}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input label="Search Enquiries" placeholder="Name, mobile, counsellor" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select label="Status Filter" options={enquiryStatusOptions} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadEnquiries(search, statusFilter)} type="button">
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-36" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {rows.length ? (
              rows.map((row) => (
                <article key={row.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-900">{row.fullName}</h4>
                        <StatusBadge status={row.status} />
                        <span className="chip-neutral">{row.source}</span>
                        {row.convertedStudentCode ? <span className="chip-success">{row.convertedStudentCode}</span> : null}
                      </div>
                      <p className="text-sm text-slate-600">
                        {row.mobile}
                        {row.parentMobile ? ` • Parent ${row.parentMobile}` : ""}
                        {row.qualification ? ` • ${row.qualification}` : ""}
                        {row.category ? ` • ${row.category}` : ""}
                      </p>
                      <p className="text-sm text-slate-500">
                        {row.instituteCode || "No institute"} {row.tradeId ? `• ${dynamicTradeOptions.find((item) => item.value === row.tradeId)?.label || row.tradeId}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {row.status !== "CONVERTED" && row.status !== "LOST" ? (
                        <button className="btn-primary" onClick={() => void openAdmission(row.id)} type="button">
                          Open Admission
                        </button>
                      ) : null}
                      {row.convertedStudentId ? (
                        <a className="btn-secondary" href={`/students/${row.convertedStudentId}`}>
                          Open Student
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Select
                      label="Status"
                      options={enquiryStatusOptions}
                      value={row.status}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, status: event.target.value } : item))
                        )
                      }
                    />
                    <Input
                      label="Next Follow-Up"
                      type="date"
                      value={row.nextFollowUpDate}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, nextFollowUpDate: event.target.value } : item))
                        )
                      }
                    />
                    <Input
                      label="Last Contact"
                      type="date"
                      value={row.lastContactDate}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, lastContactDate: event.target.value } : item))
                        )
                      }
                    />
                    <Input
                      label="Counsellor"
                      value={row.assignedCounsellor || ""}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, assignedCounsellor: event.target.value } : item))
                        )
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4">
                    <Input
                      label="Budget Concern"
                      helperText="Optional"
                      value={row.budgetConcern || ""}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, budgetConcern: event.target.value } : item))
                        )
                      }
                    />
                    <Textarea
                      label="Follow-Up Notes"
                      helperText="Optional"
                      value={row.followUpNotes || ""}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, followUpNotes: event.target.value } : item))
                        )
                      }
                    />
                    {row.status === "LOST" ? (
                      <Input
                        label="Lost Reason"
                        required
                        value={row.lostReason || ""}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) => (item.id === row.id ? { ...item, lostReason: event.target.value } : item))
                          )
                        }
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Enquiry {row.enquiryDate}
                      {row.convertedAt ? ` • Converted ${new Date(row.convertedAt).toLocaleDateString("en-IN")}` : ""}
                    </p>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        void updateRow(row.id, {
                          status: row.status,
                          nextFollowUpDate: row.nextFollowUpDate,
                          lastContactDate: row.lastContactDate,
                          assignedCounsellor: row.assignedCounsellor || "",
                          followUpNotes: row.followUpNotes || "",
                          lostReason: row.lostReason || "",
                          budgetConcern: row.budgetConcern || ""
                        })
                      }
                      type="button"
                    >
                      Save Follow-Up
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No enquiries found for the current filters.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
