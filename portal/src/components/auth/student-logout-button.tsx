"use client";

import { useRouter } from "next/navigation";

export function StudentLogoutButton({ className, label = "Logout" }: { className?: string; label?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/student-auth/logout", {
      method: "POST"
    });
    router.push("/student-login");
    router.refresh();
  }

  return (
    <button
      className={className || "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"}
      onClick={handleLogout}
      type="button"
    >
      {label}
    </button>
  );
}
