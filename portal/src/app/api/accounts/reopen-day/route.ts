import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { reopenAccountsDay } from "@/lib/services/accounts-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "edit");
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Only admin can reopen a closed day"
        },
        { status: 403 }
      );
    }

    const payload = await request.json();
    await reopenAccountsDay(payload, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to reopen day"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
