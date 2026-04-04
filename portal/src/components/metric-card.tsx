import Link from "next/link";
import type { Route } from "next";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  /** When set, the whole card links to the relevant module or filtered view. */
  href?: string;
};

export function MetricCard({ label, value, helper, href }: MetricCardProps) {
  const body = (
    <>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-400" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-compact">{label}</p>
          <div className="mt-3 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
            {value}
          </div>
        </div>
        <span className="chip-neutral text-[11px] uppercase tracking-[0.16em]">
          {href ? "Open →" : "Live"}
        </span>
      </div>
      {helper ? <p className="mt-3 max-w-[20rem] text-xs leading-5 text-slate-500">{helper}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href as Route} className="surface relative block overflow-hidden p-5 transition hover:ring-2 hover:ring-emerald-500/30">
        {body}
      </Link>
    );
  }

  return <article className="surface relative overflow-hidden p-5">{body}</article>;
}
