export function DashboardInsightsSkeleton() {
  return (
    <section className="surface animate-pulse p-6">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-64 rounded bg-slate-200" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-slate-100" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-slate-100" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 rounded-3xl bg-slate-100" />
        ))}
      </div>
    </section>
  );
}
