import { Suspense } from "react";
import { canUserPerformAction } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { readSessionConfig } from "@/lib/session-config";
import { StudentWorkbenchClient } from "@/components/students/student-workbench-client";

export async function StudentWorkbenchDesk({
  initialQueue,
  initialSession
}: {
  initialQueue?: string;
  initialSession?: string;
}) {
  const user = await requireUser();
  const config = await readSessionConfig();
  const canBulkVerify = canUserPerformAction(user, "admissions", "add");
  const canUploadDocuments = canUserPerformAction(user, "documents", "add");
  const defaultSession =
    initialSession?.trim() || config.activeTwoYearSession || config.activeOneYearSession || "";

  return (
    <Suspense fallback={<div className="surface rounded-3xl p-10 text-center text-slate-500">Loading workbench…</div>}>
      <StudentWorkbenchClient
        initialQueue={initialQueue?.trim() || ""}
        initialSession={defaultSession}
        canBulkVerify={canBulkVerify}
        canUploadDocuments={canUploadDocuments}
      />
    </Suspense>
  );
}
