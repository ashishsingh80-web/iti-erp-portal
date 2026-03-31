type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <article className="surface relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-400" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-compact">{label}</p>
          <div className="mt-3 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
            {value}
          </div>
        </div>
        <span className="chip-neutral text-[11px] uppercase tracking-[0.16em]">
          Live
        </span>
      </div>
      {helper ? <p className="mt-3 max-w-[20rem] text-xs leading-5 text-slate-500">{helper}</p> : null}
    </article>
  );
}
