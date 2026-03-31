import Link from "next/link";

type ModuleCardProps = {
  title: string;
  description: string;
  highlights: string[];
  href?: string;
};

export function ModuleCard({ title, description, highlights, href }: ModuleCardProps) {
  return (
    <article className="surface p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Portal Module</p>
          <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-900">{title}</h3>
        </div>
        {href ? (
          <Link
            className="chip-success border border-emerald-200 uppercase tracking-[0.16em] transition hover:bg-emerald-100"
            href={href as never}
          >
            Open
          </Link>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {highlights.map((item) => (
          <span key={item} className="chip-success">
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}
