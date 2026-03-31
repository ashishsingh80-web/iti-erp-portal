import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createAccountEntry, listAccountEntries } from "@/lib/services/accounts-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "view");
    const data = await listAccountEntries({
      entryType: request.nextUrl.searchParams.get("entryType") || "",
      dateFrom: request.nextUrl.searchParams.get("dateFrom") || "",
      dateTo: request.nextUrl.searchParams.get("dateTo") || "",
      month: request.nextUrl.searchParams.get("month") || ""
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load account entries"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "add");
    const payload = await request.json();
    const entryId = await createAccountEntry(payload, user.id);
    return NextResponse.json({ ok: true, entryId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create account entry"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
