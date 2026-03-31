import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type IdCardRegisterEntry = {
  entityType: "student" | "staff";
  entityId: string;
  cardNumber: string;
  issueVersion: number;
  code: string;
  fullName: string;
  status: "ACTIVE" | "CANCELLED" | "REPLACED";
  statusNote: string;
  statusUpdatedAt: string;
  statusUpdatedBy: string;
  printCount: number;
  firstPrintedAt: string;
  lastPrintedAt: string;
  lastReason: string;
  lastPrintedBy: string;
  replacementStatus: "NONE" | "REQUESTED" | "APPROVED";
  replacementRequestedAt: string;
  replacementRequestedBy: string;
  replacementReason: string;
  replacementFee: string;
  replacementPaymentMode: string;
  replacementReferenceNo: string;
  replacementReceiptNumber: string;
  replacementFeePostedAt: string;
  replacementFeePostedBy: string;
  replacementApprovedAt: string;
  replacementApprovedBy: string;
  history: Array<{
    printedAt: string;
    reason: string;
    printedBy: string;
  }>;
};

type IdCardStatus = IdCardRegisterEntry["status"];

type IdCardRegisterStore = {
  entries: IdCardRegisterEntry[];
  updatedAt: string | null;
};

const idCardRegisterPath = path.join(process.cwd(), "data", "id-card-register.json");

function normalizeEntry(entry: IdCardRegisterEntry): IdCardRegisterEntry {
  return {
    entityType: entry.entityType,
    entityId: entry.entityId.trim(),
    cardNumber:
      typeof entry.cardNumber === "string" && entry.cardNumber.trim()
        ? entry.cardNumber.trim()
        : `${entry.entityType === "student" ? "IDC-STU" : "IDC-STF"}-${entry.entityId.slice(-6).toUpperCase()}`,
    issueVersion: Number.isFinite(Number(entry.issueVersion)) ? Math.max(1, Number(entry.issueVersion)) : Math.max(1, Number(entry.printCount || 1)),
    code: entry.code.trim(),
    fullName: entry.fullName.trim(),
    status: entry.status === "CANCELLED" || entry.status === "REPLACED" ? entry.status : "ACTIVE",
    statusNote: typeof entry.statusNote === "string" ? entry.statusNote.trim() : "",
    statusUpdatedAt: typeof entry.statusUpdatedAt === "string" ? entry.statusUpdatedAt : entry.lastPrintedAt,
    statusUpdatedBy: typeof entry.statusUpdatedBy === "string" ? entry.statusUpdatedBy.trim() : entry.lastPrintedBy || "System",
    printCount: Number(entry.printCount || 0),
    firstPrintedAt: entry.firstPrintedAt,
    lastPrintedAt: entry.lastPrintedAt,
    lastReason: typeof entry.lastReason === "string" ? entry.lastReason.trim() : "Initial Issue",
    lastPrintedBy: typeof entry.lastPrintedBy === "string" ? entry.lastPrintedBy.trim() : "System",
    replacementStatus: entry.replacementStatus === "REQUESTED" || entry.replacementStatus === "APPROVED" ? entry.replacementStatus : "NONE",
    replacementRequestedAt: typeof entry.replacementRequestedAt === "string" ? entry.replacementRequestedAt : "",
    replacementRequestedBy: typeof entry.replacementRequestedBy === "string" ? entry.replacementRequestedBy.trim() : "",
    replacementReason: typeof entry.replacementReason === "string" ? entry.replacementReason.trim() : "",
    replacementFee: typeof entry.replacementFee === "string" ? entry.replacementFee.trim() : "",
    replacementPaymentMode: typeof entry.replacementPaymentMode === "string" ? entry.replacementPaymentMode.trim() : "",
    replacementReferenceNo: typeof entry.replacementReferenceNo === "string" ? entry.replacementReferenceNo.trim() : "",
    replacementReceiptNumber: typeof entry.replacementReceiptNumber === "string" ? entry.replacementReceiptNumber.trim() : "",
    replacementFeePostedAt: typeof entry.replacementFeePostedAt === "string" ? entry.replacementFeePostedAt : "",
    replacementFeePostedBy: typeof entry.replacementFeePostedBy === "string" ? entry.replacementFeePostedBy.trim() : "",
    replacementApprovedAt: typeof entry.replacementApprovedAt === "string" ? entry.replacementApprovedAt : "",
    replacementApprovedBy: typeof entry.replacementApprovedBy === "string" ? entry.replacementApprovedBy.trim() : "",
    history: Array.isArray(entry.history)
      ? entry.history.map((item) => ({
          printedAt: item.printedAt,
          reason: typeof item.reason === "string" ? item.reason.trim() : "Initial Issue",
          printedBy: typeof item.printedBy === "string" ? item.printedBy.trim() : "System"
        }))
      : entry.lastPrintedAt
        ? [
            {
              printedAt: entry.lastPrintedAt,
              reason: typeof entry.lastReason === "string" ? entry.lastReason.trim() : "Initial Issue",
              printedBy: typeof entry.lastPrintedBy === "string" ? entry.lastPrintedBy.trim() : "System"
            }
          ]
        : []
  };
}

function buildNextCardNumber(entries: IdCardRegisterEntry[], entityType: "student" | "staff") {
  const prefix = entityType === "student" ? "IDC-STU" : "IDC-STF";
  const used = entries
    .filter((entry) => entry.entityType === entityType)
    .map((entry) => Number(entry.cardNumber.split("-").at(-1) || 0))
    .filter((value) => Number.isFinite(value));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}

async function readStore(): Promise<IdCardRegisterStore> {
  try {
    const raw = await readFile(idCardRegisterPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<IdCardRegisterStore>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries.map((item) => normalizeEntry(item as IdCardRegisterEntry)) : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return { entries: [], updatedAt: null };
  }
}

async function saveStore(entries: IdCardRegisterEntry[]) {
  const payload: IdCardRegisterStore = {
    entries,
    updatedAt: new Date().toISOString()
  };
  await mkdir(path.dirname(idCardRegisterPath), { recursive: true });
  await writeFile(idCardRegisterPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function logIdCardPrint(input: {
  entityType: "student" | "staff";
  entityId: string;
  code: string;
  fullName: string;
  reason: string;
  printedBy: string;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.entries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId);
  const normalizedReason = input.reason.trim() || "Initial Issue";
  const normalizedPrintedBy = input.printedBy.trim() || "System";

  const nextEntries: IdCardRegisterEntry[] = existing
    ? store.entries.map((entry) =>
        entry === existing
          ? {
              ...entry,
              code: input.code.trim(),
              fullName: input.fullName.trim(),
              issueVersion: entry.issueVersion + 1,
              printCount: entry.printCount + 1,
              lastPrintedAt: now,
              lastReason: normalizedReason,
              lastPrintedBy: normalizedPrintedBy,
              history: [
                ...entry.history,
                {
                  printedAt: now,
                  reason: normalizedReason,
                  printedBy: normalizedPrintedBy
                }
              ]
            }
          : entry
      )
    : [
        ...store.entries,
        {
          entityType: input.entityType,
          entityId: input.entityId.trim(),
          cardNumber: buildNextCardNumber(store.entries, input.entityType),
          issueVersion: 1,
          code: input.code.trim(),
          fullName: input.fullName.trim(),
          status: "ACTIVE",
          statusNote: "",
          statusUpdatedAt: now,
          statusUpdatedBy: normalizedPrintedBy,
          printCount: 1,
          firstPrintedAt: now,
          lastPrintedAt: now,
          lastReason: normalizedReason,
          lastPrintedBy: normalizedPrintedBy,
          replacementStatus: "NONE",
          replacementRequestedAt: "",
          replacementRequestedBy: "",
          replacementReason: "",
          replacementFee: "",
          replacementPaymentMode: "",
          replacementReferenceNo: "",
          replacementReceiptNumber: "",
          replacementFeePostedAt: "",
          replacementFeePostedBy: "",
          replacementApprovedAt: "",
          replacementApprovedBy: "",
          history: [
            {
              printedAt: now,
              reason: normalizedReason,
              printedBy: normalizedPrintedBy
            }
          ]
        }
      ];

  await saveStore(nextEntries);
  return nextEntries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId) || null;
}

export async function requestIdCardReplacement(input: {
  entityType: "student" | "staff";
  entityId: string;
  reason: string;
  fee: string;
  paymentMode?: string;
  referenceNo?: string;
  requestedBy: string;
}) {
  const store = await readStore();
  const existing = store.entries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim());
  if (!existing) {
    throw new Error("ID card register entry not found.");
  }

  const now = new Date().toISOString();
  const nextEntries: IdCardRegisterEntry[] = store.entries.map((entry) =>
    entry === existing
      ? {
          ...entry,
          status: "REPLACED",
          statusNote: "Replacement requested",
          statusUpdatedAt: now,
          statusUpdatedBy: input.requestedBy.trim() || "System",
          replacementStatus: "REQUESTED",
          replacementRequestedAt: now,
          replacementRequestedBy: input.requestedBy.trim() || "System",
          replacementReason: input.reason.trim(),
          replacementFee: input.fee.trim(),
          replacementPaymentMode: input.paymentMode?.trim() || "",
          replacementReferenceNo: input.referenceNo?.trim() || ""
        }
      : entry
  );

  await saveStore(nextEntries);
  return nextEntries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim()) || null;
}

export async function approveIdCardReplacement(input: {
  entityType: "student" | "staff";
  entityId: string;
  approvedBy: string;
  replacementReceiptNumber?: string;
  feePostedAt?: string;
  feePostedBy?: string;
}) {
  const store = await readStore();
  const existing = store.entries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim());
  if (!existing) {
    throw new Error("ID card register entry not found.");
  }

  const now = new Date().toISOString();
  const nextEntries: IdCardRegisterEntry[] = store.entries.map((entry) =>
    entry === existing
      ? {
          ...entry,
          status: "ACTIVE",
          statusNote: "Replacement approved",
          statusUpdatedAt: now,
          statusUpdatedBy: input.approvedBy.trim() || "System",
          replacementStatus: "APPROVED",
          replacementReceiptNumber: input.replacementReceiptNumber?.trim() || entry.replacementReceiptNumber || "",
          replacementFeePostedAt: input.feePostedAt || entry.replacementFeePostedAt || "",
          replacementFeePostedBy: input.feePostedBy?.trim() || entry.replacementFeePostedBy || "",
          replacementApprovedAt: now,
          replacementApprovedBy: input.approvedBy.trim() || "System"
        }
      : entry
  );

  await saveStore(nextEntries);
  return nextEntries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim()) || null;
}

export async function cancelIdCardReplacement(input: {
  entityType: "student" | "staff";
  entityId: string;
  cancelledBy: string;
}) {
  const store = await readStore();
  const existing = store.entries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim());
  if (!existing) {
    throw new Error("ID card register entry not found.");
  }

  const now = new Date().toISOString();
  const nextEntries: IdCardRegisterEntry[] = store.entries.map((entry) =>
    entry === existing
      ? {
          ...entry,
          status: "ACTIVE",
          statusNote: "Replacement request cancelled",
          statusUpdatedAt: now,
          statusUpdatedBy: input.cancelledBy.trim() || "System",
          replacementStatus: "NONE",
          replacementRequestedAt: "",
          replacementRequestedBy: "",
          replacementReason: "",
          replacementFee: "",
          replacementPaymentMode: "",
          replacementReferenceNo: "",
          replacementReceiptNumber: "",
          replacementFeePostedAt: "",
          replacementFeePostedBy: "",
          replacementApprovedAt: "",
          replacementApprovedBy: ""
        }
      : entry
  );

  await saveStore(nextEntries);
  return nextEntries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim()) || null;
}

export async function updateIdCardStatus(input: {
  entityType: "student" | "staff";
  entityId: string;
  status: IdCardStatus;
  statusNote?: string;
  updatedBy: string;
}) {
  const store = await readStore();
  const existing = store.entries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim());
  if (!existing) {
    throw new Error("ID card register entry not found.");
  }

  const now = new Date().toISOString();
  const nextEntries: IdCardRegisterEntry[] = store.entries.map((entry) =>
    entry === existing
      ? {
          ...entry,
          status: input.status,
          statusNote: input.statusNote?.trim() || "",
          statusUpdatedAt: now,
          statusUpdatedBy: input.updatedBy.trim() || "System"
        }
      : entry
  );

  await saveStore(nextEntries);
  return nextEntries.find((entry) => entry.entityType === input.entityType && entry.entityId === input.entityId.trim()) || null;
}

export async function getIdCardRegisterEntry(entityType: "student" | "staff", entityId: string) {
  const store = await readStore();
  return store.entries.find((entry) => entry.entityType === entityType && entry.entityId === entityId.trim()) || null;
}

export async function getIdCardRegisterMap() {
  const store = await readStore();
  return new Map(store.entries.map((entry) => [`${entry.entityType}:${entry.entityId}`, entry] as const));
}

export async function listIdCardRegisterEntries(filters?: {
  entityType?: "student" | "staff" | "";
  search?: string;
  reissueOnly?: boolean;
  status?: "ACTIVE" | "CANCELLED" | "REPLACED" | "";
  replacementStatus?: "NONE" | "REQUESTED" | "APPROVED" | "";
}) {
  const store = await readStore();
  const search = filters?.search?.trim().toLowerCase() || "";

  return store.entries
    .filter((entry) => (filters?.entityType ? entry.entityType === filters.entityType : true))
    .filter((entry) => (filters?.reissueOnly ? entry.printCount > 1 : true))
    .filter((entry) => (filters?.status ? entry.status === filters.status : true))
    .filter((entry) => (filters?.replacementStatus ? entry.replacementStatus === filters.replacementStatus : true))
    .filter((entry) => {
      if (!search) return true;
      return (
        entry.code.toLowerCase().includes(search) ||
        entry.fullName.toLowerCase().includes(search) ||
        entry.status.toLowerCase().includes(search) ||
        entry.replacementStatus.toLowerCase().includes(search) ||
        entry.statusNote.toLowerCase().includes(search) ||
        entry.replacementReason.toLowerCase().includes(search) ||
        entry.replacementRequestedBy.toLowerCase().includes(search) ||
        entry.replacementApprovedBy.toLowerCase().includes(search) ||
        entry.lastReason.toLowerCase().includes(search) ||
        entry.lastPrintedBy.toLowerCase().includes(search)
      );
    })
    .sort((left, right) => right.lastPrintedAt.localeCompare(left.lastPrintedAt));
}
