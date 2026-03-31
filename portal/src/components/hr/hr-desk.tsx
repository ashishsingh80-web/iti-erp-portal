"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatInr } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";

type StaffRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  fatherName: string | null;
  motherName: string | null;
  spouseName: string | null;
  dateOfBirth: string;
  joiningDate: string;
  designation: string | null;
  department: string | null;
  staffCategory: string;
  qualifications: Array<{
    id?: string;
    level: string;
    specialization: string | null;
    boardUniversity: string | null;
    passingYear: number | null;
    percentage: string;
    documentUrl: string | null;
    documentName: string | null;
  }>;
  isCtiHolder: boolean;
  ctiPassingYear: number | null;
  ctiTrade: string | null;
  ctiInstituteName: string | null;
  ctiPercentage: string;
  ctiDocumentUrl: string | null;
  ctiDocumentName: string | null;
  salaryType: string;
  monthlySalary: string;
  mobile: string | null;
  alternateMobile: string | null;
  email: string | null;
  aadhaarNo: string | null;
  panNo: string | null;
  aadhaarDocumentUrl: string | null;
  aadhaarDocumentName: string | null;
  panDocumentUrl: string | null;
  panDocumentName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  addressLine: string | null;
  photoUrl: string | null;
  isGovtRecordOnly: boolean;
  isExperienceCase: boolean;
  experienceFromDate: string;
  experienceToDate: string;
  agreementEndDate: string;
  agreedMonthlyAmount: string;
  experienceNote: string | null;
  employmentStatus: string;
  isActive: boolean;
  lastPaymentAmount: string;
  lastPaymentDate: string;
  createdAt: string;
};

type QualificationFormRow = {
  level: string;
  specialization: string;
  boardUniversity: string;
  passingYear: string;
  percentage: string;
  documentFile: File | null;
  existingDocumentUrl: string | null;
  existingDocumentName: string | null;
};

type PaymentRow = {
  id: string;
  staffId: string;
  staffName: string;
  employeeCode: string;
  paymentMonth: string;
  paymentDate: string;
  grossAmount: string;
  deductionsAmount: string;
  netAmount: string;
  paymentMode: string;
  referenceNo: string | null;
  note: string | null;
  createdByName: string;
  createdAt: string;
};

type LeaveRow = {
  id: string;
  staffId: string;
  staffName: string;
  employeeCode: string;
  leaveType: string;
  status: string;
  fromDate: string;
  toDate: string;
  totalDays: string;
  reason: string;
  approvalNote: string;
  approvedByName: string;
  createdByName: string;
  createdAt: string;
};

const defaultStaffForm = {
  employeeCode: "",
  fullName: "",
  fatherName: "",
  motherName: "",
  spouseName: "",
  dateOfBirth: "",
  joiningDate: "",
  designation: "",
  department: "",
  staffCategory: "NON_TEACHING",
  isCtiHolder: false,
  ctiPassingYear: "",
  ctiTrade: "",
  ctiInstituteName: "",
  ctiPercentage: "",
  salaryType: "MONTHLY",
  monthlySalary: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  aadhaarNo: "",
  panNo: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  addressLine: "",
  isGovtRecordOnly: false,
  isExperienceCase: false,
  experienceFromDate: "",
  experienceToDate: "",
  agreementEndDate: "",
  agreedMonthlyAmount: "",
  experienceNote: "",
  employmentStatus: "ACTIVE"
};

const defaultQualificationRow: QualificationFormRow = {
  level: "TENTH",
  specialization: "",
  boardUniversity: "",
  passingYear: "",
  percentage: "",
  documentFile: null,
  existingDocumentUrl: null,
  existingDocumentName: null
};

const defaultPaymentForm = {
  staffId: "",
  paymentMonth: "",
  paymentDate: "",
  grossAmount: "",
  deductionsAmount: "0",
  paymentMode: "CASH",
  referenceNo: "",
  note: ""
};

const defaultLeaveForm = {
  staffId: "",
  leaveType: "CASUAL",
  status: "PENDING",
  fromDate: "",
  toDate: "",
  totalDays: "",
  reason: "",
  approvalNote: ""
};

export function HrDesk() {
  const lang = useAppLanguage();
  const [loading, setLoading] = useState(true);
  const [savingStaff, setSavingStaff] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [staffForm, setStaffForm] = useState(defaultStaffForm);
  const [qualificationRows, setQualificationRows] = useState<QualificationFormRow[]>([{ ...defaultQualificationRow }]);
  const [aadhaarDocumentFile, setAadhaarDocumentFile] = useState<File | null>(null);
  const [aadhaarDocumentMeta, setAadhaarDocumentMeta] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });
  const [panDocumentFile, setPanDocumentFile] = useState<File | null>(null);
  const [panDocumentMeta, setPanDocumentMeta] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });
  const [ctiDocumentFile, setCtiDocumentFile] = useState<File | null>(null);
  const [ctiDocumentMeta, setCtiDocumentMeta] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [paymentForm, setPaymentForm] = useState(defaultPaymentForm);
  const [leaveForm, setLeaveForm] = useState(defaultLeaveForm);
  const [savingLeave, setSavingLeave] = useState(false);
  const [updatingLeaveId, setUpdatingLeaveId] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingStaffId, setEditingStaffId] = useState("");
  const [error, setError] = useState("");

  const salaryTypeOptions = useMemo(
    () => [
      { label: "Monthly", value: "MONTHLY" },
      { label: "Daily Wage", value: "DAILY_WAGE" },
      { label: "Contract", value: "CONTRACT" }
    ],
    []
  );

  const employmentStatusOptions = useMemo(
    () => [
      { label: "Active", value: "ACTIVE" },
      { label: "On Leave", value: "ON_LEAVE" },
      { label: "Inactive", value: "INACTIVE" }
    ],
    []
  );

  const paymentModeOptions = useMemo(
    () => [
      { label: "Cash", value: "CASH" },
      { label: "UPI", value: "UPI" },
      { label: "Online", value: "ONLINE" },
      { label: "Bank Transfer", value: "BANK_TRANSFER" },
      { label: "Cheque", value: "CHEQUE" }
    ],
    []
  );

  const leaveTypeOptions = useMemo(
    () => [
      { label: "Casual Leave", value: "CASUAL" },
      { label: "Medical Leave", value: "MEDICAL" },
      { label: "Earned Leave", value: "EARNED" },
      { label: "Half Day", value: "HALF_DAY" },
      { label: "LWP", value: "LWP" },
      { label: "Other", value: "OTHER" }
    ],
    []
  );

  const leaveStatusOptions = useMemo(
    () => [
      { label: "Pending", value: "PENDING" },
      { label: "Approved", value: "APPROVED" },
      { label: "Rejected", value: "REJECTED" }
    ],
    []
  );

  const staffCategoryOptions = useMemo(
    () => [
      { label: "Technical with CTI", value: "TECHNICAL_CTI" },
      { label: "Technical without CTI", value: "TECHNICAL_NON_CTI" },
      { label: "Non-Technical Teaching", value: "NON_TECHNICAL_TEACHING" },
      { label: "Non-Teaching", value: "NON_TEACHING" }
    ],
    []
  );

  const [qualificationOptions, setQualificationOptions] = useState([
    { label: "10th", value: "TENTH" },
    { label: "12th", value: "TWELFTH" },
    { label: "ITI", value: "ITI" },
    { label: "Diploma", value: "DIPLOMA" },
    { label: "B.Tech / B.E.", value: "BTECH_BE" },
    { label: "Graduation", value: "GRADUATION" },
    { label: "Post Graduation", value: "POST_GRADUATION" },
    { label: "Other", value: "OTHER" }
  ]);

  const staffOptions = useMemo(
    () =>
      staffRows
        .filter((item) => item.isActive && !item.isGovtRecordOnly)
        .map((item) => ({
          label: `${item.employeeCode} • ${item.fullName}`,
          value: item.id
        })),
    [staffRows]
  );

  const actualStaffCount = useMemo(() => staffRows.filter((item) => item.isActive && !item.isGovtRecordOnly).length, [staffRows]);
  const govtRecordCount = useMemo(() => staffRows.filter((item) => item.isGovtRecordOnly).length, [staffRows]);
  const leftStaffCount = useMemo(() => staffRows.filter((item) => !item.isActive && !item.isGovtRecordOnly).length, [staffRows]);

  async function loadData() {
    setLoading(true);
    setError("");

    const [staffResponse, paymentsResponse, previewResponse, leavesResponse, mastersResponse] = await Promise.all([
      fetch("/api/hr/staff"),
      fetch("/api/hr/payments"),
      fetch("/api/hr/staff?preview=code"),
      fetch("/api/hr/leaves"),
      fetch("/api/masters")
    ]);
    const [staffResult, paymentsResult, previewResult, leavesResult, mastersResult] = await Promise.all([
      staffResponse.json(),
      paymentsResponse.json(),
      previewResponse.json(),
      leavesResponse.json(),
      mastersResponse.json()
    ]);

    if (!staffResponse.ok) {
      setError(staffResult?.message || "Unable to load staff");
      setLoading(false);
      return;
    }

    if (!paymentsResponse.ok) {
      setError(paymentsResult?.message || "Unable to load payments");
      setLoading(false);
      return;
    }

    if (!leavesResponse.ok) {
      setError(leavesResult?.message || "Unable to load leave records");
      setLoading(false);
      return;
    }

    setStaffRows(Array.isArray(staffResult?.staff) ? staffResult.staff : []);
    setPayments(Array.isArray(paymentsResult?.payments) ? paymentsResult.payments : []);
    setLeaves(Array.isArray(leavesResult?.leaves) ? leavesResult.leaves : []);
    if (Array.isArray(mastersResult?.qualifications) && mastersResult.qualifications.length) {
      setQualificationOptions(mastersResult.qualifications);
    }
    setStaffForm((current) => ({
      ...current,
      employeeCode: current.employeeCode || String(previewResult?.code || "")
    }));
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetStaffForm() {
    setStaffForm(defaultStaffForm);
    setQualificationRows([{ ...defaultQualificationRow }]);
    setAadhaarDocumentFile(null);
    setAadhaarDocumentMeta({ url: null, name: null });
    setPanDocumentFile(null);
    setPanDocumentMeta({ url: null, name: null });
    setCtiDocumentFile(null);
    setCtiDocumentMeta({ url: null, name: null });
    setPhotoFile(null);
    setEditingStaffId("");
  }

  function loadStaffIntoForm(item: StaffRow) {
    setEditingStaffId(item.id);
    setStaffForm({
      employeeCode: item.employeeCode,
      fullName: item.fullName,
      fatherName: item.fatherName || "",
      motherName: item.motherName || "",
      spouseName: item.spouseName || "",
      dateOfBirth: item.dateOfBirth || "",
      joiningDate: item.joiningDate || "",
      designation: item.designation || "",
      department: item.department || "",
      staffCategory: item.staffCategory,
      isCtiHolder: item.isCtiHolder,
      ctiPassingYear: item.ctiPassingYear ? String(item.ctiPassingYear) : "",
      ctiTrade: item.ctiTrade || "",
      ctiInstituteName: item.ctiInstituteName || "",
      ctiPercentage: item.ctiPercentage || "",
      salaryType: item.salaryType,
      monthlySalary: item.monthlySalary || "",
      mobile: item.mobile || "",
      alternateMobile: item.alternateMobile || "",
      email: item.email || "",
      aadhaarNo: item.aadhaarNo || "",
      panNo: item.panNo || "",
      bankName: item.bankName || "",
      accountNumber: item.accountNumber || "",
      ifscCode: item.ifscCode || "",
      addressLine: item.addressLine || "",
      isGovtRecordOnly: item.isGovtRecordOnly,
      isExperienceCase: item.isExperienceCase,
      experienceFromDate: item.experienceFromDate || "",
      experienceToDate: item.experienceToDate || "",
      agreementEndDate: item.agreementEndDate || "",
      agreedMonthlyAmount: item.agreedMonthlyAmount || "",
      experienceNote: item.experienceNote || "",
      employmentStatus: item.employmentStatus
    });
    setQualificationRows(
      item.qualifications.length
        ? item.qualifications.map((qualification) => ({
            level: qualification.level,
            specialization: qualification.specialization || "",
            boardUniversity: qualification.boardUniversity || "",
            passingYear: qualification.passingYear ? String(qualification.passingYear) : "",
            percentage: qualification.percentage || "",
            documentFile: null,
            existingDocumentUrl: qualification.documentUrl,
            existingDocumentName: qualification.documentName
          }))
        : [{ ...defaultQualificationRow }]
    );
    setAadhaarDocumentFile(null);
    setAadhaarDocumentMeta({ url: item.aadhaarDocumentUrl, name: item.aadhaarDocumentName });
    setPanDocumentFile(null);
    setPanDocumentMeta({ url: item.panDocumentUrl, name: item.panDocumentName });
    setCtiDocumentFile(null);
    setCtiDocumentMeta({ url: item.ctiDocumentUrl, name: item.ctiDocumentName });
    setPhotoFile(null);
  }

  async function saveStaff() {
    setSavingStaff(true);
    setError("");

    const formData = new FormData();
    const payload = {
      ...staffForm,
      qualifications: qualificationRows.map((row) => ({
        level: row.level,
        specialization: row.specialization,
        boardUniversity: row.boardUniversity,
        passingYear: row.passingYear,
        percentage: row.percentage,
        existingDocumentUrl: row.existingDocumentUrl,
        existingDocumentName: row.existingDocumentName
      })),
      aadhaarDocumentUrl: aadhaarDocumentMeta.url,
      aadhaarDocumentName: aadhaarDocumentMeta.name,
      panDocumentUrl: panDocumentMeta.url,
      panDocumentName: panDocumentMeta.name,
      ctiDocumentUrl: ctiDocumentMeta.url,
      ctiDocumentName: ctiDocumentMeta.name
    };
    formData.append("payload", JSON.stringify(payload));
    qualificationRows.forEach((row, index) => {
      if (row.documentFile) {
        formData.append(`qualificationDocumentFile-${index}`, row.documentFile);
      }
    });
    if (aadhaarDocumentFile) formData.append("aadhaarDocumentFile", aadhaarDocumentFile);
    if (panDocumentFile) formData.append("panDocumentFile", panDocumentFile);
    if (ctiDocumentFile) formData.append("ctiDocumentFile", ctiDocumentFile);
    if (photoFile) formData.append("photoFile", photoFile);

    const response = await fetch(editingStaffId ? `/api/hr/staff/${editingStaffId}` : "/api/hr/staff", {
      method: editingStaffId ? "PATCH" : "POST",
      body: formData
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save staff";
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "HR staff not saved"), message: nextError });
      setSavingStaff(false);
      return;
    }

    showToast({
      kind: "success",
      title: editingStaffId ? t(lang, "Staff updated") : t(lang, "Staff added"),
      message: `${result.staff?.fullName || t(lang, "Staff")} ${t(lang, "saved successfully.")}`
    });
    resetStaffForm();
    await loadData();
    setSavingStaff(false);
  }

  function updateQualificationRow(index: number, patch: Partial<QualificationFormRow>) {
    setQualificationRows((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function addQualificationRow() {
    setQualificationRows((current) => [...current, { ...defaultQualificationRow }]);
  }

  function removeQualificationRow(index: number) {
    setQualificationRows((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  async function toggleStaffActive(item: StaffRow, nextValue: boolean) {
    const response = await fetch(`/api/hr/staff/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ isActive: nextValue })
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: t(lang, "Staff not updated"), message: result?.message || t(lang, "Unable to update staff status") });
      return;
    }

    setStaffRows((current) => current.map((row) => (row.id === item.id ? { ...row, isActive: nextValue } : row)));
    showToast({
      kind: "success",
      title: t(lang, "Staff status updated"),
      message: `${item.fullName} ${t(lang, nextValue ? "is now active." : "is now inactive.")}`
    });
  }

  async function savePayment() {
    setSavingPayment(true);
    setError("");

    const response = await fetch("/api/hr/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paymentForm)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save payment";
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Payment not saved"), message: nextError });
      setSavingPayment(false);
      return;
    }

    setPaymentForm(defaultPaymentForm);
    showToast({
      kind: "success",
      title: t(lang, "Salary record saved"),
      message: `${result.payment?.staffName || t(lang, "Staff")} ${t(lang, "payment recorded successfully.")}`
    });
    await loadData();
    setSavingPayment(false);
  }

  async function saveLeave() {
    setSavingLeave(true);
    setError("");

    const response = await fetch("/api/hr/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leaveForm)
    });
    const result = await response.json();
    setSavingLeave(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to save leave";
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Leave not saved"), message: nextError });
      return;
    }

    setLeaveForm(defaultLeaveForm);
    showToast({
      kind: "success",
      title: t(lang, "Leave recorded"),
      message: `${result.leave?.staffName || t(lang, "Staff")} ${t(lang, "leave saved successfully.")}`
    });
    await loadData();
  }

  async function updateLeave(row: LeaveRow) {
    setUpdatingLeaveId(row.id);
    const response = await fetch(`/api/hr/leaves/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row)
    });
    const result = await response.json();
    setUpdatingLeaveId("");

    if (!response.ok) {
      showToast({ kind: "error", title: t(lang, "Leave not updated"), message: result?.message || t(lang, "Unable to update leave record") });
      return;
    }

    showToast({ kind: "success", title: t(lang, "Leave updated"), message: row.employeeCode });
    await loadData();
  }

  const actualActiveStaff = useMemo(
    () => staffRows.filter((item) => item.isActive && !item.isGovtRecordOnly && !item.isExperienceCase),
    [staffRows]
  );

  const payrollMonthPayments = useMemo(() => {
    return payments.filter((item) => {
      const dateMonth = item.paymentDate.slice(0, 7);
      const monthText = item.paymentMonth?.toLowerCase() || "";
      return dateMonth === payrollMonth || monthText.includes(payrollMonth);
    });
  }, [payments, payrollMonth]);

  const paidStaffCountForMonth = useMemo(
    () => new Set(payrollMonthPayments.map((item) => item.staffId)).size,
    [payrollMonthPayments]
  );

  const pendingStaffCountForMonth = useMemo(
    () => Math.max(actualActiveStaff.length - paidStaffCountForMonth, 0),
    [actualActiveStaff.length, paidStaffCountForMonth]
  );

  const payrollGrossTotal = useMemo(
    () => payrollMonthPayments.reduce((sum, item) => sum + Number(item.grossAmount || 0), 0),
    [payrollMonthPayments]
  );

  const payrollDeductionTotal = useMemo(
    () => payrollMonthPayments.reduce((sum, item) => sum + Number(item.deductionsAmount || 0), 0),
    [payrollMonthPayments]
  );

  const payrollNetTotal = useMemo(
    () => payrollMonthPayments.reduce((sum, item) => sum + Number(item.netAmount || 0), 0),
    [payrollMonthPayments]
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Staff Registry")}</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
                {editingStaffId ? t(lang, "Edit Staff") : t(lang, "Add Staff")}
              </h3>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="chip-warning">{staffRows.length} {t(lang, "total")}</span>
              <span className="chip-success">{actualStaffCount} {t(lang, "actual")}</span>
              <span className="chip-neutral">{leftStaffCount} {t(lang, "left")}</span>
              <span className="chip-neutral">{govtRecordCount} {t(lang, "govt record")}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input label="Employee Code" helperText="Auto-filled from numbering settings. You can still edit it." required value={staffForm.employeeCode} onChange={(event) => setStaffForm((current) => ({ ...current, employeeCode: event.target.value }))} />
            <Input label="Full Name" required value={staffForm.fullName} onChange={(event) => setStaffForm((current) => ({ ...current, fullName: event.target.value }))} />
            <Input label="Father Name" value={staffForm.fatherName} onChange={(event) => setStaffForm((current) => ({ ...current, fatherName: event.target.value }))} />
            <Input label="Mother Name" value={staffForm.motherName} onChange={(event) => setStaffForm((current) => ({ ...current, motherName: event.target.value }))} />
            <Input label="Spouse Name" helperText="Optional" value={staffForm.spouseName} onChange={(event) => setStaffForm((current) => ({ ...current, spouseName: event.target.value }))} />
            <Input label="Date of Birth" helperText="Optional" type="date" value={staffForm.dateOfBirth} onChange={(event) => setStaffForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
            <Input label="Joining Date" helperText="Optional" type="date" value={staffForm.joiningDate} onChange={(event) => setStaffForm((current) => ({ ...current, joiningDate: event.target.value }))} />
            <Input label="Designation" value={staffForm.designation} onChange={(event) => setStaffForm((current) => ({ ...current, designation: event.target.value }))} />
            <Input label="Department" value={staffForm.department} onChange={(event) => setStaffForm((current) => ({ ...current, department: event.target.value }))} />
            <Select label="Staff Category" options={staffCategoryOptions} value={staffForm.staffCategory} onChange={(event) => setStaffForm((current) => ({ ...current, staffCategory: event.target.value, isCtiHolder: event.target.value === "TECHNICAL_CTI" }))} />
            <Select label="Salary Type" options={salaryTypeOptions} value={staffForm.salaryType} onChange={(event) => setStaffForm((current) => ({ ...current, salaryType: event.target.value }))} />
            <Input label="Monthly Salary" helperText="Optional" value={staffForm.monthlySalary} onChange={(event) => setStaffForm((current) => ({ ...current, monthlySalary: event.target.value }))} />
            <Select label="Employment Status" options={employmentStatusOptions} value={staffForm.employmentStatus} onChange={(event) => setStaffForm((current) => ({ ...current, employmentStatus: event.target.value }))} />
            <Input label="Mobile" value={staffForm.mobile} onChange={(event) => setStaffForm((current) => ({ ...current, mobile: event.target.value }))} />
            <Input label="Alternate Mobile" helperText="Optional" value={staffForm.alternateMobile} onChange={(event) => setStaffForm((current) => ({ ...current, alternateMobile: event.target.value }))} />
            <Input label="Email" helperText="Optional" value={staffForm.email} onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))} />
            <Input label="Aadhaar Number" helperText="Optional" value={staffForm.aadhaarNo} onChange={(event) => setStaffForm((current) => ({ ...current, aadhaarNo: event.target.value }))} />
            <Input label="PAN Number" helperText="Optional" value={staffForm.panNo} onChange={(event) => setStaffForm((current) => ({ ...current, panNo: event.target.value }))} />
            <Input label="Bank Name" helperText="Optional" value={staffForm.bankName} onChange={(event) => setStaffForm((current) => ({ ...current, bankName: event.target.value }))} />
            <Input label="Account Number" helperText="Optional" value={staffForm.accountNumber} onChange={(event) => setStaffForm((current) => ({ ...current, accountNumber: event.target.value }))} />
            <Input label="IFSC Code" helperText="Optional" value={staffForm.ifscCode} onChange={(event) => setStaffForm((current) => ({ ...current, ifscCode: event.target.value }))} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <ToggleSwitch
                checked={staffForm.isGovtRecordOnly}
                label={staffForm.isGovtRecordOnly ? "Government record only entry" : "Regular institute staff entry"}
                onChange={(nextValue) =>
                  setStaffForm((current) => ({
                    ...current,
                    isGovtRecordOnly: nextValue,
                    isExperienceCase: nextValue ? false : current.isExperienceCase
                  }))
                }
                variant={staffForm.isGovtRecordOnly ? "warning" : "neutral"}
              />
              <p className="mt-2 text-xs text-slate-500">
                Use this for names kept only for government record demand, even if they were never actual employees.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <ToggleSwitch
                checked={staffForm.isExperienceCase}
                label={staffForm.isExperienceCase ? "Outsider experience certificate case" : "Normal employee case"}
                onChange={(nextValue) =>
                  setStaffForm((current) => ({
                    ...current,
                    isExperienceCase: nextValue,
                    isGovtRecordOnly: nextValue ? false : current.isGovtRecordOnly
                  }))
                }
                variant={staffForm.isExperienceCase ? "warning" : "neutral"}
              />
              <p className="mt-2 text-xs text-slate-500">
                Use this when an outsider needs an experience certificate for a custom period and pays a monthly agreed amount.
              </p>
            </div>
          </div>
          {staffForm.isExperienceCase ? (
            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Experience Certificate Agreement</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="Experience From Date" type="date" value={staffForm.experienceFromDate} onChange={(event) => setStaffForm((current) => ({ ...current, experienceFromDate: event.target.value }))} />
                <Input label="Experience To Date" type="date" value={staffForm.experienceToDate} onChange={(event) => setStaffForm((current) => ({ ...current, experienceToDate: event.target.value }))} />
                <Input label="Agreement End Date" helperText="Till this date the agreed monthly amount is payable." type="date" value={staffForm.agreementEndDate} onChange={(event) => setStaffForm((current) => ({ ...current, agreementEndDate: event.target.value }))} />
                <Input label="Agreed Monthly Amount" helperText="Optional" value={staffForm.agreedMonthlyAmount} onChange={(event) => setStaffForm((current) => ({ ...current, agreedMonthlyAmount: event.target.value }))} />
              </div>
              <div className="mt-4">
                <Textarea label="Agreement / Experience Note" helperText="Optional" value={staffForm.experienceNote} onChange={(event) => setStaffForm((current) => ({ ...current, experienceNote: event.target.value }))} />
              </div>
            </div>
          ) : null}
          <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Qualification Details</p>
                <p className="mt-1 text-xs text-slate-500">Add qualifications from 10th onwards with document upload.</p>
              </div>
              <button className="btn-secondary" onClick={addQualificationRow} type="button">
                Add Qualification
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {qualificationRows.map((row, index) => (
                <div key={`${row.level}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Select label="Qualification" options={qualificationOptions} value={row.level} onChange={(event) => updateQualificationRow(index, { level: event.target.value })} />
                    <Input label="Board / University / Institute" helperText="Optional" value={row.boardUniversity} onChange={(event) => updateQualificationRow(index, { boardUniversity: event.target.value })} />
                    <Input label="Trade / Stream / Specialization" helperText="Optional" value={row.specialization} onChange={(event) => updateQualificationRow(index, { specialization: event.target.value })} />
                    <Input label="Passing Year" helperText="Optional" value={row.passingYear} onChange={(event) => updateQualificationRow(index, { passingYear: event.target.value })} />
                    <Input label="Percentage" helperText="Optional" value={row.percentage} onChange={(event) => updateQualificationRow(index, { percentage: event.target.value })} />
                    <Input label="Qualification Document" helperText="Optional" type="file" onChange={(event) => updateQualificationRow(index, { documentFile: event.target.files?.[0] || null })} />
                  </div>
                  {row.existingDocumentUrl ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Current document:{" "}
                      <a className="font-medium text-emerald-700 underline" href={row.existingDocumentUrl} rel="noreferrer" target="_blank">
                        {row.existingDocumentName || "Open file"}
                      </a>
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-end">
                    <button className="text-sm font-semibold text-rose-700" onClick={() => removeQualificationRow(index)} type="button">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <ToggleSwitch
              checked={staffForm.isCtiHolder}
              label={staffForm.isCtiHolder ? "CTI Holder" : "Not a CTI Holder"}
              onChange={(nextValue) =>
                setStaffForm((current) => ({
                  ...current,
                  isCtiHolder: nextValue,
                  staffCategory: nextValue
                    ? "TECHNICAL_CTI"
                    : current.staffCategory === "TECHNICAL_CTI"
                      ? "TECHNICAL_NON_CTI"
                      : current.staffCategory
                }))
              }
              variant={staffForm.isCtiHolder ? "success" : "neutral"}
            />
          </div>
          {staffForm.isCtiHolder ? (
            <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">CTI Details</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="CTI Passing Year" helperText="Optional" value={staffForm.ctiPassingYear} onChange={(event) => setStaffForm((current) => ({ ...current, ctiPassingYear: event.target.value }))} />
                <Input label="CTI Trade" helperText="Optional" value={staffForm.ctiTrade} onChange={(event) => setStaffForm((current) => ({ ...current, ctiTrade: event.target.value }))} />
                <Input label="CTI Institute Name" helperText="Optional" value={staffForm.ctiInstituteName} onChange={(event) => setStaffForm((current) => ({ ...current, ctiInstituteName: event.target.value }))} />
                <Input label="Percentage in CTI" helperText="Optional" value={staffForm.ctiPercentage} onChange={(event) => setStaffForm((current) => ({ ...current, ctiPercentage: event.target.value }))} />
                <Input label="CTI Document" helperText="Optional" type="file" onChange={(event) => setCtiDocumentFile(event.target.files?.[0] || null)} />
              </div>
              {ctiDocumentMeta.url ? (
                <p className="mt-3 text-xs text-slate-500">
                  Current CTI document:{" "}
                  <a className="font-medium text-emerald-700 underline" href={ctiDocumentMeta.url} rel="noreferrer" target="_blank">
                    {ctiDocumentMeta.name || "Open file"}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Identity Documents</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input label="Aadhaar Document" helperText="Optional" type="file" onChange={(event) => setAadhaarDocumentFile(event.target.files?.[0] || null)} />
              <Input label="PAN Document" helperText="Optional" type="file" onChange={(event) => setPanDocumentFile(event.target.files?.[0] || null)} />
            </div>
            <div className="mt-3 grid gap-2">
              {aadhaarDocumentMeta.url ? (
                <p className="text-xs text-slate-500">
                  Current Aadhaar document:{" "}
                  <a className="font-medium text-emerald-700 underline" href={aadhaarDocumentMeta.url} rel="noreferrer" target="_blank">
                    {aadhaarDocumentMeta.name || "Open file"}
                  </a>
                </p>
              ) : null}
              {panDocumentMeta.url ? (
                <p className="text-xs text-slate-500">
                  Current PAN document:{" "}
                  <a className="font-medium text-emerald-700 underline" href={panDocumentMeta.url} rel="noreferrer" target="_blank">
                    {panDocumentMeta.name || "Open file"}
                  </a>
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Staff Photo</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  {photoFile ? (
                    <img alt="New staff preview" className="h-full w-full object-cover" src={URL.createObjectURL(photoFile)} />
                  ) : editingStaffId && staffRows.find((item) => item.id === editingStaffId)?.photoUrl ? (
                    <img
                      alt={staffRows.find((item) => item.id === editingStaffId)?.fullName || "Staff"}
                      className="h-full w-full object-cover"
                      src={staffRows.find((item) => item.id === editingStaffId)?.photoUrl || ""}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">No photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <Input label="Photo Upload" helperText="Optional" type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
                </div>
              </div>
            </div>
            <Textarea label="Address" helperText="Optional" value={staffForm.addressLine} onChange={(event) => setStaffForm((current) => ({ ...current, addressLine: event.target.value }))} />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={savingStaff} onClick={() => void saveStaff()} type="button">
              {savingStaff ? "Saving..." : editingStaffId ? "Update Staff" : "Save Staff"}
            </button>
            <button className="btn-secondary" onClick={resetStaffForm} type="button">
              Reset
            </button>
          </div>
        </section>

        <section className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">Salary Desk</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Record Payment</h3>
            </div>
            <span className="chip-success">{payments.length} recent</span>
          </div>

          <div className="mt-6 grid gap-4">
            <Select label="Staff" required options={staffOptions} value={paymentForm.staffId} onChange={(event) => setPaymentForm((current) => ({ ...current, staffId: event.target.value }))} />
            <Input label="Payment Month" helperText="Example: March 2026" value={paymentForm.paymentMonth} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMonth: event.target.value }))} />
            <Input label="Payment Date" required type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} />
            <Input label="Gross Amount" required value={paymentForm.grossAmount} onChange={(event) => setPaymentForm((current) => ({ ...current, grossAmount: event.target.value }))} />
            <Input label="Deductions" helperText="Optional" value={paymentForm.deductionsAmount} onChange={(event) => setPaymentForm((current) => ({ ...current, deductionsAmount: event.target.value }))} />
            <Input
              disabled
              helperText="Auto calculated"
              label="Net Amount"
              value={String(Math.max(Number(paymentForm.grossAmount || 0) - Number(paymentForm.deductionsAmount || 0), 0))}
            />
            <Select label="Payment Mode" required options={paymentModeOptions} value={paymentForm.paymentMode} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMode: event.target.value }))} />
            <Input label="Reference No." helperText="Optional" value={paymentForm.referenceNo} onChange={(event) => setPaymentForm((current) => ({ ...current, referenceNo: event.target.value }))} />
            <Textarea label="Note" helperText="Optional" value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={savingPayment} onClick={() => void savePayment()} type="button">
              {savingPayment ? "Saving..." : "Save Payment"}
            </button>
            <button className="btn-secondary" onClick={() => setPaymentForm(defaultPaymentForm)} type="button">
              Reset
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">Leave Desk</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Leave Register</h3>
            </div>
            <span className="chip-warning">{leaves.length} recent</span>
          </div>

          <div className="mt-6 grid gap-4">
            <Select label="Staff" required options={staffOptions} value={leaveForm.staffId} onChange={(event) => setLeaveForm((current) => ({ ...current, staffId: event.target.value }))} />
            <Select label="Leave Type" options={leaveTypeOptions} value={leaveForm.leaveType} onChange={(event) => setLeaveForm((current) => ({ ...current, leaveType: event.target.value }))} />
            <Select label="Status" options={leaveStatusOptions} value={leaveForm.status} onChange={(event) => setLeaveForm((current) => ({ ...current, status: event.target.value }))} />
            <Input label="From Date" required type="date" value={leaveForm.fromDate} onChange={(event) => setLeaveForm((current) => ({ ...current, fromDate: event.target.value }))} />
            <Input label="To Date" required type="date" value={leaveForm.toDate} onChange={(event) => setLeaveForm((current) => ({ ...current, toDate: event.target.value }))} />
            <Input label="Total Days" helperText="Optional, auto-calculated if blank" value={leaveForm.totalDays} onChange={(event) => setLeaveForm((current) => ({ ...current, totalDays: event.target.value }))} />
            <Textarea label="Reason" helperText="Optional" value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} />
            <Textarea label="Approval Note" helperText="Optional" value={leaveForm.approvalNote} onChange={(event) => setLeaveForm((current) => ({ ...current, approvalNote: event.target.value }))} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={savingLeave} onClick={() => void saveLeave()} type="button">
              {savingLeave ? "Saving..." : "Save Leave"}
            </button>
            <button className="btn-secondary" onClick={() => setLeaveForm(defaultLeaveForm)} type="button">
              Reset
            </button>
          </div>
        </section>

        <section className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">Payroll Summary</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Month-wise Salary Overview</h3>
            </div>
            <Input label="Payroll Month" type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Paid Staff</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{paidStaffCountForMonth}</p>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pending Staff</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{pendingStaffCountForMonth}</p>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Gross Paid</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{formatInr(payrollGrossTotal)}</p>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Net Paid</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{formatInr(payrollNetTotal)}</p>
              <p className="mt-1 text-xs text-slate-500">Deductions: {formatInr(payrollDeductionTotal)}</p>
            </article>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Pending Salary Queue</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {actualActiveStaff
                .filter((item) => !payrollMonthPayments.some((payment) => payment.staffId === item.id))
                .map((item) => (
                  <span key={item.id} className="chip-warning">
                    {item.employeeCode} • {item.fullName}
                  </span>
                ))}
              {!pendingStaffCountForMonth ? <span className="chip-success">No pending staff for selected month</span> : null}
            </div>
          </div>
        </section>
      </div>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Staff Directory</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Whole Employee Register</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="btn-secondary" href="/api/hr/staff?format=csv">
              Download Whole List
            </a>
            <a className="btn-secondary" href="/api/hr/staff?format=csv&scope=actual">
              Download Actual Employee List
            </a>
            <button className="btn-secondary" onClick={() => void loadData()} type="button">
              Reload
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {staffRows.length ? (
              staffRows.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {item.photoUrl ? (
                          <img alt={item.fullName} className="h-full w-full object-cover" src={item.photoUrl} />
                        ) : (
                          <span className="text-lg font-semibold text-slate-400">{item.fullName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.employeeCode}</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.fullName}</h4>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.designation || "No designation"} • {item.department || "No department"} • {item.staffCategory.replaceAll("_", " ")}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Salary: {item.monthlySalary ? formatInr(item.monthlySalary) : "Not set"} • Last payment: {item.lastPaymentAmount ? formatInr(item.lastPaymentAmount) : "No record"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={item.isGovtRecordOnly ? "chip-warning" : item.isActive ? "chip-success" : "chip-neutral"}>
                          {item.isGovtRecordOnly ? "Govt Record Only" : item.isActive ? "Current Institute Staff" : "Left Institute"}
                        </span>
                        {item.isExperienceCase ? <span className="chip-warning">Experience Certificate Case</span> : null}
                        {item.isCtiHolder ? <span className="chip-success">CTI Holder</span> : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Qualifications: {item.qualifications.length ? item.qualifications.map((qualification) => qualification.level.replaceAll("_", " ")).join(", ") : "Not set"}
                      </p>
                      {item.isExperienceCase ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Experience period: {item.experienceFromDate || "-"} to {item.experienceToDate || "-"} • Agreement till {item.agreementEndDate || "-"} • Monthly amount {item.agreedMonthlyAmount ? formatInr(item.agreedMonthlyAmount) : "-"}
                        </p>
                      ) : null}
                      </div>
                    </div>
                    <div className="min-w-[220px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <ToggleSwitch
                        checked={item.isActive}
                        label={item.isActive ? "Currently in institute" : "Left institute"}
                        onChange={(nextValue) => void toggleStaffActive(item, nextValue)}
                        variant={item.isActive ? "success" : "neutral"}
                      />
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{item.employmentStatus.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="btn-secondary" onClick={() => loadStaffIntoForm(item)} type="button">
                      Edit Staff
                    </button>
                    <Link className="btn-secondary" href={`/staff-id-cards/${item.id}`}>
                      Print ID Card
                    </Link>
                    {item.mobile ? <span className="chip-neutral">{item.mobile}</span> : null}
                    {item.lastPaymentDate ? <span className="chip-success">Paid on {new Date(item.lastPaymentDate).toLocaleDateString("en-IN")}</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No staff records added yet.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Payment History</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Recent Salary Records</h3>
          </div>
        </div>

        <div className="mt-6 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Month</th>
                <th>Date</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Mode</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.length ? (
                payments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-slate-900">{item.staffName}</p>
                        <p className="text-xs text-slate-500">{item.employeeCode}</p>
                      </div>
                    </td>
                    <td>{item.paymentMonth || "-"}</td>
                    <td>{new Date(item.paymentDate).toLocaleDateString("en-IN")}</td>
                    <td>{formatInr(item.grossAmount)}</td>
                    <td>{formatInr(item.deductionsAmount)}</td>
                    <td>{formatInr(item.netAmount)}</td>
                    <td>{item.paymentMode.replaceAll("_", " ")}</td>
                    <td>{item.referenceNo || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="data-table-empty" colSpan={8}>
                    No salary payment records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Leave History</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Recent Leave Records</h3>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {leaves.length ? (
            leaves.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900">{item.staffName}</h4>
                      <span className="chip-neutral">{item.employeeCode}</span>
                      <span className={item.status === "APPROVED" ? "chip-success" : item.status === "REJECTED" ? "chip-warning" : "chip-neutral"}>
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.leaveType.replaceAll("_", " ")} • {new Date(item.fromDate).toLocaleDateString("en-IN")} to {new Date(item.toDate).toLocaleDateString("en-IN")} • {item.totalDays} days
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Select label="Status" options={leaveStatusOptions} value={item.status} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, status: event.target.value } : row)))} />
                  <Input label="Leave Type" value={item.leaveType} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, leaveType: event.target.value } : row)))} />
                  <Input label="From Date" type="date" value={item.fromDate} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, fromDate: event.target.value } : row)))} />
                  <Input label="To Date" type="date" value={item.toDate} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, toDate: event.target.value } : row)))} />
                  <Input label="Total Days" value={item.totalDays} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, totalDays: event.target.value } : row)))} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Textarea label="Reason" helperText="Optional" value={item.reason} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, reason: event.target.value } : row)))} />
                  <Textarea label="Approval Note" helperText="Optional" value={item.approvalNote} onChange={(event) => setLeaves((current) => current.map((row) => (row.id === item.id ? { ...row, approvalNote: event.target.value } : row)))} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Created by {item.createdByName}
                    {item.approvedByName ? ` • Approved by ${item.approvedByName}` : ""}
                  </p>
                  <button className="btn-primary" disabled={updatingLeaveId === item.id} onClick={() => void updateLeave(item)} type="button">
                    {updatingLeaveId === item.id ? "Saving..." : "Save Leave Update"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No leave records added yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
