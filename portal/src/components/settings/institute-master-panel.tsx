"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { Select } from "@/components/ui/select";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";
import { AcademicStructurePanel } from "@/components/settings/academic-structure-panel";

type InstituteRow = {
  id: string;
  instituteCode: string;
  name: string;
  scvtCode: string;
  sidhCode: string;
  address: string;
  status: boolean;
};

type TradeRow = {
  id: string;
  instituteCode: string;
  tradeCode: string;
  name: string;
  duration: string;
  ncvtScvt: string;
  standardFees: string;
  isActive: boolean;
};

const instituteFormDefaults = {
  instituteCode: "",
  name: "",
  scvtCode: "",
  sidhCode: "",
  address: "",
  status: true
};

const tradeFormDefaults = {
  instituteCode: "",
  tradeCode: "",
  name: "",
  duration: "",
  ncvtScvt: "",
  standardFees: "",
  isActive: true
};

export function InstituteMasterPanel() {
  const [loading, setLoading] = useState(true);
  const [savingInstitute, setSavingInstitute] = useState(false);
  const [savingTrade, setSavingTrade] = useState(false);
  const [error, setError] = useState("");
  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [selectedInstituteCode, setSelectedInstituteCode] = useState("");
  const [instituteForm, setInstituteForm] = useState(instituteFormDefaults);
  const [tradeForm, setTradeForm] = useState(tradeFormDefaults);

  const instituteOptions: SelectOption[] = institutes.map((item) => ({
    label: `${item.name} (${item.instituteCode})`,
    value: item.instituteCode
  }));

  async function loadData() {
    setLoading(true);
    setError("");

    const [institutesResponse, tradesResponse] = await Promise.all([
      fetch("/api/settings/institutes"),
      fetch("/api/settings/trades")
    ]);
    const [institutesResult, tradesResult] = await Promise.all([
      institutesResponse.json(),
      tradesResponse.json()
    ]);

    if (!institutesResponse.ok) {
      setError(institutesResult?.message || "Unable to load institute masters");
      setLoading(false);
      return;
    }

    if (!tradesResponse.ok) {
      setError(tradesResult?.message || "Unable to load trade masters");
      setLoading(false);
      return;
    }

    setInstitutes(Array.isArray(institutesResult?.institutes) ? institutesResult.institutes : []);
    setTrades(Array.isArray(tradesResult?.trades) ? tradesResult.trades : []);
    const nextInstitutes = Array.isArray(institutesResult?.institutes) ? institutesResult.institutes : [];
    setSelectedInstituteCode((current) =>
      current && nextInstitutes.some((item: InstituteRow) => item.instituteCode === current)
        ? current
        : String(nextInstitutes[0]?.instituteCode || "")
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedInstitute = institutes.find((item) => item.instituteCode === selectedInstituteCode) || null;
  const selectedInstituteTrades = trades.filter((item) => item.instituteCode === selectedInstituteCode);

  async function createInstitute() {
    setSavingInstitute(true);
    setError("");
    const response = await fetch("/api/settings/institutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(instituteForm)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save institute";
      setError(nextError);
      showToast({ kind: "error", title: "Institute not saved", message: nextError });
      setSavingInstitute(false);
      return;
    }

    setInstituteForm(instituteFormDefaults);
    showToast({ kind: "success", title: "Institute saved", message: `${result.institute?.name || "Institute"} is ready for use.` });
    await loadData();
    setSavingInstitute(false);
  }

  async function createTrade() {
    setSavingTrade(true);
    setError("");
    const response = await fetch("/api/settings/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tradeForm)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save trade";
      setError(nextError);
      showToast({ kind: "error", title: "Trade not saved", message: nextError });
      setSavingTrade(false);
      return;
    }

    setTradeForm(tradeFormDefaults);
    showToast({ kind: "success", title: "Trade saved", message: `${result.trade?.name || "Trade"} added to master.` });
    await loadData();
    setSavingTrade(false);
  }

  async function updateInstitute(item: InstituteRow) {
    const response = await fetch(`/api/settings/institutes/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Institute not updated", message: result?.message || "Unable to update institute" });
      return;
    }

    setInstitutes((current) => current.map((row) => (row.id === item.id ? result.institute : row)));
    showToast({ kind: "success", title: "Institute updated", message: `${result.institute?.name || "Institute"} updated.` });
  }

  async function updateTrade(item: TradeRow) {
    const response = await fetch(`/api/settings/trades/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Trade not updated", message: result?.message || "Unable to update trade" });
      return;
    }

    setTrades((current) => current.map((row) => (row.id === item.id ? result.trade : row)));
    showToast({ kind: "success", title: "Trade updated", message: `${result.trade?.name || "Trade"} updated.` });
  }

  return (
    <section className="surface w-full max-w-full overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Institute Setup</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Institute & Trade Masters</h3>
          <p className="mt-2 text-sm text-slate-600">Choose an institute first, then manage that institute and its trade setup from one place instead of scattered edits.</p>
        </div>
        <span className="chip-warning">{institutes.length} institutes • {trades.length} trades</span>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:items-end">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Choose Institute</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  value={selectedInstituteCode}
                  onChange={(event) => setSelectedInstituteCode(event.target.value)}
                >
                  {institutes.map((item) => (
                    <option key={item.id} value={item.instituteCode}>
                      {item.name} ({item.instituteCode})
                    </option>
                  ))}
                </select>
              </div>
              {selectedInstitute ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="eyebrow-compact">{selectedInstitute.instituteCode}</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">{selectedInstitute.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">Only the selected institute setup is shown below.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <div>
                <p className="eyebrow-compact">New Institute</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Add Institute</h4>
              </div>
              <div className="mt-4 grid gap-4">
                <Input label="Institute Code" required value={instituteForm.instituteCode} onChange={(event) => setInstituteForm((current) => ({ ...current, instituteCode: event.target.value.toUpperCase() }))} />
                <Input label="Institute Name" required value={instituteForm.name} onChange={(event) => setInstituteForm((current) => ({ ...current, name: event.target.value }))} />
                <Input label="SCVT Code" value={instituteForm.scvtCode} onChange={(event) => setInstituteForm((current) => ({ ...current, scvtCode: event.target.value }))} />
                <Input label="SIDH Code" value={instituteForm.sidhCode} onChange={(event) => setInstituteForm((current) => ({ ...current, sidhCode: event.target.value }))} />
                <Input label="Address" value={instituteForm.address} onChange={(event) => setInstituteForm((current) => ({ ...current, address: event.target.value }))} />
                <ToggleSwitch checked={instituteForm.status} label={instituteForm.status ? "Active institute" : "Inactive institute"} onChange={(nextValue) => setInstituteForm((current) => ({ ...current, status: nextValue }))} variant={instituteForm.status ? "success" : "neutral"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="btn-primary" disabled={savingInstitute} onClick={() => void createInstitute()} type="button">
                  {savingInstitute ? "Saving..." : "Save Institute"}
                </button>
                <button className="btn-secondary" onClick={() => setInstituteForm(instituteFormDefaults)} type="button">
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <div>
                <p className="eyebrow-compact">New Trade</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Add Trade</h4>
              </div>
              <div className="mt-4 grid gap-4">
                <Select label="Institute" required options={instituteOptions} value={tradeForm.instituteCode} onChange={(event) => setTradeForm((current) => ({ ...current, instituteCode: event.target.value }))} />
                <Input label="Trade Code" required value={tradeForm.tradeCode} onChange={(event) => setTradeForm((current) => ({ ...current, tradeCode: event.target.value.toUpperCase() }))} />
                <Input label="Trade Name" required value={tradeForm.name} onChange={(event) => setTradeForm((current) => ({ ...current, name: event.target.value }))} />
                <Input label="Duration" helperText="Example: 1 Year / 2 Year" value={tradeForm.duration} onChange={(event) => setTradeForm((current) => ({ ...current, duration: event.target.value }))} />
                <Input label="NCVT / SCVT" helperText="Optional" value={tradeForm.ncvtScvt} onChange={(event) => setTradeForm((current) => ({ ...current, ncvtScvt: event.target.value }))} />
                <Input label="Standard Fees" helperText="Optional" value={tradeForm.standardFees} onChange={(event) => setTradeForm((current) => ({ ...current, standardFees: event.target.value }))} />
                <ToggleSwitch checked={tradeForm.isActive} label={tradeForm.isActive ? "Active trade" : "Inactive trade"} onChange={(nextValue) => setTradeForm((current) => ({ ...current, isActive: nextValue }))} variant={tradeForm.isActive ? "success" : "neutral"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="btn-primary" disabled={savingTrade} onClick={() => void createTrade()} type="button">
                  {savingTrade ? "Saving..." : "Save Trade"}
                </button>
                <button className="btn-secondary" onClick={() => setTradeForm(tradeFormDefaults)} type="button">
                  Reset
                </button>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow-compact">Selected Institute</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">Institute Settings</h4>
                </div>
                <button className="btn-secondary" onClick={() => void loadData()} type="button">
                  Reload
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {selectedInstitute ? (
                  <div key={selectedInstitute.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="grid gap-3">
                      <Input label="Institute Code" value={selectedInstitute.instituteCode} onChange={(event) => setInstitutes((current) => current.map((row) => (row.id === selectedInstitute.id ? { ...row, instituteCode: event.target.value.toUpperCase() } : row)))} />
                      <Input label="Institute Name" value={selectedInstitute.name} onChange={(event) => setInstitutes((current) => current.map((row) => (row.id === selectedInstitute.id ? { ...row, name: event.target.value } : row)))} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input label="SCVT Code" value={selectedInstitute.scvtCode} onChange={(event) => setInstitutes((current) => current.map((row) => (row.id === selectedInstitute.id ? { ...row, scvtCode: event.target.value } : row)))} />
                        <Input label="SIDH Code" value={selectedInstitute.sidhCode} onChange={(event) => setInstitutes((current) => current.map((row) => (row.id === selectedInstitute.id ? { ...row, sidhCode: event.target.value } : row)))} />
                      </div>
                      <Input label="Address" value={selectedInstitute.address} onChange={(event) => setInstitutes((current) => current.map((row) => (row.id === selectedInstitute.id ? { ...row, address: event.target.value } : row)))} />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <ToggleSwitch checked={selectedInstitute.status} label={selectedInstitute.status ? "Active institute" : "Inactive institute"} onChange={(nextValue) => setInstitutes((current) => current.map((row) => (row.id === selectedInstitute.id ? { ...row, status: nextValue } : row)))} variant={selectedInstitute.status ? "success" : "neutral"} />
                        <button className="btn-secondary" onClick={() => void updateInstitute(selectedInstitute)} type="button">
                          Save Institute
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-slate-500">
                    No institute selected.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <div>
                <p className="eyebrow-compact">Selected Institute Trades</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Trade Settings</h4>
              </div>
              <div className="mt-4 space-y-4">
                {selectedInstituteTrades.length ? (
                  selectedInstituteTrades.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="grid gap-3">
                      <Select label="Institute" options={instituteOptions} value={item.instituteCode} onChange={(event) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, instituteCode: event.target.value } : row)))} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input label="Trade Code" value={item.tradeCode} onChange={(event) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, tradeCode: event.target.value.toUpperCase() } : row)))} />
                        <Input label="Trade Name" value={item.name} onChange={(event) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, name: event.target.value } : row)))} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input label="Duration" value={item.duration} onChange={(event) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, duration: event.target.value } : row)))} />
                        <Input label="NCVT / SCVT" value={item.ncvtScvt} onChange={(event) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, ncvtScvt: event.target.value } : row)))} />
                        <Input label="Standard Fees" value={item.standardFees} onChange={(event) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, standardFees: event.target.value } : row)))} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <ToggleSwitch checked={item.isActive} label={item.isActive ? "Active trade" : "Inactive trade"} onChange={(nextValue) => setTrades((current) => current.map((row) => (row.id === item.id ? { ...row, isActive: nextValue } : row)))} variant={item.isActive ? "success" : "neutral"} />
                        <button className="btn-secondary" onClick={() => void updateTrade(item)} type="button">
                          Save Trade
                        </button>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-slate-500">
                    No trades found for the selected institute.
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedInstituteCode ? <AcademicStructurePanel embedded selectedInstituteCode={selectedInstituteCode} /> : null}
        </div>
      )}
    </section>
  );
}
