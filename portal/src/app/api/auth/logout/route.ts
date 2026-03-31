import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { appendLoginHistory } from "@/lib/login-history";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) {
    await appendLoginHistory({
      eventType: "LOGOUT",
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "",
      userAgent: request.headers.get("user-agent") || ""
    });
  }
  await clearSessionCookie();

  return NextResponse.json({
    ok: true
  });
}
