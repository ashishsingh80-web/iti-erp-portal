import Link from "next/link";
import type { StageBoardData } from "@/lib/services/module-stage-service";

function toneClass(tone: StageBoardData["metrics"][number]["tone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  if (tone === "danger") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export function StageBoard({ board }: { board: StageBoardData }) {
  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Live Module Board</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{board.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{board.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {board.metrics.map((metric) => (
          metric.href ? (
            <Link key={metric.label} className="rounded-3xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-sm" href={metric.href as never}>
              <div className="flex items-start justify-between gap-3">
                <p className="eyebrow-compact">{metric.label}</p>
                <span className="chip-neutral text-[10px] uppercase tracking-[0.16em]">
                  Queue
                </span>
              </div>
              <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass(metric.tone)}`}>
                {metric.tone || "live"}
              </span>
            </Link>
          ) : (
            <article key={metric.label} className="rounded-3xl border border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="eyebrow-compact">{metric.label}</p>
                <span className="chip-neutral text-[10px] uppercase tracking-[0.16em]">
                  Live
                </span>
              </div>
              <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass(metric.tone)}`}>
                {metric.tone || "live"}
              </span>
            </article>
          )
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {board.rows.length ? (
          board.rows.map((row) => (
            <article key={row.id} className="rounded-3xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {row.href ? (
                    <Link className="font-semibold text-emerald-800 hover:underline" href={row.href as never}>
                      {row.primary}
                    </Link>
                  ) : (
                    <p className="font-semibold text-slate-900">{row.primary}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-700">{row.secondary}</p>
                  {row.tertiary ? <p className="mt-1 text-xs text-slate-500">{row.tertiary}</p> : null}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {row.status}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No current records in this stage board</p>
            <p className="mt-2 text-sm text-slate-500">As new cases enter this workflow, they will appear here automatically.</p>
          </div>
        )}
      </div>
    </section>
  );
}
