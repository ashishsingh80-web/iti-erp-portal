"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";

type BackupRow = {
  fileName: string;
  fileSizeKb: number;
  exportedAt: string;
  version: number;
  totalDatasets: number;
  totalRecords: number;
  counts: Record<string, number>;
};

export function BackupDesk() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState("");
  const [backupDir, setBackupDir] = useState("");
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [error, setError] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);

  async function loadBackups() {
    setLoading(true);
    const response = await fetch("/api/backups");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load backups");
      setLoading(false);
      return;
    }

    setBackupDir(result.backupDir || "");
    setBackups(result.backups || []);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    void loadBackups();
  }, []);

  async function handleCreateBackup() {
    setCreating(true);
    const response = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "export" })
    });
    const result = await response.json();
    setCreating(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to create backup";
      setError(nextError);
      showToast({ kind: "error", title: "Backup not created", message: nextError });
      return;
    }

    showToast({
      kind: "success",
      title: "Backup created",
      message: `${result.result?.fileName || ""} saved`
    });
    await loadBackups();
  }

  async function handleRestoreBackup(fileName: string) {
    setRestoringFile(fileName);
    const response = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "restore", fileName })
    });
    const result = await response.json();
    setRestoringFile("");
    setRestoreTarget(null);

    if (!response.ok) {
      const nextError = result?.message || "Unable to restore backup";
      setError(nextError);
      showToast({ kind: "error", title: "Backup not restored", message: nextError });
      return;
    }

    showToast({
      kind: "success",
      title: "Backup restored",
      message: `${result.result?.restoredRecords || 0} records restored`
    });
    await loadBackups();
  }

  const latestBackup = backups[0] || null;
  const totalStoredRecords = useMemo(
    () => backups.reduce((sum, item) => sum + item.totalRecords, 0),
    [backups]
  );

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow-compact">Backup & Restore</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">System Snapshot and Recovery Desk</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Create full ERP snapshots inside the portal workspace, download them for safekeeping, and restore the system from a saved backup when required.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={() => void loadBackups()} type="button">
              Refresh
            </button>
            <button className="btn-primary" disabled={creating} onClick={() => void handleCreateBackup()} type="button">
              {creating ? "Creating..." : "Create Backup"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Backups Saved</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">{backups.length}</p>
          </article>
          <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Stored Records</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">{totalStoredRecords}</p>
          </article>
          <article className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Latest Snapshot</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{latestBackup ? latestBackup.fileName : "No backup yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{latestBackup ? new Date(latestBackup.exportedAt).toLocaleString("en-IN") : "Create the first backup to begin."}</p>
          </article>
        </div>

        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Restore is a full snapshot recovery. It replaces the current ERP data with the selected backup file, so use it only when you intentionally want to roll the system back.
        </div>
        {backupDir ? <p className="mt-3 text-xs text-slate-500">Backup storage path: {backupDir}</p> : null}
        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      </section>

      <section className="surface p-6">
        <p className="eyebrow-compact">Backup Register</p>
        <h4 className="mt-2 text-xl font-semibold text-slate-900">Saved Snapshots</h4>

        {loading ? (
          <div className="mt-5 space-y-4">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : backups.length ? (
          <div className="mt-5 space-y-4">
            {backups.map((backup) => (
              <article key={backup.fileName} className="rounded-3xl border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{backup.fileName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(backup.exportedAt).toLocaleString("en-IN")} • {backup.fileSizeKb} KB • {backup.totalRecords} records
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      className="btn-secondary"
                      href={`/api/backups/download?file=${encodeURIComponent(backup.fileName)}`}
                    >
                      Download
                    </a>
                    <button
                      className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white"
                      disabled={restoringFile === backup.fileName}
                      onClick={() => setRestoreTarget(backup)}
                      type="button"
                    >
                      {restoringFile === backup.fileName ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(backup.counts)
                    .filter(([, count]) => count > 0)
                    .slice(0, 8)
                    .map(([key, count]) => (
                      <span key={key} className="chip-neutral">
                        {key}: {count}
                      </span>
                    ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No system backups are saved yet.
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore Backup"
        message={restoreTarget ? `Restore ${restoreTarget.fileName}? This will replace the current ERP data with the selected snapshot.` : ""}
        confirmLabel="Restore Snapshot"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (restoreTarget) {
            void handleRestoreBackup(restoreTarget.fileName);
          }
        }}
      />
    </div>
  );
}
