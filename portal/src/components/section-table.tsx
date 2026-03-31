type SectionTableProps = {
  title: string;
  headers: string[];
  rows: string[][];
};

export function SectionTable({ title, headers, rows }: SectionTableProps) {
  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-slate-200/70 px-6 py-5">
        <p className="eyebrow-compact">Reference Table</p>
        <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-6 py-4 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${rowIndex}-${cellIndex}`} className={`px-6 py-4 ${cellIndex === 0 ? "font-medium text-slate-900" : "text-slate-700"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
