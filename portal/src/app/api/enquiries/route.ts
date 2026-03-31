import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createEnquiry, listEnquiries } from "@/lib/services/enquiry-service";
import { enquiryPayloadSchema } from "@/lib/validations/enquiry";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "enquiry", "view");

    const url = new URL(request.url);
    const result = await listEnquiries({
      search: url.searchParams.get("search") || "",
      status: url.searchParams.get("status") || ""
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to load enquiries");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "enquiry", "add");

    const payload = enquiryPayloadSchema.parse(await request.json());
    const enquiry = await createEnquiry({
      ...payload,
      createdById: user.id
    });

    return NextResponse.json({
      ok: true,
      enquiry: {
        id: enquiry.id,
        fullName: enquiry.fullName,
        status: enquiry.status
      }
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to create enquiry");
  }
}
