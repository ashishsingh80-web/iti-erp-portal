import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentProfile } from "@/lib/services/student-service";

const STUDENT_SESSION_COOKIE = "iti_erp_student_session";
const AUTH_SECRET = process.env.AUTH_SECRET;
const AUTH_SECRET_EFFECTIVE = AUTH_SECRET || "iti-erp-dev-secret";
if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET must be set in production");
}

type StudentSessionPayload = {
  studentId: string;
  iat: number;
  exp: number;
};

export type StudentPortalUser = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  instituteCode: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  mobile: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", AUTH_SECRET_EFFECTIVE).update(value).digest("base64url");
}

function createStudentSessionToken(studentId: string) {
  const issuedAt = Date.now();
  const payload: StudentSessionPayload = {
    studentId,
    iat: issuedAt,
    exp: issuedAt + 1000 * 60 * 60 * 12
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function parseStudentSessionToken(token: string): StudentSessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (signValue(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as StudentSessionPayload;
    if (!payload.studentId || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function formatIsoDate(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export async function setStudentSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearStudentSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function authenticateStudent(studentCode: string, dateOfBirth: string) {
  const normalizedCode = studentCode.trim().toUpperCase();
  const student = await prisma.student.findFirst({
    where: {
      studentCode: normalizedCode,
      deletedAt: null
    },
    include: {
      institute: true,
      trade: true
    }
  });

  if (!student || !student.dateOfBirth) {
    throw new Error("Invalid student code or date of birth");
  }

  const studentDob = formatIsoDate(student.dateOfBirth);
  if (studentDob !== dateOfBirth.trim()) {
    throw new Error("Invalid student code or date of birth");
  }

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      instituteName: student.institute.name,
      instituteCode: student.institute.instituteCode,
      tradeName: student.trade.name,
      session: student.session,
      yearLabel: student.yearLabel,
      mobile: student.mobile
    },
    sessionToken: createStudentSessionToken(student.id)
  };
}

export async function getCurrentStudentUser(): Promise<StudentPortalUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = parseStudentSessionToken(token);
  if (!payload) return null;

  const profile = await getStudentProfile(payload.studentId);
  if (!profile) return null;

  return {
    id: profile.id,
    studentCode: profile.studentCode,
    fullName: profile.fullName,
    instituteName: profile.instituteName,
    instituteCode: profile.instituteCode,
    tradeName: profile.tradeName,
    session: profile.session,
    yearLabel: profile.yearLabel,
    mobile: profile.mobile
  };
}

export async function requireStudentUser() {
  const student = await getCurrentStudentUser();
  if (!student) {
    redirect("/student-login");
  }
  return student;
}
