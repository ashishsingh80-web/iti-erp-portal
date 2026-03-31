"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/toast";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@itierp.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        const nextError = result?.message || "Unable to log in";
        setError(nextError);
        showToast({ kind: "error", title: "Login failed", message: nextError });
        return;
      }

      showToast({ kind: "success", title: "Login successful", message: "Opening dashboard" });
      router.push("/");
      router.refresh();
    } catch (loginError) {
      const nextError = loginError instanceof Error ? loginError.message : "Unable to log in";
      setError(nextError);
      showToast({ kind: "error", title: "Login failed", message: nextError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Email"
        required
        autoComplete="username"
        errorText={error.toLowerCase().includes("email") ? error : ""}
        helperText="Use your assigned portal login."
        onChange={(event) => setEmail(event.target.value)}
        value={email}
      />
      <Input
        label="Password"
        required
        autoComplete="current-password"
        errorText={error.toLowerCase().includes("password") ? error : ""}
        helperText="Case-sensitive password."
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        value={password}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <button
        className="w-full rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
        disabled={loading}
        type="submit"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
