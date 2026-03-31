export function formatInr(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function looksLikeMoneyField(label: string) {
  const key = label.toLowerCase();
  return (
    key.includes("amount") ||
    key.includes("due") ||
    key.includes("paid") ||
    key.includes("fee") ||
    key.includes("income") ||
    key.includes("expense") ||
    key.includes("collection") ||
    key.includes("balance") ||
    key.includes("total")
  );
}
