"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/toast";

export function StudentLoginForm() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/student-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ studentCode, dateOfBirth })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const nextError = result?.message || "Unable to log in";
        setError(nextError);
        showToast({ kind: "error", title: "Student login failed", message: nextError });
        return;
      }

      showToast({ kind: "success", title: "Login successful", message: "Opening student portal" });
      router.push("/student-portal");
      router.refresh();
    } catch (loginError) {
      const nextError = loginError instanceof Error ? loginError.message : "Unable to log in";
      setError(nextError);
      showToast({ kind: "error", title: "Student login failed", message: nextError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Student Code"
        required
        autoComplete="username"
        helperText="Use your institute-issued student code."
        onChange={(event) => setStudentCode(event.target.value.toUpperCase())}
        value={studentCode}
      />
      <Input
        label="Date of Birth"
        required
        type="date"
        helperText="Match your admission record date of birth."
        onChange={(event) => setDateOfBirth(event.target.value)}
        value={dateOfBirth}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <button className="w-full rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading} type="submit">
        {loading ? "Signing in..." : "Student Sign In"}
      </button>
    </form>
  );
}
