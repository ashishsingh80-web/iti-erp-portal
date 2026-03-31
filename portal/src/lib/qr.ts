export function buildQrImageUrl(value: string, size = 160) {
  const safeValue = encodeURIComponent(value.trim());
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${safeValue}`;
}
