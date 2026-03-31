import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { issueLibraryBook } from "@/lib/services/library-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "library", "add");
    const body = (await request.json()) as {
      bookId?: string;
      studentId?: string;
      issueDate?: string;
      expectedReturnDate?: string;
      remark?: string;
    };

    const issue = await issueLibraryBook(
      {
        bookId: body.bookId || "",
        studentId: body.studentId || "",
        issueDate: body.issueDate || "",
        expectedReturnDate: body.expectedReturnDate || "",
        remark: body.remark || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to issue book" }, { status: 400 });
  }
}
