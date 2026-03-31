import { createCipheriv, createHash, randomBytes } from "crypto";

export function maskAadhaar(value: string) {
  const sanitized = value.replace(/\D/g, "");
  if (sanitized.length !== 12) return sanitized;
  return `XXXX-XXXX-${sanitized.slice(-4)}`;
}

const AADHAAR_ENCRYPTION_KEY = process.env.AADHAAR_ENCRYPTION_KEY;
const AADHAAR_ENCRYPTION_KEY_EFFECTIVE = AADHAAR_ENCRYPTION_KEY || "development-only-key";
if (!AADHAAR_ENCRYPTION_KEY && process.env.NODE_ENV === "production") {
  throw new Error("AADHAAR_ENCRYPTION_KEY must be set in production");
}

export function encryptSensitiveValue(value: string) {
  const key = createHash("sha256").update(AADHAAR_ENCRYPTION_KEY_EFFECTIVE).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
