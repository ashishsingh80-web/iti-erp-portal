import { NextResponse } from "next/server";
import { ScholarshipStatus } from "@prisma/client";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "scholarship", "view");
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get("search") || "").trim();
    const status = String(searchParams.get("status") || "").trim();
    const session = String(searchParams.get("session") || "").trim();
    const yearLabel = String(searchParams.get("yearLabel") || "").trim();
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(100, Math.max(Number(searchParams.get("pageSize") || "25"), 10));

    const where = {
      ...(status ? { status: status as ScholarshipStatus } : {}),
      ...(session || yearLabel || search
        ? {
            student: {
              ...(session ? { session } : {}),
              ...(yearLabel ? { yearLabel } : {}),
              ...(search
                ? {
                    OR: [
                      { fullName: { contains: search, mode: "insensitive" as const } },
                      { studentCode: { contains: search, mode: "insensitive" as const } },
                      { mobile: { contains: search, mode: "insensitive" as const } }
                    ]
                  }
                : {})
            }
          }
        : {})
    };

    const [rows, total, grouped] = await Promise.all([
      prisma.scholarshipRecord.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              fullName: true,
              mobile: true,
              session: true,
              yearLabel: true,
              institute: { select: { instituteCode: true, name: true } },
              trade: { select: { name: true } }
            }
          }
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.scholarshipRecord.count({ where }),
      prisma.scholarshipRecord.groupBy({
        by: ["status"],
        _count: { _all: true }
      })
    ]);

    return NextResponse.json({
      ok: true,
      rows,
      counts: grouped.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {}),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load scholarship queue" },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
