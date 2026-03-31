"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  admissionFormDefaults,
  admissionModeOptions,
  agentOptions,
  categoryOptions,
  countryOptions,
  genderOptions,
  instituteOptions,
  oneYearAdmissionSessionOptions,
  parentRelationOptions,
  qualificationOptions,
  stateOptions,
  tradeUnitCatalog,
  tradeOptions,
  twoYearAdmissionSessionOptions,
  yearOptions
} from "@/lib/constants";
import {
  getBlockOptions,
  getBlockOptionsFromHierarchy,
  getDistrictOptions,
  getDistrictOptionsFromHierarchy,
  getTehsilOptions,
  getTehsilOptionsFromHierarchy,
  getWardOptions,
  getWardOptionsFromHierarchy
} from "@/lib/address-masters";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { t } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";
import { useAppLanguage } from "@/lib/use-app-language";
import { admissionPayloadSchema } from "@/lib/validations/admission";
import type { StateMap } from "@/lib/address-masters";

function CollapsibleAdmissionSection({
  title,
  description,
  defaultOpen = false,
  children
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="overflow-hidden rounded-3xl border border-slate-200 bg-white" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none">
        <div>
          <h4 className="font-semibold text-slate-900">{title}</h4>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Toggle
        </span>
      </summary>
      <div className="border-t border-slate-100 p-5">{children}</div>
    </details>
  );
}

export function AdmissionFormPreview() {
  const lang = useAppLanguage();
  const searchParams = useSearchParams();
  const dobPickerRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(admissionFormDefaults);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [studentPhotoFile, setStudentPhotoFile] = useState<File | null>(null);
  const [qualificationFiles, setQualificationFiles] = useState<Record<number, File | null>>({});
  const [casteFile, setCasteFile] = useState<File | null>(null);
  const [incomeFile, setIncomeFile] = useState<File | null>(null);
  const [unitAvailability, setUnitAvailability] = useState<
    Array<{ unitNumber: number; capacity: number; used: number; remaining: number; isFull: boolean }>
  >([]);
  const [activeSessions, setActiveSessions] = useState({
    activeOneYearSession: oneYearAdmissionSessionOptions[1]?.value || oneYearAdmissionSessionOptions[0]?.value || "",
    activeTwoYearSession: twoYearAdmissionSessionOptions[1]?.value || twoYearAdmissionSessionOptions[0]?.value || ""
  });
  const [dynamicInstituteOptions, setDynamicInstituteOptions] = useState<SelectOption[]>(instituteOptions);
  const [dynamicTradeOptions, setDynamicTradeOptions] = useState<SelectOption[]>(tradeOptions);
  const [dynamicAgentOptions, setDynamicAgentOptions] = useState<SelectOption[]>(agentOptions);
  const [dynamicCategoryOptions, setDynamicCategoryOptions] = useState<SelectOption[]>(categoryOptions);
  const [dynamicReligionOptions, setDynamicReligionOptions] = useState<SelectOption[]>([]);
  const [dynamicCasteOptions, setDynamicCasteOptions] = useState<SelectOption[]>([]);
  const [dynamicQualificationOptions, setDynamicQualificationOptions] = useState<SelectOption[]>(qualificationOptions);
  const [addressStateOptions, setAddressStateOptions] = useState<SelectOption[]>(stateOptions);
  const [addressHierarchy, setAddressHierarchy] = useState<StateMap>({});

  const filteredTradeOptions = useMemo(() => {
    if (!form.instituteId) return dynamicTradeOptions;
    return dynamicTradeOptions.filter((item) => item.value.startsWith(`${form.instituteId}::`));
  }, [form.instituteId, dynamicTradeOptions]);

  const selectedTradeMeta = tradeUnitCatalog[form.tradeId];
  const availableYearOptions = selectedTradeMeta?.durationYears === 1 ? yearOptions.filter((item) => item.value === "1st") : yearOptions;
  const availableSessionOptions =
    selectedTradeMeta?.durationYears === 1 ? oneYearAdmissionSessionOptions : twoYearAdmissionSessionOptions;
  const districtOptions = useMemo(
    () =>
      Object.keys(addressHierarchy).length
        ? getDistrictOptionsFromHierarchy(addressHierarchy, form.stateName)
        : getDistrictOptions(form.stateName),
    [addressHierarchy, form.stateName]
  );
  const tehsilOptions = useMemo(
    () =>
      Object.keys(addressHierarchy).length
        ? getTehsilOptionsFromHierarchy(addressHierarchy, form.stateName, form.district)
        : getTehsilOptions(form.stateName, form.district),
    [addressHierarchy, form.stateName, form.district]
  );
  const blockOptions = useMemo(
    () =>
      Object.keys(addressHierarchy).length
        ? getBlockOptionsFromHierarchy(addressHierarchy, form.stateName, form.district, form.tehsil)
        : getBlockOptions(form.stateName, form.district, form.tehsil),
    [addressHierarchy, form.stateName, form.district, form.tehsil]
  );
  const wardOptions = useMemo(
    () =>
      Object.keys(addressHierarchy).length
        ? getWardOptionsFromHierarchy(addressHierarchy, form.stateName, form.district, form.tehsil, form.block)
        : getWardOptions(form.stateName, form.district, form.tehsil, form.block),
    [addressHierarchy, form.stateName, form.district, form.tehsil, form.block]
  );
  const unitOptions = useMemo(() => {
    if (!selectedTradeMeta) return [];
    const source =
      unitAvailability.length > 0
        ? unitAvailability
        : Array.from({ length: selectedTradeMeta.unitCount }, (_, index) => ({
            unitNumber: index + 1,
            capacity: selectedTradeMeta.seatsPerUnit,
            used: 0,
            remaining: selectedTradeMeta.seatsPerUnit,
            isFull: false
          }));

    return source
      .filter((item) => !item.isFull)
      .map((item) => ({
        label: `Unit ${item.unitNumber} (${item.remaining} seats left)`,
        value: String(item.unitNumber)
      }));
  }, [selectedTradeMeta, unitAvailability]);
  const requiresCasteCertificate = Boolean(form.category && form.category !== "GENERAL");
  const requiresIncomeCertificate = Boolean(form.scholarshipApplied);

  useEffect(() => {
    const sourceEnquiryId = searchParams.get("sourceEnquiryId") || "";
    if (!sourceEnquiryId || form.sourceEnquiryId === sourceEnquiryId) return;

    setForm((current) => ({
      ...current,
      sourceEnquiryId,
      instituteId: searchParams.get("instituteId") || current.instituteId,
      tradeId: searchParams.get("tradeId") || current.tradeId,
      fullName: searchParams.get("fullName") || current.fullName,
      mobile: searchParams.get("mobile") || current.mobile,
      parentMobile: searchParams.get("parentMobile") || current.parentMobile,
      category: searchParams.get("category") || current.category,
      address: searchParams.get("address") || current.address,
      notes: searchParams.get("notes") || current.notes,
      admissionMode: searchParams.get("admissionMode") || current.admissionMode
    }));
  }, [searchParams, form.sourceEnquiryId]);

  useEffect(() => {
    async function loadUnitAvailability() {
      if (!form.tradeId || !form.session || !form.yearLabel) {
        setUnitAvailability([]);
        return;
      }

      const params = new URLSearchParams({
        tradeId: form.tradeId,
        session: form.session,
        yearLabel: form.yearLabel
      });
      const response = await fetch(`/api/admissions/unit-availability?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) {
        setUnitAvailability([]);
        return;
      }

      setUnitAvailability(Array.isArray(result.units) ? result.units : []);
      if (form.unitNumber) {
        const stillAvailable = (result.units || []).some(
          (item: { unitNumber: number; isFull: boolean }) => String(item.unitNumber) === form.unitNumber && !item.isFull
        );
        if (!stillAvailable) {
          setForm((current) => ({ ...current, unitNumber: "" }));
        }
      }
    }

    void loadUnitAvailability();
  }, [form.tradeId, form.session, form.yearLabel, form.unitNumber]);

  useEffect(() => {
    async function loadActiveSessions() {
      const response = await fetch("/api/masters");
      const result = await response.json();
      const config = result?.activeAdmissionSessions;
      if (config?.activeOneYearSession && config?.activeTwoYearSession) {
        setActiveSessions({
          activeOneYearSession: String(config.activeOneYearSession),
          activeTwoYearSession: String(config.activeTwoYearSession)
        });
      }
      if (Array.isArray(result?.institutes) && result.institutes.length) {
        setDynamicInstituteOptions(result.institutes as SelectOption[]);
      }
      if (Array.isArray(result?.trades) && result.trades.length) {
        setDynamicTradeOptions(result.trades as SelectOption[]);
      }
      if (Array.isArray(result?.agents) && result.agents.length) {
        setDynamicAgentOptions(result.agents as SelectOption[]);
      }
      if (Array.isArray(result?.categories) && result.categories.length) {
        setDynamicCategoryOptions(result.categories as SelectOption[]);
      }
      if (Array.isArray(result?.religions) && result.religions.length) {
        setDynamicReligionOptions(result.religions as SelectOption[]);
      }
      if (Array.isArray(result?.castes) && result.castes.length) {
        setDynamicCasteOptions(result.castes as SelectOption[]);
      }
      if (Array.isArray(result?.qualifications) && result.qualifications.length) {
        setDynamicQualificationOptions(result.qualifications as SelectOption[]);
      }
    }

    void loadActiveSessions();
  }, []);

  useEffect(() => {
    async function loadAddressMasters() {
      const response = await fetch("/api/address-masters");
      const result = await response.json();
      if (!response.ok) return;

      if (Array.isArray(result?.data?.stateOptions) && result.data.stateOptions.length) {
        setAddressStateOptions(result.data.stateOptions as SelectOption[]);
      }
      if (result?.data?.hierarchy && typeof result.data.hierarchy === "object") {
        setAddressHierarchy(result.data.hierarchy as StateMap);
      }
    }

    void loadAddressMasters();
  }, []);

  useEffect(() => {
    if (!selectedTradeMeta) return;
    const autoSession =
      selectedTradeMeta.durationYears === 1 ? activeSessions.activeOneYearSession : activeSessions.activeTwoYearSession;

    if (form.session !== autoSession) {
      setForm((current) => ({
        ...current,
        session: autoSession
      }));
    }

    if (selectedTradeMeta.durationYears === 1 && form.yearLabel !== "1st") {
      setForm((current) => ({ ...current, yearLabel: "1st" }));
    }
  }, [selectedTradeMeta, activeSessions, form.session, form.yearLabel]);

  function fieldError(label: string) {
    const loweredLabel = label.toLowerCase();
    return fieldErrors.find((item) => item.toLowerCase().includes(loweredLabel)) || "";
  }

  function updateField<K extends keyof typeof admissionFormDefaults>(key: K, value: (typeof admissionFormDefaults)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateQualification(
    index: number,
    key: keyof (typeof admissionFormDefaults)["qualifications"][number],
    value: string
  ) {
    setForm((current) => ({
      ...current,
      qualifications: current.qualifications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  }

  function formatIsoToDdMmYyyy(value: string) {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return "";
    return `${day}/${month}/${year}`;
  }

  function formatDdMmYyyyToIso(value: string) {
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function addQualification() {
    setForm((current) => ({
      ...current,
      qualifications: [
        ...current.qualifications,
        {
          qualificationLevel: "TWELFTH",
          schoolName: "",
          boardUniversity: "",
          certificateNumber: "",
          passingYear: "",
          percentage: "",
          rollNumber: ""
        }
      ]
    }));
  }

  function removeQualification(index: number) {
    setForm((current) => ({
      ...current,
      qualifications: current.qualifications.filter((_, itemIndex) => itemIndex !== index)
    }));
    setQualificationFiles((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");
    setFieldErrors([]);

    const parsed = admissionPayloadSchema.safeParse(form);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message);
      setFieldErrors(issues);
      const message = t(lang, "Please fix the highlighted fields before submitting.");
      setError(message);
      showToast({ kind: "error", title: t(lang, "Admission not saved"), message });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admissions", {
        method: "POST",
        body: (() => {
          const formData = new FormData();
          formData.append("payload", JSON.stringify(form));
          if (studentPhotoFile) formData.append("studentPhoto", studentPhotoFile);
          Object.entries(qualificationFiles).forEach(([index, file]) => {
            if (file) {
              formData.append(`qualificationDocument_${index}`, file);
            }
          });
          if (casteFile) formData.append("casteCertificate", casteFile);
          if (incomeFile) formData.append("incomeCertificate", incomeFile);
          return formData;
        })()
      });

      const result = await response.json();

      if (!response.ok) {
        const nextError = result?.message || "Admission save failed";
        setError(nextError);
        const issues = result?.issues?.fieldErrors
          ? (Object.values(result.issues.fieldErrors).flat().filter(Boolean) as string[])
          : [];
        setFieldErrors(issues);
        showToast({ kind: "error", title: t(lang, "Admission not saved"), message: nextError });
        return;
      }

      setMessage(`${t(lang, "Admission created successfully.")} ${t(lang, "Student code")}: ${result.studentCode}`);
      showToast({ kind: "success", title: t(lang, "Admission saved"), message: `Student code: ${result.studentCode}` });
      setForm(admissionFormDefaults);
      setStudentPhotoFile(null);
      setQualificationFiles({});
      setCasteFile(null);
      setIncomeFile(null);
      setFieldErrors([]);
    } catch (submissionError) {
      const nextError = submissionError instanceof Error ? submissionError.message : "Unable to submit admission";
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Admission not saved"), message: nextError });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="surface p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Admissions")}</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Admission Form Structure")}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {t(
            lang,
            "This preview shows the complete web-portal admission form structure, including parent Aadhaar and 10th-pass eligibility capture."
          )}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <CollapsibleAdmissionSection
              title={t(lang, "Admission Basics")}
              description={t(lang, "Institute, trade, session, student identity, and address details.")}
              defaultOpen
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Select label={t(lang, "Institute")} required errorText={fieldError("institute")} options={dynamicInstituteOptions} value={form.instituteId} onChange={(event) => {
                  updateField("instituteId", event.target.value);
                  updateField("tradeId", "");
                }} />
                <Select label={t(lang, "Trade")} required errorText={fieldError("trade")} helperText={t(lang, form.instituteId ? "Showing trades for selected institute." : "Select institute first for a shorter list.")} options={filteredTradeOptions} value={form.tradeId} onChange={(event) => updateField("tradeId", event.target.value)} />
                <Input label={t(lang, "Enrollment / Registration Number")} helperText={t(lang, "Optional at admission stage")} value={form.enrollmentNumber} onChange={(event) => updateField("enrollmentNumber", event.target.value)} />
                <Select label={t(lang, "Unit")} required errorText={fieldError("unit")} helperText={selectedTradeMeta ? `${selectedTradeMeta.unitCount} ${t(lang, "units")}, ${selectedTradeMeta.seatsPerUnit} ${t(lang, "seats each. Full units are hidden.")}` : t(lang, "Select trade first.")} options={unitOptions} value={form.unitNumber} onChange={(event) => updateField("unitNumber", event.target.value)} />
                <Input label={t(lang, "Session")} required errorText={fieldError("session")} helperText={t(lang, selectedTradeMeta?.durationYears === 1 ? "Auto-selected from active 1-year session setting" : "Auto-selected from active 2-year session setting")} value={form.session} onChange={() => undefined} readOnly />
                <Select label={t(lang, "Year")} required errorText={fieldError("year")} options={availableYearOptions} value={form.yearLabel} onChange={(event) => updateField("yearLabel", event.target.value)} />
                <Input label={t(lang, "Admission Date")} helperText={t(lang, "Optional")} type="date" value={form.admissionDate} onChange={(event) => updateField("admissionDate", event.target.value)} />
                <Select label={t(lang, "Admission Type")} options={[{ label: "Direct", value: "DIRECT" }, { label: "Counselling", value: "COUNSELLING" }, { label: "Management", value: "MANAGEMENT" }, { label: "Portal", value: "PORTAL" }]} value={form.admissionType} onChange={(event) => updateField("admissionType", event.target.value)} />
                <Select label={t(lang, "Admission Status")} options={[{ label: "Inquiry", value: "INQUIRY" }, { label: "Registered", value: "REGISTERED" }, { label: "Documents Pending", value: "DOCUMENTS_PENDING" }, { label: "Admitted", value: "ADMITTED" }, { label: "Provisionally Admitted", value: "PROVISIONALLY_ADMITTED" }, { label: "Canceled", value: "CANCELED" }, { label: "Dropped", value: "DROPPED" }, { label: "Transferred", value: "TRANSFERRED" }]} value={form.admissionStatusLabel} onChange={(event) => updateField("admissionStatusLabel", event.target.value)} />
                <Select label={t(lang, "Seat Type")} options={[{ label: "Regular", value: "REGULAR" }, { label: "Management", value: "MANAGEMENT" }, { label: "Counselling", value: "COUNSELLING" }, { label: "Reserved", value: "RESERVED" }]} value={form.seatType} onChange={(event) => updateField("seatType", event.target.value)} />
                <Input label={t(lang, "Roll Number")} helperText={t(lang, "Optional")} value={form.rollNumber} onChange={(event) => updateField("rollNumber", event.target.value)} />
                <Input label={t(lang, "Batch")} helperText={t(lang, "Optional")} value={form.batchLabel} onChange={(event) => updateField("batchLabel", event.target.value)} />
                <Input label={t(lang, "Shift")} helperText={t(lang, "Optional")} value={form.shiftLabel} onChange={(event) => updateField("shiftLabel", event.target.value)} />
                <Input label={t(lang, "Student Name")} required errorText={fieldError("student name")} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span>{t(lang, "Date of Birth")}</span>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600">Required</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      aria-invalid={fieldError("date of birth") ? true : undefined}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition ${
                        fieldError("date of birth")
                          ? "border-rose-300 bg-rose-50/60 focus:border-rose-500"
                          : "border-slate-200 focus:border-emerald-600"
                      }`}
                      placeholder="DD/MM/YYYY"
                      value={form.dateOfBirth}
                      onChange={(event) => updateField("dateOfBirth", event.target.value)}
                    />
                    <button
                      className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
                      onClick={() => dobPickerRef.current?.showPicker?.()}
                      type="button"
                    >
                      {t(lang, "Pick")}
                    </button>
                    <input
                      ref={dobPickerRef}
                      className="sr-only"
                      type="date"
                      value={formatDdMmYyyyToIso(form.dateOfBirth)}
                      onChange={(event) => updateField("dateOfBirth", formatIsoToDdMmYyyy(event.target.value))}
                      tabIndex={-1}
                    />
                  </div>
                  {fieldError("date of birth") ? (
                    <span className="text-xs font-medium text-rose-600">{fieldError("date of birth")}</span>
                  ) : (
                    <span className="text-xs text-slate-500">{t(lang, "Use DD/MM/YYYY format or pick from calendar")}</span>
                  )}
                </div>
                <Input label={t(lang, "Mobile")} required errorText={fieldError("mobile")} helperText={t(lang, "10 digits")} value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} />
                <Input label={t(lang, "Alternate Mobile")} errorText={fieldError("alternate mobile")} helperText={t(lang, "Optional, 10 digits")} value={form.alternateMobile} onChange={(event) => updateField("alternateMobile", event.target.value)} />
                <Input label={t(lang, "Email")} helperText={t(lang, "Optional")} value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                <Select label={t(lang, "Gender")} helperText={t(lang, "Optional")} options={genderOptions} value={form.gender} onChange={(event) => updateField("gender", event.target.value)} />
                <Select label={t(lang, "Category")} helperText={t(lang, "Optional")} options={dynamicCategoryOptions} value={form.category} onChange={(event) => updateField("category", event.target.value)} />
                <Select label={t(lang, "Caste")} helperText={t(lang, "Optional")} options={dynamicCasteOptions} value={form.caste} onChange={(event) => updateField("caste", event.target.value)} />
                <Select label={t(lang, "Religion")} helperText={t(lang, "Optional")} options={dynamicReligionOptions} value={form.religion} onChange={(event) => updateField("religion", event.target.value)} />
                <Select label={t(lang, "Marital Status")} helperText={t(lang, "Optional")} options={[{ label: "Single", value: "SINGLE" }, { label: "Married", value: "MARRIED" }, { label: "Other", value: "OTHER" }]} value={form.maritalStatus} onChange={(event) => updateField("maritalStatus", event.target.value)} />
                <Input label={t(lang, "Student Aadhaar")} required errorText={fieldError("aadhaar")} helperText={t(lang, "12 digits")} value={form.studentAadhaar} onChange={(event) => updateField("studentAadhaar", event.target.value)} />
                <Select label={t(lang, "Country")} helperText={t(lang, "Choose from list or type below")} options={countryOptions} value={form.country} onChange={(event) => updateField("country", event.target.value)} />
                <Input label={t(lang, "Country (Manual)")} helperText={t(lang, "Type manually if not in list")} value={form.country} onChange={(event) => updateField("country", event.target.value)} />
                <Select label={t(lang, "State")} helperText={t(lang, "Choose from list or type below")} options={addressStateOptions} value={form.stateName} onChange={(event) => {
                  updateField("stateName", event.target.value);
                  updateField("district", "");
                  updateField("tehsil", "");
                  updateField("block", "");
                  updateField("ward", "");
                }} />
                <Input label={t(lang, "State (Manual)")} helperText={t(lang, "Type manually if not in list")} value={form.stateName} onChange={(event) => updateField("stateName", event.target.value)} />
                <Select label={t(lang, "District")} helperText={t(lang, "Choose from list or type below")} options={districtOptions} value={form.district} onChange={(event) => {
                  updateField("district", event.target.value);
                  updateField("tehsil", "");
                  updateField("block", "");
                  updateField("ward", "");
                }} />
                <Input label={t(lang, "District (Manual)")} helperText={t(lang, "Type manually if not in list")} value={form.district} onChange={(event) => updateField("district", event.target.value)} />
                <Select label={t(lang, "Tehsil")} helperText={t(lang, "Choose from list or type below")} options={tehsilOptions} value={form.tehsil} onChange={(event) => {
                  updateField("tehsil", event.target.value);
                  updateField("block", "");
                  updateField("ward", "");
                }} />
                <Input label={t(lang, "Tehsil (Manual)")} helperText={t(lang, "Type manually if not in list")} value={form.tehsil} onChange={(event) => updateField("tehsil", event.target.value)} />
                <Select label={t(lang, "Block")} helperText={t(lang, "Choose from list or type below")} options={blockOptions} value={form.block} onChange={(event) => {
                  updateField("block", event.target.value);
                  updateField("ward", "");
                }} />
                <Input label={t(lang, "Block (Manual)")} helperText={t(lang, "Type manually if not in list")} value={form.block} onChange={(event) => updateField("block", event.target.value)} />
                <Select label={t(lang, "Ward")} helperText={t(lang, "Choose ward if available, or type it below.")} options={wardOptions} value={form.ward} onChange={(event) => updateField("ward", event.target.value)} />
                <Input label={t(lang, "Ward / Mohalla (Manual)")} helperText={t(lang, "Use this if the ward is not in the list.")} value={form.ward} onChange={(event) => updateField("ward", event.target.value)} />
                <Input label={t(lang, "Village / Area")} helperText={t(lang, "If not found above, type it manually")} value={form.areaVillage} onChange={(event) => updateField("areaVillage", event.target.value)} />
                <Input label={t(lang, "Income Details")} helperText={t(lang, "Optional")} value={form.incomeDetails} onChange={(event) => updateField("incomeDetails", event.target.value)} />
                <Input label={t(lang, "Domicile Details")} helperText={t(lang, "Optional")} value={form.domicileDetails} onChange={(event) => updateField("domicileDetails", event.target.value)} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <ToggleSwitch checked={form.minorityStatus} label={t(lang, "Minority Status")} onChange={(nextValue) => updateField("minorityStatus", nextValue)} variant="warning" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <ToggleSwitch checked={form.disabilityStatus} label={t(lang, "Disability Status")} onChange={(nextValue) => updateField("disabilityStatus", nextValue)} variant="warning" />
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Student Photo")}</p>
                <input className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" type="file" accept="image/*" onChange={(event) => setStudentPhotoFile(event.target.files?.[0] || null)} />
                <p className="mt-2 text-xs text-slate-500">{t(lang, "Optional at admission. It can also be uploaded later from the student profile.")}</p>
              </div>
            </CollapsibleAdmissionSection>
          </div>

          <div className="space-y-4">
            <CollapsibleAdmissionSection
              title={t(lang, "Parent and Eligibility")}
              description={t(lang, "Guardian information, qualification details, and eligibility checks.")}
              defaultOpen
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input label={t(lang, "Father Name")} helperText={t(lang, "Optional")} value={form.fatherName} onChange={(event) => updateField("fatherName", event.target.value)} />
                <Input label={t(lang, "Mother Name")} helperText={t(lang, "Optional")} value={form.motherName} onChange={(event) => updateField("motherName", event.target.value)} />
                <Select label={t(lang, "Parent Relation")} required errorText={fieldError("parent relation")} options={parentRelationOptions} value={form.parentRelation} onChange={(event) => updateField("parentRelation", event.target.value)} />
                <Input label={t(lang, "Parent / Guardian Name")} helperText={t(lang, "Optional")} value={form.parentName} onChange={(event) => updateField("parentName", event.target.value)} />
                <Input label={t(lang, "Parent Mobile")} helperText={t(lang, "Optional, 10 digits if entered")} errorText={fieldError("parent mobile")} value={form.parentMobile} onChange={(event) => updateField("parentMobile", event.target.value)} />
                <Input label={t(lang, "Parent Aadhaar")} helperText={t(lang, "Optional, 12 digits if entered")} errorText={fieldError("parent aadhaar")} value={form.parentAadhaar} onChange={(event) => updateField("parentAadhaar", event.target.value)} />
              </div>
            </CollapsibleAdmissionSection>

            <CollapsibleAdmissionSection
              title={t(lang, "Qualifications")}
              description={t(lang, "School, board, marks, and certificate details.")}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{t(lang, "Qualifications")}</p>
                <button className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800" onClick={addQualification} type="button">
                  {t(lang, "Add Qualification")}
                </button>
              </div>
              <div className="mt-3 space-y-4">
                {form.qualifications.map((qualification, index) => (
                  <div key={`${qualification.qualificationLevel}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Qualification")} {index + 1}</p>
                      {form.qualifications.length > 1 ? (
                        <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" onClick={() => removeQualification(index)} type="button">
                          {t(lang, "Remove")}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <Select label={t(lang, "Qualification")} required options={dynamicQualificationOptions} value={qualification.qualificationLevel} onChange={(event) => updateQualification(index, "qualificationLevel", event.target.value)} />
                      <Input label={t(lang, "School Name")} helperText={t(lang, "Optional")} value={qualification.schoolName} onChange={(event) => updateQualification(index, "schoolName", event.target.value)} />
                      <Input label={t(lang, "Board / University")} helperText={t(lang, "Optional")} value={qualification.boardUniversity} onChange={(event) => updateQualification(index, "boardUniversity", event.target.value)} />
                      <Input label={t(lang, "Certificate Details")} helperText={t(lang, "Optional")} value={qualification.certificateNumber} onChange={(event) => updateQualification(index, "certificateNumber", event.target.value)} />
                      <Input label={t(lang, "Roll Number")} helperText={t(lang, "Optional")} value={qualification.rollNumber} onChange={(event) => updateQualification(index, "rollNumber", event.target.value)} />
                      <Input label={t(lang, "Passing Year")} helperText={t(lang, "Optional")} value={qualification.passingYear} onChange={(event) => updateQualification(index, "passingYear", event.target.value)} />
                      <Input label={t(lang, "Percentage")} helperText={t(lang, "Optional")} value={qualification.percentage} onChange={(event) => updateQualification(index, "percentage", event.target.value)} />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Qualification Document")}</p>
                        <input
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(event) =>
                            setQualificationFiles((current) => ({
                              ...current,
                              [index]: event.target.files?.[0] || null
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleAdmissionSection>

            <CollapsibleAdmissionSection
              title={t(lang, "Eligibility and Certificates")}
              description={t(lang, "10th pass confirmation, scholarship, and required certificate uploads.")}
            >
              <div className="space-y-4">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {t(lang, "Minimum eligibility rule:")}
                  <span className="ml-2 font-semibold">{t(lang, "Student must be 10th pass before admission can be completed.")}</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <ToggleSwitch
                    checked={form.isPassed}
                    label={t(lang, "Confirm student has passed 10th")}
                    onChange={(nextValue) => updateField("isPassed", nextValue)}
                    variant="success"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <ToggleSwitch
                    checked={form.scholarshipApplied}
                    label={t(lang, "Student has applied / will apply for scholarship")}
                    onChange={(nextValue) => updateField("scholarshipApplied", nextValue)}
                    variant="warning"
                  />
                </div>

                {requiresCasteCertificate ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Caste Certificate")}</p>
                    <input className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setCasteFile(event.target.files?.[0] || null)} />
                    <p className="mt-2 text-xs text-slate-500">{t(lang, "Required for non-General category. Can also be uploaded later in profile.")}</p>
                  </div>
                ) : null}

                {requiresIncomeCertificate ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label={t(lang, "Income Certificate Number")} required errorText={fieldError("income certificate number")} value={form.incomeCertificateNumber} onChange={(event) => updateField("incomeCertificateNumber", event.target.value)} />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Income Certificate Upload")}</p>
                        <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setIncomeFile(event.target.files?.[0] || null)} />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{t(lang, "Required when scholarship is applied. Can also be uploaded later in profile.")}</p>
                  </div>
                ) : null}
              </div>
            </CollapsibleAdmissionSection>

            <CollapsibleAdmissionSection
              title={t(lang, "Admission Mode and Agent")}
              description={t(lang, "Control the source of admission and any agent mapping.")}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Select label={t(lang, "Admission Mode")} required errorText={fieldError("admission mode")} options={admissionModeOptions} value={form.admissionMode} onChange={(event) => updateField("admissionMode", event.target.value)} />
                <Select label={t(lang, "Agent")} helperText={t(lang, "Optional unless admission is agent-based.")} options={dynamicAgentOptions} value={form.agentId} onChange={(event) => updateField("agentId", event.target.value)} />
              </div>
            </CollapsibleAdmissionSection>

            <CollapsibleAdmissionSection
              title={t(lang, "Internal Notes")}
              description={t(lang, "Private office notes for this admission entry.")}
            >
              <Textarea label={t(lang, "Internal Notes")} helperText={t(lang, "Optional")} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </CollapsibleAdmissionSection>
          </div>
        </div>

        {(message || error) ? (
          <div className={`rounded-3xl border px-4 py-4 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t(lang, "Saving Admission...") : t(lang, "Save Admission")}
          </button>
          <button
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
            onClick={() => {
              setForm(admissionFormDefaults);
              setStudentPhotoFile(null);
              setQualificationFiles({});
              setCasteFile(null);
              setIncomeFile(null);
              setError("");
              setMessage("");
              setFieldErrors([]);
              showToast({ kind: "info", title: t(lang, "Admission form reset") });
            }}
            type="button"
          >
            {t(lang, "Reset")}
          </button>
        </div>

        {fieldErrors.length ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <p className="font-semibold">{t(lang, "Please fix these fields:")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {fieldErrors.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </section>
  );
}
