"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { showToast } from "@/lib/toast";

type CompanyRow = {
  id: string;
  companyCode: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  addressLine: string;
  industryType: string;
  note: string;
  isActive: boolean;
};

type StudentOption = {
  id: string;
  label: string;
};

type PlacementRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  tradeName: string;
  session: string;
  employerName: string;
  companyId: string;
  companyName: string;
  designation: string;
  locationName: string;
  salaryOffered: string;
  placementStatus: string;
  apprenticeshipStatus: string;
  offerDate: string;
  joiningDate: string;
  completionDate: string;
  note: string;
  createdByName: string;
};

const placementStatusOptions = [
  { label: "Interested", value: "INTERESTED" },
  { label: "Applied", value: "APPLIED" },
  { label: "Selected", value: "SELECTED" },
  { label: "Offered", value: "OFFERED" },
  { label: "Joined", value: "JOINED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Not Joined", value: "NOT_JOINED" }
];

const apprenticeshipStatusOptions = [
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "Applied", value: "APPLIED" },
  { label: "Under Process", value: "UNDER_PROCESS" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" }
];

const defaultCompanyForm = {
  companyName: "",
  contactPerson: "",
  mobile: "",
  email: "",
  addressLine: "",
  industryType: "",
  note: ""
};

const defaultPlacementForm = {
  studentId: "",
  companyId: "",
  employerName: "",
  designation: "",
  locationName: "",
  salaryOffered: "",
  placementStatus: "INTERESTED",
  apprenticeshipStatus: "NOT_STARTED",
  offerDate: "",
  joiningDate: "",
  completionDate: "",
  note: ""
};

export function PlacementDesk() {
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [placementForm, setPlacementForm] = useState(defaultPlacementForm);

  async function loadData(nextSearch = search, nextStatus = statusFilter) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);
    const response = await fetch(`/api/placement?${params.toString()}`);
    const result = await response.json();
    setCompanies(result.companies || []);
    setStudents(result.students || []);
    setPlacements(result.placements || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSaveCompany() {
    setSavingCompany(true);
    const response = await fetch("/api/placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "company", ...companyForm })
    });
    const result = await response.json();
    setSavingCompany(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Company not saved", message: result?.message || "Unable to save company" });
      return;
    }

    showToast({ kind: "success", title: "Company saved", message: result.company?.companyCode || "" });
    setCompanyForm(defaultCompanyForm);
    await loadData();
  }

  async function handleSavePlacement() {
    setSavingPlacement(true);
    const response = await fetch("/api/placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(placementForm)
    });
    const result = await response.json();
    setSavingPlacement(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Placement not saved", message: result?.message || "Unable to save placement" });
      return;
    }

    showToast({ kind: "success", title: "Placement saved", message: "Placement record added." });
    setPlacementForm(defaultPlacementForm);
    await loadData();
  }

  async function handleUpdatePlacement(row: PlacementRow) {
    setUpdatingId(row.id);
    const response = await fetch(`/api/placement/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row)
    });
    const result = await response.json();
    setUpdatingId("");

    if (!response.ok) {
      showToast({ kind: "error", title: "Placement not updated", message: result?.message || "Unable to update placement" });
      return;
    }

    showToast({ kind: "success", title: "Placement updated", message: row.studentCode });
    await loadData();
  }

  const joinedCount = useMemo(() => placements.filter((item) => item.placementStatus === "JOINED").length, [placements]);
  const apprenticeshipActiveCount = useMemo(() => placements.filter((item) => item.apprenticeshipStatus === "ACTIVE").length, [placements]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Placement & Apprenticeship</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Employer Linkage, Offers, Joining, and Apprenticeship Desk</h3>
            <p className="mt-2 text-sm text-slate-600">Track company partners, student placement progress, apprenticeship workflow, joining dates, and pass-out career outcomes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-success">{companies.length} companies</span>
            <span className="chip-success">{joinedCount} joined</span>
            <span className="chip-warning">{apprenticeshipActiveCount} apprenticeship active</span>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input label="Search" placeholder="Student, company, employer" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select label="Placement Status" options={placementStatusOptions} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} placeholder="All statuses" />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadData(search, statusFilter)} type="button">
              Apply
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="surface p-6">
          <p className="eyebrow-compact">Company Master</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Add Employer / Company</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input label="Company Name" required value={companyForm.companyName} onChange={(event) => setCompanyForm((current) => ({ ...current, companyName: event.target.value }))} />
            <Input label="Contact Person" helperText="Optional" value={companyForm.contactPerson} onChange={(event) => setCompanyForm((current) => ({ ...current, contactPerson: event.target.value }))} />
            <Input label="Mobile" helperText="Optional" value={companyForm.mobile} onChange={(event) => setCompanyForm((current) => ({ ...current, mobile: event.target.value }))} />
            <Input label="Email" helperText="Optional" value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))} />
            <Input label="Industry Type" helperText="Optional" value={companyForm.industryType} onChange={(event) => setCompanyForm((current) => ({ ...current, industryType: event.target.value }))} />
            <Input label="Address" helperText="Optional" value={companyForm.addressLine} onChange={(event) => setCompanyForm((current) => ({ ...current, addressLine: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Note" helperText="Optional" value={companyForm.note} onChange={(event) => setCompanyForm((current) => ({ ...current, note: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingCompany} onClick={() => void handleSaveCompany()} type="button">
              {savingCompany ? "Saving..." : "Save Company"}
            </button>
          </div>
        </article>

        <article className="surface p-6">
          <p className="eyebrow-compact">Placement Entry</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Add Student Placement / Apprenticeship Record</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Select label="Student" required options={students.map((item) => ({ label: item.label, value: item.id }))} value={placementForm.studentId} onChange={(event) => setPlacementForm((current) => ({ ...current, studentId: event.target.value }))} />
            <Select
              label="Company"
              options={companies.filter((item) => item.isActive).map((item) => ({ label: `${item.companyCode} - ${item.companyName}`, value: item.id }))}
              value={placementForm.companyId}
              onChange={(event) => {
                const company = companies.find((item) => item.id === event.target.value);
                setPlacementForm((current) => ({
                  ...current,
                  companyId: event.target.value,
                  employerName: company?.companyName || current.employerName
                }));
              }}
              placeholder="Custom employer"
            />
            <Input label="Employer Name" required value={placementForm.employerName} onChange={(event) => setPlacementForm((current) => ({ ...current, employerName: event.target.value }))} />
            <Input label="Designation" helperText="Optional" value={placementForm.designation} onChange={(event) => setPlacementForm((current) => ({ ...current, designation: event.target.value }))} />
            <Input label="Location" helperText="Optional" value={placementForm.locationName} onChange={(event) => setPlacementForm((current) => ({ ...current, locationName: event.target.value }))} />
            <Input label="Salary Offered" helperText="Optional" type="number" min="0" step="0.01" value={placementForm.salaryOffered} onChange={(event) => setPlacementForm((current) => ({ ...current, salaryOffered: event.target.value }))} />
            <Select label="Placement Status" options={placementStatusOptions} value={placementForm.placementStatus} onChange={(event) => setPlacementForm((current) => ({ ...current, placementStatus: event.target.value }))} />
            <Select label="Apprenticeship Status" options={apprenticeshipStatusOptions} value={placementForm.apprenticeshipStatus} onChange={(event) => setPlacementForm((current) => ({ ...current, apprenticeshipStatus: event.target.value }))} />
            <Input label="Offer Date" type="date" helperText="Optional" value={placementForm.offerDate} onChange={(event) => setPlacementForm((current) => ({ ...current, offerDate: event.target.value }))} />
            <Input label="Joining Date" type="date" helperText="Optional" value={placementForm.joiningDate} onChange={(event) => setPlacementForm((current) => ({ ...current, joiningDate: event.target.value }))} />
            <Input label="Completion Date" type="date" helperText="Optional" value={placementForm.completionDate} onChange={(event) => setPlacementForm((current) => ({ ...current, completionDate: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Note" helperText="Optional" value={placementForm.note} onChange={(event) => setPlacementForm((current) => ({ ...current, note: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingPlacement} onClick={() => void handleSavePlacement()} type="button">
              {savingPlacement ? "Saving..." : "Save Placement"}
            </button>
          </div>
        </article>
      </section>

      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : (
        <>
          <section className="surface p-6">
            <p className="eyebrow-compact">Company Register</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Employer Network</h4>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Industry</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="font-medium text-slate-900">{row.companyName}</div>
                        <div className="text-xs text-slate-500">{row.companyCode}</div>
                      </td>
                      <td>{row.contactPerson || row.mobile || "—"}</td>
                      <td>{row.industryType || "—"}</td>
                      <td><StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface p-6">
            <p className="eyebrow-compact">Placement Register</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Student Outcomes and Apprenticeship</h4>
            <div className="mt-5 space-y-4">
              {placements.map((row) => (
                <article key={row.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="text-lg font-semibold text-slate-900">{row.studentName}</h5>
                        <StatusBadge status={row.placementStatus} />
                        <StatusBadge status={row.apprenticeshipStatus} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {row.studentCode} • {row.tradeName} • {row.session}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Select
                      label="Company"
                      options={companies.filter((item) => item.isActive).map((item) => ({ label: `${item.companyCode} - ${item.companyName}`, value: item.id }))}
                      value={row.companyId}
                      onChange={(event) =>
                        setPlacements((current) => current.map((item) => {
                          if (item.id !== row.id) return item;
                          const company = companies.find((entry) => entry.id === event.target.value);
                          return { ...item, companyId: event.target.value, companyName: company?.companyName || "", employerName: company?.companyName || item.employerName };
                        }))
                      }
                      placeholder="Custom employer"
                    />
                    <Input label="Employer Name" value={row.employerName} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, employerName: event.target.value } : item)))} />
                    <Input label="Designation" helperText="Optional" value={row.designation} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, designation: event.target.value } : item)))} />
                    <Input label="Location" helperText="Optional" value={row.locationName} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, locationName: event.target.value } : item)))} />
                    <Input label="Salary Offered" helperText="Optional" type="number" min="0" step="0.01" value={row.salaryOffered} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, salaryOffered: event.target.value } : item)))} />
                    <Select label="Placement Status" options={placementStatusOptions} value={row.placementStatus} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, placementStatus: event.target.value } : item)))} />
                    <Select label="Apprenticeship Status" options={apprenticeshipStatusOptions} value={row.apprenticeshipStatus} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, apprenticeshipStatus: event.target.value } : item)))} />
                    <Input label="Offer Date" type="date" helperText="Optional" value={row.offerDate} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, offerDate: event.target.value } : item)))} />
                    <Input label="Joining Date" type="date" helperText="Optional" value={row.joiningDate} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, joiningDate: event.target.value } : item)))} />
                    <Input label="Completion Date" type="date" helperText="Optional" value={row.completionDate} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, completionDate: event.target.value } : item)))} />
                  </div>
                  <div className="mt-3">
                    <Textarea label="Note" helperText="Optional" value={row.note} onChange={(event) => setPlacements((current) => current.map((item) => (item.id === row.id ? { ...item, note: event.target.value } : item)))} />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button className="btn-primary" disabled={updatingId === row.id} onClick={() => void handleUpdatePlacement(row)} type="button">
                      {updatingId === row.id ? "Saving..." : "Save Update"}
                    </button>
                  </div>
                </article>
              ))}

              {!placements.length ? <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No placement records found for current filters.</section> : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
