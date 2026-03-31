type MasterItem = {
  label: string;
  status: "live" | "next";
};

type MasterGroup = {
  key: string;
  title: string;
  description: string;
  status: string;
  tone: "success" | "warning" | "neutral";
  items: MasterItem[];
};

const masterGroups: MasterGroup[] = [
  {
    key: "institute-affiliation",
    title: "Institute & Affiliation",
    description: "Core institute identity, approval references, branding controls, and branch setup.",
    status: "Live + Next",
    tone: "warning",
    items: [
      { label: "Institute name", status: "live" },
      { label: "Campus / branch name", status: "live" },
      { label: "Address", status: "live" },
      { label: "Contact details", status: "live" },
      { label: "Affiliation details", status: "live" },
      { label: "NCVT / SCVT status", status: "live" },
      { label: "MIS / institute code", status: "live" },
      { label: "Logo / seal / signature settings", status: "live" }
    ]
  },
  {
    key: "academic-masters",
    title: "Academic Masters",
    description: "Session, trade, unit, batch, year, and shift/timing structure for daily operations.",
    status: "Live + Next",
    tone: "success",
    items: [
      { label: "Academic session master", status: "live" },
      { label: "Trade master", status: "live" },
      { label: "Unit / batch master", status: "next" },
      { label: "Shift / timing master", status: "next" }
    ]
  },
  {
    key: "student-masters",
    title: "Student Classification Masters",
    description: "Static selection masters that shape student admission, profile, and reporting data.",
    status: "Live + Next",
    tone: "warning",
    items: [
      { label: "Category master", status: "live" },
      { label: "Religion master", status: "live" },
      { label: "Caste master", status: "live" },
      { label: "Qualification master", status: "live" }
    ]
  },
  {
    key: "geography",
    title: "Geography Masters",
    description: "Location hierarchy used across admission, student profile, and reporting.",
    status: "Live + Next",
    tone: "success",
    items: [
      { label: "District / state master", status: "live" },
      { label: "Tehsil / block / ward master", status: "live" },
      { label: "Village / area suggestions", status: "next" }
    ]
  },
  {
    key: "finance-numbering",
    title: "Finance & Numbering",
    description: "Fee, scholarship, and system code controls that keep records consistent.",
    status: "Live + Next",
    tone: "success",
    items: [
      { label: "Fee head master", status: "live" },
      { label: "Scholarship scheme master", status: "live" },
      { label: "Receipt / code numbering", status: "live" }
    ]
  },
  {
    key: "documents-templates",
    title: "Documents & Templates",
    description: "Document master and print/template controls for undertakings and future certificates.",
    status: "Live + Next",
    tone: "success",
    items: [
      { label: "Document type master", status: "live" },
      { label: "Undertaking template master", status: "live" },
      { label: "Certificate / print branding", status: "next" }
    ]
  }
];

function toneClass(tone: "success" | "warning" | "neutral") {
  switch (tone) {
    case "success":
      return "chip-success";
    case "warning":
      return "chip-warning";
    default:
      return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700";
  }
}

function itemClass(status: "live" | "next") {
  return status === "live"
    ? "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700"
    : "rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700";
}

export function MasterControlPanel() {
  const liveCount = masterGroups.flatMap((group) => group.items).filter((item) => item.status === "live").length;
  const nextCount = masterGroups.flatMap((group) => group.items).filter((item) => item.status === "next").length;

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow-compact">Master Control</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Institute Setup Overview</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            This hub groups the settings area into the main control buckets. Live controls are already wired below, and the remaining masters stay visible so setup work remains organized.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip-success">{liveCount} live controls</span>
          <span className="chip-warning">{nextCount} next controls</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {masterGroups.map((group) => (
          <article key={group.key} className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow-compact">{group.title}</p>
                <p className="mt-2 text-sm text-slate-600">{group.description}</p>
              </div>
              <span className={toneClass(group.tone)}>{group.status}</span>
            </div>

            <div className="mt-4 grid gap-2">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">{item.label}</span>
                  <span className={itemClass(item.status)}>{item.status === "live" ? "Live" : "Next"}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
