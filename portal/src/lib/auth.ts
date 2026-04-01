import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Gender, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserInvalidBefore } from "@/lib/session-control";
import { getLoginLockState } from "@/lib/login-history";

const SESSION_COOKIE = "iti_erp_session";
const AUTH_SECRET = process.env.AUTH_SECRET;
const AUTH_SECRET_EFFECTIVE = AUTH_SECRET || "iti-erp-dev-secret";
if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET must be set in production");
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  fatherName: string | null;
  motherName: string | null;
  spouseName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  mobile: string | null;
  emergencyContact: string | null;
  designation: string | null;
  addressLine: string | null;
  photoUrl: string | null;
  role: UserRole;
  isActive: boolean;
  hasCustomModuleAccess: boolean;
  allowedModuleSlugs: string[];
  hasCustomActionAccess: boolean;
  allowedActionKeys: string[];
};

type SessionPayload = {
  userId: string;
  iat: number;
  exp: number;
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

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (derived.length !== original.length) return false;
  return timingSafeEqual(derived, original);
}

export function createSessionToken(userId: string) {
  const issuedAt = Date.now();
  const payload: SessionPayload = {
    userId,
    iat: issuedAt,
    exp: issuedAt + 1000 * 60 * 60 * 12
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (signValue(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) return null;
    if (!payload.iat) {
      payload.iat = 0;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function authenticateUser(email: string, password: string) {
  const lockState = await getLoginLockState(email);
  if (lockState?.lockedUntil && new Date(lockState.lockedUntil).getTime() > Date.now()) {
    throw new Error(`Account is temporarily locked until ${new Date(lockState.lockedUntil).toLocaleString("en-IN")}`);
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase()
    }
  });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }

  const sessionToken = createSessionToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      fatherName: user.fatherName,
      motherName: user.motherName,
      spouseName: user.spouseName,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      gender: user.gender,
      mobile: user.mobile,
      emergencyContact: user.emergencyContact,
      designation: user.designation,
      addressLine: user.addressLine,
      photoUrl: user.photoUrl,
      role: user.role,
      isActive: user.isActive,
      hasCustomModuleAccess: user.hasCustomModuleAccess,
      allowedModuleSlugs: user.allowedModuleSlugs,
      hasCustomActionAccess: user.hasCustomActionAccess,
      allowedActionKeys: user.allowedActionKeys
    },
    sessionToken
  };
}

async function loadCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = parseSessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    }
  });

  if (!user || !user.isActive) return null;

  const invalidBefore = await getUserInvalidBefore(user.id);
  if (invalidBefore) {
    const invalidTimestamp = new Date(invalidBefore).getTime();
    if (Number.isFinite(invalidTimestamp) && payload.iat < invalidTimestamp) {
      return null;
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    fatherName: user.fatherName,
    motherName: user.motherName,
    spouseName: user.spouseName,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    gender: user.gender,
    mobile: user.mobile,
    emergencyContact: user.emergencyContact,
    designation: user.designation,
    addressLine: user.addressLine,
    photoUrl: user.photoUrl,
    role: user.role,
    isActive: user.isActive,
    hasCustomModuleAccess: user.hasCustomModuleAccess,
    allowedModuleSlugs: user.allowedModuleSlugs,
    hasCustomActionAccess: user.hasCustomActionAccess,
    allowedActionKeys: user.allowedActionKeys
  };
}

/** One DB read per request when layout + pages both need the user. */
export const getCurrentUser = cache(loadCurrentUser);

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
