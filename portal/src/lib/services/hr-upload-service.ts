import { mkdir, writeFile } from "fs/promises";
import path from "path";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveHrFile(staffId: string, file: File, folder = "general") {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const relativeDir = path.join("uploads", "hr-staff", staffId, folder);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);

  return {
    fileUrl: `/${relativeDir}/${safeName}`.replace(/\\/g, "/"),
    originalName: file.name
  };
}
