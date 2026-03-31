import { mkdir, writeFile } from "fs/promises";
import path from "path";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveInstituteBrandingFile(instituteCode: string, file: File, assetType: "logo" | "seal" | "signature") {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeCode = instituteCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  const safeName = `${assetType}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const relativeDir = path.join("uploads", "institute-branding", safeCode, assetType);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);

  return {
    fileUrl: `/${relativeDir}/${safeName}`.replace(/\\/g, "/"),
    originalName: file.name
  };
}
