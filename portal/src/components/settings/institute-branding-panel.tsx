"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";

type BrandingRow = {
  instituteCode: string;
  instituteName: string;
  campusName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  principalName: string;
  ncvtCode: string;
  affiliationNumber: string;
  affiliationValidFrom: string;
  affiliationValidTo: string;
  logoUrl: string;
  sealUrl: string;
  signatureUrl: string;
  signatureLabel: string;
  certificateFooterText: string;
  receiptHeaderText: string;
};

export function InstituteBrandingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [rows, setRows] = useState<BrandingRow[]>([]);
  const [selectedInstituteCode, setSelectedInstituteCode] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState<"" | "logo" | "seal" | "signature">("");

  async function loadConfig() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/settings/institute-branding");
    const result = await response.json();

    if (!response.ok) {
      setError(result?.message || "Unable to load institute branding settings");
      setLoading(false);
      return;
    }

    setRows(Array.isArray(result.config?.institutes) ? result.config.institutes : []);
    const nextRows = Array.isArray(result.config?.institutes) ? result.config.institutes : [];
    setSelectedInstituteCode((current) =>
      current && nextRows.some((item: BrandingRow) => item.instituteCode === current)
        ? current
        : String(nextRows[0]?.instituteCode || "")
    );
    setUpdatedAt(String(result.config?.updatedAt || ""));
    setLoading(false);
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  const selectedRow = rows.find((item) => item.instituteCode === selectedInstituteCode) || null;

  function updateSelectedRow(patch: Partial<BrandingRow>) {
    if (!selectedInstituteCode) return;
    setRows((current) =>
      current.map((row) => (row.instituteCode === selectedInstituteCode ? { ...row, ...patch } : row))
    );
  }

  async function uploadAsset(assetType: "logo" | "seal" | "signature", file: File | null) {
    if (!selectedRow || !file) return;
    setUploadingAsset(assetType);

    const formData = new FormData();
    formData.append("instituteCode", selectedRow.instituteCode);
    formData.append("assetType", assetType);
    formData.append("file", file);

    const response = await fetch("/api/settings/institute-branding/upload", {
      method: "POST",
      body: formData
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Upload failed",
        message: result?.message || "Unable to upload branding file."
      });
      setUploadingAsset("");
      return;
    }

    if (assetType === "logo") updateSelectedRow({ logoUrl: String(result.fileUrl || "") });
    if (assetType === "seal") updateSelectedRow({ sealUrl: String(result.fileUrl || "") });
    if (assetType === "signature") updateSelectedRow({ signatureUrl: String(result.fileUrl || "") });

    showToast({
      kind: "success",
      title: "Upload complete",
      message: `${assetType} uploaded for ${selectedRow.instituteName}. Save settings to keep it.`
    });
    setUploadingAsset("");
  }

  async function saveConfig() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/settings/institute-branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institutes: rows })
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to save institute branding settings";
      setError(nextError);
      showToast({ kind: "error", title: "Institute branding not saved", message: nextError });
      setSaving(false);
      return;
    }

    setUpdatedAt(String(result.config?.updatedAt || ""));
    showToast({
      kind: "success",
      title: "Institute branding saved",
      message: "Campus, contact, affiliation, and print branding settings are updated."
    });
    setSaving(false);
  }

  return (
    <section className="surface w-full max-w-full overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Institute Branding & Affiliation</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Campus, Contact, Affiliation & Print Identity
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Keep institute contact details, NCVT affiliation references, and print identity fields together so certificates,
            receipts, and future public pages can use the same source.
          </p>
        </div>
        {updatedAt ? (
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Updated {new Date(updatedAt).toLocaleString("en-IN")}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : (
          <div className="mt-6 space-y-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:items-end">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Choose Institute</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  value={selectedInstituteCode}
                  onChange={(event) => setSelectedInstituteCode(event.target.value)}
                >
                  {rows.map((item) => (
                    <option key={item.instituteCode} value={item.instituteCode}>
                      {item.instituteName} ({item.instituteCode})
                    </option>
                  ))}
                </select>
              </div>
              {selectedRow ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="eyebrow-compact">{selectedRow.instituteCode}</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">{selectedRow.instituteName}</h4>
                  <p className="mt-1 text-sm text-slate-600">Only the selected institute settings are shown below.</p>
                </div>
              ) : null}
            </div>
          </div>

          {selectedRow ? (
            <article key={selectedRow.instituteCode} className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow-compact">{selectedRow.instituteCode}</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">{selectedRow.instituteName}</h4>
                </div>
                <span className="chip-success">Branding master</span>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <Input
                  label="Campus / Branch Name"
                  value={selectedRow.campusName}
                  onChange={(event) => updateSelectedRow({ campusName: event.target.value })}
                />
                <Input
                  label="Principal / Head Name"
                  value={selectedRow.principalName}
                  onChange={(event) => updateSelectedRow({ principalName: event.target.value })}
                />
                <Input
                  label="Contact Phone"
                  value={selectedRow.contactPhone}
                  onChange={(event) => updateSelectedRow({ contactPhone: event.target.value })}
                />
                <Input
                  label="Contact Email"
                  value={selectedRow.contactEmail}
                  onChange={(event) => updateSelectedRow({ contactEmail: event.target.value })}
                />
                <Input
                  label="Website"
                  value={selectedRow.website}
                  onChange={(event) => updateSelectedRow({ website: event.target.value })}
                />
                <Input
                  label="NCVT Code"
                  value={selectedRow.ncvtCode}
                  onChange={(event) => updateSelectedRow({ ncvtCode: event.target.value })}
                />
                <Input
                  label="Affiliation Number"
                  value={selectedRow.affiliationNumber}
                  onChange={(event) => updateSelectedRow({ affiliationNumber: event.target.value })}
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                  <Input
                    label="Affiliation Valid From"
                    type="date"
                    value={selectedRow.affiliationValidFrom}
                    onChange={(event) => updateSelectedRow({ affiliationValidFrom: event.target.value })}
                  />
                  <Input
                    label="Affiliation Valid To"
                    type="date"
                    value={selectedRow.affiliationValidTo}
                    onChange={(event) => updateSelectedRow({ affiliationValidTo: event.target.value })}
                  />
                </div>
                <Input
                  label="Logo URL"
                  value={selectedRow.logoUrl}
                  onChange={(event) => updateSelectedRow({ logoUrl: event.target.value })}
                />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Upload Logo</label>
                  <input
                    className="mt-2 block w-full text-sm text-slate-700"
                    accept="image/*"
                    onChange={(event) => void uploadAsset("logo", event.target.files?.[0] || null)}
                    type="file"
                  />
                  {selectedRow.logoUrl ? <img alt="Institute logo preview" className="mt-3 h-24 w-24 rounded-2xl border border-slate-200 object-contain bg-white p-2" src={selectedRow.logoUrl} /> : null}
                </div>
                <Input
                  label="Seal URL"
                  value={selectedRow.sealUrl}
                  onChange={(event) => updateSelectedRow({ sealUrl: event.target.value })}
                />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Upload Seal</label>
                  <input
                    className="mt-2 block w-full text-sm text-slate-700"
                    accept="image/*"
                    onChange={(event) => void uploadAsset("seal", event.target.files?.[0] || null)}
                    type="file"
                  />
                  {selectedRow.sealUrl ? <img alt="Institute seal preview" className="mt-3 h-24 w-24 rounded-2xl border border-slate-200 object-contain bg-white p-2" src={selectedRow.sealUrl} /> : null}
                </div>
                <Input
                  label="Signature URL"
                  value={selectedRow.signatureUrl}
                  onChange={(event) => updateSelectedRow({ signatureUrl: event.target.value })}
                />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Upload Signature</label>
                  <input
                    className="mt-2 block w-full text-sm text-slate-700"
                    accept="image/*"
                    onChange={(event) => void uploadAsset("signature", event.target.files?.[0] || null)}
                    type="file"
                  />
                  {selectedRow.signatureUrl ? <img alt="Institute signature preview" className="mt-3 h-24 w-40 rounded-2xl border border-slate-200 object-contain bg-white p-2" src={selectedRow.signatureUrl} /> : null}
                </div>
                <Input
                  label="Signature Label"
                  value={selectedRow.signatureLabel}
                  onChange={(event) => updateSelectedRow({ signatureLabel: event.target.value })}
                />
                <div className="xl:col-span-2">
                  <Input
                    label="Certificate Footer Text"
                    value={selectedRow.certificateFooterText}
                    onChange={(event) => updateSelectedRow({ certificateFooterText: event.target.value })}
                  />
                </div>
                <div className="xl:col-span-2">
                  <Input
                    label="Receipt Header Text"
                    value={selectedRow.receiptHeaderText}
                    onChange={(event) => updateSelectedRow({ receiptHeaderText: event.target.value })}
                  />
                </div>
              </div>
            </article>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white px-4 py-8 text-center text-slate-500">
              No institute branding records found yet.
            </div>
          )}

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" disabled={saving} onClick={saveConfig} type="button">
              {saving ? "Saving..." : uploadingAsset ? `Uploading ${uploadingAsset}...` : "Save Institute Branding"}
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
