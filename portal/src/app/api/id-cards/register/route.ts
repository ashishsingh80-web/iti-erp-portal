import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listIdCardRegisterEntries } from "@/lib/id-card-register";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "id-cards", "view");

    const url = new URL(request.url);
    const registerSearch = url.searchParams.get("registerSearch") || "";
    const registerType = url.searchParams.get("registerType") || "";
    const registerScope = url.searchParams.get("registerScope") || "all";
    const registerStatus = url.searchParams.get("registerStatus") || "";
    const registerReplacementStatus = url.searchParams.get("registerReplacementStatus") || "";

    const rows = await listIdCardRegisterEntries({
      entityType: registerType === "student" || registerType === "staff" ? registerType : "",
      search: registerSearch,
      reissueOnly: registerScope === "reissue",
      status: registerStatus === "ACTIVE" || registerStatus === "CANCELLED" || registerStatus === "REPLACED" ? registerStatus : "",
      replacementStatus:
        registerReplacementStatus === "NONE" || registerReplacementStatus === "REQUESTED" || registerReplacementStatus === "APPROVED"
          ? registerReplacementStatus
          : ""
    });

    const csv = [
      [
        "Type",
        "Card Number",
        "Code",
        "Name",
        "Status",
        "Status Note",
        "Status Updated At",
        "Status Updated By",
        "Issue Version",
        "Print Count",
        "First Printed",
        "Last Printed",
        "Latest Reason",
        "Printed By",
        "Replacement Status",
        "Replacement Requested At",
        "Replacement Requested By",
        "Replacement Reason",
        "Replacement Fee",
        "Replacement Payment Mode",
        "Replacement Reference No",
        "Replacement Approved At",
        "Replacement Approved By",
        "Replacement Receipt No",
        "Replacement Fee Posted At",
        "Replacement Fee Posted By"
      ],
      ...rows.map((entry) => [
        entry.entityType,
        entry.cardNumber,
        entry.code,
        entry.fullName,
        entry.status,
        entry.statusNote,
        entry.statusUpdatedAt,
        entry.statusUpdatedBy,
        `V${entry.issueVersion}`,
        String(entry.printCount),
        entry.firstPrintedAt,
        entry.lastPrintedAt,
        entry.lastReason,
        entry.lastPrintedBy,
        entry.replacementStatus,
        entry.replacementRequestedAt,
        entry.replacementRequestedBy,
        entry.replacementReason,
        entry.replacementFee,
        entry.replacementPaymentMode,
        entry.replacementReferenceNo,
        entry.replacementApprovedAt,
        entry.replacementApprovedBy,
        entry.replacementReceiptNumber,
        entry.replacementFeePostedAt,
        entry.replacementFeePostedBy
      ])
    ]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="id-card-register.csv"'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to export ID card register." },
      { status: 400 }
    );
  }
}
