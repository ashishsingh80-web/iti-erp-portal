import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getTimetablePublication, setTimetablePublication } from "@/lib/services/timetable-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "view");
    const searchParams = new URL(request.url).searchParams;
    const publication = await getTimetablePublication({
      instituteCode: searchParams.get("instituteCode") || "",
      tradeValue: searchParams.get("tradeValue") || "",
      session: searchParams.get("session") || "",
      yearLabel: searchParams.get("yearLabel") || ""
    });
    return NextResponse.json({ ok: true, publication });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load timetable status" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "edit");
    const body = (await request.json()) as {
      instituteCode?: string;
      tradeValue?: string;
      session?: string;
      yearLabel?: string;
      isLocked?: boolean;
      note?: string;
    };

    const publication = await setTimetablePublication(
      {
        instituteCode: body.instituteCode || "",
        tradeValue: body.tradeValue || "",
        session: body.session || "",
        yearLabel: body.yearLabel || ""
      },
      user.id,
      Boolean(body.isLocked),
      body.note || ""
    );

    return NextResponse.json({ ok: true, publication });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to update timetable status" }, { status: 400 });
  }
}
