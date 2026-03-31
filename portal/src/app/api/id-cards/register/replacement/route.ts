import { NextResponse } from "next/server";
import { AccountEntryType } from "@prisma/client";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { approveIdCardReplacement, cancelIdCardReplacement, getIdCardRegisterEntry, requestIdCardReplacement } from "@/lib/id-card-register";
import { reserveGeneratedCode } from "@/lib/numbering-config";
import { prisma } from "@/lib/prisma";
import { isAccountsDateClosed } from "@/lib/services/accounts-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "id-cards", "view");

    const payload = (await request.json()) as {
      action?: "request" | "approve" | "cancel";
      entityType?: "student" | "staff";
      entityId?: string;
      reason?: string;
      fee?: string;
      paymentMode?: string;
      referenceNo?: string;
    };

    if (!payload.action || !payload.entityType || !payload.entityId) {
      return NextResponse.json({ ok: false, message: "Action, entity type, and entity id are required." }, { status: 400 });
    }

    if (payload.action === "request") {
      if (!payload.reason?.trim()) {
        return NextResponse.json({ ok: false, message: "Replacement reason is required." }, { status: 400 });
      }
      const entry = await requestIdCardReplacement({
        entityType: payload.entityType,
        entityId: payload.entityId,
        reason: payload.reason,
        fee: payload.fee || "",
        paymentMode: payload.paymentMode || "",
        referenceNo: payload.referenceNo || "",
        requestedBy: user.name || user.email
      });
      return NextResponse.json({ ok: true, entry });
    }

    if (payload.action === "cancel") {
      const entry = await cancelIdCardReplacement({
        entityType: payload.entityType,
        entityId: payload.entityId,
        cancelledBy: user.name || user.email
      });
      return NextResponse.json({ ok: true, entry });
    }

    const existing = await getIdCardRegisterEntry(payload.entityType, payload.entityId);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "ID card register entry not found." }, { status: 404 });
    }

    const replacementFee = Number(existing.replacementFee || 0);
    let feePostedAt = "";
    let replacementReceiptNumber = existing.replacementReceiptNumber || "";
    if (replacementFee > 0 && !existing.replacementFeePostedAt) {
      const entryDate = new Date();
      if (await isAccountsDateClosed(entryDate)) {
        return NextResponse.json({ ok: false, message: "Today is already closed in accounts, so replacement approval cannot post the fee." }, { status: 400 });
      }
      replacementReceiptNumber =
        existing.replacementReceiptNumber ||
        (await reserveGeneratedCode("receipt", {
          date: entryDate
        }));

      await prisma.accountEntry.create({
        data: {
          entryType: AccountEntryType.INCOME,
          category: "OTHER_INCOME",
          head: "OTHER_INCOME",
          subHead: "ID_CARD_REPLACEMENT",
          partyName: `${existing.code} • ${existing.fullName}`,
          amount: replacementFee,
          paymentMode: existing.replacementPaymentMode || "CASH",
          referenceNo: existing.replacementReferenceNo || null,
          note: `ID card replacement fee for ${existing.fullName} (${replacementReceiptNumber})`,
          entryDate,
          createdById: user.id
        }
      });

      feePostedAt = entryDate.toISOString();
    }

    const entry = await approveIdCardReplacement({
      entityType: payload.entityType,
      entityId: payload.entityId,
      approvedBy: user.name || user.email,
      replacementReceiptNumber,
      feePostedAt,
      feePostedBy: feePostedAt ? user.name || user.email : ""
    });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to process replacement workflow." },
      { status: 400 }
    );
  }
}
