"use client";

import { useState } from "react";
import { formatInr } from "@/lib/currency";
import type { StudentProfileData } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";

type OperationsPanelProps = {
  studentId: string;
  currentUserRole: string;
  initialFees: StudentProfileData["fees"];
  initialScholarship: StudentProfileData["scholarship"];
  initialPrnScvt: StudentProfileData["prnScvt"];
  initialExamStatus: StudentProfileData["examStatus"];
  initialUndertaking: StudentProfileData["undertaking"];
};

type MessageState = {
  kind: "success" | "error";
  text: string;
} | null;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionLabel({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{title}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function MessageBanner({ message }: { message: MessageState }) {
  if (!message) return null;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        message.kind === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message.text}
    </div>
  );
}

export function OperationsPanel({
  studentId,
  currentUserRole,
  initialFees,
  initialScholarship,
  initialPrnScvt,
  initialExamStatus,
  initialUndertaking
}: OperationsPanelProps) {
  const lang = useAppLanguage();
  const [fees, setFees] = useState(initialFees);
  const [scholarship, setScholarship] = useState(initialScholarship);
  const [prnScvt, setPrnScvt] = useState(initialPrnScvt);
  const [examStatus, setExamStatus] = useState(initialExamStatus);
  const [undertaking, setUndertaking] = useState(initialUndertaking);

  const [feeMessage, setFeeMessage] = useState<MessageState>(null);
  const [scholarshipMessage, setScholarshipMessage] = useState<MessageState>(null);
  const [prnMessage, setPrnMessage] = useState<MessageState>(null);
  const [examMessage, setExamMessage] = useState<MessageState>(null);
  const [undertakingMessage, setUndertakingMessage] = useState<MessageState>(null);

  const [feeProfileForm, setFeeProfileForm] = useState({
    collectionMode: initialFees?.collectionMode || "DIRECT",
    instituteDecidedFee: initialFees?.instituteDecidedFee || initialFees?.finalFees || "0",
    finalFees: initialFees?.finalFees || "0",
    feesIfScholarship: initialFees?.feesIfScholarship || "",
    feesIfNoScholarship: initialFees?.feesIfNoScholarship || "",
    agentCommittedFee: initialFees?.agentCommittedFee || "",
    scholarshipApplied: Boolean(initialFees?.scholarshipApplied),
    convertedFromAgent: Boolean(initialFees?.convertedFromAgent),
    conversionReason: initialFees?.conversionReason || "",
    reminderCount: String(initialFees?.reminderCount || 0),
    lastReminderDate: initialFees?.lastReminderDate?.slice(0, 10) || "",
    finalStatus: initialFees?.finalStatus || "",
    practicalExamEligible: Boolean(initialFees?.practicalExamEligible),
    adminOverride: Boolean(initialFees?.adminOverride)
  });
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: "",
    payerType: "STUDENT",
    agentCode: "",
    collectionScope: "STUDENT_WISE",
    paymentMode: initialFees?.transactions[0]?.paymentMode || "CASH",
    allocationGroup: "",
    referenceNo: "",
    remark: "",
    transactionDate: new Date().toISOString().slice(0, 10)
  });
  const [scholarshipForm, setScholarshipForm] = useState({
    status: initialScholarship?.status || "NOT_APPLIED",
    scholarshipId: initialScholarship?.scholarshipId || "",
    queryText: initialScholarship?.queryText || "",
    approvedDate: initialScholarship?.approvedDate?.slice(0, 10) || "",
    creditedAmount: initialScholarship?.creditedAmount || "",
    creditDate: initialScholarship?.creditDate?.slice(0, 10) || "",
    incomeCertificateOk: Boolean(initialScholarship?.incomeCertificateOk),
    bankVerified: Boolean(initialScholarship?.bankVerified),
    aadhaarVerified: Boolean(initialScholarship?.aadhaarVerified),
    casteCertificateOk: Boolean(initialScholarship?.casteCertificateOk)
  });
  const [prnForm, setPrnForm] = useState({
    entRollNumber: initialPrnScvt?.entRollNumber || "",
    admissionStatus: initialPrnScvt?.admissionStatus || "ALLOTMENT",
    prnNumber: initialPrnScvt?.prnNumber || "",
    scvtRegistrationNumber: initialPrnScvt?.scvtRegistrationNumber || "",
    uploadDate: initialPrnScvt?.uploadDate?.slice(0, 10) || "",
    verificationStatus: initialPrnScvt?.verificationStatus || "PENDING",
    remark: initialPrnScvt?.remark || ""
  });
  const [undertakingForm, setUndertakingForm] = useState({
    generatedUrl: initialUndertaking?.generatedUrl || "",
    generationStatus: initialUndertaking?.generationStatus || "PENDING",
    generatedOn: initialUndertaking?.generatedOn?.slice(0, 10) || "",
    signedDocumentUrl: initialUndertaking?.signedDocumentUrl || "",
    signedStatus: initialUndertaking?.signedStatus || "PENDING",
    incrementPrintCount: false
  });
  const [examForm, setExamForm] = useState({
    examFeePaid: Boolean(initialExamStatus?.examFeePaid),
    hallTicketIssuedOn: initialExamStatus?.hallTicketIssuedOn?.slice(0, 10) || "",
    tradePracticalResult: initialExamStatus?.tradePracticalResult || "NOT_DECLARED",
    onlineTheoryResult: initialExamStatus?.onlineTheoryResult || "NOT_DECLARED",
    practicalExamAppearance: initialExamStatus?.practicalExamAppearance || "NOT_APPEARED",
    practicalAttemptCount: String(initialExamStatus?.practicalAttemptCount || 0),
    theoryAttemptCount: String(initialExamStatus?.theoryAttemptCount || 0),
    nextPracticalAttemptDate: initialExamStatus?.nextPracticalAttemptDate?.slice(0, 10) || "",
    nextTheoryAttemptDate: initialExamStatus?.nextTheoryAttemptDate?.slice(0, 10) || "",
    practicalReappearStatus: initialExamStatus?.practicalReappearStatus || "NOT_REQUIRED",
    theoryReappearStatus: initialExamStatus?.theoryReappearStatus || "NOT_REQUIRED",
    adminOverrideReason: initialExamStatus?.adminOverrideReason || "",
    resultPublished: Boolean(initialExamStatus?.resultPublished),
    resultDeclaredOn: initialExamStatus?.resultDeclaredOn?.slice(0, 10) || "",
    remark: initialExamStatus?.remark || ""
  });
  const [undertakingFile, setUndertakingFile] = useState<File | null>(null);
  const canAdminReviewUndertaking = ["SUPER_ADMIN", "ADMIN"].includes(currentUserRole);
  const isScvtCompleted = Boolean(
    (prnScvt?.entRollNumber || prnForm.entRollNumber) &&
      (prnScvt?.admissionStatus || prnForm.admissionStatus) &&
      (prnScvt?.scvtRegistrationNumber || prnForm.scvtRegistrationNumber) &&
      (prnScvt?.verificationStatus || prnForm.verificationStatus) === "VERIFIED"
  );

  async function runPatch(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message || "Request failed");
    }

    return result;
  }

  async function submitFeeProfile() {
    try {
      setFeeMessage(null);
      const result = await runPatch(`/api/students/${studentId}/fees`, {
        action: "UPDATE_PROFILE",
        ...feeProfileForm
      });
      setFees(result.feeProfile);
      setFeeProfileForm((current) => ({
        ...current,
        collectionMode: result.feeProfile.collectionMode,
        instituteDecidedFee: result.feeProfile.instituteDecidedFee || "",
        finalFees: result.feeProfile.finalFees,
        feesIfScholarship: result.feeProfile.feesIfScholarship || "",
        feesIfNoScholarship: result.feeProfile.feesIfNoScholarship || "",
        agentCommittedFee: result.feeProfile.agentCommittedFee || "",
        scholarshipApplied: result.feeProfile.scholarshipApplied,
        convertedFromAgent: result.feeProfile.convertedFromAgent,
        conversionReason: result.feeProfile.conversionReason || "",
        reminderCount: String(result.feeProfile.reminderCount || 0),
        lastReminderDate: result.feeProfile.lastReminderDate?.slice(0, 10) || "",
        finalStatus: result.feeProfile.finalStatus || "",
        practicalExamEligible: result.feeProfile.practicalExamEligible,
        adminOverride: result.feeProfile.adminOverride
      }));
      setFeeMessage({ kind: "success", text: t(lang, "Fee profile updated") });
    } catch (error) {
      setFeeMessage({ kind: "error", text: error instanceof Error ? error.message : t(lang, "Unable to update fee profile") });
    }
  }

  async function submitPayment() {
    try {
      setFeeMessage(null);
      const amountValue = Number(paymentForm.amountPaid);
      const dueAmount = Number(fees?.dueAmount || 0);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error(t(lang, "Payment amount must be greater than 0"));
      }
      if (amountValue > dueAmount) {
        throw new Error(t(lang, "Payment amount cannot exceed current due amount"));
      }
      if (paymentForm.payerType === "AGENT" && !paymentForm.agentCode.trim()) {
        throw new Error(t(lang, "Agent code is required for agent payment"));
      }
      if (!paymentForm.transactionDate) {
        throw new Error(t(lang, "Transaction date is required"));
      }
      const result = await runPatch(`/api/students/${studentId}/fees`, {
        action: "ADD_PAYMENT",
        ...paymentForm
      });
      setFees(result.feeProfile);
      setPaymentForm((current) => ({
        ...current,
        amountPaid: "",
        referenceNo: "",
        remark: ""
      }));
      setFeeMessage({ kind: "success", text: t(lang, "Payment entry saved") });
    } catch (error) {
      setFeeMessage({ kind: "error", text: error instanceof Error ? error.message : t(lang, "Unable to add payment") });
    }
  }

  async function submitScholarship() {
    try {
      setScholarshipMessage(null);
      if (scholarshipForm.status === "APPROVED") {
        if (!scholarshipForm.approvedDate) {
          throw new Error(t(lang, "Approved date is required when scholarship is approved"));
        }
        const credited = Number(scholarshipForm.creditedAmount || 0);
        if (!Number.isFinite(credited) || credited < 0) {
          throw new Error(t(lang, "Credited amount must be a valid non-negative number"));
        }
      }
      if (scholarshipForm.creditDate && !scholarshipForm.creditedAmount) {
        throw new Error(t(lang, "Credited amount is required when credit date is set"));
      }
      const result = await runPatch(`/api/students/${studentId}/scholarship`, scholarshipForm);
      setScholarship(result.scholarship);
      setScholarshipMessage({ kind: "success", text: t(lang, "Scholarship record updated") });
    } catch (error) {
      setScholarshipMessage({
        kind: "error",
        text: error instanceof Error ? error.message : t(lang, "Unable to update scholarship")
      });
    }
  }

  async function submitScvt() {
    try {
      setPrnMessage(null);
      if (prnForm.verificationStatus === "VERIFIED") {
        if (!prnForm.entRollNumber.trim() || !prnForm.admissionStatus.trim() || !prnForm.scvtRegistrationNumber.trim()) {
          throw new Error(t(lang, "Ent. Roll No., admission status, and SCVT registration are required for verified status"));
        }
      }
      const result = await runPatch(`/api/students/${studentId}/prn-scvt`, {
        entRollNumber: prnForm.entRollNumber,
        admissionStatus: prnForm.admissionStatus,
        scvtRegistrationNumber: prnForm.scvtRegistrationNumber,
        uploadDate: prnForm.uploadDate,
        verificationStatus: prnForm.verificationStatus,
        remark: prnForm.remark
      });
      setPrnScvt(result.prnScvt);
      setPrnMessage({ kind: "success", text: t(lang, "SCVT record updated") });
    } catch (error) {
      setPrnMessage({ kind: "error", text: error instanceof Error ? error.message : t(lang, "Unable to update SCVT") });
    }
  }

  async function submitPrn() {
    try {
      setPrnMessage(null);
      if (!prnForm.prnNumber.trim()) {
        throw new Error(t(lang, "PRN number is required"));
      }
      const result = await runPatch(`/api/students/${studentId}/prn-scvt`, {
        entRollNumber: prnForm.entRollNumber,
        admissionStatus: prnForm.admissionStatus,
        scvtRegistrationNumber: prnForm.scvtRegistrationNumber,
        uploadDate: prnForm.uploadDate,
        verificationStatus: prnForm.verificationStatus,
        prnNumber: prnForm.prnNumber,
        remark: prnForm.remark
      });
      setPrnScvt(result.prnScvt);
      setPrnMessage({ kind: "success", text: t(lang, "PRN record updated") });
    } catch (error) {
      setPrnMessage({ kind: "error", text: error instanceof Error ? error.message : t(lang, "Unable to update PRN") });
    }
  }

  async function submitExamStatus() {
    try {
      setExamMessage(null);
      const practicalAttempts = Number(examForm.practicalAttemptCount);
      const theoryAttempts = Number(examForm.theoryAttemptCount);
      if (!Number.isInteger(practicalAttempts) || practicalAttempts < 0) {
        throw new Error(t(lang, "Practical attempt count must be a non-negative whole number"));
      }
      if (!Number.isInteger(theoryAttempts) || theoryAttempts < 0) {
        throw new Error(t(lang, "Theory attempt count must be a non-negative whole number"));
      }
      if (examForm.resultPublished && !examForm.resultDeclaredOn) {
        throw new Error(t(lang, "Result declared date is required when result is published"));
      }
      if (examForm.tradePracticalResult === "FAIL" && practicalAttempts < 4 && !examForm.nextPracticalAttemptDate) {
        throw new Error(t(lang, "Next practical attempt date is required when practical exam is failed"));
      }
      if (examForm.onlineTheoryResult === "FAIL" && theoryAttempts < 4 && !examForm.nextTheoryAttemptDate) {
        throw new Error(t(lang, "Next theory attempt date is required when theory exam is failed"));
      }
      const result = await runPatch(`/api/students/${studentId}/exam-status`, examForm);
      setExamStatus(result.examStatus);
      setExamMessage({ kind: "success", text: t(lang, "Exam status updated") });
    } catch (error) {
      setExamMessage({ kind: "error", text: error instanceof Error ? error.message : t(lang, "Unable to update exam status") });
    }
  }

  async function submitUndertaking() {
    try {
      setUndertakingMessage(null);
      const result = await runPatch(`/api/students/${studentId}/undertaking`, undertakingForm);
      setUndertaking(result.undertaking);
      setUndertakingForm((current) => ({
        ...current,
        generatedUrl: result.undertaking.generatedUrl || "",
        generatedOn: result.undertaking.generatedOn?.slice(0, 10) || "",
        signedDocumentUrl: result.undertaking.signedDocumentUrl || "",
        generationStatus: result.undertaking.generationStatus,
        signedStatus: result.undertaking.signedStatus,
        incrementPrintCount: false
      }));
      setUndertakingMessage({ kind: "success", text: t(lang, "Undertaking updated") });
    } catch (error) {
      setUndertakingMessage({
        kind: "error",
        text: error instanceof Error ? error.message : t(lang, "Unable to update undertaking")
      });
    }
  }

  async function uploadUndertakingFile() {
    if (!undertakingFile) {
      setUndertakingMessage({ kind: "error", text: t(lang, "Choose the signed undertaking file first") });
      return;
    }

    try {
      setUndertakingMessage(null);
      const formData = new FormData();
      formData.append("file", undertakingFile);

      const response = await fetch(`/api/students/${studentId}/undertaking`, {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || t(lang, "Unable to upload signed undertaking"));
      }

      setUndertaking(result.undertaking);
      setUndertakingForm((current) => ({
        ...current,
        generatedUrl: result.undertaking.generatedUrl || "",
        generatedOn: result.undertaking.generatedOn?.slice(0, 10) || "",
        signedDocumentUrl: result.undertaking.signedDocumentUrl || "",
        generationStatus: result.undertaking.generationStatus,
        signedStatus: result.undertaking.signedStatus
      }));
      setUndertakingFile(null);
      setUndertakingMessage({ kind: "success", text: t(lang, "Signed undertaking uploaded and sent for admin approval") });
    } catch (error) {
      setUndertakingMessage({
        kind: "error",
        text: error instanceof Error ? error.message : t(lang, "Unable to upload signed undertaking")
      });
    }
  }

  async function reviewSignedUndertaking(status: "VERIFIED" | "REJECTED" | "INCOMPLETE") {
    try {
      setUndertakingMessage(null);
      const result = await runPatch(`/api/students/${studentId}/undertaking`, {
        action: "REVIEW_SIGNED_UPLOAD",
        status
      });
      setUndertaking(result.undertaking);
      setUndertakingForm((current) => ({
        ...current,
        signedDocumentUrl: result.undertaking.signedDocumentUrl || "",
        signedStatus: result.undertaking.signedStatus
      }));
      setUndertakingMessage({
        kind: "success",
        text: status === "VERIFIED" ? t(lang, "Undertaking approved by admin") : t(lang, "Undertaking review updated")
      });
    } catch (error) {
      setUndertakingMessage({
        kind: "error",
        text: error instanceof Error ? error.message : t(lang, "Unable to review signed undertaking")
      });
    }
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Operations Desk")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Fees, Scholarship, Exams, PRN & Undertaking")}</h3>
          <p className="mt-2 text-sm text-slate-600">{t(lang, "Use this desk to move the student through finance, scholarship, exam, registration, and undertaking steps.")}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">{t(lang, "Fees")}</h4>
            <StatusBadge status={fees?.paymentStatus || "UNPAID"} />
          </div>
          <MessageBanner message={feeMessage} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label={t(lang, "Final Fees")} value={formatInr(fees?.finalFees || "0")} />
            <MiniStat label={t(lang, "Paid")} value={formatInr(fees?.paidAmount || "0")} />
            <MiniStat label={t(lang, "Due")} value={formatInr(fees?.dueAmount || "0")} />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title={t(lang, "Fee Profile")} helper={t(lang, "Control collection mode, scholarship-linked fee logic, reminder tracking, and practical exam eligibility.")} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Final fees" value={feeProfileForm.finalFees} onChange={(event) => setFeeProfileForm((current) => ({ ...current, finalFees: event.target.value }))} />
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={feeProfileForm.collectionMode} onChange={(event) => setFeeProfileForm((current) => ({ ...current, collectionMode: event.target.value }))}>
              <option value="DIRECT">Direct</option>
              <option value="AGENT">Agent</option>
            </select>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Institute decided fee" value={feeProfileForm.instituteDecidedFee} onChange={(event) => setFeeProfileForm((current) => ({ ...current, instituteDecidedFee: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Fees if scholarship" value={feeProfileForm.feesIfScholarship} onChange={(event) => setFeeProfileForm((current) => ({ ...current, feesIfScholarship: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Fees if no scholarship" value={feeProfileForm.feesIfNoScholarship} onChange={(event) => setFeeProfileForm((current) => ({ ...current, feesIfNoScholarship: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Agent committed fee" value={feeProfileForm.agentCommittedFee} onChange={(event) => setFeeProfileForm((current) => ({ ...current, agentCommittedFee: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Reminder count" value={feeProfileForm.reminderCount} onChange={(event) => setFeeProfileForm((current) => ({ ...current, reminderCount: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={feeProfileForm.lastReminderDate} onChange={(event) => setFeeProfileForm((current) => ({ ...current, lastReminderDate: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Conversion reason" value={feeProfileForm.conversionReason} onChange={(event) => setFeeProfileForm((current) => ({ ...current, conversionReason: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Final status note" value={feeProfileForm.finalStatus} onChange={(event) => setFeeProfileForm((current) => ({ ...current, finalStatus: event.target.value }))} />
          </div>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <ToggleSwitch checked={feeProfileForm.scholarshipApplied} label={t(lang, "Scholarship applied")} onChange={(nextValue) => setFeeProfileForm((current) => ({ ...current, scholarshipApplied: nextValue }))} variant="warning" />
            <ToggleSwitch checked={feeProfileForm.convertedFromAgent} label={t(lang, "Converted to institute fee")} onChange={(nextValue) => setFeeProfileForm((current) => ({ ...current, convertedFromAgent: nextValue }))} variant="warning" />
            <ToggleSwitch checked={feeProfileForm.practicalExamEligible} label={t(lang, "Practical exam eligible")} onChange={(nextValue) => setFeeProfileForm((current) => ({ ...current, practicalExamEligible: nextValue }))} variant="success" />
            <ToggleSwitch checked={feeProfileForm.adminOverride} label={t(lang, "Admin override")} onChange={(nextValue) => setFeeProfileForm((current) => ({ ...current, adminOverride: nextValue }))} variant="warning" />
          </div>
          <button className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={submitFeeProfile} type="button">
            {t(lang, "Save Fee Profile")}
          </button>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title={t(lang, "Payment Entry")} helper={t(lang, "Record a new fee transaction with payer type, mode, date, reference, and optional bulk grouping.")} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Amount paid" value={paymentForm.amountPaid} onChange={(event) => setPaymentForm((current) => ({ ...current, amountPaid: event.target.value }))} />
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentForm.payerType} onChange={(event) => setPaymentForm((current) => ({ ...current, payerType: event.target.value }))}>
              <option value="STUDENT">Student</option>
              <option value="AGENT">Agent</option>
            </select>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Agent code" value={paymentForm.agentCode} onChange={(event) => setPaymentForm((current) => ({ ...current, agentCode: event.target.value }))} />
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentForm.collectionScope} onChange={(event) => setPaymentForm((current) => ({ ...current, collectionScope: event.target.value }))}>
              <option value="STUDENT_WISE">Student-wise</option>
              <option value="BULK">Bulk</option>
            </select>
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentForm.paymentMode} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMode: event.target.value }))}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online/Cheque</option>
            </select>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Bulk allocation group" value={paymentForm.allocationGroup} onChange={(event) => setPaymentForm((current) => ({ ...current, allocationGroup: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Reference no" value={paymentForm.referenceNo} onChange={(event) => setPaymentForm((current) => ({ ...current, referenceNo: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={paymentForm.transactionDate} onChange={(event) => setPaymentForm((current) => ({ ...current, transactionDate: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" placeholder="Payment remark" value={paymentForm.remark} onChange={(event) => setPaymentForm((current) => ({ ...current, remark: event.target.value }))} />
          </div>
          <button className="mt-4 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={submitPayment} type="button">
            Add Payment
          </button>
          </div>

          <div className="mt-5">
            <SectionLabel title="Recent Receipts" helper="Latest payment activity for this student, with receipt access." />
          <div className="space-y-3">
            {(fees?.transactions || []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-900">{formatInr(item.amountPaid)} via {item.paymentMode}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.receiptNo}</p>
                <p className="mt-1 text-slate-600">{new Date(item.transactionDate).toLocaleDateString("en-IN")}</p>
                <p className="mt-1 text-slate-500">{item.referenceNo || item.remark || "No reference"}</p>
                <a className="mt-2 inline-flex rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" href={`/receipts/${item.id}`} target="_blank" rel="noreferrer">
                  Open Receipt
                </a>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">Scholarship</h4>
            <StatusBadge status={scholarship?.status || "NOT_APPLIED"} />
          </div>
          <MessageBanner message={scholarshipMessage} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label="Status" value={scholarship?.status ? scholarship.status.replaceAll("_", " ") : "NOT APPLIED"} />
            <MiniStat label="Scholarship ID" value={scholarship?.scholarshipId || "Not assigned"} />
            <MiniStat label="Credited" value={formatInr(scholarship?.creditedAmount || "0")} />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title="Scholarship Record" helper="Track application stage, approval dates, credited amount, and verification dependencies." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={scholarshipForm.status} onChange={(event) => setScholarshipForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="NOT_APPLIED">Not Applied</option>
              <option value="APPLIED">Applied</option>
              <option value="UNDER_PROCESS">Under Process</option>
              <option value="QUERY_BY_DEPARTMENT">Query by Department</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Scholarship ID" value={scholarshipForm.scholarshipId} onChange={(event) => setScholarshipForm((current) => ({ ...current, scholarshipId: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={scholarshipForm.approvedDate} onChange={(event) => setScholarshipForm((current) => ({ ...current, approvedDate: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Credited amount" value={scholarshipForm.creditedAmount} onChange={(event) => setScholarshipForm((current) => ({ ...current, creditedAmount: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" type="date" value={scholarshipForm.creditDate} onChange={(event) => setScholarshipForm((current) => ({ ...current, creditDate: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" placeholder="Department query / note" value={scholarshipForm.queryText} onChange={(event) => setScholarshipForm((current) => ({ ...current, queryText: event.target.value }))} />
          </div>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <ToggleSwitch checked={scholarshipForm.incomeCertificateOk} label="Income certificate OK" onChange={(nextValue) => setScholarshipForm((current) => ({ ...current, incomeCertificateOk: nextValue }))} variant="success" />
            <ToggleSwitch checked={scholarshipForm.bankVerified} label="Bank verified" onChange={(nextValue) => setScholarshipForm((current) => ({ ...current, bankVerified: nextValue }))} variant="success" />
            <ToggleSwitch checked={scholarshipForm.aadhaarVerified} label="Aadhaar verified" onChange={(nextValue) => setScholarshipForm((current) => ({ ...current, aadhaarVerified: nextValue }))} variant="success" />
            <ToggleSwitch checked={scholarshipForm.casteCertificateOk} label="Caste certificate OK" onChange={(nextValue) => setScholarshipForm((current) => ({ ...current, casteCertificateOk: nextValue }))} variant="success" />
          </div>
          <button className="mt-4 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={submitScholarship} type="button">
            Save Scholarship
          </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">Exam Status</h4>
            <StatusBadge
              status={
                (examStatus?.tradePracticalResult === "FAIL" && !examStatus?.practicalEligibleReappear) ||
                (examStatus?.onlineTheoryResult === "FAIL" && !examStatus?.theoryEligibleReappear)
                  ? "NOT_ELIGIBLE"
                  : examStatus?.tradePracticalResult === "PASS" && examStatus?.onlineTheoryResult === "PASS"
                    ? "PASSED"
                    : "IN_PROGRESS"
              }
            />
          </div>
          <MessageBanner message={examMessage} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label="Exam Fee" value={examStatus?.examFeePaid ? "Paid" : "Pending"} />
            <MiniStat label="Hall Ticket" value={examStatus?.hallTicketIssuedOn?.slice(0, 10) || "Not Issued"} />
            <MiniStat label="Practical" value={examStatus?.tradePracticalResult || "NOT_DECLARED"} />
            <MiniStat label="Theory" value={examStatus?.onlineTheoryResult || "NOT_DECLARED"} />
            <MiniStat label="Appearance" value={examStatus?.practicalExamAppearance || "NOT_APPEARED"} />
            <MiniStat label="Practical Attempts" value={String(examStatus?.practicalAttemptCount || 0)} />
            <MiniStat label="Theory Attempts" value={String(examStatus?.theoryAttemptCount || 0)} />
            <MiniStat label="Result" value={examStatus?.resultPublished ? examStatus?.resultDeclaredOn?.slice(0, 10) || "Published" : "Pending"} />
            <MiniStat
              label="Re-Appear"
              value={
                (examStatus?.tradePracticalResult === "FAIL" && !examStatus?.practicalEligibleReappear) ||
                (examStatus?.onlineTheoryResult === "FAIL" && !examStatus?.theoryEligibleReappear)
                  ? "Not Eligible"
                  : "Eligible / Active"
              }
            />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title="Exam Tracking" helper="Maximum 4 attempts are allowed for each failed exam. Hall ticket and practical permission should only move after exam fee, no dues, documents, and eligibility are clear. If admin forces it, reason is mandatory." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ToggleSwitch checked={examForm.examFeePaid} label="Exam fee paid" onChange={(nextValue) => setExamForm((current) => ({ ...current, examFeePaid: nextValue }))} variant="success" />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={examForm.hallTicketIssuedOn} onChange={(event) => setExamForm((current) => ({ ...current, hallTicketIssuedOn: event.target.value }))} />
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={examForm.tradePracticalResult} onChange={(event) => setExamForm((current) => ({ ...current, tradePracticalResult: event.target.value }))}>
                <option value="NOT_DECLARED">Trade Practical: Not Declared</option>
                <option value="PASS">Trade Practical: Pass</option>
                <option value="FAIL">Trade Practical: Fail</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={examForm.onlineTheoryResult} onChange={(event) => setExamForm((current) => ({ ...current, onlineTheoryResult: event.target.value }))}>
                <option value="NOT_DECLARED">Online Theory: Not Declared</option>
                <option value="PASS">Online Theory: Pass</option>
                <option value="FAIL">Online Theory: Fail</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={examForm.practicalExamAppearance} onChange={(event) => setExamForm((current) => ({ ...current, practicalExamAppearance: event.target.value }))}>
                <option value="NOT_APPEARED">Practical Status: Not Appeared</option>
                <option value="APPEARED">Practical Status: Appeared</option>
              </select>
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Practical attempt count" value={examForm.practicalAttemptCount} onChange={(event) => setExamForm((current) => ({ ...current, practicalAttemptCount: event.target.value }))} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Theory attempt count" value={examForm.theoryAttemptCount} onChange={(event) => setExamForm((current) => ({ ...current, theoryAttemptCount: event.target.value }))} />
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={examForm.practicalReappearStatus} onChange={(event) => setExamForm((current) => ({ ...current, practicalReappearStatus: event.target.value }))}>
                <option value="NOT_REQUIRED">Practical Re-Appear: Not Required</option>
                <option value="PENDING">Practical Re-Appear: Pending</option>
                <option value="SCHEDULED">Practical Re-Appear: Scheduled</option>
                <option value="COMPLETED">Practical Re-Appear: Completed</option>
                <option value="NOT_ELIGIBLE">Practical Re-Appear: Not Eligible</option>
              </select>
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={examForm.nextPracticalAttemptDate} onChange={(event) => setExamForm((current) => ({ ...current, nextPracticalAttemptDate: event.target.value }))} />
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={examForm.theoryReappearStatus} onChange={(event) => setExamForm((current) => ({ ...current, theoryReappearStatus: event.target.value }))}>
                <option value="NOT_REQUIRED">Theory Re-Appear: Not Required</option>
                <option value="PENDING">Theory Re-Appear: Pending</option>
                <option value="SCHEDULED">Theory Re-Appear: Scheduled</option>
                <option value="COMPLETED">Theory Re-Appear: Completed</option>
                <option value="NOT_ELIGIBLE">Theory Re-Appear: Not Eligible</option>
              </select>
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={examForm.nextTheoryAttemptDate} onChange={(event) => setExamForm((current) => ({ ...current, nextTheoryAttemptDate: event.target.value }))} />
              <ToggleSwitch checked={examForm.resultPublished} label="Result published" onChange={(nextValue) => setExamForm((current) => ({ ...current, resultPublished: nextValue }))} variant="success" />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={examForm.resultDeclaredOn} onChange={(event) => setExamForm((current) => ({ ...current, resultDeclaredOn: event.target.value }))} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" placeholder="Admin override reason" value={examForm.adminOverrideReason} onChange={(event) => setExamForm((current) => ({ ...current, adminOverrideReason: event.target.value }))} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" placeholder="Exam remark" value={examForm.remark} onChange={(event) => setExamForm((current) => ({ ...current, remark: event.target.value }))} />
            </div>
            <button className="mt-4 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={submitExamStatus} type="button">
              Save Exam Status
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">SCVT</h4>
            <StatusBadge status={prnScvt?.verificationStatus || "PENDING"} />
          </div>
          <MessageBanner message={prnMessage} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label="Ent. Roll No." value={prnScvt?.entRollNumber || "Pending"} />
            <MiniStat label="Admission Status" value={prnScvt?.admissionStatus || "Pending"} />
            <MiniStat label="SCVT" value={prnScvt?.scvtRegistrationNumber || "Pending"} />
            <MiniStat label="Upload Date" value={prnScvt?.uploadDate?.slice(0, 10) || "Not set"} />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title="SCVT Registration" helper="Complete SCVT registration first. PRN unlocks only after SCVT is verified." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Ent. Roll No." value={prnForm.entRollNumber} onChange={(event) => setPrnForm((current) => ({ ...current, entRollNumber: event.target.value }))} />
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={prnForm.admissionStatus} onChange={(event) => setPrnForm((current) => ({ ...current, admissionStatus: event.target.value }))}>
              <option value="ALLOTMENT">Allotment</option>
              <option value="ADMITTED_NEW_ADMISSION">Admitted/New Admission</option>
              <option value="ADMISSION">Admission</option>
            </select>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="SCVT registration number" value={prnForm.scvtRegistrationNumber} onChange={(event) => setPrnForm((current) => ({ ...current, scvtRegistrationNumber: event.target.value }))} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={prnForm.uploadDate} onChange={(event) => setPrnForm((current) => ({ ...current, uploadDate: event.target.value }))} />
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={prnForm.verificationStatus} onChange={(event) => setPrnForm((current) => ({ ...current, verificationStatus: event.target.value }))}>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" placeholder="Remark" value={prnForm.remark} onChange={(event) => setPrnForm((current) => ({ ...current, remark: event.target.value }))} />
          </div>
          <button className="mt-4 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={submitScvt} type="button">
            Save SCVT
          </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">PRN</h4>
            <StatusBadge status={isScvtCompleted ? (prnScvt?.prnNumber ? "OPEN" : "READY") : "LOCKED_BY_SCVT"} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label="SCVT Stage" value={isScvtCompleted ? "Completed" : "Complete SCVT first"} />
            <MiniStat label="PRN" value={prnScvt?.prnNumber || "Pending"} />
            <MiniStat label="Upload Date" value={prnScvt?.uploadDate?.slice(0, 10) || "Not set"} />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title="PRN Registration" helper="This step opens only after SCVT registration is fully completed and verified." />
            {!isScvtCompleted ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Complete SCVT module with Ent. Roll No., Admission Status, SCVT Registration Number, and Verified status first.
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
                disabled={!isScvtCompleted}
                placeholder="PRN number"
                value={prnForm.prnNumber}
                onChange={(event) => setPrnForm((current) => ({ ...current, prnNumber: event.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
                disabled={!isScvtCompleted}
                placeholder="PRN remark"
                value={prnForm.remark}
                onChange={(event) => setPrnForm((current) => ({ ...current, remark: event.target.value }))}
              />
            </div>
            <button
              className="mt-4 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!isScvtCompleted}
              onClick={submitPrn}
              type="button"
            >
              Save PRN
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-900">Undertaking</h4>
            <StatusBadge status={`${undertaking?.printCount || 0} prints`} />
          </div>
          <MessageBanner message={undertakingMessage} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label="Code" value={undertaking?.verificationCode || "Pending"} />
            <MiniStat label="Generation" value={undertaking?.generationStatus || "PENDING"} />
            <MiniStat label="Signed" value={undertaking?.signedStatus || "PENDING"} />
            <MiniStat label="Print Count" value={String(undertaking?.printCount || 0)} />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
            <SectionLabel title="Undertaking Lifecycle" helper="Staff can only print the prefilled undertaking and upload the signed copy. Admin can change the print format from Settings." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Generated Undertaking</p>
              <p className="mt-2 break-all text-slate-800">{undertakingForm.generatedUrl || "Auto-generated when student is created"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {undertakingForm.generatedUrl ? (
                  <a className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white" href={undertakingForm.generatedUrl} target="_blank" rel="noreferrer">
                    Open Print View
                  </a>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Generation Status</p>
              <p className="mt-2 text-slate-800">{undertaking?.generationStatus || "PENDING"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Generated On</p>
              <p className="mt-2 text-slate-800">{undertakingForm.generatedOn || "Auto-set"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signed Undertaking Upload</p>
              <input
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setUndertakingFile(event.target.files?.[0] || null)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" onClick={uploadUndertakingFile} type="button">
                  Upload Signed Copy
                </button>
                {undertakingForm.signedDocumentUrl ? (
                  <a className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800" href={undertakingForm.signedDocumentUrl} target="_blank" rel="noreferrer">
                    Open Uploaded File
                  </a>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signed Status</p>
              <p className="mt-2 text-slate-800">
                {undertakingForm.signedDocumentUrl && (undertaking?.signedStatus || "PENDING") === "PENDING"
                  ? "Pending Admin Approval"
                  : undertaking?.signedStatus || "PENDING"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <ToggleSwitch checked={undertakingForm.incrementPrintCount} label="Increase print count on save" onChange={(nextValue) => setUndertakingForm((current) => ({ ...current, incrementPrintCount: nextValue }))} variant="neutral" />
            </div>
            {undertakingForm.signedDocumentUrl && canAdminReviewUndertaking ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Admin Review</p>
                <p className="mt-2 text-amber-900">Review the uploaded signed undertaking before the stage is marked completed.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" onClick={() => void reviewSignedUndertaking("VERIFIED")} type="button">
                    Approve
                  </button>
                  <button className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => void reviewSignedUndertaking("REJECTED")} type="button">
                    Reject
                  </button>
                  <button className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => void reviewSignedUndertaking("INCOMPLETE")} type="button">
                    Mark Incomplete
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button className="mt-4 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={submitUndertaking} type="button">
            Save Undertaking
          </button>
          </div>
        </div>
      </div>
    </section>
  );
}
