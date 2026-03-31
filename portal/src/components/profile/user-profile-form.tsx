"use client";

import { useMemo, useState } from "react";
import type { Gender, UserRole } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/toast";

type UserProfileFormProps = {
  initialProfile: {
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
  };
};

export function UserProfileForm({ initialProfile }: UserProfileFormProps) {
  const [name, setName] = useState(initialProfile.name);
  const [fatherName, setFatherName] = useState(initialProfile.fatherName || "");
  const [motherName, setMotherName] = useState(initialProfile.motherName || "");
  const [spouseName, setSpouseName] = useState(initialProfile.spouseName || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile.dateOfBirth || "");
  const [gender, setGender] = useState(initialProfile.gender || "");
  const [mobile, setMobile] = useState(initialProfile.mobile || "");
  const [emergencyContact, setEmergencyContact] = useState(initialProfile.emergencyContact || "");
  const [designation, setDesignation] = useState(initialProfile.designation || "");
  const [addressLine, setAddressLine] = useState(initialProfile.addressLine || "");
  const [password, setPassword] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialProfile.photoUrl);
  const [saving, setSaving] = useState(false);

  const genderOptions = useMemo(
    () => [
      { label: "Male", value: "MALE" },
      { label: "Female", value: "FEMALE" },
      { label: "Other", value: "OTHER" }
    ],
    []
  );

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    if (!file) {
      setPreviewUrl(initialProfile.photoUrl);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("fatherName", fatherName);
    formData.append("motherName", motherName);
    formData.append("spouseName", spouseName);
    formData.append("dateOfBirth", dateOfBirth);
    formData.append("gender", gender);
    formData.append("mobile", mobile);
    formData.append("emergencyContact", emergencyContact);
    formData.append("designation", designation);
    formData.append("addressLine", addressLine);
    formData.append("password", password);
    if (photoFile) {
      formData.append("photoFile", photoFile);
    }

    const response = await fetch("/api/profile", {
      method: "PUT",
      body: formData
    });

    const result = await response.json();
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Profile not updated",
        message: result?.message || "Unable to update profile"
      });
      setSaving(false);
      return;
    }

    setPassword("");
    if (result?.profile?.photoUrl) {
      setPreviewUrl(result.profile.photoUrl);
    }
    showToast({
      kind: "success",
      title: "Profile updated",
      message: "Your profile details are saved."
    });
    setSaving(false);
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]" onSubmit={(event) => void handleSubmit(event)}>
      <section className="surface p-6">
        <p className="eyebrow-compact">Profile Photo</p>
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 text-5xl font-semibold text-slate-500">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={name} className="h-full w-full object-cover" src={previewUrl} />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-900">{name}</p>
          <p className="mt-1 text-sm text-slate-500">{initialProfile.email}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{initialProfile.role.replaceAll("_", " ")}</p>
        </div>
        <div className="mt-6">
          <Input
            accept="image/*"
            helperText="Optional. JPG, PNG, or WebP."
            label="Upload Photo"
            onChange={(event) => handlePhotoChange(event.target.files?.[0] || null)}
            type="file"
          />
        </div>
      </section>

      <div className="grid gap-6">
        <section className="surface p-6">
          <p className="eyebrow-compact">Basic Details</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Full Name" required value={name} onChange={(event) => setName(event.target.value)} />
            <Input disabled helperText="Read only" label="Email" value={initialProfile.email} />
            <Input label="Father Name" helperText="Optional" value={fatherName} onChange={(event) => setFatherName(event.target.value)} />
            <Input label="Mother Name" helperText="Optional" value={motherName} onChange={(event) => setMotherName(event.target.value)} />
            <Input label="Spouse Name" helperText="Optional" value={spouseName} onChange={(event) => setSpouseName(event.target.value)} />
            <Input label="Date of Birth" helperText="Optional" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
            <Select label="Gender" helperText="Optional" options={genderOptions} value={gender} onChange={(event) => setGender(event.target.value)} />
            <Input label="Designation" helperText="Optional" value={designation} onChange={(event) => setDesignation(event.target.value)} />
          </div>
        </section>

        <section className="surface p-6">
          <p className="eyebrow-compact">Contact Details</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Mobile Number" helperText="Optional" value={mobile} onChange={(event) => setMobile(event.target.value)} />
            <Input label="Emergency Contact" helperText="Optional" value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} />
          </div>
          <div className="mt-4">
            <Textarea
              helperText="Optional"
              label="Address"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
            />
          </div>
        </section>

        <section className="surface p-6">
          <p className="eyebrow-compact">Security</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input
              helperText="Optional. Fill only if you want to change the password."
              label="New Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button className="btn-primary min-w-[180px]" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
