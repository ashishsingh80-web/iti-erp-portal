"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { showToast } from "@/lib/toast";

type TradeStructureRow = {
  instituteCode: string;
  instituteName: string;
  tradeCode: string;
  tradeName: string;
  duration: string;
  unitCount: number;
  seatsPerUnit: number;
  batchLabels: string[];
  shiftName: string;
};

type ShiftRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export function AcademicStructurePanel({
  selectedInstituteCode,
  embedded = false
}: {
  selectedInstituteCode?: string;
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [tradeStructures, setTradeStructures] = useState<TradeStructureRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/academic-structure");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load academic structure settings");
      setLoading(false);
      return;
    }

    setTradeStructures(Array.isArray(result.config?.tradeStructures) ? result.config.tradeStructures : []);
    setShifts(Array.isArray(result.config?.shifts) ? result.config.shifts : []);
    setUpdatedAt(String(result.config?.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  const visibleTradeStructures = selectedInstituteCode
    ? tradeStructures.filter((item) => item.instituteCode === selectedInstituteCode)
    : tradeStructures;

  async function saveConfig() {
    setSaving(true);
    setError("");

    const payload = {
      tradeStructures: tradeStructures.map((item) => ({
        instituteCode: item.instituteCode,
        tradeCode: item.tradeCode,
        unitCount: item.unitCount,
        seatsPerUnit: item.seatsPerUnit,
        batchLabels: item.batchLabels,
        shiftName: item.shiftName
      })),
      shifts
    };

    const response = await fetch("/api/settings/academic-structure", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save academic structure settings";
      setError(nextError);
      showToast({ kind: "error", title: "Academic structure not saved", message: nextError });
      setSaving(false);
      return;
    }

    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({
      kind: "success",
      title: "Academic structure saved",
      message: "Unit, batch, and shift controls are updated for the institute masters."
    });
    setSaving(false);
  }

  function addShift() {
    setShifts((current) => [
      ...current,
      {
        id: `shift-${current.length + 1}`,
        name: "",
        startTime: "09:00",
        endTime: "13:00",
        isActive: true
      }
    ]);
  }

  return (
    <section className={`surface w-full max-w-full overflow-hidden ${embedded ? "p-0 shadow-none" : "p-6"}`}>
      <div className={embedded ? "border-b border-slate-100 px-6 py-5" : "flex flex-wrap items-center justify-between gap-3"}>
        <div className={embedded ? "flex flex-wrap items-center justify-between gap-3" : ""}>
          <div>
            <p className="eyebrow-compact">Academic Structure Master</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Unit, Batch & Shift Control</h3>
            <p className="mt-2 text-sm text-slate-600">
              Keep trade-wise unit count, seats per unit, default batches, and institute shift timings in one place for future admissions and timetable control.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-success">{visibleTradeStructures.length} trade structures</span>
            <span className="chip-warning">{shifts.length} shifts</span>
            {updatedAt ? (
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Updated {new Date(updatedAt).toLocaleString("en-IN")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <section className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow-compact">Trade Unit Matrix</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Trade-wise Unit & Batch Rules</h4>
              </div>
              <span className="chip-success">Admissions-ready</span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-3 py-3">Institute</th>
                    <th className="px-3 py-3">Trade</th>
                    <th className="px-3 py-3">Duration</th>
                    <th className="px-3 py-3">Units</th>
                    <th className="px-3 py-3">Seats / Unit</th>
                    <th className="px-3 py-3">Batch Labels</th>
                    <th className="px-3 py-3">Default Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTradeStructures.map((row) => (
                    <tr key={`${row.instituteCode}-${row.tradeCode}`} className="border-b border-slate-100 align-top text-sm text-slate-700">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">{row.instituteName}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.instituteCode}</p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">{row.tradeName}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.tradeCode}</p>
                      </td>
                      <td className="px-3 py-4">{row.duration || "-"}</td>
                      <td className="px-3 py-4">
                        <input
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          min={1}
                          type="number"
                          value={row.unitCount}
                          onChange={(event) =>
                            setTradeStructures((current) =>
                              current.map((item) =>
                                item.instituteCode === row.instituteCode && item.tradeCode === row.tradeCode
                                  ? { ...item, unitCount: Number(event.target.value) || 1 }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-4">
                        <input
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          min={1}
                          type="number"
                          value={row.seatsPerUnit}
                          onChange={(event) =>
                            setTradeStructures((current) =>
                              current.map((item) =>
                                item.instituteCode === row.instituteCode && item.tradeCode === row.tradeCode
                                  ? { ...item, seatsPerUnit: Number(event.target.value) || 1 }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-4">
                        <input
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="A, B"
                          value={row.batchLabels.join(", ")}
                          onChange={(event) =>
                            setTradeStructures((current) =>
                              current.map((item) =>
                                item.instituteCode === row.instituteCode && item.tradeCode === row.tradeCode
                                  ? {
                                      ...item,
                                      batchLabels: event.target.value
                                        .split(",")
                                        .map((label) => label.trim())
                                        .filter(Boolean)
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-4">
                        <input
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          value={row.shiftName}
                          onChange={(event) =>
                            setTradeStructures((current) =>
                              current.map((item) =>
                                item.instituteCode === row.instituteCode && item.tradeCode === row.tradeCode
                                  ? { ...item, shiftName: event.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow-compact">Shift Master</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Shift & Timing Controls</h4>
              </div>
              <button className="btn-secondary" onClick={addShift} type="button">
                Add Shift
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              {shifts.map((shift, index) => (
                <article key={shift.id || index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Input
                      label="Shift Name"
                      value={shift.name}
                      onChange={(event) =>
                        setShifts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item))
                        )
                      }
                    />
                    <Input
                      label="Start Time"
                      type="time"
                      value={shift.startTime}
                      onChange={(event) =>
                        setShifts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, startTime: event.target.value } : item))
                        )
                      }
                    />
                    <Input
                      label="End Time"
                      type="time"
                      value={shift.endTime}
                      onChange={(event) =>
                        setShifts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, endTime: event.target.value } : item))
                        )
                      }
                    />
                    <div className="flex items-end">
                      <ToggleSwitch
                        checked={shift.isActive}
                        label={shift.isActive ? "Active shift" : "Inactive shift"}
                        onChange={(nextValue) =>
                          setShifts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, isActive: nextValue } : item))
                          )
                        }
                        variant={shift.isActive ? "success" : "neutral"}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" disabled={saving} onClick={saveConfig} type="button">
              {saving ? "Saving..." : "Save Academic Structure"}
            </button>
            <button className="btn-secondary" onClick={() => void loadConfig()} type="button">
              Reload
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
