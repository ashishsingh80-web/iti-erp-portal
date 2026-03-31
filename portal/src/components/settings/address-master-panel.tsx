"use client";

import { useEffect, useState } from "react";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { Textarea } from "@/components/ui/textarea";
import { recommendedAddressPresetJson } from "@/lib/address-import-presets";
import { showToast } from "@/lib/toast";

export function AddressMasterPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [stats, setStats] = useState({
    states: 0,
    districts: 0,
    tehsils: 0,
    blocks: 0,
    wards: 0
  });
  const [payload, setPayload] = useState(recommendedAddressPresetJson);
  const [districtsFile, setDistrictsFile] = useState<File | null>(null);
  const [subDistrictsFile, setSubDistrictsFile] = useState<File | null>(null);

  async function loadConfig() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/settings/address-masters");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load address master settings");
      setLoading(false);
      return;
    }

    const hierarchy = result?.config?.hierarchy;
    setPayload(
      hierarchy && Object.keys(hierarchy).length ? JSON.stringify(hierarchy, null, 2) : recommendedAddressPresetJson
    );
    setUpdatedAt(String(result?.config?.updatedAt || ""));
    setStats({
      states: Number(result?.merged?.stats?.states || 0),
      districts: Number(result?.merged?.stats?.districts || 0),
      tehsils: Number(result?.merged?.stats?.tehsils || 0),
      blocks: Number(result?.merged?.stats?.blocks || 0),
      wards: Number(result?.merged?.stats?.wards || 0)
    });
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    setError("");

    try {
      const hierarchy = JSON.parse(payload);
      const response = await fetch("/api/settings/address-masters", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ hierarchy })
      });
      const result = await response.json();

      if (!response.ok) {
        const nextError = result?.message || "Unable to save address master settings";
        setError(nextError);
        showToast({ kind: "error", title: "Address masters not saved", message: nextError });
        setSaving(false);
        return;
      }

      setUpdatedAt(String(result?.config?.updatedAt || ""));
      setStats({
        states: Number(result?.merged?.stats?.states || 0),
        districts: Number(result?.merged?.stats?.districts || 0),
        tehsils: Number(result?.merged?.stats?.tehsils || 0),
        blocks: Number(result?.merged?.stats?.blocks || 0),
        wards: Number(result?.merged?.stats?.wards || 0)
      });
      showToast({
        kind: "success",
        title: "Address masters saved",
        message: "Admission address dropdowns now use the updated hierarchy."
      });
    } catch (parseError) {
      const nextError = parseError instanceof Error ? parseError.message : "Invalid JSON";
      setError(nextError);
      showToast({ kind: "error", title: "Invalid address JSON", message: nextError });
    } finally {
      setSaving(false);
    }
  }

  async function importLgdFiles() {
    if (!districtsFile || !subDistrictsFile) {
      const nextError = "Select both LGD district and sub-district CSV files first";
      setError(nextError);
      showToast({ kind: "error", title: "LGD import not started", message: nextError });
      return;
    }

    setImporting(true);
    setError("");

    const formData = new FormData();
    formData.append("districtsFile", districtsFile);
    formData.append("subDistrictsFile", subDistrictsFile);

    const response = await fetch("/api/settings/address-masters/import", {
      method: "POST",
      body: formData
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to import LGD files";
      setError(nextError);
      showToast({ kind: "error", title: "LGD import failed", message: nextError });
      setImporting(false);
      return;
    }

    setUpdatedAt(String(result?.config?.updatedAt || ""));
    setPayload(JSON.stringify(result?.config?.hierarchy || {}, null, 2));
    setStats({
      states: Number(result?.merged?.stats?.states || 0),
      districts: Number(result?.merged?.stats?.districts || 0),
      tehsils: Number(result?.merged?.stats?.tehsils || 0),
      blocks: Number(result?.merged?.stats?.blocks || 0),
      wards: Number(result?.merged?.stats?.wards || 0)
    });
    showToast({
      kind: "success",
      title: "LGD import completed",
      message: "District and sub-district masters are now loaded into the portal."
    });
    setImporting(false);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Address Master</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">India Address Import</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Paste LGD-style hierarchy JSON here to expand district, tehsil, block, and ward dropdowns without changing code.
          </p>
        </div>
        {updatedAt ? (
          <p className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Updated {new Date(updatedAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-80" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">States</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.states}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Districts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.districts}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tehsils</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.tehsils}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Blocks</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.blocks}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Wards</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.wards}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Use this to import a broader LGD-based hierarchy. The full state/UT list is already built in; this panel expands the lower levels.
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            A ready preset is included for your main working regions. Click `Load Recommended Preset` if you want a strong starting hierarchy before pasting a larger LGD export.
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Official LGD Import</p>
            <p className="mt-2 text-sm text-slate-600">
              Upload the official LGD District and Sub-District CSV files from data.gov.in. This importer builds the wider State → District → Tehsil hierarchy automatically. Blocks and wards can still be refined through the JSON editor.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">LGD Districts CSV</p>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setDistrictsFile(event.target.files?.[0] || null)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">LGD Sub-Districts CSV</p>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setSubDistrictsFile(event.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={importing}
                onClick={() => void importLgdFiles()}
                type="button"
              >
                {importing ? "Importing LGD Files..." : "Import LGD Files"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <Textarea
              label="Address Hierarchy JSON"
              helperText='Format: State -> districts -> tehsils -> blocks -> wards. Example: "Uttar Pradesh" -> "Lucknow" -> "Bakshi Ka Talab" -> "BKT" -> "Ward 1".'
              rows={18}
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
            />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={saveConfig}
              type="button"
            >
              {saving ? "Saving..." : "Save Address Masters"}
            </button>
            <button
              className="rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-900"
              onClick={() => {
                setPayload(recommendedAddressPresetJson);
                setError("");
                showToast({
                  kind: "info",
                  title: "Recommended preset loaded",
                  message: "Save it to make the broader address hierarchy live."
                });
              }}
              type="button"
            >
              Load Recommended Preset
            </button>
            <button
              className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800"
              onClick={() => void loadConfig()}
              type="button"
            >
              Reload
            </button>
          </div>
        </>
      )}
    </section>
  );
}
