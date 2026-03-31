import { prisma } from "@/lib/prisma";

export type AuditActor = {
  userId?: string | null;
  studentId?: string | null;
  module: string;
  action: string;
  metadata?: Record<string, unknown> | null;
};

export async function createAuditLog(actor: AuditActor) {
  await prisma.auditLog.create({
    data: {
      userId: actor.userId || null,
      studentId: actor.studentId || null,
      module: actor.module,
      action: actor.action,
      metadataJson: actor.metadata ? JSON.stringify(actor.metadata) : null
    }
  });
}

export async function listAuditLogs(filters: { module?: string; studentId?: string; limit?: number } = {}) {
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.studentId ? { studentId: filters.studentId } : {})
    },
    include: {
      user: true,
      student: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: filters.limit || 100
  });

  return rows.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    module: item.module,
    action: item.action,
    userName: item.user?.name || "System",
    userEmail: item.user?.email || "",
    studentId: item.studentId,
    studentCode: item.student?.studentCode || "",
    studentName: item.student?.fullName || "",
    metadata: item.metadataJson ? safeParseJson(item.metadataJson) : null
  }));
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {
      raw: value
    };
  }
}
