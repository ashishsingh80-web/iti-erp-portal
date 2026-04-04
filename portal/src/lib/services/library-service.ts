import { LibraryIssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export async function listLibraryDeskData(search = "", category = "") {
  const bookWhere: Prisma.LibraryBookWhereInput = {
    ...(category.trim() ? { category: { contains: category.trim(), mode: "insensitive" } } : {}),
    ...(search.trim()
      ? {
          OR: [
            { accessionNumber: { startsWith: search.trim(), mode: "insensitive" } },
            { title: { startsWith: search.trim(), mode: "insensitive" } },
            { authorName: { startsWith: search.trim(), mode: "insensitive" } },
            { shelfLocation: { startsWith: search.trim(), mode: "insensitive" } }
          ]
        }
      : {})
  };

  const studentWhere: Prisma.StudentWhereInput = {
    deletedAt: null,
    ...(search.trim()
      ? {
          OR: [
            { fullName: { startsWith: search.trim(), mode: "insensitive" } },
            { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
            { mobile: { startsWith: search.trim() } }
          ]
        }
      : {})
  };

  const [books, issues, students] = await Promise.all([
    prisma.libraryBook.findMany({
      where: bookWhere,
      include: {
        issues: {
          where: { status: LibraryIssueStatus.ISSUED }
        }
      },
      orderBy: [{ title: "asc" }],
      take: 100
    }),
    prisma.libraryIssue.findMany({
      where: {
        ...(category.trim() ? { book: { category: { contains: category.trim(), mode: "insensitive" } } } : {}),
        ...(search.trim()
          ? {
              OR: [
                { student: { fullName: { startsWith: search.trim(), mode: "insensitive" } } },
                { student: { studentCode: { startsWith: search.trim(), mode: "insensitive" } } },
                { book: { accessionNumber: { startsWith: search.trim(), mode: "insensitive" } } },
                { book: { title: { startsWith: search.trim(), mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        book: true,
        student: {
          include: {
            institute: true,
            trade: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 150
    }),
    prisma.student.findMany({
      where: studentWhere,
      include: {
        institute: true,
        trade: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  return {
    books: books.map((book) => ({
      id: book.id,
      accessionNumber: book.accessionNumber,
      title: book.title,
      authorName: book.authorName || "",
      category: book.category || "",
      publisherName: book.publisherName || "",
      editionLabel: book.editionLabel || "",
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      shelfLocation: book.shelfLocation || "",
      note: book.note || "",
      isActive: book.isActive,
      issuedCount: book.issues.length,
      availabilityStatus: book.availableCopies <= 0 ? "OUT" : book.availableCopies <= 1 ? "LOW" : "AVAILABLE"
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      bookId: issue.bookId,
      accessionNumber: issue.book.accessionNumber,
      bookTitle: issue.book.title,
      studentId: issue.studentId,
      studentCode: issue.student.studentCode,
      studentName: issue.student.fullName,
      instituteName: issue.student.institute.name,
      tradeName: issue.student.trade.name,
      issueDate: issue.issueDate.toISOString().slice(0, 10),
      expectedReturnDate: issue.expectedReturnDate ? issue.expectedReturnDate.toISOString().slice(0, 10) : "",
      returnDate: issue.returnDate ? issue.returnDate.toISOString().slice(0, 10) : "",
      status: issue.status,
      remark: issue.remark || ""
    })),
    students: students.map((student) => ({
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      instituteName: student.institute.name,
      tradeName: student.trade.name,
      session: student.session,
      yearLabel: student.yearLabel
    }))
  };
}

export async function createLibraryBook(
  payload: {
    accessionNumber: string;
    title: string;
    authorName?: string;
    category?: string;
    publisherName?: string;
    editionLabel?: string;
    totalCopies?: string;
    shelfLocation?: string;
    note?: string;
    isActive?: boolean;
  },
  userId?: string | null
) {
  if (!payload.accessionNumber.trim() || !payload.title.trim()) {
    throw new Error("Accession number and title are required");
  }

  const totalCopies = Number(payload.totalCopies || "1");
  if (!Number.isFinite(totalCopies) || totalCopies < 1) {
    throw new Error("Total copies must be at least 1");
  }

  const book = await prisma.libraryBook.create({
    data: {
      accessionNumber: payload.accessionNumber.trim().toUpperCase(),
      title: payload.title.trim(),
      authorName: payload.authorName?.trim() || null,
      category: payload.category?.trim() || null,
      publisherName: payload.publisherName?.trim() || null,
      editionLabel: payload.editionLabel?.trim() || null,
      totalCopies,
      availableCopies: totalCopies,
      shelfLocation: payload.shelfLocation?.trim() || null,
      note: payload.note?.trim() || null,
      isActive: payload.isActive ?? true
    }
  });

  await createAuditLog({
    userId,
    module: "library",
    action: "CREATE_BOOK",
    metadata: {
      accessionNumber: book.accessionNumber,
      title: book.title
    }
  });

  return book;
}

export async function issueLibraryBook(
  payload: {
    bookId: string;
    studentId: string;
    issueDate: string;
    expectedReturnDate?: string;
    remark?: string;
  },
  userId?: string | null
) {
  if (!payload.bookId || !payload.studentId || !payload.issueDate) {
    throw new Error("Book, student, and issue date are required");
  }

  return prisma.$transaction(async (tx) => {
    const book = await tx.libraryBook.findUnique({ where: { id: payload.bookId } });
    if (!book) throw new Error("Book not found");
    if (!book.isActive) throw new Error("Inactive books cannot be issued");
    if (book.availableCopies <= 0) throw new Error("No copy is currently available");

    const issue = await tx.libraryIssue.create({
      data: {
        bookId: payload.bookId,
        studentId: payload.studentId,
        issueDate: new Date(`${payload.issueDate}T00:00:00.000Z`),
        expectedReturnDate: payload.expectedReturnDate ? new Date(`${payload.expectedReturnDate}T00:00:00.000Z`) : null,
        remark: payload.remark?.trim() || null,
        issuedById: userId || null
      },
      include: {
        book: true
      }
    });

    await tx.libraryBook.update({
      where: { id: payload.bookId },
      data: { availableCopies: { decrement: 1 } }
    });

    await createAuditLog({
      userId,
      studentId: payload.studentId,
      module: "library",
      action: "ISSUE_BOOK",
      metadata: {
        accessionNumber: issue.book.accessionNumber,
        title: issue.book.title
      }
    });

    return issue;
  });
}

export async function returnLibraryIssue(
  payload: {
    issueId: string;
    returnDate: string;
    remark?: string;
  },
  userId?: string | null
) {
  if (!payload.issueId || !payload.returnDate) {
    throw new Error("Issue and return date are required");
  }

  return prisma.$transaction(async (tx) => {
    const issue = await tx.libraryIssue.findUnique({
      where: { id: payload.issueId },
      include: {
        book: true
      }
    });

    if (!issue) throw new Error("Library issue not found");
    if (issue.status === LibraryIssueStatus.RETURNED) throw new Error("This book has already been returned");

    const updated = await tx.libraryIssue.update({
      where: { id: payload.issueId },
      data: {
        returnDate: new Date(`${payload.returnDate}T00:00:00.000Z`),
        status: LibraryIssueStatus.RETURNED,
        returnedById: userId || null,
        remark: payload.remark?.trim() || issue.remark || null
      }
    });

    await tx.libraryBook.update({
      where: { id: issue.bookId },
      data: { availableCopies: { increment: 1 } }
    });

    await createAuditLog({
      userId,
      studentId: issue.studentId,
      module: "library",
      action: "RETURN_BOOK",
      metadata: {
        accessionNumber: issue.book.accessionNumber,
        title: issue.book.title
      }
    });

    return updated;
  });
}

export async function getPendingLibraryIssueCountsByStudentIds(studentIds: string[]) {
  if (!studentIds.length) return new Map<string, number>();

  const rows = await prisma.libraryIssue.groupBy({
    by: ["studentId"],
    where: {
      studentId: { in: studentIds },
      status: LibraryIssueStatus.ISSUED
    },
    _count: {
      _all: true
    }
  });

  return new Map(rows.map((row) => [row.studentId, row._count._all]));
}
