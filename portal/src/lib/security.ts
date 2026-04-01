import { createCipheriv, createHash, randomBytes } from "crypto";

export function maskAadhaar(value: string) {
  const sanitized = value.replace(/\D/g, "");
  if (sanitized.length !== 12) return sanitized;
  return `XXXX-XXXX-${sanitized.slice(-4)}`;
}

/** Resolved when encrypt runs — not at import time — so `next build` can run without this env var. */
function getAadhaarKeyMaterial(): string {
  const key = process.env.AADHAAR_ENCRYPTION_KEY;
  if (!key && process.env.NODE_ENV === "production") {
    throw new Error("AADHAAR_ENCRYPTION_KEY must be set in production");
  }
  return key || "development-only-key";
}

export function encryptSensitiveValue(value: string) {
  const key = createHash("sha256").update(getAadhaarKeyMaterial()).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
