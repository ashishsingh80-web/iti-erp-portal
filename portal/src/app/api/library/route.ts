import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createLibraryBook, listLibraryDeskData } from "@/lib/services/library-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "library", "view");
    const searchParams = new URL(request.url).searchParams;
    const data = await listLibraryDeskData(searchParams.get("search") || "", searchParams.get("category") || "");
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load library" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "library", "add");
    const body = (await request.json()) as {
      accessionNumber?: string;
      title?: string;
      authorName?: string;
      category?: string;
      publisherName?: string;
      editionLabel?: string;
      totalCopies?: string;
      shelfLocation?: string;
      note?: string;
      isActive?: boolean;
    };

    const book = await createLibraryBook(
      {
        accessionNumber: body.accessionNumber || "",
        title: body.title || "",
        authorName: body.authorName || "",
        category: body.category || "",
        publisherName: body.publisherName || "",
        editionLabel: body.editionLabel || "",
        totalCopies: body.totalCopies || "1",
        shelfLocation: body.shelfLocation || "",
        note: body.note || "",
        isActive: body.isActive ?? true
      },
      user.id
    );

    return NextResponse.json({ ok: true, book });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to create book" }, { status: 400 });
  }
}
