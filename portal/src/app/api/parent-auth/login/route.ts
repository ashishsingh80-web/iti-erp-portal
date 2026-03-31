import { NextResponse } from "next/server";
import { authenticateParent, setParentSessionCookie } from "@/lib/parent-auth";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    studentCode?: string;
    parentMobile?: string;
  };

  try {
    if (!payload.studentCode?.trim() || !payload.parentMobile?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Student code and parent mobile are required"
        },
        { status: 400 }
      );
    }

    const { parentUser, sessionToken } = await authenticateParent(payload.studentCode, payload.parentMobile);
    await setParentSessionCookie(sessionToken);

    return NextResponse.json({
      ok: true,
      parentUser
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to log in"
      },
      { status: 401 }
    );
  }
}
