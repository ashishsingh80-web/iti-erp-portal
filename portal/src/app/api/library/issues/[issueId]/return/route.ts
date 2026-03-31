import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { returnLibraryIssue } from "@/lib/services/library-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "library", "edit");
    const { issueId } = await params;
    const body = (await request.json()) as {
      returnDate?: string;
      remark?: string;
    };

    const issue = await returnLibraryIssue(
      {
        issueId,
        returnDate: body.returnDate || "",
        remark: body.remark || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to return book" }, { status: 400 });
  }
}
