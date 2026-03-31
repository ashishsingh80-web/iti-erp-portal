"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { showToast } from "@/lib/toast";
import { timetableDayOptions } from "@/lib/services/timetable-service";

type Option = { label: string; value: string; instituteCode?: string };

type TimetableRow = {
  id: string;
  instituteCode: string;
  instituteName: string;
  tradeValue: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectTitle: string;
  instructorName: string;
  roomLabel: string;
  batchLabel: string;
  isPractical: boolean;
  note: string;
};

const initialForm = {
  instituteCode: "",
  tradeValue: "",
  session: "",
  yearLabel: "",
  dayOfWeek: "MONDAY",
  startTime: "",
  endTime: "",
  subjectTitle: "",
  instructorName: "",
  roomLabel: "",
  batchLabel: "",
  isPractical: false,
  note: ""
};

function formatDay(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function TimetableDesk() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [institutes, setInstitutes] = useState<Option[]>([]);
  const [trades, setTrades] = useState<Option[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [years, setYears] = useState<Option[]>([]);
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [filters, setFilters] = useState({
    instituteCode: "",
    tradeValue: "",
    session: "",
    yearLabel: "",
    dayOfWeek: "",
    instructorName: "",
    roomLabel: "",
    batchLabel: ""
  });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<TimetableRow | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "faculty" | "room" | "batch">("day");
  const [publication, setPublication] = useState<{ isLocked: boolean; approvedAt: string; approvedBy: string; note: string } | null>(null);
  const [publicationNote, setPublicationNote] = useState("");
  const [copyTargetSession, setCopyTargetSession] = useState("");
  const [copyTargetYear, setCopyTargetYear] = useState("");
  const [copyMode, setCopyMode] = useState<"single" | "bulk">("single");
  const [historyRows, setHistoryRows] = useState<
    Array<{ id: string; createdAt: string; action: string; userName: string; metadata: Record<string, unknown> | null }>
  >([]);

  async function loadMasters() {
    setMastersLoading(true);
    const response = await fetch("/api/masters");
    const result = await response.json();
    setInstitutes(result.institutes || []);
    setTrades(result.trades || []);
    setSessions(result.sessions || []);
    setYears(result.years || []);
    setMastersLoading(false);
  }

  async function loadHistory() {
    const response = await fetch("/api/timetable/history");
    const result = await response.json();
    setHistoryRows(result.rows || []);
  }

  async function loadRows(nextFilters = filters) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextFilters.instituteCode) params.set("instituteCode", nextFilters.instituteCode);
    if (nextFilters.tradeValue) params.set("tradeValue", nextFilters.tradeValue);
    if (nextFilters.session) params.set("session", nextFilters.session);
    if (nextFilters.yearLabel) params.set("yearLabel", nextFilters.yearLabel);
    if (nextFilters.dayOfWeek) params.set("dayOfWeek", nextFilters.dayOfWeek);
    if (nextFilters.instructorName) params.set("instructorName", nextFilters.instructorName);
    if (nextFilters.roomLabel) params.set("roomLabel", nextFilters.roomLabel);
    if (nextFilters.batchLabel) params.set("batchLabel", nextFilters.batchLabel);
    const response = await fetch(`/api/timetable?${params.toString()}`);
    const result = await response.json();
    setRows(result.rows || []);
    if (nextFilters.instituteCode && nextFilters.tradeValue && nextFilters.session && nextFilters.yearLabel) {
      const statusParams = new URLSearchParams({
        instituteCode: nextFilters.instituteCode,
        tradeValue: nextFilters.tradeValue,
        session: nextFilters.session,
        yearLabel: nextFilters.yearLabel
      });
      const statusResponse = await fetch(`/api/timetable/lock?${statusParams.toString()}`);
      const statusResult = await statusResponse.json();
      setPublication(statusResult.publication || { isLocked: false, approvedAt: "", approvedBy: "", note: "" });
      setPublicationNote(statusResult.publication?.note || "");
    } else {
      setPublication(null);
      setPublicationNote("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadMasters();
    void loadRows();
    void loadHistory();
  }, []);

  const visibleTrades = useMemo(() => {
    if (!filters.instituteCode && !form.instituteCode) return trades;
    const activeInstituteCode = form.instituteCode || filters.instituteCode;
    return trades.filter((item) => item.value.startsWith(`${activeInstituteCode}::`));
  }, [filters.instituteCode, form.instituteCode, trades]);

  const groupedRows = useMemo(() => {
    const days = timetableDayOptions.map((item) => item.value);
    return days
      .map((day) => ({
        day,
        label: formatDay(day),
        entries: rows.filter((item) => item.dayOfWeek === day)
      }))
      .filter((group) => group.entries.length);
  }, [rows]);

  const facultyGroups = useMemo(() => {
    const grouped = new Map<string, TimetableRow[]>();
    rows.forEach((item) => {
      const key = item.instructorName || "Unassigned Instructor";
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return [...grouped.entries()]
      .map(([label, entries]) => ({
        label,
        entries: [...entries].sort((a, b) => `${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`))
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const roomGroups = useMemo(() => {
    const grouped = new Map<string, TimetableRow[]>();
    rows.forEach((item) => {
      const key = item.roomLabel || "Unassigned Room / Workshop";
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return [...grouped.entries()]
      .map(([label, entries]) => ({
        label,
        entries: [...entries].sort((a, b) => `${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`))
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const batchGroups = useMemo(() => {
    const grouped = new Map<string, TimetableRow[]>();
    rows.forEach((item) => {
      const key = item.batchLabel || "All Batch / Unit";
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return [...grouped.entries()]
      .map(([label, entries]) => ({
        label,
        entries: [...entries].sort((a, b) => `${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`))
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const instructorCount = useMemo(() => new Set(rows.map((item) => item.instructorName).filter(Boolean)).size, [rows]);
  const practicalCount = useMemo(() => rows.filter((item) => item.isPractical).length, [rows]);
  const roomCount = useMemo(() => new Set(rows.map((item) => item.roomLabel).filter(Boolean)).size, [rows]);
  const batchCount = useMemo(() => new Set(rows.map((item) => item.batchLabel).filter(Boolean)).size, [rows]);

  const facultyLoadRows = useMemo(
    () =>
      facultyGroups.map((group) => ({
        label: group.label,
        slots: group.entries.length,
        practicalSlots: group.entries.filter((entry) => entry.isPractical).length,
        totalHours: group.entries.reduce((sum, entry) => {
          const [sh, sm] = entry.startTime.split(":").map(Number);
          const [eh, em] = entry.endTime.split(":").map(Number);
          return sum + (eh * 60 + em - (sh * 60 + sm)) / 60;
        }, 0)
      })),
    [facultyGroups]
  );

  const roomUtilizationRows = useMemo(
    () =>
      roomGroups.map((group) => ({
        label: group.label,
        slots: group.entries.length,
        practicalSlots: group.entries.filter((entry) => entry.isPractical).length,
        totalHours: group.entries.reduce((sum, entry) => {
          const [sh, sm] = entry.startTime.split(":").map(Number);
          const [eh, em] = entry.endTime.split(":").map(Number);
          return sum + (eh * 60 + em - (sh * 60 + sm)) / 60;
        }, 0)
      })),
    [roomGroups]
  );

  async function saveEntry() {
    if (publication?.isLocked) {
      showToast({ kind: "error", title: "Timetable locked", message: "Reopen this timetable before making changes." });
      return;
    }
    setSaving(true);
    const response = await fetch(editingId ? `/api/timetable/${editingId}` : "/api/timetable", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "Timetable not saved", message: result?.message || "Unable to save timetable entry" });
      setSaving(false);
      return;
    }

    showToast({
      kind: "success",
      title: editingId ? "Timetable updated" : "Timetable saved",
      message: `${result.row?.tradeName || "Trade"} • ${result.row?.subjectTitle || "Schedule"}`
    });
    setEditingId("");
    setForm((current) => ({ ...initialForm, instituteCode: current.instituteCode, tradeValue: current.tradeValue, session: current.session, yearLabel: current.yearLabel }));
    await loadRows(filters);
    await loadHistory();
    setSaving(false);
  }

  function startEdit(entry: TimetableRow) {
    setEditingId(entry.id);
    setForm({
      instituteCode: entry.instituteCode,
      tradeValue: entry.tradeValue,
      session: entry.session,
      yearLabel: entry.yearLabel,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectTitle: entry.subjectTitle,
      instructorName: entry.instructorName,
      roomLabel: entry.roomLabel,
      batchLabel: entry.batchLabel,
      isPractical: entry.isPractical,
      note: entry.note
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmDelete() {
    if (!entryToDelete) return;
    if (publication?.isLocked) {
      showToast({ kind: "error", title: "Timetable locked", message: "Reopen this timetable before deleting slots." });
      return;
    }
    const response = await fetch(`/api/timetable/${entryToDelete.id}`, { method: "DELETE" });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "Timetable not deleted", message: result?.message || "Unable to delete slot" });
      return;
    }

    showToast({ kind: "success", title: "Timetable deleted", message: `${entryToDelete.subjectTitle} removed.` });
    setEntryToDelete(null);
    if (editingId === entryToDelete.id) {
      setEditingId("");
      setForm(initialForm);
    }
    await loadRows(filters);
    await loadHistory();
  }

  function buildBrandedPrintShell(title: string, body: string) {
    const instituteTitle =
      rows.length && new Set(rows.map((item) => item.instituteName)).size === 1
        ? rows[0].instituteName
        : "Adarsh Rashtriya Private ITI & Babu Harbansh Bahadur Singh Private ITI";

    return `
      <html>
        <head>
          <title>${title}</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
          <div style="border-bottom:3px solid #0f766e;padding-bottom:16px;margin-bottom:24px;">
            <h1 style="margin:0;font-size:28px;">${instituteTitle}</h1>
            <p style="margin:8px 0 0 0;color:#475569;">${title}</p>
          </div>
          ${body}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
  }

  function printWeeklyView() {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!popup) return;

    const groupedMarkup = groupedRows
      .map(
        (group) => `
          <section style="margin-bottom:24px;">
            <h2 style="font-size:20px;margin:0 0 12px 0;">${group.label}</h2>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Time</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Subject</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Trade</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Instructor</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Room</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Type</th>
                </tr>
              </thead>
              <tbody>
                ${group.entries
                  .map(
                    (entry) => `
                      <tr>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.startTime} - ${entry.endTime}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.subjectTitle}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.tradeName} (${entry.session} / ${entry.yearLabel})</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.instructorName || "-"}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.roomLabel || "-"}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.isPractical ? "Practical" : "Theory"}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
        `
      )
      .join("");

    popup.document.write(buildBrandedPrintShell("Weekly Timetable", groupedMarkup || "<p>No timetable slots found.</p>"));
    popup.document.close();
  }

  function printGroupedView(mode: "faculty" | "room" | "batch") {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!popup) return;

    const groups = mode === "faculty" ? facultyGroups : mode === "room" ? roomGroups : batchGroups;
    const title =
      mode === "faculty"
        ? "Faculty-wise Weekly Timetable"
        : mode === "room"
          ? "Room / Workshop Weekly Timetable"
          : "Batch / Unit-wise Weekly Timetable";
    const groupedMarkup = groups
      .map(
        (group) => `
          <section style="margin-bottom:24px;">
            <h2 style="font-size:20px;margin:0 0 12px 0;">${group.label}</h2>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Day</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Time</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Subject</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Trade</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">${mode === "faculty" ? "Room" : mode === "room" ? "Instructor" : "Room / Instructor"}</th>
                  <th style="text-align:left;border:1px solid #cbd5e1;padding:8px;">Type</th>
                </tr>
              </thead>
              <tbody>
                ${group.entries
                  .map(
                    (entry) => `
                      <tr>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${formatDay(entry.dayOfWeek)}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.startTime} - ${entry.endTime}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.subjectTitle}</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.tradeName} (${entry.session} / ${entry.yearLabel})</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${
                          mode === "faculty"
                            ? entry.roomLabel || "-"
                            : mode === "room"
                              ? entry.instructorName || "-"
                              : `${entry.roomLabel || "-"} / ${entry.instructorName || "-"}`
                        }</td>
                        <td style="border:1px solid #cbd5e1;padding:8px;">${entry.isPractical ? "Practical" : "Theory"}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
        `
      )
      .join("");

    popup.document.write(buildBrandedPrintShell(title, groupedMarkup || "<p>No timetable slots found.</p>"));
    popup.document.close();
  }

  function exportCurrentView() {
    downloadCsv("timetable-current-view.csv", [
      ["Day", "Start Time", "End Time", "Institute", "Trade", "Session", "Year", "Subject", "Instructor", "Room", "Batch", "Type", "Note"],
      ...rows.map((entry) => [
        formatDay(entry.dayOfWeek),
        entry.startTime,
        entry.endTime,
        entry.instituteName,
        entry.tradeName,
        entry.session,
        entry.yearLabel,
        entry.subjectTitle,
        entry.instructorName,
        entry.roomLabel,
        entry.batchLabel,
        entry.isPractical ? "Practical" : "Theory",
        entry.note
      ])
    ]);
  }

  async function togglePublication(nextLocked: boolean) {
    if (!filters.instituteCode || !filters.tradeValue || !filters.session || !filters.yearLabel) {
      showToast({ kind: "error", title: "Filter required", message: "Choose institute, trade, session, and year first." });
      return;
    }

    const response = await fetch("/api/timetable/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instituteCode: filters.instituteCode,
        tradeValue: filters.tradeValue,
        session: filters.session,
        yearLabel: filters.yearLabel,
        isLocked: nextLocked,
        note: publicationNote
      })
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "Status not updated", message: result?.message || "Unable to change timetable status" });
      return;
    }

    setPublication(result.publication);
    await loadHistory();
    showToast({
      kind: "success",
      title: nextLocked ? "Timetable finalized" : "Timetable reopened",
      message: nextLocked ? "This timetable is now locked for edits." : "This timetable is editable again."
    });
  }

  async function runCopyForward() {
    if (!filters.instituteCode || !filters.tradeValue || !filters.session || !filters.yearLabel || !copyTargetSession || !copyTargetYear) {
      showToast({ kind: "error", title: "Copy target required", message: "Choose source filters and target session/year first." });
      return;
    }

    const response = await fetch("/api/timetable/copy-forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          instituteCode: filters.instituteCode,
          tradeValue: filters.tradeValue,
          session: filters.session,
          yearLabel: filters.yearLabel
        },
        target: {
          instituteCode: filters.instituteCode,
          tradeValue: filters.tradeValue,
          session: copyTargetSession,
          yearLabel: copyTargetYear
        },
        mode: copyMode
      })
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "Copy forward failed", message: result?.message || "Unable to copy timetable forward" });
      return;
    }

    showToast({
      kind: "success",
      title: copyMode === "bulk" ? "Institute timetable copied" : "Timetable copied",
      message:
        copyMode === "bulk"
          ? `${result.copiedTrades} trades and ${result.copiedSlots} slots copied to the target session.`
          : `${result.copiedCount} slots copied to the target session.`
    });
    await loadHistory();
  }

  const renderedGroups =
    viewMode === "faculty"
      ? facultyGroups.map((group) => ({ key: group.label, title: group.label, count: group.entries.length, entries: group.entries }))
      : viewMode === "room"
        ? roomGroups.map((group) => ({ key: group.label, title: group.label, count: group.entries.length, entries: group.entries }))
        : viewMode === "batch"
          ? batchGroups.map((group) => ({ key: group.label, title: group.label, count: group.entries.length, entries: group.entries }))
        : groupedRows.map((group) => ({ key: group.day, title: group.label, count: group.entries.length, entries: group.entries }));

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="surface p-6">
          <div>
            <p className="eyebrow-compact">Timetable Desk</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Academic Planning & Daily Trade Schedule</h3>
            <p className="mt-2 text-sm text-slate-600">Create session-wise trade schedules with day, time, subject, instructor, room, and batch details. This is the academic planning step from your blueprint.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip-success">{rows.length} total slots</span>
            <span className="chip-warning">{practicalCount} practical</span>
            <span className="chip-success">{instructorCount} instructors</span>
            <span className="chip-success">{roomCount} rooms</span>
            <span className="chip-success">{batchCount} batches</span>
          </div>

        {mastersLoading ? (
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Institute"
                required
                options={institutes}
                value={form.instituteCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    instituteCode: event.target.value,
                    tradeValue: current.tradeValue.startsWith(`${event.target.value}::`) ? current.tradeValue : ""
                  }))
                }
              />
              <Select label="Trade" required options={visibleTrades} value={form.tradeValue} onChange={(event) => setForm((current) => ({ ...current, tradeValue: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Session" required options={sessions} value={form.session} onChange={(event) => setForm((current) => ({ ...current, session: event.target.value }))} />
              <Select label="Year" required options={years} value={form.yearLabel} onChange={(event) => setForm((current) => ({ ...current, yearLabel: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Day" required options={timetableDayOptions.map((item) => ({ label: item.label, value: item.value }))} value={form.dayOfWeek} onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))} />
              <Input label="Start Time" required type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
              <Input label="End Time" required type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Subject / Topic" required value={form.subjectTitle} onChange={(event) => setForm((current) => ({ ...current, subjectTitle: event.target.value }))} />
              <Input label="Instructor" helperText="Optional" value={form.instructorName} onChange={(event) => setForm((current) => ({ ...current, instructorName: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Room / Workshop" helperText="Optional" value={form.roomLabel} onChange={(event) => setForm((current) => ({ ...current, roomLabel: event.target.value }))} />
              <Input label="Batch / Unit" helperText="Optional" value={form.batchLabel} onChange={(event) => setForm((current) => ({ ...current, batchLabel: event.target.value }))} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ToggleSwitch checked={form.isPractical} label={form.isPractical ? "Practical Slot" : "Theory Slot"} onChange={(nextValue) => setForm((current) => ({ ...current, isPractical: nextValue }))} variant={form.isPractical ? "warning" : "neutral"} />
            </div>

            <Textarea label="Planning Note" helperText="Optional" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} onClick={() => void saveEntry()} type="button">
                {saving ? "Saving..." : editingId ? "Update Timetable Slot" : "Save Timetable Slot"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditingId("");
                  setForm(initialForm);
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Current Schedule</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Day-wise Timetable View</h3>
          </div>
          <span className="chip-success">{rows.length} slots</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Select label="Filter Institute" options={institutes} value={filters.instituteCode} onChange={(event) => setFilters((current) => ({ ...current, instituteCode: event.target.value, tradeValue: current.tradeValue.startsWith(`${event.target.value}::`) ? current.tradeValue : "" }))} />
          <Select label="Filter Trade" options={trades.filter((item) => !filters.instituteCode || item.value.startsWith(`${filters.instituteCode}::`))} value={filters.tradeValue} onChange={(event) => setFilters((current) => ({ ...current, tradeValue: event.target.value }))} />
          <Select label="Filter Session" options={sessions} value={filters.session} onChange={(event) => setFilters((current) => ({ ...current, session: event.target.value }))} />
          <Select label="Filter Year" options={years} value={filters.yearLabel} onChange={(event) => setFilters((current) => ({ ...current, yearLabel: event.target.value }))} />
          <Select label="Filter Day" options={timetableDayOptions.map((item) => ({ label: item.label, value: item.value }))} value={filters.dayOfWeek} onChange={(event) => setFilters((current) => ({ ...current, dayOfWeek: event.target.value }))} />
          <Input label="Filter Instructor" helperText="Optional" value={filters.instructorName} onChange={(event) => setFilters((current) => ({ ...current, instructorName: event.target.value }))} />
          <Input label="Filter Room / Workshop" helperText="Optional" value={filters.roomLabel} onChange={(event) => setFilters((current) => ({ ...current, roomLabel: event.target.value }))} />
          <Input label="Filter Batch / Unit" helperText="Optional" value={filters.batchLabel} onChange={(event) => setFilters((current) => ({ ...current, batchLabel: event.target.value }))} />
          <Select
            label="View Mode"
            options={[
              { label: "Day-wise", value: "day" },
              { label: "Faculty-wise", value: "faculty" },
              { label: "Room / Workshop-wise", value: "room" },
              { label: "Batch / Unit-wise", value: "batch" }
            ]}
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as "day" | "faculty" | "room" | "batch")}
          />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadRows(filters)} type="button">
              Apply
            </button>
            <button className="btn-secondary" onClick={exportCurrentView} type="button">
              Download CSV
            </button>
            <button
              className="btn-secondary"
              onClick={() => (viewMode === "day" ? printWeeklyView() : printGroupedView(viewMode))}
              type="button"
            >
              {viewMode === "day" ? "Print Weekly View" : viewMode === "faculty" ? "Print Faculty View" : viewMode === "room" ? "Print Room View" : "Print Batch View"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">Faculty Load Summary</h4>
              <span className="chip-success">{facultyLoadRows.length} faculty</span>
            </div>
            <div className="mt-4 space-y-3">
              {facultyLoadRows.length ? (
                facultyLoadRows.map((row) => (
                  <div key={row.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {row.slots} slots • {row.practicalSlots} practical • {row.totalHours.toFixed(1)} hours
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No faculty load data yet.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">Room Utilization Summary</h4>
              <span className="chip-success">{roomUtilizationRows.length} rooms</span>
            </div>
            <div className="mt-4 space-y-3">
              {roomUtilizationRows.length ? (
                roomUtilizationRows.map((row) => (
                  <div key={row.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {row.slots} slots • {row.practicalSlots} practical • {row.totalHours.toFixed(1)} hours
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No room utilization data yet.
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">Finalization Control</h4>
              <span className={publication?.isLocked ? "chip-warning" : "chip-success"}>
                {publication?.isLocked ? "Locked" : "Editable"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">Lock a finished timetable so no one edits it accidentally. Reopen only when a genuine revision is needed.</p>
            <Textarea label="Approval Note" helperText="Optional" value={publicationNote} onChange={(event) => setPublicationNote(event.target.value)} />
            {publication?.approvedBy ? (
              <p className="mt-3 text-sm text-slate-500">
                Approved by {publication.approvedBy} {publication.approvedAt ? `on ${new Date(publication.approvedAt).toLocaleDateString("en-IN")}` : ""}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => void togglePublication(true)} type="button">
                Finalize & Lock
              </button>
              <button className="btn-secondary" onClick={() => void togglePublication(false)} type="button">
                Reopen Timetable
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">Copy Forward</h4>
              <span className="chip-success">Next Session</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">Carry this timetable structure to the next session/year for the same institute. You can copy the current trade only or all trades of this institute in one action.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Select
                label="Copy Mode"
                options={[
                  { label: "Current Trade Only", value: "single" },
                  { label: "All Trades of Institute", value: "bulk" }
                ]}
                value={copyMode}
                onChange={(event) => setCopyMode(event.target.value as "single" | "bulk")}
              />
              <Select label="Target Session" options={sessions} value={copyTargetSession} onChange={(event) => setCopyTargetSession(event.target.value)} />
              <Select label="Target Year" options={years} value={copyTargetYear} onChange={(event) => setCopyTargetYear(event.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-secondary" onClick={() => void runCopyForward()} type="button">
                {copyMode === "bulk" ? "Copy Institute Timetable Forward" : "Copy Timetable Forward"}
              </button>
            </div>
          </article>
        </div>

        <article className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-lg font-semibold text-slate-900">Timetable History</h4>
            <span className="chip-success">{historyRows.length} entries</span>
          </div>
          <div className="mt-4 space-y-3">
            {historyRows.length ? (
              historyRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{row.action.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {row.userName} • {new Date(row.createdAt).toLocaleString("en-IN")}
                  </p>
                  {row.metadata ? (
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-3 text-xs text-slate-600">
                      {JSON.stringify(row.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No timetable history yet.
              </div>
            )}
          </div>
        </article>

        {loading ? (
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
        ) : renderedGroups.length ? (
          <div className="mt-6 space-y-5">
            {renderedGroups.map((group) => (
              <article key={group.key} className="rounded-3xl border border-slate-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900">{group.title}</h4>
                  <span className="chip-warning">{group.count} slots</span>
                </div>
                <div className="mt-4 space-y-3">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{entry.subjectTitle}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {entry.startTime} - {entry.endTime} • {entry.tradeName} • {entry.session} / {entry.yearLabel}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {entry.instituteName}
                            {entry.instructorName ? ` • ${entry.instructorName}` : ""}
                            {entry.roomLabel ? ` • ${entry.roomLabel}` : ""}
                            {entry.batchLabel ? ` • ${entry.batchLabel}` : ""}
                          </p>
                          {entry.note ? <p className="mt-2 text-sm text-slate-500">{entry.note}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={entry.isPractical ? "chip-warning" : "chip-success"}>{entry.isPractical ? "Practical" : "Theory"}</span>
                          <button className="btn-secondary" onClick={() => startEdit(entry)} type="button">
                            Edit
                          </button>
                          <button className="btn-secondary" onClick={() => setEntryToDelete(entry)} type="button">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No timetable slots found for the current filter.
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(entryToDelete)}
        title="Delete Timetable Slot"
        message={`This will permanently remove ${entryToDelete?.subjectTitle || "this timetable slot"}.`}
        confirmLabel="Delete Slot"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
