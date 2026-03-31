import { formatEnumLabel } from "@/lib/display";

type StatusBadgeProps = {
  status: string;
  prefix?: string;
  className?: string;
};

function normalizeStatus(status: string) {
  return status.trim().toUpperCase().replace(/\s+/g, "_");
}

function toneForStatus(status: string) {
  const normalized = normalizeStatus(status);

  if (["VERIFIED", "APPROVED", "COMPLETED", "PAID", "ACTIVE", "READY"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (["IN_PROGRESS", "UNDER_REVIEW", "UNDER_PROCESS", "PARTIAL", "DRAFT", "GENERATED"].includes(normalized)) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (["PENDING", "UNPAID", "INCOMPLETE", "NOT_APPLIED", "QUERY_BY_DEPARTMENT"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["REJECTED", "OVERDUE"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function StatusBadge({ status, prefix, className = "" }: StatusBadgeProps) {
  const label = formatEnumLabel(status) || status;

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.12em] ${toneForStatus(status)} ${className}`.trim()}
    >
      {prefix ? `${prefix}: ${label}` : label}
    </span>
  );
}
