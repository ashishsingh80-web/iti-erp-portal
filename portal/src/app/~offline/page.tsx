import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline | ITI ERP Portal"
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">No connection</p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-slate-900">You are offline</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        This page is not available without internet. Check your connection and try again.
      </p>
      <Link
        className="mt-8 rounded-2xl bg-emerald-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
        href="/"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
