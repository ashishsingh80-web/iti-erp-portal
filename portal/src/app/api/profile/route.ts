import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Gender } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function persistProfilePhoto(userId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const relativeDir = path.join("uploads", "users", userId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);

  return `/${relativeDir}/${safeName}`.replace(/\\/g, "/");
}

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!profile) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        fatherName: profile.fatherName,
        motherName: profile.motherName,
        spouseName: profile.spouseName,
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : "",
        gender: profile.gender,
        mobile: profile.mobile,
        emergencyContact: profile.emergencyContact,
        designation: profile.designation,
        addressLine: profile.addressLine,
        photoUrl: profile.photoUrl,
        role: profile.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load profile" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") || "";

    let payload:
      | {
          name: string | null;
          fatherName: string | null;
          motherName: string | null;
          spouseName: string | null;
          dateOfBirth: string | null;
          gender: string | null;
          mobile: string | null;
          emergencyContact: string | null;
          designation: string | null;
          addressLine: string | null;
          password: string | null;
          photoFile?: File | null;
        }
      | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = {
        name: normalizeText(formData.get("name")),
        fatherName: normalizeText(formData.get("fatherName")),
        motherName: normalizeText(formData.get("motherName")),
        spouseName: normalizeText(formData.get("spouseName")),
        dateOfBirth: normalizeText(formData.get("dateOfBirth")),
        gender: normalizeText(formData.get("gender")),
        mobile: normalizeText(formData.get("mobile")),
        emergencyContact: normalizeText(formData.get("emergencyContact")),
        designation: normalizeText(formData.get("designation")),
        addressLine: normalizeText(formData.get("addressLine")),
        password: normalizeText(formData.get("password")),
        photoFile: formData.get("photoFile") instanceof File ? (formData.get("photoFile") as File) : null
      };
    } else {
      const body = (await request.json()) as Record<string, string | null | undefined>;
      payload = {
        name: body.name?.trim() || null,
        fatherName: body.fatherName?.trim() || null,
        motherName: body.motherName?.trim() || null,
        spouseName: body.spouseName?.trim() || null,
        dateOfBirth: body.dateOfBirth?.trim() || null,
        gender: body.gender?.trim() || null,
        mobile: body.mobile?.trim() || null,
        emergencyContact: body.emergencyContact?.trim() || null,
        designation: body.designation?.trim() || null,
        addressLine: body.addressLine?.trim() || null,
        password: body.password?.trim() || null,
        photoFile: null
      };
    }

    if (!payload?.name) {
      return NextResponse.json({ ok: false, message: "Name is required" }, { status: 400 });
    }

    let photoUrl: string | undefined;
    if (payload.photoFile && payload.photoFile.size > 0) {
      photoUrl = await persistProfilePhoto(user.id, payload.photoFile);
    }

    const genderValue = payload.gender && payload.gender in Gender ? (payload.gender as Gender) : null;
    const dateOfBirth = normalizeDate(payload.dateOfBirth);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: payload.name,
        fatherName: payload.fatherName,
        motherName: payload.motherName,
        spouseName: payload.spouseName,
        dateOfBirth,
        gender: genderValue,
        mobile: payload.mobile,
        emergencyContact: payload.emergencyContact,
        designation: payload.designation,
        addressLine: payload.addressLine,
        ...(photoUrl ? { photoUrl } : {}),
        ...(payload.password ? { passwordHash: hashPassword(payload.password) } : {})
      }
    });

    return NextResponse.json({
      ok: true,
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        fatherName: updated.fatherName,
        motherName: updated.motherName,
        spouseName: updated.spouseName,
        dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString().slice(0, 10) : "",
        gender: updated.gender,
        mobile: updated.mobile,
        emergencyContact: updated.emergencyContact,
        designation: updated.designation,
        addressLine: updated.addressLine,
        photoUrl: updated.photoUrl,
        role: updated.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update profile" },
      { status: 400 }
    );
  }
}
