"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "@/lib/toast";

type AttendanceRow = {
  id: string;
  code: string;
  fullName: string;
  photoUrl: string | null;
  type: "STUDENT" | "STAFF";
  secondary: string;
  attendance: {
    id: string;
    status: string;
    checkInAt: string;
    checkOutAt: string;
    note: string;
  } | null;
};

export function AttendanceDesk() {
  const [scope, setScope] = useState<"students" | "staff">("students");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [quickCode, setQuickCode] = useState("");
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerBusy, setScannerBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  const summary = useMemo(() => {
    const present = rows.filter((item) => item.attendance?.status === "PRESENT").length;
    const absent = rows.filter((item) => item.attendance?.status === "ABSENT").length;
    const late = rows.filter((item) => item.attendance?.status === "LATE").length;
    const halfDay = rows.filter((item) => item.attendance?.status === "HALF_DAY").length;
    return { present, absent, late, halfDay };
  }, [rows]);

  async function loadRows() {
    setLoading(true);
    const params = new URLSearchParams({
      scope,
      date,
      search
    });
    const response = await fetch(`/api/attendance?${params.toString()}`);
    const result = await response.json();
    setRows(result.rows || []);
    setLoading(false);
  }

  async function markAttendance(targetId: string, status: string, action: "CHECK_IN" | "CHECK_OUT" | "STATUS_ONLY" = "STATUS_ONLY") {
    const response = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        targetId,
        recordDate: date,
        status,
        action
      })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Attendance not saved", message: result?.message || "Unable to save attendance" });
      return;
    }
    await loadRows();
  }

  async function markByCode(scannedCode?: string) {
    const code = (scannedCode || quickCode).trim().toUpperCase();
    if (!code) return;
    const response = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        code,
        recordDate: date,
        status: "PRESENT",
        action: "CHECK_IN"
      })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Attendance not saved", message: result?.message || "Code not found" });
      return;
    }
    showToast({ kind: "success", title: "Attendance marked", message: code });
    setQuickCode("");
    await loadRows();
  }

  function stopScanner() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      setScannerError("");
      return;
    }

    let cancelled = false;

    async function startScanner() {
      try {
        const BarcodeDetectorCtor = (window as typeof window & {
          BarcodeDetector?: new (options?: { formats?: string[] }) => {
            detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
          };
        }).BarcodeDetector;

        if (!BarcodeDetectorCtor) {
          setScannerError("Camera QR scanning is not supported in this browser. Use Quick Check-In or Open QR Card.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !videoRef.current || scannerBusy) {
            frameRef.current = requestAnimationFrame(() => {
              void tick();
            });
            return;
          }

          try {
            const results = await detector.detect(videoRef.current);
            const rawValue = results[0]?.rawValue?.trim();

            if (rawValue) {
              setScannerBusy(true);
              setQuickCode(rawValue.toUpperCase());
              await markByCode(rawValue);
              setScannerOpen(false);
              setScannerBusy(false);
              return;
            }
          } catch {
            setScannerError("Unable to read QR from camera stream.");
          }

          frameRef.current = requestAnimationFrame(() => {
            void tick();
          });
        };

        frameRef.current = requestAnimationFrame(() => {
          void tick();
        });
      } catch (error) {
        setScannerError(error instanceof Error ? error.message : "Unable to open camera scanner.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scannerOpen, scannerBusy, scope, date]);

  useEffect(() => {
    void loadRows();
  }, [scope, date]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Attendance</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Student & Staff Attendance Desk</h3>
            <p className="mt-2 text-sm text-slate-600">Use quick code entry for fast attendance, or verify with photo before marking manually. QR cards can use the same code later.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={`rounded-full px-4 py-2 text-sm font-semibold ${scope === "students" ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-700"}`} onClick={() => setScope("students")} type="button">
              Students
            </button>
            <button className={`rounded-full px-4 py-2 text-sm font-semibold ${scope === "staff" ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-700"}`} onClick={() => setScope("staff")} type="button">
              Staff
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_220px_auto]">
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={`Search ${scope} by name or code`} value={search} onChange={(event) => setSearch(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={`Quick ${scope === "students" ? "student" : "employee"} code`} value={quickCode} onChange={(event) => setQuickCode(event.target.value.toUpperCase())} />
          <div className="flex gap-2">
            <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700" onClick={() => void loadRows()} type="button">
              Search
            </button>
            <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => void markByCode()} type="button">
              Quick Check-In
            </button>
            <button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" onClick={() => setScannerOpen(true)} type="button">
              Scan QR
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Present</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.present}</p></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Absent</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.absent}</p></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Late</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.late}</p></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Half Day</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.halfDay}</p></div>
        </div>
      </section>

      {scannerOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-compact">QR Scanner</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Scan Attendance QR</h3>
                <p className="mt-2 text-sm text-slate-600">Show the student or staff QR code to the camera. Attendance will be marked automatically.</p>
              </div>
              <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setScannerOpen(false)} type="button">
                Close
              </button>
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
            {scannerError ? <p className="mt-4 text-sm text-rose-700">{scannerError}</p> : null}
            <p className="mt-4 text-xs text-slate-500">
              If camera scan is not supported on this browser, use Quick Check-In with student code or employee code.
            </p>
          </div>
        </div>
      ) : null}

      <section className="surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Code / QR Value</th>
                <th className="px-3 py-2">Current Status</th>
                <th className="px-3 py-2">Check-In</th>
                <th className="px-3 py-2">Check-Out</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 text-sm">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {row.photoUrl ? (
                          <img alt={row.fullName} className="h-full w-full object-cover" src={row.photoUrl} />
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">{row.fullName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">{row.secondary}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{row.code}</p>
                    <a
                      className="mt-1 inline-flex text-xs font-medium text-emerald-700 underline"
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(row.code)}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open QR Card
                    </a>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.attendance?.status || "Not Marked"}</td>
                  <td className="px-3 py-3 text-slate-700">{row.attendance?.checkInAt ? new Date(row.attendance.checkInAt).toLocaleTimeString("en-IN") : "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{row.attendance?.checkOutAt ? new Date(row.attendance.checkOutAt).toLocaleTimeString("en-IN") : "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" onClick={() => void markAttendance(row.id, "PRESENT", "CHECK_IN")} type="button">Present</button>
                      <button className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => void markAttendance(row.id, "LATE", "CHECK_IN")} type="button">Late</button>
                      <button className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => void markAttendance(row.id, "HALF_DAY", "STATUS_ONLY")} type="button">Half Day</button>
                      <button className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => void markAttendance(row.id, "ABSENT", "STATUS_ONLY")} type="button">Absent</button>
                      <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => void markAttendance(row.id, row.attendance?.status || "PRESENT", "CHECK_OUT")} type="button">Check-Out</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !rows.length ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-slate-500" colSpan={6}>
                    No attendance rows found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
