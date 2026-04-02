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
          <p className="text-xs uppercase tracking-[0.35em] text-white/75">BHB International School · School ERP</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold tracking-tight">
            Role-based staff portal for admissions, fees, academics, communication, and operations.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/85">
            Each desk signs in with its own access. Modules match your role (admission, finance, documents, and more).
          </p>
        </section>

        <section className="surface p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Sign In</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">School ERP · Staff login</h2>
          <p className="mt-2 text-sm text-slate-600">Use your desk credentials to continue.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
          {process.env.NODE_ENV === "development" ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">
                Local demo (run <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-800">npm run prisma:seed</code> first)
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-800">
                <span className="text-slate-500">Email</span> admin@bhb.local <span className="text-slate-400">or</span> admin@itierp.local
                <span className="mx-2 text-slate-400">·</span>
                <span className="text-slate-500">Password</span> Admin@123
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500">
                If login still fails, your database may have no users or an old hash — run{" "}
                <code className="rounded bg-white px-1 font-mono">npm run prisma:seed</code> in the project folder, then try again.
              </p>
            </div>
          ) : null}
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
