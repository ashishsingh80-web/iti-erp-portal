import { formatInr, looksLikeMoneyField } from "@/lib/currency";
import { formatEnumLabel } from "@/lib/display";
import { type AppLanguage, t } from "@/lib/i18n";

/**
 * Formats a report cell for CSV export. English leaves values as stored (stable for integrations);
 * Hindi applies the same enum/money/“All” rules as the reports table UI.
 */
export function formatReportCsvCell(lang: AppLanguage, header: string, value: string | undefined | null): string {
  const raw = String(value ?? "").trim();
  if (lang === "en") {
    return raw;
  }

  if (looksLikeMoneyField(header)) {
    const numeric = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(numeric)) {
      return raw;
    }
    return formatInr(numeric);
  }

  if (!raw) {
    return "";
  }
  if (raw === "All") {
    return t(lang, "All");
  }
  if (/^[A-Z][A-Z0-9_]*$/.test(raw)) {
    return t(lang, formatEnumLabel(raw));
  }

  return raw;
}
