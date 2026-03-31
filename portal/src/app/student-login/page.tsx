import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentLoginForm } from "@/components/auth/student-login-form";
import { getCurrentStudentUser } from "@/lib/student-auth";

export default async function StudentLoginPage() {
  const student = await getCurrentStudentUser();

  if (student) {
    redirect("/student-portal");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-emerald-500 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-white/75">Student Portal Access</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold tracking-tight">
            View your own fee, scholarship, exam, and institute status from one student login.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/85">
            This first version uses your student code and date of birth to open your student portal safely.
          </p>
          <div className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-5 text-sm text-white/90">
            Student login uses:
            <div className="mt-3 space-y-1 font-semibold">
              <p>Student Code</p>
              <p>Date of Birth</p>
            </div>
          </div>
        </section>

        <section className="surface p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Student Sign In</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Student Portal Login</h2>
          <p className="mt-2 text-sm text-slate-600">Use your own student details to continue.</p>
          <div className="mt-6">
            <StudentLoginForm />
          </div>
          <div className="mt-6 space-y-2 text-sm text-slate-600">
            <div>
              Parent portal:
              {" "}
              <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/parent-login">
                Open parent login
              </Link>
            </div>
            <div>
              Staff login:
              {" "}
              <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/login">
                Open staff portal
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
