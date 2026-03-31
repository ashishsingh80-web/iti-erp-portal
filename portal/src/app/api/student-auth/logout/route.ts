import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/student-auth";

export async function POST() {
  await clearStudentSessionCookie();
  return NextResponse.json({ ok: true });
}
