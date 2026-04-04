#!/usr/bin/env node
/**
 * Pull Production env from Vercel, then run prisma migrate deploy against Neon.
 * Requires: Vercel CLI logged in, portal linked (`npx vercel link`), and
 * DATABASE_URL (or POSTGRES_URL) set for Production in the Vercel project.
 */
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envFile = path.join(root, ".env.vercel.production");
process.chdir(root);

if (!fs.existsSync(envFile)) {
  execFileSync("npx", ["vercel", "env", "pull", envFile, "--environment", "production", "--yes"], {
    stdio: "inherit"
  });
}

const content = fs.readFileSync(envFile, "utf8");
const vars = {};
for (const line of content.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const key = t.slice(0, eq);
  let val = t.slice(eq + 1);
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  vars[key] = val.replace(/\\n/g, "\n").replace(/\\"/g, '"');
}

const dbUrl = vars.DATABASE_URL || vars.POSTGRES_URL || vars.PRISMA_DATABASE_URL;
if (!dbUrl) {
  console.error(
    [
      "No DATABASE_URL in .env.vercel.production.",
      "",
      "1. Vercel → iti-erp-portal → Settings → Environment Variables → Production",
      "   Add DATABASE_URL from Neon (Connection details → pooled or direct URI).",
      "   Or install the Neon integration so Vercel injects it.",
      "2. Run: npx vercel env pull .env.vercel.production --environment production --yes",
      "3. Run: npm run migrate:vercel-production"
    ].join("\n")
  );
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, ...vars, DATABASE_URL: dbUrl }
});
process.exit(r.status ?? 1);
