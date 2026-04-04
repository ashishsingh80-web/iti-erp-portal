/**
 * Shared CSV parsing and header/value resolution for bulk imports.
 * Handles UTF-8 BOM, spaces, and common header variants (e.g. "Trade Code" vs tradeCode).
 */

export type CsvRow = Record<string, string>;

export function normalizeCsvHeaderKey(key: string): string {
  return key
    .replace(/^\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\.\u200B]+/g, "");
}

/** Returns the first non-empty value among columns matching `keys` (in order — earlier keys win). */
export function pickCsvField(row: CsvRow, keys: string[]): string {
  const normalizedWanted = keys.map((k) => normalizeCsvHeaderKey(k));
  for (const want of normalizedWanted) {
    for (const [rawKey, val] of Object.entries(row)) {
      if (normalizeCsvHeaderKey(rawKey) === want && typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
  }
  return "";
}

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some((item) => item.length)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((item) => item.length)) rows.push(row);

  if (!rows.length) return [];

  const headers = rows[0].map((item) => item.replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((items) => {
    const output: CsvRow = {};
    headers.forEach((header, headerIndex) => {
      output[header] = items[headerIndex]?.trim() || "";
    });
    return output;
  });
}
