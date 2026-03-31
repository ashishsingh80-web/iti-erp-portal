import Link from "next/link";
import { redirect } from "next/navigation";
import { ParentLoginForm } from "@/components/auth/parent-login-form";
import { getCurrentParentUser } from "@/lib/parent-auth";

export default async function ParentLoginPage() {
  const parent = await getCurrentParentUser();

  if (parent) {
    redirect("/parent-portal");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface rounded-[2rem] bg-gradient-to-br from-slate-950 via-orange-900 to-emerald-500 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-white/75">Parent Portal Access</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold tracking-tight">
            Parents can view their child’s fee, scholarship, PRN / SCVT, and exam progress from one portal.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/85">
            This first version uses the student code and parent mobile number already stored in the admission record.
          </p>
          <div className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-5 text-sm text-white/90">
            Parent login uses:
            <div className="mt-3 space-y-1 font-semibold">
              <p>Student Code</p>
              <p>Parent Mobile Number</p>
            </div>
          </div>
        </section>

        <section className="surface p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Parent Sign In</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Parent Portal Login</h2>
          <p className="mt-2 text-sm text-slate-600">Use your child’s record details to continue.</p>
          <div className="mt-6">
            <ParentLoginForm />
          </div>
          <div className="mt-6 space-y-2 text-sm text-slate-600">
            <div>
              Student portal:
              {" "}
              <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/student-login">
                Open student login
              </Link>
            </div>
            <div>
              Staff portal:
              {" "}
              <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/login">
                Open staff login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
