import { notFound } from "next/navigation";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <section className="surface flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="eyebrow-compact">Account</p>
          <h2 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-950">User Profile</h2>
          <p className="mt-2 text-sm text-slate-600">Manage your personal details, password, and profile photo.</p>
        </div>
        <span className="chip-success">{profile.role.replaceAll("_", " ")}</span>
      </section>

      <UserProfileForm
        initialProfile={{
          name: profile.name,
          email: profile.email,
          fatherName: profile.fatherName,
          motherName: profile.motherName,
          spouseName: profile.spouseName,
          dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : null,
          gender: profile.gender,
          mobile: profile.mobile,
          emergencyContact: profile.emergencyContact,
          designation: profile.designation,
          addressLine: profile.addressLine,
          photoUrl: profile.photoUrl,
          role: profile.role
        }}
      />
    </div>
  );
}
