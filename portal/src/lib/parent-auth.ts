import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentProfile } from "@/lib/services/student-service";

const PARENT_SESSION_COOKIE = "iti_erp_parent_session";
const AUTH_SECRET = process.env.AUTH_SECRET;
const AUTH_SECRET_EFFECTIVE = AUTH_SECRET || "iti-erp-dev-secret";
if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET must be set in production");
}

type ParentSessionPayload = {
  studentId: string;
  parentId: string;
  iat: number;
  exp: number;
};

export type ParentPortalUser = {
  studentId: string;
  parentId: string;
  studentCode: string;
  studentName: string;
  parentName: string;
  relation: string;
  instituteName: string;
  tradeName: string;
  session: string;
  yearLabel: string;
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

function createParentSessionToken(studentId: string, parentId: string) {
  const issuedAt = Date.now();
  const payload: ParentSessionPayload = {
    studentId,
    parentId,
    iat: issuedAt,
    exp: issuedAt + 1000 * 60 * 60 * 12
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function parseParentSessionToken(token: string): ParentSessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (signValue(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as ParentSessionPayload;
    if (!payload.studentId || !payload.parentId || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export async function setParentSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PARENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearParentSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PARENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function authenticateParent(studentCode: string, parentMobile: string) {
  const normalizedCode = studentCode.trim().toUpperCase();
  const normalizedMobile = normalizeMobile(parentMobile);

  const student = await prisma.student.findFirst({
    where: {
      studentCode: normalizedCode,
      deletedAt: null
    },
    include: {
      institute: true,
      trade: true,
      parents: true
    }
  });

  if (!student) {
    throw new Error("Invalid student code or parent mobile");
  }

  const parent = student.parents.find((item) => normalizeMobile(item.mobile || "") === normalizedMobile);
  if (!parent || !normalizedMobile) {
    throw new Error("Invalid student code or parent mobile");
  }

  return {
    parentUser: {
      studentId: student.id,
      parentId: parent.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      parentName: parent.name,
      relation: parent.relation,
      instituteName: student.institute.name,
      tradeName: student.trade.name,
      session: student.session,
      yearLabel: student.yearLabel
    },
    sessionToken: createParentSessionToken(student.id, parent.id)
  };
}

export async function getCurrentParentUser(): Promise<ParentPortalUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PARENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = parseParentSessionToken(token);
  if (!payload) return null;

  const profile = await getStudentProfile(payload.studentId);
  if (!profile || !profile.parent) return null;

  return {
    studentId: profile.id,
    parentId: payload.parentId,
    studentCode: profile.studentCode,
    studentName: profile.fullName,
    parentName: profile.parent.name,
    relation: profile.parent.relation,
    instituteName: profile.instituteName,
    tradeName: profile.tradeName,
    session: profile.session,
    yearLabel: profile.yearLabel
  };
}

export async function requireParentUser() {
  const parent = await getCurrentParentUser();
  if (!parent) {
    redirect("/parent-login");
  }
  return parent;
}
