import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { bulkCopyTimetableForward, copyTimetableForward } from "@/lib/services/timetable-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "add");
    const body = (await request.json()) as {
      source?: { instituteCode?: string; tradeValue?: string; session?: string; yearLabel?: string };
      target?: { instituteCode?: string; tradeValue?: string; session?: string; yearLabel?: string };
      mode?: "single" | "bulk";
    };

    const result =
      body.mode === "bulk"
        ? await bulkCopyTimetableForward(
            {
              instituteCode: body.source?.instituteCode || "",
              session: body.source?.session || "",
              yearLabel: body.source?.yearLabel || ""
            },
            {
              instituteCode: body.target?.instituteCode || "",
              session: body.target?.session || "",
              yearLabel: body.target?.yearLabel || ""
            },
            user.id
          )
        : await copyTimetableForward(
            {
              instituteCode: body.source?.instituteCode || "",
              tradeValue: body.source?.tradeValue || "",
              session: body.source?.session || "",
              yearLabel: body.source?.yearLabel || ""
            },
            {
              instituteCode: body.target?.instituteCode || "",
              tradeValue: body.target?.tradeValue || "",
              session: body.target?.session || "",
              yearLabel: body.target?.yearLabel || ""
            },
            user.id
          );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to copy timetable forward" }, { status: 400 });
  }
}
