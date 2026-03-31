import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function toApiErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        message: "Validation failed",
        issues: error.flatten()
      },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message.startsWith("Access denied")) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message
      },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message: error instanceof Error ? error.message : fallbackMessage
    },
    { status: 500 }
  );
}
