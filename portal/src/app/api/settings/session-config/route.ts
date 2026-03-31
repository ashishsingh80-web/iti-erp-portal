import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { readSessionConfig, saveSessionConfig } from "@/lib/session-config";

export async function GET() {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for session settings" }, { status: 403 });
    }

    const config = await readSessionConfig();

    return NextResponse.json({
      ok: true,
      config
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load session settings"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for session settings" }, { status: 403 });
    }

    const payload = (await request.json()) as {
      activeOneYearSession?: string;
      activeTwoYearSession?: string;
    };

    if (!payload.activeOneYearSession?.trim() || !payload.activeTwoYearSession?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Both 1-year and 2-year active sessions are required" },
        { status: 400 }
      );
    }

    const config = await saveSessionConfig({
      activeOneYearSession: payload.activeOneYearSession,
      activeTwoYearSession: payload.activeTwoYearSession
    });

    return NextResponse.json({
      ok: true,
      config
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to save session settings"
      },
      { status: 400 }
    );
  }
}
