export function DashboardOperationsSkeleton() {
  return (
    <div className="grid gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="surface h-48 animate-pulse rounded-3xl bg-slate-50 p-6">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="mt-6 h-24 rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
