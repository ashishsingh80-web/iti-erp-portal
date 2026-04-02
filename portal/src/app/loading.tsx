export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-40 rounded-[2rem] bg-slate-200/80 md:h-48" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-[2rem] bg-slate-100" />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="h-80 rounded-[2rem] bg-slate-100" />
        <div className="h-80 rounded-[2rem] bg-slate-100" />
      </div>
    </div>
  );
}
