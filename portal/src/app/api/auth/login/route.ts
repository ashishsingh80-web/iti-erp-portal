import { NextResponse } from "next/server";
import { authenticateUser, setSessionCookie } from "@/lib/auth";
import { getLoginLockState, registerFailedLoginAttempt, registerSuccessfulLogin } from "@/lib/login-history";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = payload.email?.trim();
  const password = payload.password || "";
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

  try {
    if (!email || !password) {
      await registerFailedLoginAttempt({
        userEmail: email || "",
        ipAddress,
        userAgent
      });
      return NextResponse.json(
        {
          ok: false,
          message: "Email and password are required"
        },
        { status: 400 }
      );
    }

    const lockState = await getLoginLockState(email);
    if (lockState?.lockedUntil && new Date(lockState.lockedUntil).getTime() > Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          message: `Account is temporarily locked until ${new Date(lockState.lockedUntil).toLocaleString("en-IN")}`
        },
        { status: 423 }
      );
    }

    const { user, sessionToken } = await authenticateUser(email, password);
    await setSessionCookie(sessionToken);
    await registerSuccessfulLogin({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      ipAddress,
      userAgent
    });

    return NextResponse.json({
      ok: true,
      user
    });
  } catch (error) {
    const failure = await registerFailedLoginAttempt({
      userEmail: email || "",
      ipAddress,
      userAgent
    });
    return NextResponse.json(
      {
        ok: false,
        message:
          failure.lockState.lockedUntil && new Date(failure.lockState.lockedUntil).getTime() > Date.now()
            ? `Account is temporarily locked until ${new Date(failure.lockState.lockedUntil).toLocaleString("en-IN")}`
            : error instanceof Error
              ? error.message
              : "Unable to log in"
      },
      {
        status:
          failure.lockState.lockedUntil && new Date(failure.lockState.lockedUntil).getTime() > Date.now() ? 423 : 401
      }
    );
  }
}
