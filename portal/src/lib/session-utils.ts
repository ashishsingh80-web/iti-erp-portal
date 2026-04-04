/**
 * Pure (client-safe) helpers for normalizing session labels.
 * This file intentionally contains no `fs` imports so it can be used in client components.
 */

export function normalizeSessionLabel(value?: string | null) {
  const raw = String(value || "")
    .trim()
    .replace(/[\/–—]/g, "-"); // support `25/26` and `2025–26` style separators

  if (!raw) return "";

  const parts = raw
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 2) return raw;

  const leftDigits = parts[0].replace(/\D/g, "");
  const rightDigits = parts[1].replace(/\D/g, "");

  if (!leftDigits || !rightDigits) return raw;

  const left =
    leftDigits.length >= 4
      ? leftDigits.slice(0, 4)
      : `20${leftDigits.slice(-2)}`;

  const right = rightDigits.slice(-2);

  return `${left}-${right}`;
}

export function buildSessionVariants(value?: string | null) {
  const raw = String(value || "").trim();
  const normalized = normalizeSessionLabel(raw);
  const parts = normalized.split("-");

  // Legacy compatibility: some parts of the system historically stored sessions in short format like `25-26`.
  const shortVariant =
    parts.length === 2 && parts[0].length >= 4
      ? `${parts[0].slice(-2)}-${parts[1].slice(-2)}`
      : "";

  return Array.from(new Set([raw, normalized, shortVariant].filter(Boolean)));
}

