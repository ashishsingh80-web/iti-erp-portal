import { NextRequest, NextResponse } from "next/server";
import { getCertificateVerificationData } from "@/lib/services/certificate-service";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code") || "";
    if (!code.trim()) {
      return NextResponse.json({ ok: false, message: "Verification code is required" }, { status: 400 });
    }

    const certificate = await getCertificateVerificationData(code);
    if (!certificate) {
      return NextResponse.json({ ok: false, message: "Certificate not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, certificate });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to verify certificate" },
      { status: 400 }
    );
  }
}
