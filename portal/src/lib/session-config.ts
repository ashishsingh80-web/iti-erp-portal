import { prisma } from "@/lib/prisma";

export type SessionConfig = {
  activeOneYearSession: string;
  activeTwoYearSession: string;
  updatedAt: string | null;
};

export function normalizeSessionLabel(value?: string | null) {
  const raw = String(value || "").trim();
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
  const shortVariant =
    parts.length === 2 && parts[0].length >= 4
      ? `${parts[0].slice(-2)}-${parts[1].slice(-2)}`
      : "";

  return Array.from(new Set([raw, normalized, shortVariant].filter(Boolean)));
}

function toTwoDigitYear(year: number) {
  return String(year).slice(-2);
}

export function buildDefaultSessionConfig(date = new Date()): SessionConfig {
  const month = date.getMonth() + 1;
  const baseYear = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  const oneYearStart = toTwoDigitYear(baseYear);
  const oneYearEnd = toTwoDigitYear(baseYear + 1);
  const twoYearEnd = toTwoDigitYear(baseYear + 2);

  return {
    activeOneYearSession: normalizeSessionLabel(`${oneYearStart}-${oneYearEnd}`),
    activeTwoYearSession: normalizeSessionLabel(`${oneYearStart}-${twoYearEnd}`),
    updatedAt: null
  };
}

async function loadSessionConfig(): Promise<SessionConfig> {
  try {
    const latest = await prisma.auditLog.findFirst({
      where: {
        module: "SETTINGS",
        action: "SESSION_CONFIG_UPDATED"
      },
      orderBy: { createdAt: "desc" },
      select: { metadataJson: true, createdAt: true }
    });
    const parsed = latest?.metadataJson ? (JSON.parse(latest.metadataJson) as Partial<SessionConfig>) : null;
    const fallback = buildDefaultSessionConfig();

    return {
      activeOneYearSession:
        typeof parsed?.activeOneYearSession === "string" && parsed.activeOneYearSession.trim()
          ? normalizeSessionLabel(parsed.activeOneYearSession)
          : fallback.activeOneYearSession,
      activeTwoYearSession:
        typeof parsed?.activeTwoYearSession === "string" && parsed.activeTwoYearSession.trim()
          ? normalizeSessionLabel(parsed.activeTwoYearSession)
          : fallback.activeTwoYearSession,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : latest?.createdAt?.toISOString() || null
    };
  } catch {
    return buildDefaultSessionConfig();
  }
}

export async function readSessionConfig() {
  return loadSessionConfig();
}

export async function saveSessionConfig(input: Omit<SessionConfig, "updatedAt">) {
  const payload: SessionConfig = {
    activeOneYearSession: normalizeSessionLabel(input.activeOneYearSession),
    activeTwoYearSession: normalizeSessionLabel(input.activeTwoYearSession),
    updatedAt: new Date().toISOString()
  };

  await prisma.auditLog.create({
    data: {
      module: "SETTINGS",
      action: "SESSION_CONFIG_UPDATED",
      metadataJson: JSON.stringify(payload)
    }
  });

  return payload;
}
