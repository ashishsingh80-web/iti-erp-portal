import { Prisma } from "@prisma/client";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export type NumberingKind = "student" | "agent" | "employee" | "receipt";

export type NumberingRule = {
  prefix: string;
  postfix: string;
  includeSession: boolean;
  startNumber: number;
  nextNumber: number;
  padLength: number;
  separator: string;
};

export type NumberingConfig = {
  student: NumberingRule;
  agent: NumberingRule;
  employee: NumberingRule;
  receipt: NumberingRule;
  updatedAt: string | null;
};

export type NumberingContext = {
  session?: string | null;
  institute?: string | null;
  trade?: string | null;
  date?: Date | null;
};

const STORE_ID = "default";
const numberingConfigPath = path.join(process.cwd(), "data", "numbering-config.json");
let reserveQueue: Promise<void> = Promise.resolve();

/** Vercel serverless filesystem under /var/task is read-only — never use local JSON there. */
function allowNumberingFilesystem() {
  return process.env.VERCEL !== "1";
}

function defaultRule(input: Partial<NumberingRule>): NumberingRule {
  return {
    prefix: input.prefix || "",
    postfix: input.postfix || "",
    includeSession: Boolean(input.includeSession),
    startNumber: input.startNumber || 1,
    nextNumber: input.nextNumber || input.startNumber || 1,
    padLength: input.padLength || 3,
    separator: input.separator || "-"
  };
}

export function buildDefaultNumberingConfig(): NumberingConfig {
  return {
    student: defaultRule({ prefix: "ADM-{institute}-{trade}", includeSession: true, startNumber: 1, nextNumber: 1, padLength: 3, separator: "-" }),
    agent: defaultRule({ prefix: "AG", includeSession: false, startNumber: 1, nextNumber: 1, padLength: 3, separator: "-" }),
    employee: defaultRule({ prefix: "EMP", includeSession: false, startNumber: 1, nextNumber: 1, padLength: 3, separator: "-" }),
    receipt: defaultRule({ prefix: "RCPT", includeSession: false, startNumber: 1, nextNumber: 1, padLength: 4, separator: "-" }),
    updatedAt: null
  };
}

function normalizeRule(input: Partial<NumberingRule> | undefined, fallback: NumberingRule) {
  return {
    prefix: typeof input?.prefix === "string" ? input.prefix : fallback.prefix,
    postfix: typeof input?.postfix === "string" ? input.postfix : fallback.postfix,
    includeSession: typeof input?.includeSession === "boolean" ? input.includeSession : fallback.includeSession,
    startNumber: Number.isFinite(Number(input?.startNumber)) ? Math.max(1, Number(input?.startNumber)) : fallback.startNumber,
    nextNumber: Number.isFinite(Number(input?.nextNumber)) ? Math.max(1, Number(input?.nextNumber)) : fallback.nextNumber,
    padLength: Number.isFinite(Number(input?.padLength)) ? Math.max(1, Number(input?.padLength)) : fallback.padLength,
    separator: typeof input?.separator === "string" && input.separator.length ? input.separator : fallback.separator
  };
}

function parseStoredConfig(raw: unknown, fallback: NumberingConfig): NumberingConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const parsed = raw as Partial<NumberingConfig>;
  return {
    student: normalizeRule(parsed.student, fallback.student),
    agent: normalizeRule(parsed.agent, fallback.agent),
    employee: normalizeRule(parsed.employee, fallback.employee),
    receipt: normalizeRule(parsed.receipt, fallback.receipt),
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
  };
}

async function readNumberingConfigFromFilesystem(fallback: NumberingConfig): Promise<NumberingConfig> {
  if (!allowNumberingFilesystem()) return fallback;
  try {
    const raw = await readFile(numberingConfigPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<NumberingConfig>;
    return {
      student: normalizeRule(parsed.student, fallback.student),
      agent: normalizeRule(parsed.agent, fallback.agent),
      employee: normalizeRule(parsed.employee, fallback.employee),
      receipt: normalizeRule(parsed.receipt, fallback.receipt),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return fallback;
  }
}

export async function readNumberingConfig(): Promise<NumberingConfig> {
  const fallback = buildDefaultNumberingConfig();
  try {
    const row = await prisma.numberingConfigStore.findUnique({ where: { id: STORE_ID } });
    if (row) return parseStoredConfig(row.configJson, fallback);
  } catch {
    // e.g. migration not applied yet — fall back to file/defaults
  }
  return readNumberingConfigFromFilesystem(fallback);
}

function toJsonPayload(config: NumberingConfig): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue;
}

export async function saveNumberingConfig(input: Omit<NumberingConfig, "updatedAt">) {
  const fallback = buildDefaultNumberingConfig();
  const payload: NumberingConfig = {
    student: normalizeRule(input.student, fallback.student),
    agent: normalizeRule(input.agent, fallback.agent),
    employee: normalizeRule(input.employee, fallback.employee),
    receipt: normalizeRule(input.receipt, fallback.receipt),
    updatedAt: new Date().toISOString()
  };

  try {
    await prisma.numberingConfigStore.upsert({
      where: { id: STORE_ID },
      create: { id: STORE_ID, configJson: toJsonPayload(payload) },
      update: { configJson: toJsonPayload(payload) }
    });
  } catch (e) {
    if (!allowNumberingFilesystem()) throw e;
    try {
      await mkdir(path.dirname(numberingConfigPath), { recursive: true });
      await writeFile(numberingConfigPath, JSON.stringify(payload, null, 2), "utf8");
    } catch {
      throw e;
    }
    return payload;
  }

  if (allowNumberingFilesystem()) {
    try {
      await mkdir(path.dirname(numberingConfigPath), { recursive: true });
      await writeFile(numberingConfigPath, JSON.stringify(payload, null, 2), "utf8");
    } catch {
      // local dev only — ignore
    }
  }
  return payload;
}

function renderTemplate(template: string, context: NumberingContext) {
  const date = context.date || new Date();
  const tokens: Record<string, string> = {
    session: context.session || "",
    institute: context.institute || "",
    trade: context.trade || "",
    date: `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`,
    year: String(date.getFullYear())
  };

  return template.replace(/\{(session|institute|trade|date|year)\}/g, (_, key: string) => tokens[key] || "");
}

export function generateCodeFromRule(rule: NumberingRule, context: NumberingContext = {}, sequence = rule.nextNumber) {
  const parts = [];
  const prefix = renderTemplate(rule.prefix, context).trim();
  const postfix = renderTemplate(rule.postfix, context).trim();
  if (prefix) parts.push(prefix);
  if (rule.includeSession && context.session) parts.push(context.session);
  parts.push(String(sequence).padStart(rule.padLength, "0"));
  if (postfix) parts.push(postfix);
  return parts.join(rule.separator);
}

export async function previewGeneratedCode(kind: NumberingKind, context: NumberingContext = {}) {
  const config = await readNumberingConfig();
  const rule = config[kind];
  return generateCodeFromRule(rule, context, rule.nextNumber);
}

async function reserveGeneratedCodeInDb(kind: NumberingKind, context: NumberingContext): Promise<string> {
  const fallback = buildDefaultNumberingConfig();
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const row = await tx.numberingConfigStore.findUnique({ where: { id: STORE_ID } });
          const config = row?.configJson
            ? parseStoredConfig(row.configJson, fallback)
            : allowNumberingFilesystem()
              ? await readNumberingConfigFromFilesystem(fallback)
              : fallback;

          const rule = config[kind];
          const sequence = rule.nextNumber;
          const code = generateCodeFromRule(rule, context, sequence);
          config[kind] = {
            ...rule,
            nextNumber: Math.max(sequence + 1, rule.startNumber)
          };
          config.updatedAt = new Date().toISOString();

          await tx.numberingConfigStore.upsert({
            where: { id: STORE_ID },
            create: { id: STORE_ID, configJson: toJsonPayload(config) },
            update: { configJson: toJsonPayload(config) }
          });
          return code;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 15_000,
          timeout: 15_000
        }
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < maxAttempts - 1) {
        continue;
      }
      throw e;
    }
  }

  throw new Error("Unable to reserve code after retries");
}

export async function reserveGeneratedCode(kind: NumberingKind, context: NumberingContext = {}) {
  const previous = reserveQueue;
  let release: (() => void) | undefined;
  reserveQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await reserveGeneratedCodeInDb(kind, context);
  } finally {
    release?.();
  }
}
