import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export const timetableDayOptions = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
  { label: "Saturday", value: "SATURDAY" }
] as const;

export type TimetableFilters = {
  instituteCode?: string;
  tradeValue?: string;
  session?: string;
  yearLabel?: string;
  dayOfWeek?: string;
  instructorName?: string;
  roomLabel?: string;
  batchLabel?: string;
};

export type TimetablePayload = {
  instituteCode: string;
  tradeValue: string;
  session: string;
  yearLabel: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectTitle: string;
  instructorName?: string;
  roomLabel?: string;
  batchLabel?: string;
  isPractical?: boolean;
  note?: string;
};

export type TimetablePlanKey = {
  instituteCode: string;
  tradeValue: string;
  session: string;
  yearLabel: string;
};

type ConflictCheckArgs = {
  entryId?: string;
  instituteId: string;
  tradeId: string;
  session: string;
  yearLabel: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructorName?: string;
  roomLabel?: string;
};

function parseTradeValue(tradeValue: string) {
  const [instituteCode, tradeCode] = tradeValue.split("::");
  if (!instituteCode || !tradeCode) {
    throw new Error("Trade is required");
  }

  return { instituteCode, tradeCode };
}

async function resolveTradeTarget(instituteCode: string, tradeValue: string) {
  const { instituteCode: valueInstituteCode, tradeCode } = parseTradeValue(tradeValue);
  if (valueInstituteCode !== instituteCode) {
    throw new Error("Trade does not belong to the selected institute");
  }

  const trade = await prisma.trade.findFirst({
    where: {
      tradeCode,
      institute: { instituteCode }
    },
    include: {
      institute: true
    }
  });

  if (!trade) {
    throw new Error("Trade not found for the selected institute");
  }

  return trade;
}

async function assertTimetableUnlocked(plan: TimetablePlanKey) {
  const trade = await resolveTradeTarget(plan.instituteCode, plan.tradeValue);
  const publication = await prisma.timetablePublication.findUnique({
    where: {
      instituteId_tradeId_session_yearLabel: {
        instituteId: trade.instituteId,
        tradeId: trade.id,
        session: plan.session,
        yearLabel: plan.yearLabel
      }
    }
  });

  if (publication?.isLocked) {
    throw new Error("This timetable is locked and approved. Reopen it before editing.");
  }

  return trade;
}

async function assertNoTimetableConflicts({
  entryId,
  instituteId,
  tradeId,
  session,
  yearLabel,
  dayOfWeek,
  startTime,
  endTime,
  instructorName,
  roomLabel
}: ConflictCheckArgs) {
  const baseWhere = {
    ...(entryId ? { id: { not: entryId } } : {}),
    instituteId,
    session,
    yearLabel,
    dayOfWeek,
    startTime: { lt: endTime },
    endTime: { gt: startTime }
  };

  const tradeOverlap = await prisma.timetableEntry.findFirst({
    where: {
      ...baseWhere,
      tradeId
    }
  });

  if (tradeOverlap) {
    throw new Error("An overlapping timetable slot already exists for this trade and day");
  }

  if (instructorName?.trim()) {
    const instructorOverlap = await prisma.timetableEntry.findFirst({
      where: {
        ...baseWhere,
        instructorName: instructorName.trim()
      }
    });

    if (instructorOverlap) {
      throw new Error("This instructor is already assigned in another slot at the same time");
    }
  }

  if (roomLabel?.trim()) {
    const roomOverlap = await prisma.timetableEntry.findFirst({
      where: {
        ...baseWhere,
        roomLabel: roomLabel.trim()
      }
    });

    if (roomOverlap) {
      throw new Error("This room or workshop is already occupied in another slot at the same time");
    }
  }
}

export async function listTimetableRows(filters: TimetableFilters) {
  const where: Record<string, unknown> = {};

  if (filters.session) where.session = filters.session;
  if (filters.yearLabel) where.yearLabel = filters.yearLabel;
  if (filters.dayOfWeek) where.dayOfWeek = filters.dayOfWeek;
  if (filters.instructorName?.trim()) {
    where.instructorName = { contains: filters.instructorName.trim(), mode: "insensitive" };
  }
  if (filters.roomLabel?.trim()) {
    where.roomLabel = { contains: filters.roomLabel.trim(), mode: "insensitive" };
  }
  if (filters.batchLabel?.trim()) {
    where.batchLabel = { contains: filters.batchLabel.trim(), mode: "insensitive" };
  }

  if (filters.instituteCode) {
    where.institute = { instituteCode: filters.instituteCode };
  }

  if (filters.tradeValue) {
    const { instituteCode, tradeCode } = parseTradeValue(filters.tradeValue);
    where.trade = {
      tradeCode,
      institute: { instituteCode }
    };
  }

  const rows = await prisma.timetableEntry.findMany({
    where,
    include: {
      institute: true,
      trade: true
    },
    orderBy: [
      { dayOfWeek: "asc" },
      { startTime: "asc" },
      { endTime: "asc" }
    ]
  });

  return rows.map((row) => ({
    id: row.id,
    instituteCode: row.institute.instituteCode,
    instituteName: row.institute.name,
    tradeValue: `${row.institute.instituteCode}::${row.trade.tradeCode}`,
    tradeName: row.trade.name,
    session: row.session,
    yearLabel: row.yearLabel,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    subjectTitle: row.subjectTitle,
    instructorName: row.instructorName || "",
    roomLabel: row.roomLabel || "",
    batchLabel: row.batchLabel || "",
    isPractical: row.isPractical,
    note: row.note || ""
  }));
}

export async function getTimetablePublication(plan: TimetablePlanKey) {
  if (!plan.instituteCode || !plan.tradeValue || !plan.session || !plan.yearLabel) {
    return null;
  }

  const trade = await resolveTradeTarget(plan.instituteCode, plan.tradeValue);
  const publication = await prisma.timetablePublication.findUnique({
    where: {
      instituteId_tradeId_session_yearLabel: {
        instituteId: trade.instituteId,
        tradeId: trade.id,
        session: plan.session,
        yearLabel: plan.yearLabel
      }
    },
    include: {
      approvedBy: true
    }
  });

  return {
    isLocked: Boolean(publication?.isLocked),
    approvedAt: publication?.approvedAt?.toISOString() || "",
    approvedBy: publication?.approvedBy?.name || "",
    note: publication?.note || ""
  };
}

export async function setTimetablePublication(plan: TimetablePlanKey, userId: string, isLocked: boolean, note?: string) {
  const trade = await resolveTradeTarget(plan.instituteCode, plan.tradeValue);

  const updated = await prisma.timetablePublication.upsert({
    where: {
      instituteId_tradeId_session_yearLabel: {
        instituteId: trade.instituteId,
        tradeId: trade.id,
        session: plan.session,
        yearLabel: plan.yearLabel
      }
    },
    update: {
      isLocked,
      approvedById: isLocked ? userId : null,
      approvedAt: isLocked ? new Date() : null,
      note: note?.trim() || null
    },
    create: {
      instituteId: trade.instituteId,
      tradeId: trade.id,
      session: plan.session,
      yearLabel: plan.yearLabel,
      isLocked,
      approvedById: isLocked ? userId : null,
      approvedAt: isLocked ? new Date() : null,
      note: note?.trim() || null
    },
    include: {
      approvedBy: true
    }
  });

  await createAuditLog({
    userId,
    module: "timetable",
    action: isLocked ? "FINALIZE_AND_LOCK" : "REOPEN_TIMETABLE",
    metadata: {
      institute: trade.institute.name,
      trade: trade.name,
      session: plan.session,
      yearLabel: plan.yearLabel,
      note: note?.trim() || ""
    }
  });

  return {
    isLocked: updated.isLocked,
    approvedAt: updated.approvedAt?.toISOString() || "",
    approvedBy: updated.approvedBy?.name || "",
    note: updated.note || ""
  };
}

export async function copyTimetableForward(
  source: TimetablePlanKey,
  target: TimetablePlanKey,
  userId: string
) {
  const sourceTrade = await resolveTradeTarget(source.instituteCode, source.tradeValue);
  const targetTrade = await assertTimetableUnlocked(target);

  const existingTarget = await prisma.timetableEntry.count({
    where: {
      instituteId: targetTrade.instituteId,
      tradeId: targetTrade.id,
      session: target.session,
      yearLabel: target.yearLabel
    }
  });

  if (existingTarget > 0) {
    throw new Error("Target timetable already has entries. Clear or choose another target.");
  }

  const sourceRows = await prisma.timetableEntry.findMany({
    where: {
      instituteId: sourceTrade.instituteId,
      tradeId: sourceTrade.id,
      session: source.session,
      yearLabel: source.yearLabel
    }
  });

  if (!sourceRows.length) {
    throw new Error("Source timetable has no entries to copy");
  }

  await prisma.timetableEntry.createMany({
    data: sourceRows.map((row) => ({
      instituteId: targetTrade.instituteId,
      tradeId: targetTrade.id,
      session: target.session,
      yearLabel: target.yearLabel,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      subjectTitle: row.subjectTitle,
      instructorName: row.instructorName,
      roomLabel: row.roomLabel,
      batchLabel: row.batchLabel,
      isPractical: row.isPractical,
      note: row.note,
      createdById: userId
    }))
  });

  await createAuditLog({
    userId,
    module: "timetable",
    action: "COPY_FORWARD",
    metadata: {
      source,
      target,
      copiedCount: sourceRows.length
    }
  });

  return { copiedCount: sourceRows.length };
}

export async function bulkCopyTimetableForward(
  source: { instituteCode: string; session: string; yearLabel: string },
  target: { instituteCode: string; session: string; yearLabel: string },
  userId: string
) {
  if (!source.instituteCode || !source.session || !source.yearLabel || !target.instituteCode || !target.session || !target.yearLabel) {
    throw new Error("Source and target institute/session/year are required");
  }

  if (source.instituteCode !== target.instituteCode) {
    throw new Error("Bulk copy forward currently works within the same institute only");
  }

  const institute = await prisma.institute.findFirst({
    where: { instituteCode: source.instituteCode },
    include: { trades: { where: { isActive: true }, orderBy: { tradeCode: "asc" } } }
  });

  if (!institute) {
    throw new Error("Institute not found");
  }

  const sourceTrades = await prisma.timetableEntry.findMany({
    where: {
      instituteId: institute.id,
      session: source.session,
      yearLabel: source.yearLabel
    },
    include: {
      trade: true
    }
  });

  if (!sourceTrades.length) {
    throw new Error("Source institute timetable has no entries to copy");
  }

  const tradeCodeSet = [...new Set(sourceTrades.map((item) => item.trade.tradeCode))];
  let copiedTrades = 0;
  let copiedSlots = 0;

  for (const tradeCode of tradeCodeSet) {
    const tradeValue = `${source.instituteCode}::${tradeCode}`;
    const tradeSourceRows = sourceTrades.filter((item) => item.trade.tradeCode === tradeCode);
    const targetTrade = await assertTimetableUnlocked({
      instituteCode: target.instituteCode,
      tradeValue,
      session: target.session,
      yearLabel: target.yearLabel
    });

    const existingTarget = await prisma.timetableEntry.count({
      where: {
        instituteId: targetTrade.instituteId,
        tradeId: targetTrade.id,
        session: target.session,
        yearLabel: target.yearLabel
      }
    });

    if (existingTarget > 0) {
      throw new Error(`Target timetable already has entries for trade ${tradeCode}`);
    }

    await prisma.timetableEntry.createMany({
      data: tradeSourceRows.map((row) => ({
        instituteId: targetTrade.instituteId,
        tradeId: targetTrade.id,
        session: target.session,
        yearLabel: target.yearLabel,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        subjectTitle: row.subjectTitle,
        instructorName: row.instructorName,
        roomLabel: row.roomLabel,
        batchLabel: row.batchLabel,
        isPractical: row.isPractical,
        note: row.note,
        createdById: userId
      }))
    });

    copiedTrades += 1;
    copiedSlots += tradeSourceRows.length;
  }

  await createAuditLog({
    userId,
    module: "timetable",
    action: "BULK_COPY_FORWARD",
    metadata: {
      source,
      target,
      copiedTrades,
      copiedSlots
    }
  });

  return { copiedTrades, copiedSlots };
}

export async function updateTimetableEntry(entryId: string, payload: TimetablePayload) {
  if (!payload.instituteCode || !payload.tradeValue || !payload.session || !payload.yearLabel || !payload.dayOfWeek || !payload.startTime || !payload.endTime || !payload.subjectTitle.trim()) {
    throw new Error("Institute, trade, session, year, day, time, and subject are required");
  }

  if (payload.endTime <= payload.startTime) {
    throw new Error("End time must be after start time");
  }

  const existing = await prisma.timetableEntry.findUnique({ where: { id: entryId } });
  if (!existing) {
    throw new Error("Timetable entry not found");
  }

  const trade = await assertTimetableUnlocked({
    instituteCode: payload.instituteCode,
    tradeValue: payload.tradeValue,
    session: payload.session,
    yearLabel: payload.yearLabel
  });

  await assertNoTimetableConflicts({
    entryId,
    instituteId: trade.instituteId,
    tradeId: trade.id,
    session: payload.session,
    yearLabel: payload.yearLabel,
    dayOfWeek: payload.dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    instructorName: payload.instructorName,
    roomLabel: payload.roomLabel
  });

  const updated = await prisma.timetableEntry.update({
    where: { id: entryId },
    data: {
      instituteId: trade.instituteId,
      tradeId: trade.id,
      session: payload.session,
      yearLabel: payload.yearLabel,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      subjectTitle: payload.subjectTitle.trim(),
      instructorName: payload.instructorName?.trim() || null,
      roomLabel: payload.roomLabel?.trim() || null,
      batchLabel: payload.batchLabel?.trim() || null,
      isPractical: Boolean(payload.isPractical),
      note: payload.note?.trim() || null
    },
    include: {
      institute: true,
      trade: true
    }
  });

  await createAuditLog({
    userId: updated.createdById,
    module: "timetable",
    action: "UPDATE_SLOT",
    metadata: {
      entryId: updated.id,
      institute: updated.institute.name,
      trade: updated.trade.name,
      session: updated.session,
      yearLabel: updated.yearLabel,
      dayOfWeek: updated.dayOfWeek,
      subjectTitle: updated.subjectTitle
    }
  });

  return {
    id: updated.id,
    instituteName: updated.institute.name,
    tradeName: updated.trade.name,
    subjectTitle: updated.subjectTitle
  };
}

export async function deleteTimetableEntry(entryId: string) {
  const existing = await prisma.timetableEntry.findUnique({
    where: { id: entryId },
    include: {
      institute: true,
      trade: true
    }
  });
  if (!existing) {
    throw new Error("Timetable entry not found");
  }

  await assertTimetableUnlocked({
    instituteCode: existing.institute.instituteCode,
    tradeValue: `${existing.institute.instituteCode}::${existing.trade.tradeCode}`,
    session: existing.session,
    yearLabel: existing.yearLabel
  });

  await createAuditLog({
    userId: existing.createdById,
    module: "timetable",
    action: "DELETE_SLOT",
    metadata: {
      entryId: existing.id,
      institute: existing.institute.name,
      trade: existing.trade.name,
      session: existing.session,
      yearLabel: existing.yearLabel,
      dayOfWeek: existing.dayOfWeek,
      subjectTitle: existing.subjectTitle
    }
  });

  await prisma.timetableEntry.delete({ where: { id: entryId } });
}

export async function createTimetableEntry(payload: TimetablePayload, createdById: string) {
  if (!payload.instituteCode || !payload.tradeValue || !payload.session || !payload.yearLabel || !payload.dayOfWeek || !payload.startTime || !payload.endTime || !payload.subjectTitle.trim()) {
    throw new Error("Institute, trade, session, year, day, time, and subject are required");
  }

  if (payload.endTime <= payload.startTime) {
    throw new Error("End time must be after start time");
  }

  const trade = await assertTimetableUnlocked({
    instituteCode: payload.instituteCode,
    tradeValue: payload.tradeValue,
    session: payload.session,
    yearLabel: payload.yearLabel
  });

  await assertNoTimetableConflicts({
    instituteId: trade.instituteId,
    tradeId: trade.id,
    session: payload.session,
    yearLabel: payload.yearLabel,
    dayOfWeek: payload.dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    instructorName: payload.instructorName,
    roomLabel: payload.roomLabel
  });

  const created = await prisma.timetableEntry.create({
    data: {
      instituteId: trade.instituteId,
      tradeId: trade.id,
      session: payload.session,
      yearLabel: payload.yearLabel,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      subjectTitle: payload.subjectTitle.trim(),
      instructorName: payload.instructorName?.trim() || null,
      roomLabel: payload.roomLabel?.trim() || null,
      batchLabel: payload.batchLabel?.trim() || null,
      isPractical: Boolean(payload.isPractical),
      note: payload.note?.trim() || null,
      createdById
    },
    include: {
      institute: true,
      trade: true
    }
  });

  await createAuditLog({
    userId: createdById,
    module: "timetable",
    action: "CREATE_SLOT",
    metadata: {
      entryId: created.id,
      institute: created.institute.name,
      trade: created.trade.name,
      session: created.session,
      yearLabel: created.yearLabel,
      dayOfWeek: created.dayOfWeek,
      subjectTitle: created.subjectTitle
    }
  });

  return {
    id: created.id,
    instituteName: created.institute.name,
    tradeName: created.trade.name,
    subjectTitle: created.subjectTitle
  };
}
