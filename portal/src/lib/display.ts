export function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "";

  return value
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
