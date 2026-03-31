import { NextResponse } from "next/server";
import { clearParentSessionCookie } from "@/lib/parent-auth";

export async function POST() {
  await clearParentSessionCookie();
  return NextResponse.json({ ok: true });
}
