import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import {
  createCommunicationLog,
  createCommunicationTemplate,
  listCommunicationDeskData,
  sendCommunicationLog,
  sendReadyCommunicationLogs
} from "@/lib/services/communication-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "communication", "view");
    const search = new URL(request.url).searchParams.get("search") || "";
    return NextResponse.json({ ok: true, ...(await listCommunicationDeskData(search)) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load communication desk" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { mode?: string; [key: string]: unknown };

    if (body.mode === "send") {
      assertUserActionAccess(user, "communication", "edit");
      const logId = String(body.logId || "").trim();
      if (!logId) {
        return NextResponse.json({ ok: false, message: "logId is required" }, { status: 400 });
      }
      const result = await sendCommunicationLog(logId, user.id);
      return NextResponse.json({ ok: true, result });
    }

    if (body.mode === "send-ready") {
      assertUserActionAccess(user, "communication", "edit");
      const limit = Number(body.limit || 20);
      const result = await sendReadyCommunicationLogs(limit, user.id);
      return NextResponse.json({ ok: true, result });
    }

    if (body.mode === "template") {
      assertUserActionAccess(user, "communication", "add");
      const template = await createCommunicationTemplate(
        {
          title: String(body.title || ""),
          category: String(body.category || ""),
          channel: String(body.channel || ""),
          subjectLine: String(body.subjectLine || ""),
          bodyText: String(body.bodyText || ""),
          isActive: body.isActive === undefined ? true : Boolean(body.isActive)
        },
        user.id
      );

      return NextResponse.json({ ok: true, template });
    }

    assertUserActionAccess(user, "communication", "add");
    const log = await createCommunicationLog(
      {
        templateId: body.templateId ? String(body.templateId) : "",
        channel: String(body.channel || ""),
        targetType: String(body.targetType || ""),
        targetId: body.targetId ? String(body.targetId) : "",
        targetName: String(body.targetName || ""),
        targetMobile: String(body.targetMobile || ""),
        targetEmail: String(body.targetEmail || ""),
        subjectLine: String(body.subjectLine || ""),
        bodyText: String(body.bodyText || ""),
        note: String(body.note || ""),
        status: String(body.status || "READY")
      },
      user.id
    );

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to save communication entry" }, { status: 400 });
  }
}
