import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { APP_LANGUAGE_COOKIE, resolveAppLanguage, type AppLanguage } from "@/lib/i18n";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { language?: string };
    const resolved = resolveAppLanguage(body.language) as AppLanguage;

    const store = await cookies();
    store.set(APP_LANGUAGE_COOKIE, resolved, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false
    });

    return NextResponse.json({ ok: true, language: resolved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to set language" },
      { status: 400 }
    );
  }
}
