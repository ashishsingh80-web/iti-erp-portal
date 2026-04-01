/**
 * Generates PWA launcher icons from public/portal-logo.svg.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const iconsDir = join(publicDir, "icons");
const srcSvg = join(publicDir, "portal-logo.svg");

const bg = { r: 241, g: 244, b: 239, alpha: 1 };

await mkdir(iconsDir, { recursive: true });

for (const size of [192, 512]) {
  const out = join(iconsDir, `icon-${size}.png`);
  await sharp(srcSvg, { density: 300 })
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(out);
  console.log("Wrote", out);
}

/* Default favicon / legacy references — single 512 asset */
await sharp(srcSvg, { density: 300 })
  .resize(512, 512, { fit: "contain", background: bg })
  .png()
  .toFile(join(publicDir, "portal-logo.png"));
console.log("Wrote", join(publicDir, "portal-logo.png"));
