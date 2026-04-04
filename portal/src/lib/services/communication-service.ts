import { CommunicationChannel, CommunicationLogStatus, CommunicationTargetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/currency";
import { createAuditLog } from "@/lib/services/audit-service";

export const communicationChannelOptions = [
  { label: "SMS", value: "SMS" },
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "Email", value: "EMAIL" },
  { label: "Call", value: "CALL" }
] as const;

export const communicationCategoryOptions = [
  { label: "Fees Due", value: "FEES_DUE" },
  { label: "Documents Pending", value: "DOCUMENTS_PENDING" },
  { label: "Scholarship Query", value: "SCHOLARSHIP_QUERY" },
  { label: "Enquiry Follow-up", value: "ENQUIRY_FOLLOW_UP" },
  { label: "General Notice", value: "GENERAL_NOTICE" }
] as const;

type ReminderTarget = {
  targetType: string;
  targetId: string;
  targetName: string;
  targetMobile: string;
  targetEmail: string;
  category: string;
  helper: string;
  defaultMessage: string;
};

function renderTemplate(body: string, payload: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => payload[key] || "");
}

type DeliveryResult = {
  delivered: boolean;
  providerMessage: string;
};

function getChannelWebhook(channel: CommunicationChannel) {
  if (channel === "SMS") return process.env.NOTIFY_SMS_WEBHOOK_URL || "";
  if (channel === "WHATSAPP") return process.env.NOTIFY_WHATSAPP_WEBHOOK_URL || "";
  if (channel === "EMAIL") return process.env.NOTIFY_EMAIL_WEBHOOK_URL || "";
  return "";
}

async function deliverCommunicationLog(log: {
  id: string;
  channel: CommunicationChannel;
  targetName: string;
  targetMobile: string | null;
  targetEmail: string | null;
  subjectLine: string | null;
  bodyText: string;
}): Promise<DeliveryResult> {
  const webhookUrl = getChannelWebhook(log.channel);
  const authToken = process.env.NOTIFY_WEBHOOK_BEARER_TOKEN || "";

  if (!webhookUrl) {
    return {
      delivered: false,
      providerMessage: `No provider webhook configured for channel ${log.channel}`
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify({
      channel: log.channel,
      messageId: log.id,
      toMobile: log.targetMobile || "",
      toEmail: log.targetEmail || "",
      recipientName: log.targetName,
      subject: log.subjectLine || "",
      body: log.bodyText
    })
  });

  if (!response.ok) {
    const providerText = await response.text().catch(() => "");
    return {
      delivered: false,
      providerMessage: providerText || `Provider returned HTTP ${response.status}`
    };
  }

  const providerText = await response.text().catch(() => "");
  return {
    delivered: true,
    providerMessage: providerText || "Delivered"
  };
}

export async function listCommunicationDeskData(search = "") {
  const [templates, logs, feeTargets, documentTargets, scholarshipTargets, enquiryTargets] = await Promise.all([
    prisma.communicationTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      take: 50
    }),
    prisma.communicationLog.findMany({
      include: {
        template: true,
        createdBy: true
      },
      orderBy: { createdAt: "desc" },
      take: 80
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        feeProfile: { dueAmount: { gt: 0 } },
        ...(search.trim()
          ? {
              OR: [
                { fullName: { startsWith: search.trim(), mode: "insensitive" } },
                { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
                { mobile: { startsWith: search.trim() } }
              ]
            }
          : {})
      },
      include: {
        feeProfile: true
      },
      take: 20,
      orderBy: { createdAt: "desc" }
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        documentsStatus: { in: ["PENDING", "INCOMPLETE", "REJECTED"] },
        ...(search.trim()
          ? {
              OR: [
                { fullName: { startsWith: search.trim(), mode: "insensitive" } },
                { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
                { mobile: { startsWith: search.trim() } }
              ]
            }
          : {})
      },
      take: 20,
      orderBy: { createdAt: "desc" }
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        scholarshipRecord: {
          status: { in: ["QUERY_BY_DEPARTMENT", "UNDER_PROCESS"] }
        },
        ...(search.trim()
          ? {
              OR: [
                { fullName: { startsWith: search.trim(), mode: "insensitive" } },
                { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
                { mobile: { startsWith: search.trim() } }
              ]
            }
          : {})
      },
      include: { scholarshipRecord: true },
      take: 20,
      orderBy: { createdAt: "desc" }
    }),
    prisma.enquiry.findMany({
      where: {
        status: { in: ["NEW", "FOLLOW_UP", "VISIT_SCHEDULED", "COUNSELLED", "INTERESTED", "DOCUMENTS_PENDING"] },
        ...(search.trim()
          ? {
              OR: [
                { fullName: { startsWith: search.trim(), mode: "insensitive" } },
                { mobile: { startsWith: search.trim() } },
                { assignedCounsellor: { startsWith: search.trim(), mode: "insensitive" } }
              ]
            }
          : {})
      },
      take: 20,
      orderBy: [{ nextFollowUpDate: "asc" }, { createdAt: "desc" }]
    })
  ]);

  const reminderTargets: ReminderTarget[] = [
    ...feeTargets.filter((row) => Boolean(row.mobile)).map((row: (typeof feeTargets)[number]) => ({
      targetType: "STUDENT",
      targetId: row.id,
      targetName: row.fullName,
      targetMobile: row.mobile || "",
      targetEmail: row.email || "",
      category: "FEES_DUE",
      helper: `${row.studentCode} • Due ${formatInr(row.feeProfile?.dueAmount?.toString() || "0")}`,
      defaultMessage: `Dear ${row.fullName}, your institute fee due is ${formatInr(row.feeProfile?.dueAmount?.toString() || "0")}. Please contact the institute office and clear it at the earliest.`
    })),
    ...documentTargets.filter((row) => Boolean(row.mobile)).map((row: (typeof documentTargets)[number]) => ({
      targetType: "STUDENT",
      targetId: row.id,
      targetName: row.fullName,
      targetMobile: row.mobile || "",
      targetEmail: row.email || "",
      category: "DOCUMENTS_PENDING",
      helper: `${row.studentCode} • ${row.documentsStatus}`,
      defaultMessage: `Dear ${row.fullName}, your admission documents are still pending/incomplete. Please visit the institute with the required documents.`
    })),
    ...scholarshipTargets.filter((row) => Boolean(row.mobile)).map((row: (typeof scholarshipTargets)[number]) => ({
      targetType: "STUDENT",
      targetId: row.id,
      targetName: row.fullName,
      targetMobile: row.mobile || "",
      targetEmail: row.email || "",
      category: "SCHOLARSHIP_QUERY",
      helper: `${row.studentCode} • ${row.scholarshipRecord?.status || ""}`,
      defaultMessage: `Dear ${row.fullName}, there is an update/query in your scholarship case. Please contact the institute scholarship desk immediately.`
    })),
    ...enquiryTargets.filter((row) => Boolean(row.mobile)).map((row: (typeof enquiryTargets)[number]) => ({
      targetType: "ENQUIRY",
      targetId: row.id,
      targetName: row.fullName,
      targetMobile: row.mobile || "",
      targetEmail: "",
      category: "ENQUIRY_FOLLOW_UP",
      helper: `${row.status} • Follow-up ${row.nextFollowUpDate ? row.nextFollowUpDate.toISOString().slice(0, 10) : "pending"}`,
      defaultMessage: `Dear ${row.fullName}, thank you for your enquiry. Please connect with the institute for the next admission step and counselling support.`
    }))
  ];

  return {
    templates: templates.map((item: (typeof templates)[number]) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      channel: item.channel,
      subjectLine: item.subjectLine || "",
      bodyText: item.bodyText,
      isActive: item.isActive
    })),
    logs: logs.map((item: (typeof logs)[number]) => ({
      id: item.id,
      title: item.template?.title || item.channel,
      channel: item.channel,
      targetType: item.targetType,
      targetName: item.targetName,
      targetMobile: item.targetMobile || "",
      targetEmail: item.targetEmail || "",
      status: item.status,
      createdBy: item.createdBy?.name || "System",
      createdAt: item.createdAt.toISOString(),
      note: item.note || "",
      category: item.template?.category || ""
    })),
    reminderTargets
  };
}

export async function createCommunicationTemplate(
  payload: {
    title: string;
    category: string;
    channel: string;
    subjectLine?: string;
    bodyText: string;
    isActive?: boolean;
  },
  userId?: string | null
) {
  if (!payload.title.trim() || !payload.category.trim() || !payload.channel || !payload.bodyText.trim()) {
    throw new Error("Title, category, channel, and message body are required");
  }

  const template = await prisma.communicationTemplate.create({
    data: {
      title: payload.title.trim(),
      category: payload.category.trim(),
      channel: payload.channel as CommunicationChannel,
      subjectLine: payload.subjectLine?.trim() || null,
      bodyText: payload.bodyText.trim(),
      isActive: payload.isActive ?? true,
      createdById: userId || null
    }
  });

  await createAuditLog({
    userId,
    module: "communication",
    action: "CREATE_TEMPLATE",
    metadata: {
      templateId: template.id,
      category: template.category,
      channel: template.channel
    }
  });

  return template;
}

export async function createCommunicationLog(
  payload: {
    templateId?: string;
    channel: string;
    targetType: string;
    targetId?: string;
    targetName: string;
    targetMobile?: string;
    targetEmail?: string;
    subjectLine?: string;
    bodyText: string;
    note?: string;
    status?: string;
  },
  userId?: string | null
) {
  if (!payload.channel || !payload.targetType || !payload.targetName.trim() || !payload.bodyText.trim()) {
    throw new Error("Channel, target type, target name, and message body are required");
  }

  const log = await prisma.communicationLog.create({
    data: {
      templateId: payload.templateId || null,
      channel: payload.channel as CommunicationChannel,
      targetType: payload.targetType as CommunicationTargetType,
      targetId: payload.targetId || null,
      targetName: payload.targetName.trim(),
      targetMobile: payload.targetMobile?.trim() || null,
      targetEmail: payload.targetEmail?.trim() || null,
      subjectLine: payload.subjectLine?.trim() || null,
      bodyText: payload.bodyText.trim(),
      note: payload.note?.trim() || null,
      status: (payload.status || "READY") as CommunicationLogStatus,
      createdById: userId || null
    }
  });

  await createAuditLog({
    userId,
    studentId: payload.targetType === "STUDENT" ? payload.targetId || null : null,
    module: "communication",
    action: "PREPARE_MESSAGE",
    metadata: {
      communicationLogId: log.id,
      channel: log.channel,
      targetType: log.targetType
    }
  });

  return log;
}

export async function sendCommunicationLog(logId: string, userId?: string | null) {
  const log = await prisma.communicationLog.findUnique({
    where: { id: logId }
  });

  if (!log) {
    throw new Error("Communication log not found");
  }

  if (log.status !== CommunicationLogStatus.READY && log.status !== CommunicationLogStatus.FAILED) {
    throw new Error("Only READY or FAILED messages can be sent");
  }

  const recipientMissing =
    (log.channel === "SMS" || log.channel === "WHATSAPP") && !log.targetMobile
      ? "Target mobile is required"
      : log.channel === "EMAIL" && !log.targetEmail
        ? "Target email is required"
        : "";
  if (recipientMissing) {
    await prisma.communicationLog.update({
      where: { id: logId },
      data: {
        status: CommunicationLogStatus.FAILED,
        note: recipientMissing
      }
    });
    return { delivered: false, message: recipientMissing };
  }

  const result = await deliverCommunicationLog({
    id: log.id,
    channel: log.channel,
    targetName: log.targetName,
    targetMobile: log.targetMobile,
    targetEmail: log.targetEmail,
    subjectLine: log.subjectLine,
    bodyText: log.bodyText
  });

  await prisma.communicationLog.update({
    where: { id: logId },
    data: {
      status: result.delivered ? CommunicationLogStatus.SENT : CommunicationLogStatus.FAILED,
      note: result.providerMessage
    }
  });

  await createAuditLog({
    userId,
    module: "communication",
    action: result.delivered ? "SEND_MESSAGE" : "SEND_MESSAGE_FAILED",
    metadata: {
      communicationLogId: log.id,
      channel: log.channel,
      status: result.delivered ? "SENT" : "FAILED",
      providerMessage: result.providerMessage
    }
  });

  return {
    delivered: result.delivered,
    message: result.providerMessage
  };
}

export async function sendReadyCommunicationLogs(limit = 20, userId?: string | null) {
  const readyLogs = await prisma.communicationLog.findMany({
    where: { status: CommunicationLogStatus.READY },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 100))
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const row of readyLogs) {
    const result = await sendCommunicationLog(row.id, userId);
    if (result.delivered) sentCount += 1;
    else failedCount += 1;
  }

  return {
    processed: readyLogs.length,
    sentCount,
    failedCount
  };
}

export async function previewTemplateApplication(templateId: string, target: ReminderTarget) {
  const template = await prisma.communicationTemplate.findUnique({ where: { id: templateId } });
  if (!template) {
    throw new Error("Template not found");
  }

  return {
    templateId: template.id,
    channel: template.channel,
    subjectLine: template.subjectLine || "",
    bodyText: renderTemplate(template.bodyText, {
      name: target.targetName,
      mobile: target.targetMobile,
      category: target.category
    })
  };
}
