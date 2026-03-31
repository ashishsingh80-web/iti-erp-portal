import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { deleteTimetableEntry, updateTimetableEntry } from "@/lib/services/timetable-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "edit");
    const { entryId } = await params;
    const payload = await request.json();
    const row = await updateTimetableEntry(entryId, payload);
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update timetable entry" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "delete");
    const { entryId } = await params;
    await deleteTimetableEntry(entryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to delete timetable entry" },
      { status: 400 }
    );
  }
}
