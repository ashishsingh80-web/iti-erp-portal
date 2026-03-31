import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

const prismaAny = prisma as any;
const BACKUP_DIR = path.join(process.cwd(), "storage", "backups");
const BACKUP_VERSION = 1;
const CHUNK_SIZE = 200;
const BACKUP_FILENAME_RE = /^[a-zA-Z0-9._-]+\.json$/;

type BackupDatasetConfig = {
  key: string;
  delegate: string;
};

const BACKUP_DATASETS: BackupDatasetConfig[] = [
  { key: "users", delegate: "user" },
  { key: "institutes", delegate: "institute" },
  { key: "trades", delegate: "trade" },
  { key: "agents", delegate: "agent" },
  { key: "enquiries", delegate: "enquiry" },
  { key: "hrStaff", delegate: "hrStaff" },
  { key: "hrQualifications", delegate: "hrQualification" },
  { key: "hrPayments", delegate: "hrPayment" },
  { key: "students", delegate: "student" },
  { key: "parents", delegate: "parentIdentity" },
  { key: "educationRecords", delegate: "educationQualification" },
  { key: "studentDocuments", delegate: "studentDocument" },
  { key: "feeProfiles", delegate: "feeProfile" },
  { key: "feeTransactions", delegate: "feeTransaction" },
  { key: "agentCollections", delegate: "agentCollection" },
  { key: "agentCollectionAllocations", delegate: "agentCollectionAllocation" },
  { key: "accountEntries", delegate: "accountEntry" },
  { key: "accountDayClosures", delegate: "accountDayClosure" },
  { key: "vendorBills", delegate: "vendorBill" },
  { key: "vendorPayments", delegate: "vendorPayment" },
  { key: "scholarshipRecords", delegate: "scholarshipRecord" },
  { key: "prnScvtRecords", delegate: "prnScvtRecord" },
  { key: "examStatusRecords", delegate: "examStatusRecord" },
  { key: "attendanceRecords", delegate: "attendanceRecord" },
  { key: "undertakingRecords", delegate: "undertakingRecord" },
  { key: "studentNoDuesClearances", delegate: "studentNoDuesClearance" },
  { key: "certificatePrintLogs", delegate: "certificatePrintLog" },
  { key: "verificationNotes", delegate: "verificationNote" },
  { key: "timetableEntries", delegate: "timetableEntry" },
  { key: "timetablePublications", delegate: "timetablePublication" },
  { key: "inventoryItems", delegate: "inventoryItem" },
  { key: "inventoryIssues", delegate: "inventoryIssue" },
  { key: "libraryBooks", delegate: "libraryBook" },
  { key: "libraryIssues", delegate: "libraryIssue" },
  { key: "communicationTemplates", delegate: "communicationTemplate" },
  { key: "communicationLogs", delegate: "communicationLog" },
  { key: "grievanceCases", delegate: "grievanceCase" },
  { key: "placementCompanies", delegate: "placementCompany" },
  { key: "placementRecords", delegate: "placementRecord" },
  { key: "auditLogs", delegate: "auditLog" }
];

type BackupSnapshot = {
  version: number;
  exportedAt: string;
  metadata: {
    totalDatasets: number;
    totalRecords: number;
    counts: Record<string, number>;
  };
  data: Record<string, unknown[]>;
};

function toSafeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return { __type: "date", value: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (value && typeof value === "object") {
    if ((value as { constructor?: { name?: string } }).constructor?.name === "Decimal") {
      return { __type: "decimal", value: String(value) };
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)])
    );
  }

  return value;
}

function reviveValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => reviveValue(item));
  }

  if (value && typeof value === "object") {
    if ("__type" in value && "value" in value) {
      const wrapped = value as { __type: string; value: unknown };
      if (wrapped.__type === "date") return new Date(String(wrapped.value));
      if (wrapped.__type === "decimal") return String(wrapped.value);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, reviveValue(item)])
    );
  }

  return value;
}

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function readSnapshotFile(fileName: string): Promise<BackupSnapshot> {
  if (!BACKUP_FILENAME_RE.test(fileName)) throw new Error("Invalid backup file name");

  const raw = await fs.readFile(path.join(BACKUP_DIR, fileName), "utf8");
  return JSON.parse(raw) as BackupSnapshot;
}

function chunkRows<T>(rows: T[]) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    chunks.push(rows.slice(index, index + CHUNK_SIZE));
  }
  return chunks;
}

export async function listBackupFiles() {
  await ensureBackupDir();
  const names = (await fs.readdir(BACKUP_DIR)).filter((item) => item.endsWith(".json")).sort().reverse();

  const rows = await Promise.all(
    names.map(async (fileName) => {
      const absolutePath = path.join(BACKUP_DIR, fileName);
      const [stat, snapshot] = await Promise.all([
        fs.stat(absolutePath),
        readSnapshotFile(fileName)
      ]);

      return {
        fileName,
        fileSizeKb: Number((stat.size / 1024).toFixed(1)),
        exportedAt: snapshot.exportedAt,
        version: snapshot.version,
        totalDatasets: snapshot.metadata.totalDatasets,
        totalRecords: snapshot.metadata.totalRecords,
        counts: snapshot.metadata.counts
      };
    })
  );

  return {
    backupDir: BACKUP_DIR,
    backups: rows
  };
}

export async function createSystemBackup(currentUserId?: string | null) {
  await ensureBackupDir();

  const dataEntries = await Promise.all(
    BACKUP_DATASETS.map(async ({ key, delegate }) => {
      const rows = await prismaAny[delegate].findMany();
      return [key, rows.map((item: unknown) => serializeValue(item))] as const;
    })
  );

  const data = Object.fromEntries(dataEntries) as Record<string, unknown[]>;
  const counts = Object.fromEntries(
    Object.entries(data).map(([key, rows]) => [key, rows.length])
  );
  const totalRecords = Object.values(counts).reduce((sum, item) => sum + item, 0);

  const snapshot: BackupSnapshot = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    metadata: {
      totalDatasets: BACKUP_DATASETS.length,
      totalRecords,
      counts
    },
    data
  };

  const fileName = `iti-erp-backup-${toSafeTimestamp()}.json`;
  await fs.writeFile(path.join(BACKUP_DIR, fileName), JSON.stringify(snapshot, null, 2), "utf8");

  await createAuditLog({
    userId: currentUserId || null,
    module: "backup",
    action: "EXPORT_BACKUP",
    metadata: {
      fileName,
      totalRecords
    }
  });

  return {
    fileName,
    totalRecords,
    totalDatasets: BACKUP_DATASETS.length,
    backupDir: BACKUP_DIR
  };
}

export async function restoreSystemBackup(fileName: string, currentUserId?: string | null) {
  const snapshot = await readSnapshotFile(fileName);
  if (snapshot.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${snapshot.version}`);
  }

  await prisma.$transaction(async (tx) => {
    const txAny = tx as any;

    for (const { delegate } of [...BACKUP_DATASETS].reverse()) {
      await txAny[delegate].deleteMany({});
    }

    for (const { key, delegate } of BACKUP_DATASETS) {
      const rows = ((snapshot.data[key] || []) as unknown[]).map((item) => reviveValue(item));
      if (!rows.length) continue;

      for (const chunk of chunkRows(rows)) {
        await txAny[delegate].createMany({ data: chunk });
      }
    }
  });

  await createAuditLog({
    userId: currentUserId || null,
    module: "backup",
    action: "RESTORE_BACKUP",
    metadata: {
      fileName,
      totalRecords: snapshot.metadata.totalRecords
    }
  });

  return {
    fileName,
    restoredRecords: snapshot.metadata.totalRecords,
    restoredDatasets: snapshot.metadata.totalDatasets
  };
}

export async function getBackupDownload(fileName: string) {
  await ensureBackupDir();
  if (!BACKUP_FILENAME_RE.test(fileName)) throw new Error("Invalid backup file name");

  // Prevent traversal even if an unexpected filename sneaks through.
  const backupsDirAbs = path.resolve(BACKUP_DIR);
  const absolutePath = path.resolve(backupsDirAbs, fileName);
  if (!absolutePath.startsWith(backupsDirAbs + path.sep) && absolutePath !== backupsDirAbs) {
    throw new Error("Invalid backup file path");
  }

  const buffer = await fs.readFile(absolutePath);
  return {
    fileName,
    buffer
  };
}
