import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-900 to-orange-500 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-white/75">ITI ERP Secure Access</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold tracking-tight">
            Role-based portal for admissions, documents, finance, scholarship, and PRN / SCVT desks.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/85">
            Staff can now log in with their own portal access. Each role sees only the modules needed for that desk.
          </p>
        </section>

        <section className="surface p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Sign In</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Portal Login</h2>
          <p className="mt-2 text-sm text-slate-600">Use your desk credentials to continue.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
          <div className="mt-6 text-sm text-slate-600">
            Student portal:
            {" "}
            <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/student-login">
              Open student login
            </Link>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Parent portal:
            {" "}
            <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/parent-login">
              Open parent login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
