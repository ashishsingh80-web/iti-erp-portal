import { NextResponse } from "next/server";
import { authenticateStudent, setStudentSessionCookie } from "@/lib/student-auth";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    studentCode?: string;
    dateOfBirth?: string;
  };

  try {
    if (!payload.studentCode?.trim() || !payload.dateOfBirth?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Student code and date of birth are required"
        },
        { status: 400 }
      );
    }

    const { student, sessionToken } = await authenticateStudent(payload.studentCode, payload.dateOfBirth);
    await setStudentSessionCookie(sessionToken);

    return NextResponse.json({
      ok: true,
      student
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
