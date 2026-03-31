"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatInr } from "@/lib/currency";
import { formatEnumLabel } from "@/lib/display";
import { fetchJsonSafe } from "@/lib/fetch-json";
import { t } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppLanguage } from "@/lib/use-app-language";

type AccountRow = {
  id: string;
  voucherNo: string;
  entryType: string;
  category: string;
  head: string | null;
  subHead: string | null;
  partyName: string | null;
  amount: string;
  paymentMode: string;
  referenceNo: string | null;
  note: string | null;
  entryDate: string;
  createdByName: string;
};

type BookRow = {
  id: string;
  voucherNo: string;
  entryDate: string;
  entryType: string;
  head: string | null;
  subHead: string | null;
  partyName: string | null;
  amount: string;
  paymentMode: string;
  referenceNo: string | null;
  note: string | null;
};

type PartyLedgerRow = {
  partyName: string;
  entries: string;
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
  latestDate: string;
};

type VendorPaymentRow = {
  id: string;
  voucherNo: string;
  paymentDate: string;
  amountPaid: string;
  paymentMode: string;
  referenceNo: string;
  note: string;
  createdByName: string;
};

type VendorBillRow = {
  id: string;
  vendorName: string;
  materialDescription: string;
  billDate: string;
  referenceNo: string;
  note: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  paymentStatus: string;
  createdByName: string;
  payments: VendorPaymentRow[];
};

type HeadSummaryRow = {
  head: string;
  entries: string;
  total: string;
};

type MonthlyTrendRow = {
  month: string;
  income: string;
  expense: string;
  bankDeposit: string;
  netBalance: string;
};

type PartyContributionRow = {
  partyName: string;
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
};

export function AccountsDesk({
  initialFilters
}: {
  initialFilters?: {
    entryType?: string;
    month?: string;
    dateFrom?: string;
    dateTo?: string;
    vendorSearch?: string;
    reportPeriod?: string;
    reportDate?: string;
    reportWeekDate?: string;
    reportMonth?: string;
    reportFromDate?: string;
    reportToDate?: string;
  };
}) {
  const lang = useAppLanguage();
  const [entryTypeOptions, setEntryTypeOptions] = useState<SelectOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<SelectOption[]>([]);
  const [headMap, setHeadMap] = useState<Record<string, SelectOption[]>>({});
  const [subHeadMap, setSubHeadMap] = useState<Record<string, SelectOption[]>>({});
  const [summary, setSummary] = useState({
    totalIncome: "0.00",
    totalExpense: "0.00",
    totalBankDeposit: "0.00",
    netBalance: "0.00",
    paymentModeTotals: {} as Record<string, string>,
    todayOpeningBalance: "0.00",
    todayCashReceipts: "0.00",
    todayCashExpenses: "0.00",
    todayBankDeposits: "0.00",
    todayClosingBalance: "0.00"
  });
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [cashbookRows, setCashbookRows] = useState<BookRow[]>([]);
  const [bankbookRows, setBankbookRows] = useState<BookRow[]>([]);
  const [partyLedgerRows, setPartyLedgerRows] = useState<PartyLedgerRow[]>([]);
  const [headSummaryRows, setHeadSummaryRows] = useState<HeadSummaryRow[]>([]);
  const [topIncomeHeads, setTopIncomeHeads] = useState<HeadSummaryRow[]>([]);
  const [topExpenseHeads, setTopExpenseHeads] = useState<HeadSummaryRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendRow[]>([]);
  const [topPartyContributors, setTopPartyContributors] = useState<PartyContributionRow[]>([]);
  const [bankReconciliation, setBankReconciliation] = useState({
    digitalReceipts: "0.00",
    cashDeposits: "0.00",
    bankExpenses: "0.00",
    expectedBankbookBalance: "0.00"
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryType, setEntryType] = useState("EXPENSE");
  const [category, setCategory] = useState("");
  const [head, setHead] = useState("");
  const [subHead, setSubHead] = useState("");
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterEntryType, setFilterEntryType] = useState(initialFilters?.entryType || "");
  const [filterMonth, setFilterMonth] = useState(initialFilters?.month || "");
  const [filterDateFrom, setFilterDateFrom] = useState(initialFilters?.dateFrom || "");
  const [filterDateTo, setFilterDateTo] = useState(initialFilters?.dateTo || "");
  const [partySearch, setPartySearch] = useState("");
  const [selectedParty, setSelectedParty] = useState("");
  const [reportPeriod, setReportPeriod] = useState(initialFilters?.reportPeriod || "MONTHLY");
  const [reportDate, setReportDate] = useState(initialFilters?.reportDate || new Date().toISOString().slice(0, 10));
  const [reportWeekDate, setReportWeekDate] = useState(initialFilters?.reportWeekDate || new Date().toISOString().slice(0, 10));
  const [reportMonth, setReportMonth] = useState(initialFilters?.reportMonth || new Date().toISOString().slice(0, 7));
  const [reportFromDate, setReportFromDate] = useState(initialFilters?.reportFromDate || "");
  const [reportToDate, setReportToDate] = useState(initialFilters?.reportToDate || "");
  const [vendorSummary, setVendorSummary] = useState({
    totalBills: "0",
    totalBilled: "0.00",
    totalPaid: "0.00",
    totalDue: "0.00"
  });
  const [vendorBills, setVendorBills] = useState<VendorBillRow[]>([]);
  const [vendorSearch, setVendorSearch] = useState(initialFilters?.vendorSearch || "");
  const [vendorName, setVendorName] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [vendorBillDate, setVendorBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorReferenceNo, setVendorReferenceNo] = useState("");
  const [vendorNote, setVendorNote] = useState("");
  const [vendorBillAmount, setVendorBillAmount] = useState("");
  const [editingVendorBillId, setEditingVendorBillId] = useState("");
  const [selectedVendorBillId, setSelectedVendorBillId] = useState("");
  const [vendorPaymentDate, setVendorPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorPaymentAmount, setVendorPaymentAmount] = useState("");
  const [vendorPaymentMode, setVendorPaymentMode] = useState("CASH");
  const [vendorPaymentReferenceNo, setVendorPaymentReferenceNo] = useState("");
  const [vendorPaymentNote, setVendorPaymentNote] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [closingDate, setClosingDate] = useState(new Date().toISOString().slice(0, 10));
  const [closingNote, setClosingNote] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<AccountRow | null>(null);
  const [vendorBillToDelete, setVendorBillToDelete] = useState<VendorBillRow | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [repairingFeeLedger, setRepairingFeeLedger] = useState(false);
  const [lastRepairResult, setLastRepairResult] = useState<{
    dryRun: boolean;
    actionsCount: number;
    blockedCount: number;
    actions: string[];
    blocked: string[];
    runByName: string;
    runByEmail: string;
  } | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [filterEntryType, filterMonth, filterDateFrom, filterDateTo]);

  useEffect(() => {
    const heads = headMap[entryType] || [];
    if (heads.length && !heads.find((item) => item.value === head)) {
      setHead(heads[0].value);
    }
    if (!heads.length) {
      setHead("");
    }
  }, [entryType, headMap, head]);

  useEffect(() => {
    const subHeads = subHeadMap[head] || [];
    if (subHeads.length && !subHeads.find((item) => item.value === subHead)) {
      setSubHead(subHeads[0].value);
    }
    if (!subHeads.length) {
      setSubHead("");
    }
  }, [head, subHeadMap, subHead]);

  async function bootstrap() {
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterEntryType) params.set("entryType", filterEntryType);
      if (filterMonth) params.set("month", filterMonth);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);

      const [mastersResponse, accountsResponse, vendorsResponse] = await Promise.all([
        fetch("/api/masters"),
        fetch(`/api/accounts?${params.toString()}`),
        fetch("/api/accounts/vendors")
      ]);
      const masters = await mastersResponse.json();
      const accounts = await accountsResponse.json();
      const vendors = await vendorsResponse.json();

      if (!mastersResponse.ok) {
        throw new Error(masters?.message || "Unable to load accounts masters");
      }
      if (!accountsResponse.ok) {
        throw new Error(accounts?.message || t(lang, "Unable to load accounts ledger"));
      }
      if (!vendorsResponse.ok) {
        throw new Error(vendors?.message || t(lang, "Unable to load vendor ledger"));
      }

      setEntryTypeOptions(masters.accountEntryTypes || []);
      setCategoryOptions(masters.accountCategories || []);
      setPaymentModes(masters.paymentModes || []);
      setHeadMap(masters.accountHeads || {});
      setSubHeadMap(masters.accountSubHeads || {});
      setSummary(accounts.summary || { totalIncome: "0.00", totalExpense: "0.00", totalBankDeposit: "0.00", netBalance: "0.00", paymentModeTotals: {}, todayOpeningBalance: "0.00", todayCashReceipts: "0.00", todayCashExpenses: "0.00", todayBankDeposits: "0.00", todayClosingBalance: "0.00" });
      setRows(accounts.rows || []);
      setCashbookRows(accounts.cashbookRows || []);
      setBankbookRows(accounts.bankbookRows || []);
      setPartyLedgerRows(accounts.partyLedgerRows || []);
      setHeadSummaryRows(accounts.headSummary || []);
      setTopIncomeHeads(accounts.topIncomeHeads || []);
      setTopExpenseHeads(accounts.topExpenseHeads || []);
      setMonthlyTrend(accounts.monthlyTrend || []);
      setTopPartyContributors(accounts.topPartyContributors || []);
      setBankReconciliation(accounts.bankReconciliation || { digitalReceipts: "0.00", cashDeposits: "0.00", bankExpenses: "0.00", expectedBankbookBalance: "0.00" });
      setVendorSummary(vendors.summary || { totalBills: "0", totalBilled: "0.00", totalPaid: "0.00", totalDue: "0.00" });
      setVendorBills(vendors.rows || []);
      if (!category && masters.accountCategories?.length) {
        setCategory(masters.accountCategories[0].value);
      }
    } catch (caughtError) {
      const nextError = caughtError instanceof Error ? caughtError.message : "Unable to load accounts desk";
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Accounts desk not loaded"), message: nextError });
    }
  }

  async function saveEntry() {
    setError("");
    setMessage("");
    setLoading(true);

    const response = await fetch(editingId ? `/api/accounts/${editingId}` : "/api/accounts", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType,
        category,
        head,
        subHead,
        partyName,
        amount,
        paymentMode,
        referenceNo,
        note,
        entryDate
      })
    });
    const result = await fetchJsonSafe<any>(response);
    setLoading(false);

    if (!response.ok) {
      const nextError = mapAccountsErrorMessage(result?.message || t(lang, "Unable to save account entry"));
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Account entry not saved"), message: nextError });
      return;
    }

    setEditingId(null);
    setAmount("");
    setReferenceNo("");
    setNote("");
    setPartyName("");
    setMessage(editingId ? "Account entry updated successfully" : `${entryType === "EXPENSE" ? "Expense" : entryType === "BANK_DEPOSIT" ? "Bank deposit" : "Income"} entry added successfully`);
    showToast({
      kind: "success",
      title: editingId ? t(lang, "Account entry updated") : t(lang, "Account entry added"),
      message: `${formatEnumLabel(entryType)} ${amount}`
    });
    await bootstrap();
  }

  function startEdit(row: AccountRow) {
    setEditingId(row.id);
    setEntryType(row.entryType);
    setCategory(row.category);
    setHead(row.head || "");
    setSubHead(row.subHead || "");
    setPartyName(row.partyName || "");
    setAmount(row.amount);
    setPaymentMode(row.paymentMode);
    setReferenceNo(row.referenceNo || "");
    setNote(row.note || "");
    setEntryDate(row.entryDate.slice(0, 10));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(entryId: string) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/accounts/${entryId}`, { method: "DELETE" });
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      const nextError = mapAccountsErrorMessage(result?.message || t(lang, "Unable to delete account entry"));
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Account entry not deleted"), message: nextError });
      return;
    }

    if (editingId === entryId) {
      setEditingId(null);
    }
    setEntryToDelete(null);
    setMessage("Account entry deleted successfully");
    showToast({ kind: "success", title: t(lang, "Account entry deleted") });
    await bootstrap();
  }

  function mapAccountsErrorMessage(raw: string) {
    if (raw.includes("system-managed")) {
      return `${raw}. Use Reports > Fees-Accounts Consistency for diagnostics and Accounts > Reconcile Fee Ledger for auto-fixes.`;
    }
    if (raw.includes("already closed")) {
      return `${raw}. Reopen day first, then retry the operation.`;
    }
    return raw;
  }

  async function reconcileFeeLedger(dryRun: boolean) {
    setRepairingFeeLedger(true);
    setError("");
    const response = await fetch("/api/accounts/fee-ledger-repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun })
    });
    const result = await fetchJsonSafe<any>(response);
    setRepairingFeeLedger(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to run fee-ledger reconciliation";
      setError(nextError);
      showToast({ kind: "error", title: "Reconciliation failed", message: nextError });
      return;
    }

    const payload = result?.result || {};
    setLastRepairResult({
      dryRun: Boolean(payload.dryRun),
      actionsCount: Number(payload.actionsCount || 0),
      blockedCount: Number(payload.blockedCount || 0),
      actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 10) : [],
      blocked: Array.isArray(payload.blocked) ? payload.blocked.slice(0, 10) : [],
      runByName: payload?.runBy?.name || "Unknown",
      runByEmail: payload?.runBy?.email || ""
    });
    const details = `Actions ${payload.actionsCount || 0} • Blocked ${payload.blockedCount || 0}`;
    setMessage(dryRun ? `Dry run complete. ${details}` : `Reconciliation completed. ${details}`);
    showToast({
      kind: payload.blockedCount ? "info" : "success",
      title: dryRun ? "Dry run complete" : "Reconciliation complete",
      message: details
    });
    await bootstrap();
  }

  async function copyRepairSummary() {
    if (!lastRepairResult) return;
    const lines = [
      `Fee Ledger Reconciliation (${lastRepairResult.dryRun ? "Dry Run" : "Apply"})`,
      `Run By: ${lastRepairResult.runByName}${lastRepairResult.runByEmail ? ` <${lastRepairResult.runByEmail}>` : ""}`,
      `Actions: ${lastRepairResult.actionsCount}`,
      `Blocked: ${lastRepairResult.blockedCount}`,
      lastRepairResult.actions.length ? `Sample Actions: ${lastRepairResult.actions.join(", ")}` : "",
      lastRepairResult.blocked.length ? `Blocked IDs: ${lastRepairResult.blocked.join(", ")}` : ""
    ].filter(Boolean);
    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      showToast({ kind: "success", title: "Repair summary copied" });
    } catch {
      setMessage(`Copy failed. Summary:\n${text}`);
      showToast({ kind: "info", title: "Clipboard unavailable", message: "Summary added to message area." });
    }
  }

  function downloadRepairSummary() {
    if (!lastRepairResult) return;
    const lines = [
      `Fee Ledger Reconciliation (${lastRepairResult.dryRun ? "Dry Run" : "Apply"})`,
      `Generated At: ${new Date().toISOString()}`,
      `Run By: ${lastRepairResult.runByName}${lastRepairResult.runByEmail ? ` <${lastRepairResult.runByEmail}>` : ""}`,
      `Actions: ${lastRepairResult.actionsCount}`,
      `Blocked: ${lastRepairResult.blockedCount}`,
      lastRepairResult.actions.length ? `Sample Actions: ${lastRepairResult.actions.join(", ")}` : "",
      lastRepairResult.blocked.length ? `Blocked IDs: ${lastRepairResult.blocked.join(", ")}` : ""
    ].filter(Boolean);
    const content = `${lines.join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const mode = lastRepairResult.dryRun ? "dry-run" : "apply";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `fee-ledger-repair-${mode}-${stamp}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast({ kind: "success", title: "Repair summary downloaded" });
  }

  function resetForm() {
    setEditingId(null);
    setEntryType("EXPENSE");
    setCategory("");
    setHead("");
    setSubHead("");
    setPartyName("");
    setAmount("");
    setPaymentMode("CASH");
    setReferenceNo("");
    setNote("");
    setEntryDate(new Date().toISOString().slice(0, 10));
  }

  async function saveVendorBill() {
    setError("");
    setMessage("");
    setLoading(true);

    const response = await fetch(editingVendorBillId ? `/api/accounts/vendors/${editingVendorBillId}` : "/api/accounts/vendors", {
      method: editingVendorBillId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorName,
        materialDescription,
        billDate: vendorBillDate,
        referenceNo: vendorReferenceNo,
        note: vendorNote,
        totalAmount: vendorBillAmount
      })
    });
    const result = await fetchJsonSafe<any>(response);
    setLoading(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to save vendor bill";
      setError(nextError);
      showToast({ kind: "error", title: "Vendor bill not saved", message: nextError });
      return;
    }

    setEditingVendorBillId("");
    setVendorName("");
    setMaterialDescription("");
    setVendorReferenceNo("");
    setVendorNote("");
    setVendorBillAmount("");
    setVendorBillDate(new Date().toISOString().slice(0, 10));
    setMessage(editingVendorBillId ? "Vendor bill updated successfully" : "Vendor supply bill added successfully");
    showToast({
      kind: "success",
      title: editingVendorBillId ? "Vendor bill updated" : "Vendor bill added",
      message: vendorName || "Vendor record"
    });
    await bootstrap();
  }

  function startVendorBillEdit(bill: VendorBillRow) {
    setEditingVendorBillId(bill.id);
    setVendorName(bill.vendorName);
    setMaterialDescription(bill.materialDescription || "");
    setVendorBillDate(bill.billDate.slice(0, 10));
    setVendorReferenceNo(bill.referenceNo || "");
    setVendorNote(bill.note || "");
    setVendorBillAmount(bill.totalAmount);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function deleteVendorBill(billId: string) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/accounts/vendors/${billId}`, { method: "DELETE" });
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      const nextError = result?.message || "Unable to delete vendor bill";
      setError(nextError);
      showToast({ kind: "error", title: "Vendor bill not deleted", message: nextError });
      return;
    }

    if (editingVendorBillId === billId) {
      setEditingVendorBillId("");
      setVendorName("");
      setMaterialDescription("");
      setVendorReferenceNo("");
      setVendorNote("");
      setVendorBillAmount("");
      setVendorBillDate(new Date().toISOString().slice(0, 10));
    }

    setVendorBillToDelete(null);
    setMessage("Vendor bill deleted successfully");
    showToast({ kind: "success", title: "Vendor bill deleted" });
    await bootstrap();
  }

  async function payVendorInstallment() {
    if (!selectedVendorBillId) {
      setError("Select a vendor bill first");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);
    const response = await fetch(`/api/accounts/vendors/${selectedVendorBillId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentDate: vendorPaymentDate,
        amountPaid: vendorPaymentAmount,
        paymentMode: vendorPaymentMode,
        referenceNo: vendorPaymentReferenceNo,
        note: vendorPaymentNote
      })
    });
    const result = await fetchJsonSafe<any>(response);
    setLoading(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to save vendor payment";
      setError(nextError);
      showToast({ kind: "error", title: "Vendor payment not saved", message: nextError });
      return;
    }

    setVendorPaymentAmount("");
    setVendorPaymentReferenceNo("");
    setVendorPaymentNote("");
    setMessage("Vendor installment payment saved successfully");
    showToast({ kind: "success", title: "Vendor installment saved", message: vendorPaymentAmount });
    await bootstrap();
  }

  async function closeDay() {
    setError("");
    setMessage("");

    const response = await fetch("/api/accounts/close-day", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        closedDate: closingDate,
        note: closingNote
      })
    });
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      const nextError = result?.message || "Unable to close day";
      setError(nextError);
      showToast({ kind: "error", title: "Day not closed", message: nextError });
      return;
    }

    setMessage(`Day closed successfully for ${closingDate}`);
    showToast({ kind: "success", title: "Day closed", message: closingDate });
    await bootstrap();
  }

  async function reopenDay() {
    setError("");
    setMessage("");

    const response = await fetch("/api/accounts/reopen-day", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        closedDate: closingDate
      })
    });
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      const nextError = result?.message || "Unable to reopen day";
      setError(nextError);
      showToast({ kind: "error", title: "Day not reopened", message: nextError });
      return;
    }

    setMessage(`Day reopened successfully for ${closingDate}`);
    showToast({ kind: "success", title: "Day reopened", message: closingDate });
    await bootstrap();
  }

  const isBankDeposit = entryType === "BANK_DEPOSIT";
  const isOpeningBalance = entryType === "OPENING_BALANCE";
  const filteredPartyLedgerRows = partyLedgerRows.filter((row) => row.partyName.toLowerCase().includes(partySearch.trim().toLowerCase()));
  const selectedPartyRows = rows.filter((row) => row.partyName === selectedParty);
  const selectedVendorBill = vendorBills.find((item) => item.id === selectedVendorBillId);
  const filteredVendorBills = vendorBills.filter((item) => item.vendorName.toLowerCase().includes(vendorSearch.trim().toLowerCase()));
  const profitAndLoss = {
    income: Number(summary.totalIncome || 0),
    expense: Number(summary.totalExpense || 0),
    bankDeposit: Number(summary.totalBankDeposit || 0),
    operatingProfit: (Number(summary.totalIncome || 0) - Number(summary.totalExpense || 0)).toFixed(2)
  };
  const statementDifference = statementBalance ? (Number(statementBalance) - Number(bankReconciliation.expectedBankbookBalance || 0)).toFixed(2) : "";
  const periodQuery = `${reportPeriod === "DAILY" ? `period=DAILY&reportDate=${reportDate}` : ""}${reportPeriod === "WEEKLY" ? `period=WEEKLY&weekDate=${reportWeekDate}` : ""}${reportPeriod === "MONTHLY" ? `period=MONTHLY&month=${reportMonth}` : ""}${reportPeriod === "CUSTOM" ? `period=CUSTOM&dateFrom=${reportFromDate}&dateTo=${reportToDate}` : ""}`;
  const reportHref = `/api/accounts/period-summary?${periodQuery}&format=csv`;
  const purchaseRegisterHref = `/api/accounts/vendors/purchase-register?${vendorSearch ? `vendorName=${encodeURIComponent(vendorSearch)}&` : ""}${filterDateFrom ? `dateFrom=${filterDateFrom}&` : ""}${filterDateTo ? `dateTo=${filterDateTo}&` : ""}format=csv`;
  const headSummaryHref = `/api/accounts/head-summary?${periodQuery}&format=csv`;
  const bankReconciliationHref = `/api/accounts/bank-reconciliation?${periodQuery}${statementBalance ? `&statementBalance=${encodeURIComponent(statementBalance)}` : ""}&format=csv`;

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Finance Module</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Accounts Desk")}</h3>
        <p className="mt-2 text-sm text-slate-600">{t(lang, "Add expenses, add income, and keep a simple institute ledger with recent entries.")}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-emerald-50 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Total Income</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatInr(summary.totalIncome)}</p>
        </div>
        <div className="rounded-3xl bg-rose-50 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-700">Total Expense</p>
          <p className="mt-2 text-2xl font-semibold text-rose-900">{formatInr(summary.totalExpense)}</p>
        </div>
        <div className="rounded-3xl bg-slate-100 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-600">Net Balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatInr(summary.netBalance)}</p>
        </div>
        <div className="rounded-3xl bg-amber-50 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-700">Cash Deposit In Bank</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{formatInr(summary.totalBankDeposit)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl bg-sky-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-700">Today's Opening Cash</p>
          <p className="mt-2 text-xl font-semibold text-sky-900">{formatInr(summary.todayOpeningBalance)}</p>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Today's Cash Receipts</p>
          <p className="mt-2 text-xl font-semibold text-emerald-900">{formatInr(summary.todayCashReceipts)}</p>
        </div>
        <div className="rounded-3xl bg-rose-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-700">Today's Cash Expenses</p>
          <p className="mt-2 text-xl font-semibold text-rose-900">{formatInr(summary.todayCashExpenses)}</p>
        </div>
        <div className="rounded-3xl bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-700">Today's Bank Deposits</p>
          <p className="mt-2 text-xl font-semibold text-amber-900">{formatInr(summary.todayBankDeposits)}</p>
        </div>
        <div className="rounded-3xl bg-slate-100 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-600">Today's Closing Cash</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatInr(summary.todayClosingBalance)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(summary.paymentModeTotals || {}).map(([mode, total]) => (
          <div key={mode} className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{formatEnumLabel(mode)}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatInr(total)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Top Income Heads</p>
          <div className="mt-4 space-y-3">
            {topIncomeHeads.length ? topIncomeHeads.map((row) => (
              <div key={row.head} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{formatEnumLabel(row.head)}</p>
                  <p className="text-xs text-slate-500">{row.entries} entries</p>
                </div>
                <p className="text-sm font-semibold text-emerald-800">{formatInr(row.total)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No income entries in current view.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-700">Top Expense Heads</p>
          <div className="mt-4 space-y-3">
            {topExpenseHeads.length ? topExpenseHeads.map((row) => (
              <div key={row.head} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{formatEnumLabel(row.head)}</p>
                  <p className="text-xs text-slate-500">{row.entries} entries</p>
                </div>
                <p className="text-sm font-semibold text-rose-800">{formatInr(row.total)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No expense entries in current view.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-600">Top Parties</p>
          <div className="mt-4 space-y-3">
            {topPartyContributors.length ? topPartyContributors.map((row) => (
              <div key={row.partyName} className="rounded-2xl bg-white px-4 py-3">
                <p className="font-medium text-slate-900">{row.partyName}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>In: {formatInr(row.totalIncome)}</span>
                  <span>Out: {formatInr(row.totalExpense)}</span>
                  <span>Net: {formatInr(row.netBalance)}</span>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No party-wise activity in current view.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <div>
          <h4 className="font-serif text-2xl font-semibold">Monthly Trend</h4>
          <p className="mt-1 text-sm text-slate-600">Last six months of finance movement for management review.</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {monthlyTrend.length ? monthlyTrend.map((row) => (
            <article key={row.month} className="rounded-3xl bg-white p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{row.month}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Income</span>
                  <span className="font-semibold text-emerald-800">{formatInr(row.income)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Expense</span>
                  <span className="font-semibold text-rose-800">{formatInr(row.expense)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Bank Deposit</span>
                  <span className="font-semibold text-amber-800">{formatInr(row.bankDeposit)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                  <span className="text-slate-700">Net</span>
                  <span className="font-semibold text-slate-900">{formatInr(row.netBalance)}</span>
                </div>
              </div>
            </article>
          )) : <p className="text-sm text-slate-500">No month-wise finance activity found yet.</p>}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={filterEntryType} onChange={(event) => setFilterEntryType(event.target.value)}>
          <option value="">All types</option>
          {entryTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="month" value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800" onClick={() => { setFilterEntryType(""); setFilterMonth(""); setFilterDateFrom(""); setFilterDateTo(""); }} type="button">
          Clear Filters
        </button>
        <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800" onClick={() => window.print()} type="button">
          Print Cashbook
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_220px]">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={closingDate} onChange={(event) => setClosingDate(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Day closing note" value={closingNote} onChange={(event) => setClosingNote(event.target.value)} />
        <div className="flex gap-3">
          <button className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white" onClick={() => void closeDay()} type="button">
            Close Day
          </button>
          <button className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white" onClick={() => void reopenDay()} type="button">
            Reopen Day
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap gap-3">
          <a className="inline-flex rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" href={`/api/accounts/closing-summary?date=${closingDate}&format=csv`}>
            Export Closing Summary
          </a>
          <a className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" href={reportHref}>
            Download Finance Report
          </a>
          <a className="inline-flex rounded-2xl bg-sky-800 px-4 py-3 text-sm font-semibold text-white" href={headSummaryHref}>
            Download Head Summary
          </a>
          <a className="inline-flex rounded-2xl bg-amber-700 px-4 py-3 text-sm font-semibold text-white" href={bankReconciliationHref}>
            Download Bank Reconciliation
          </a>
          {selectedParty ? (
            <a
              className="inline-flex rounded-2xl bg-sky-800 px-4 py-3 text-sm font-semibold text-white"
              href={`/api/accounts/party-ledger?partyName=${encodeURIComponent(selectedParty)}${filterMonth ? `&month=${filterMonth}` : ""}${filterDateFrom ? `&dateFrom=${filterDateFrom}` : ""}${filterDateTo ? `&dateTo=${filterDateTo}` : ""}&format=csv`}
            >
              Export Selected Party Ledger
            </a>
          ) : null}
          <button
            className="inline-flex rounded-2xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
            disabled={repairingFeeLedger}
            onClick={() => void reconcileFeeLedger(true)}
            type="button"
          >
            {repairingFeeLedger ? "Running..." : "Reconcile Fee Ledger (Dry Run)"}
          </button>
          <button
            className="inline-flex rounded-2xl bg-violet-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
            disabled={repairingFeeLedger}
            onClick={() => void reconcileFeeLedger(false)}
            type="button"
          >
            {repairingFeeLedger ? "Running..." : "Apply Fee Ledger Reconciliation"}
          </button>
          <a className="inline-flex rounded-2xl bg-violet-100 px-4 py-3 text-sm font-semibold text-violet-800" href="/modules/reports?report=fees-accounts-consistency">
            Open Consistency Report
          </a>
        </div>
        {lastRepairResult ? (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
            <p className="font-semibold">
              Last reconciliation: {lastRepairResult.dryRun ? "Dry Run" : "Apply"} • Actions {lastRepairResult.actionsCount} • Blocked {lastRepairResult.blockedCount}
            </p>
            <p className="mt-1 text-xs">
              Run by: {lastRepairResult.runByName}
              {lastRepairResult.runByEmail ? ` (${lastRepairResult.runByEmail})` : ""}
            </p>
            {lastRepairResult.actions.length ? (
              <p className="mt-2 text-xs">
                Sample actions: {lastRepairResult.actions.join(", ")}
              </p>
            ) : null}
            {lastRepairResult.blocked.length ? (
              <p className="mt-2 text-xs">
                Blocked (manual review): {lastRepairResult.blocked.join(", ")}
              </p>
            ) : null}
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => void copyRepairSummary()}
                  type="button"
                >
                  Copy Repair Summary
                </button>
                <button
                  className="rounded-xl bg-violet-900 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => downloadRepairSummary()}
                  type="button"
                >
                  Download Summary (.txt)
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <div>
          <h4 className="font-serif text-2xl font-semibold">Finance Report Export</h4>
          <p className="mt-1 text-sm text-slate-600">Download finance reports for daily, weekly, monthly, or custom date range. Party and vendor totals are included in the export.</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="CUSTOM">Custom</option>
          </select>
          {reportPeriod === "DAILY" ? <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} /> : null}
          {reportPeriod === "WEEKLY" ? <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={reportWeekDate} onChange={(event) => setReportWeekDate(event.target.value)} /> : null}
          {reportPeriod === "MONTHLY" ? <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} /> : null}
          {reportPeriod === "CUSTOM" ? (
            <>
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={reportFromDate} onChange={(event) => setReportFromDate(event.target.value)} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={reportToDate} onChange={(event) => setReportToDate(event.target.value)} />
            </>
          ) : null}
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 lg:col-span-2">
            The exported report includes account totals, head-wise summary, and all parties/vendors within the selected range.
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={entryType} onChange={(event) => setEntryType(event.target.value)}>
          {entryTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {!isBankDeposit && !isOpeningBalance ? (
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm xl:col-span-2" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Select category</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 xl:col-span-2">
            Category is auto-set for bank deposit
          </div>
        )}
        {!isBankDeposit && !isOpeningBalance ? (
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={head} onChange={(event) => setHead(event.target.value)}>
            <option value="">Select head</option>
            {(headMap[entryType] || []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Expense head not required for bank deposit
          </div>
        )}
        {!isBankDeposit && !isOpeningBalance ? (
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={subHead} onChange={(event) => setSubHead(event.target.value)}>
            <option value="">Select sub head</option>
            {(subHeadMap[head] || []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : isOpeningBalance ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Opening balance uses fixed opening cash head
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Related expense fields hidden for bank deposit
          </div>
        )}
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
          {paymentModes.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={entryType === "EXPENSE" ? "Vendor / Payee name" : entryType === "BANK_DEPOSIT" ? "Bank / Branch name" : entryType === "OPENING_BALANCE" ? "Cashier / opening note" : "Received from"} value={partyName} onChange={(event) => setPartyName(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Reference number" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>

      {(message || error) ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading} onClick={() => void saveEntry()} type="button">
          {loading ? "Saving..." : editingId ? "Update Account Entry" : "Save Account Entry"}
        </button>
        {editingId ? (
          <button className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" onClick={resetForm} type="button">
            Cancel Edit
          </button>
        ) : null}
      </div>

      <div className="data-table-wrap mt-8">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher</th>
              <th>Type</th>
              <th>Head / Sub Head</th>
              <th>Amount</th>
              <th>Party</th>
              <th>Payment</th>
              <th>Reference</th>
              <th>Added By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.entryDate).toLocaleDateString()}</td>
                <td className="font-medium text-slate-900">{row.voucherNo}</td>
                <td>{formatEnumLabel(row.entryType)}</td>
                <td>
                  <div className="font-medium text-slate-900">{row.head || row.category}</div>
                  {row.subHead ? <div className="text-xs text-slate-500">{row.subHead}</div> : null}
                  {row.note ? <div className="text-xs text-slate-500">{row.note}</div> : null}
                </td>
                <td className="font-semibold text-slate-900">{formatInr(row.amount)}</td>
                <td>{row.partyName || "-"}</td>
                <td>{formatEnumLabel(row.paymentMode)}</td>
                <td>{row.referenceNo || "-"}</td>
                <td>{row.createdByName}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800" onClick={() => startEdit(row)} type="button">
                      Edit
                    </button>
                    <button className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700" onClick={() => setEntryToDelete(row)} type="button">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="data-table-empty" colSpan={10}>No account entries yet. Saved income, expense, and bank deposit rows will appear here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="font-serif text-2xl font-semibold">{t(lang, "Cashbook")}</h4>
          <p className="mt-1 text-sm text-slate-600">Cash movement including opening balance, cash receipts, cash expenses, and cash deposits to bank.</p>
          <div className="data-table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher</th>
                  <th>Type</th>
                  <th>Head</th>
                  <th>Party</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cashbookRows.length ? (
                  cashbookRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{new Date(row.entryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{row.voucherNo}</td>
                      <td className="px-4 py-3">{row.entryType}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.head || "-"}</div>
                        {row.subHead ? <div className="text-xs text-slate-500">{row.subHead}</div> : null}
                      </td>
                      <td className="px-4 py-3">{row.partyName || "-"}</td>
                      <td className="px-4 py-3">{formatInr(row.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="data-table-empty" colSpan={6}>No cashbook entries for the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="font-serif text-2xl font-semibold">{t(lang, "Bankbook")}</h4>
          <p className="mt-1 text-sm text-slate-600">UPI, online, bank transfer, and bank deposit movement in one bank-facing view.</p>
          <div className="data-table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Party</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bankbookRows.length ? (
                  bankbookRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{new Date(row.entryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{row.voucherNo}</td>
                      <td className="px-4 py-3">{row.entryType}</td>
                      <td className="px-4 py-3">{row.paymentMode}</td>
                      <td className="px-4 py-3">{row.partyName || "-"}</td>
                      <td className="px-4 py-3">{formatInr(row.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="data-table-empty" colSpan={6}>No bankbook entries for the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="font-serif text-2xl font-semibold">P&L Snapshot</h4>
          <p className="mt-1 text-sm text-slate-600">Quick profit and loss style view for the current filter range.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Income</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatInr(profitAndLoss.income)}</p>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Expense</p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">{formatInr(profitAndLoss.expense)}</p>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Cash Deposited To Bank</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{formatInr(profitAndLoss.bankDeposit)}</p>
            </div>
            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Operating Profit</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatInr(profitAndLoss.operatingProfit)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="font-serif text-2xl font-semibold">{t(lang, "Head-wise Summary")}</h4>
          <p className="mt-1 text-sm text-slate-600">See which heads are carrying the most transactions and amount in the current filter range.</p>
          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Head</th>
                  <th className="px-4 py-3 font-medium">Entries</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {headSummaryRows.length ? (
                  headSummaryRows.map((row) => (
                    <tr key={row.head} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.head}</td>
                      <td className="px-4 py-3">{row.entries}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(row.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>No head summary rows</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="font-serif text-2xl font-semibold">Bank Reconciliation View</h4>
          <p className="mt-1 text-sm text-slate-600">A quick bank-side view from current entries: digital receipts plus cash deposited into bank, minus bank-mode expenses.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Digital Receipts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatInr(bankReconciliation.digitalReceipts)}</p>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Cash Deposits To Bank</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatInr(bankReconciliation.cashDeposits)}</p>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Bank Expenses</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatInr(bankReconciliation.bankExpenses)}</p>
            </div>
            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Expected Bankbook Balance</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatInr(bankReconciliation.expectedBankbookBalance)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              placeholder="Manual bank statement balance"
              value={statementBalance}
              onChange={(event) => setStatementBalance(event.target.value)}
            />
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-600">
              {statementBalance
                ? `Difference against statement: ${formatInr(statementDifference)}`
                : "Enter the current bank statement balance to compare it with the expected bankbook balance."}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
          <h4 className="font-serif text-2xl font-semibold">{t(lang, "Party Ledger")}</h4>
          <p className="mt-1 text-sm text-slate-600">Track vendors, payees, banks, and received-from parties using the names already captured in account entries.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              placeholder="Search party or vendor"
              value={partySearch}
              onChange={(event) => setPartySearch(event.target.value)}
            />
            <button
              className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
              onClick={() => {
                setPartySearch("");
                setSelectedParty("");
              }}
              type="button"
            >
              Clear Party Filter
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Entries</th>
                <th className="px-4 py-3 font-medium">Income</th>
                <th className="px-4 py-3 font-medium">Expense</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3 font-medium">Latest</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartyLedgerRows.length ? (
                filteredPartyLedgerRows.map((row) => (
                  <tr key={row.partyName} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.partyName}</td>
                    <td className="px-4 py-3">{row.entries}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatInr(row.totalIncome)}</td>
                    <td className="px-4 py-3 text-rose-700">{formatInr(row.totalExpense)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(row.netBalance)}</td>
                    <td className="px-4 py-3">
                      <div>{new Date(row.latestDate).toLocaleDateString()}</div>
                      <button
                        className="mt-2 rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
                        onClick={() => setSelectedParty(row.partyName)}
                        type="button"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>No party ledger rows yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedParty ? (
          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Party Detail</p>
                <h5 className="mt-2 font-serif text-2xl font-semibold text-slate-900">{selectedParty}</h5>
                <p className="mt-1 text-sm text-slate-600">Showing detailed entries for the selected vendor, party, or bank name.</p>
              </div>
              <button
                className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                onClick={() => setSelectedParty("")}
                type="button"
              >
                Close Detail
              </button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Voucher</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Head</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPartyRows.length ? (
                    selectedPartyRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{new Date(row.entryDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{row.voucherNo}</td>
                        <td className="px-4 py-3">{row.entryType}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{row.head || row.category}</div>
                          {row.subHead ? <div className="text-xs text-slate-500">{row.subHead}</div> : null}
                          {row.note ? <div className="text-xs text-slate-500">{row.note}</div> : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(row.amount)}</td>
                        <td className="px-4 py-3">{row.paymentMode}</td>
                        <td className="px-4 py-3">{row.referenceNo || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>No detailed rows for this party in the current filter range</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <div>
          <h4 className="font-serif text-2xl font-semibold">{t(lang, "Purchase Register, Vendor Due & Installment Desk")}</h4>
          <p className="mt-1 text-sm text-slate-600">If any vendor supplies material, add the bill here. Pending vendor payment stays due until the institute pays it fully, and payments can be made in installments. This also acts as the purchase register.</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="Search vendor name"
            value={vendorSearch}
            onChange={(event) => setVendorSearch(event.target.value)}
          />
          <button
            className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
            onClick={() => setVendorSearch("")}
            type="button"
          >
            Clear Vendor Filter
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Vendor Bills</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{vendorSummary.totalBills}</p>
          </div>
          <div className="rounded-3xl bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-700">Total Billed</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">{formatInr(vendorSummary.totalBilled)}</p>
          </div>
          <div className="rounded-3xl bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Total Paid</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatInr(vendorSummary.totalPaid)}</p>
          </div>
          <div className="rounded-3xl bg-rose-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-rose-700">Total Due</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900">{formatInr(vendorSummary.totalDue)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-6">
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2" placeholder="Vendor name" value={vendorName} onChange={(event) => setVendorName(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2" placeholder="Material supplied" value={materialDescription} onChange={(event) => setMaterialDescription(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={vendorBillDate} onChange={(event) => setVendorBillDate(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Bill amount" value={vendorBillAmount} onChange={(event) => setVendorBillAmount(event.target.value)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Bill / invoice reference" value={vendorReferenceNo} onChange={(event) => setVendorReferenceNo(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" placeholder="Note" value={vendorNote} onChange={(event) => setVendorNote(event.target.value)} />
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading} onClick={() => void saveVendorBill()} type="button">
              {editingVendorBillId ? "Update Vendor Bill" : "Add Vendor Bill"}
            </button>
            <a className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white" href={purchaseRegisterHref}>
              Export Purchase Register
            </a>
            {editingVendorBillId ? (
              <button
                className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800"
                onClick={() => {
                  setEditingVendorBillId("");
                  setVendorName("");
                  setMaterialDescription("");
                  setVendorReferenceNo("");
                  setVendorNote("");
                  setVendorBillAmount("");
                  setVendorBillDate(new Date().toISOString().slice(0, 10));
                }}
                type="button"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Bill Date</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendorBills.length ? (
                filteredVendorBills.map((bill) => (
                  <tr key={bill.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{bill.vendorName}</td>
                    <td className="px-4 py-3">{bill.materialDescription || "-"}</td>
                    <td className="px-4 py-3">{new Date(bill.billDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{bill.referenceNo || "-"}</td>
                    <td className="px-4 py-3">{formatInr(bill.totalAmount)}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatInr(bill.paidAmount)}</td>
                    <td className="px-4 py-3 text-rose-700">{formatInr(bill.dueAmount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={bill.paymentStatus} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800" onClick={() => setSelectedVendorBillId(bill.id)} type="button">
                          Pay
                        </button>
                        <a
                          className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700"
                          href={`/api/accounts/vendors/statement?vendorName=${encodeURIComponent(bill.vendorName)}${filterDateFrom ? `&dateFrom=${filterDateFrom}` : ""}${filterDateTo ? `&dateTo=${filterDateTo}` : ""}&format=csv`}
                        >
                          Statement
                        </a>
                        <button className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700" onClick={() => startVendorBillEdit(bill)} type="button">
                          Edit
                        </button>
                        <button className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700" onClick={() => setVendorBillToDelete(bill)} type="button">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>No vendor due bills yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedVendorBill ? (
          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Installment Payment</p>
                <h5 className="mt-2 font-serif text-2xl font-semibold text-slate-900">{selectedVendorBill.vendorName}</h5>
                <p className="mt-1 text-sm text-slate-600">Due amount: {formatInr(selectedVendorBill.dueAmount)} • Material: {selectedVendorBill.materialDescription || "-"}</p>
              </div>
              <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800" onClick={() => setSelectedVendorBillId("")} type="button">
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-5">
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={vendorPaymentDate} onChange={(event) => setVendorPaymentDate(event.target.value)} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Installment amount" value={vendorPaymentAmount} onChange={(event) => setVendorPaymentAmount(event.target.value)} />
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={vendorPaymentMode} onChange={(event) => setVendorPaymentMode(event.target.value)}>
                {paymentModes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Payment reference" value={vendorPaymentReferenceNo} onChange={(event) => setVendorPaymentReferenceNo(event.target.value)} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Note" value={vendorPaymentNote} onChange={(event) => setVendorPaymentNote(event.target.value)} />
            </div>

            <div className="mt-4">
              <button className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading} onClick={() => void payVendorInstallment()} type="button">
                Save Vendor Payment
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Voucher</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVendorBill.payments.length ? (
                    selectedVendorBill.payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{payment.voucherNo}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(payment.amountPaid)}</td>
                        <td className="px-4 py-3">{payment.paymentMode}</td>
                        <td className="px-4 py-3">{payment.referenceNo || "-"}</td>
                        <td className="px-4 py-3">{payment.createdByName}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>No installment payments yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      <ConfirmDialog
        open={!!entryToDelete}
        title="Delete Account Entry"
        message={entryToDelete ? `Delete ${formatEnumLabel(entryToDelete.entryType)} entry for ${formatInr(entryToDelete.amount)}?` : ""}
        confirmLabel="Delete Entry"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => entryToDelete ? void deleteEntry(entryToDelete.id) : undefined}
      />
      <ConfirmDialog
        open={!!vendorBillToDelete}
        title="Delete Vendor Bill"
        message={vendorBillToDelete ? `Delete vendor bill ${vendorBillToDelete.referenceNo || vendorBillToDelete.vendorName} for ${formatInr(vendorBillToDelete.totalAmount)}?` : ""}
        confirmLabel="Delete Bill"
        onCancel={() => setVendorBillToDelete(null)}
        onConfirm={() => vendorBillToDelete ? void deleteVendorBill(vendorBillToDelete.id) : undefined}
      />
      </section>
    </section>
  );
}
