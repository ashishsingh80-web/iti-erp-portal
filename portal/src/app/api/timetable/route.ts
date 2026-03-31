import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createTimetableEntry, listTimetableRows } from "@/lib/services/timetable-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "view");
    const searchParams = new URL(request.url).searchParams;

    const rows = await listTimetableRows({
      instituteCode: searchParams.get("instituteCode") || "",
      tradeValue: searchParams.get("tradeValue") || "",
      session: searchParams.get("session") || "",
      yearLabel: searchParams.get("yearLabel") || "",
      dayOfWeek: searchParams.get("dayOfWeek") || "",
      instructorName: searchParams.get("instructorName") || "",
      roomLabel: searchParams.get("roomLabel") || "",
      batchLabel: searchParams.get("batchLabel") || ""
    });

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load timetable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "add");
    const body = (await request.json()) as {
      instituteCode?: string;
      tradeValue?: string;
      session?: string;
      yearLabel?: string;
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
      subjectTitle?: string;
      instructorName?: string;
      roomLabel?: string;
      batchLabel?: string;
      isPractical?: boolean;
      note?: string;
    };

    const row = await createTimetableEntry(
      {
        instituteCode: body.instituteCode || "",
        tradeValue: body.tradeValue || "",
        session: body.session || "",
        yearLabel: body.yearLabel || "",
        dayOfWeek: body.dayOfWeek || "",
        startTime: body.startTime || "",
        endTime: body.endTime || "",
        subjectTitle: body.subjectTitle || "",
        instructorName: body.instructorName || "",
        roomLabel: body.roomLabel || "",
        batchLabel: body.batchLabel || "",
        isPractical: Boolean(body.isPractical),
        note: body.note || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to create timetable entry" }, { status: 400 });
  }
}
