"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/toast";

export function ParentLoginForm() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/parent-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ studentCode, parentMobile })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const nextError = result?.message || "Unable to log in";
        setError(nextError);
        showToast({ kind: "error", title: "Parent login failed", message: nextError });
        return;
      }

      showToast({ kind: "success", title: "Login successful", message: "Opening parent portal" });
      router.push("/parent-portal");
      router.refresh();
    } catch (loginError) {
      const nextError = loginError instanceof Error ? loginError.message : "Unable to log in";
      setError(nextError);
      showToast({ kind: "error", title: "Parent login failed", message: nextError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        id="parent-login-student-code"
        name="studentCode"
        label="Student Code"
        required
        autoComplete="username"
        helperText="Enter your child's student code."
        onChange={(event) => setStudentCode(event.target.value.toUpperCase())}
        value={studentCode}
      />
      <Input
        id="parent-login-mobile"
        name="parentMobile"
        label="Parent Mobile"
        required
        helperText="Use the mobile number stored in the admission record."
        onChange={(event) => setParentMobile(event.target.value)}
        value={parentMobile}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <button className="w-full rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading} type="submit">
        {loading ? "Signing in..." : "Parent Sign In"}
      </button>
    </form>
  );
}
