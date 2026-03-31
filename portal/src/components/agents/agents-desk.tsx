"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { showToast } from "@/lib/toast";

type AgentRow = {
  id: string;
  agentCode: string;
  name: string;
  mobile: string | null;
  defaultAgreement: string | null;
  defaultValue: string;
  isActive: boolean;
  createdAt: string;
};

const defaultForm = {
  agentCode: "",
  name: "",
  mobile: "",
  defaultAgreement: "",
  defaultValue: ""
};

export function AgentsDesk() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [form, setForm] = useState(defaultForm);

  async function loadAgents() {
    setLoading(true);
    setError("");
    const [response, previewResponse] = await Promise.all([fetch("/api/agents"), fetch("/api/agents?preview=code")]);
    const [result, previewResult] = await Promise.all([response.json(), previewResponse.json()]);

    if (!response.ok) {
      setError(result?.message || "Unable to load agents");
      setLoading(false);
      return;
    }

    setAgents(Array.isArray(result?.agents) ? result.agents : []);
    setForm((current) => ({
      ...current,
      agentCode: current.agentCode || String(previewResult?.code || "")
    }));
    setLoading(false);
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  async function createAgent() {
    setSaving(true);
    setError("");

    const response = await fetch("/api/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to create agent";
      setError(nextError);
      showToast({ kind: "error", title: "Agent not saved", message: nextError });
      setSaving(false);
      return;
    }

    setForm(defaultForm);
    showToast({ kind: "success", title: "Agent saved", message: `${result.agent?.name || "Agent"} is now available.` });
    await loadAgents();
    setSaving(false);
  }

  async function updateAgent(agentId: string, payload: Partial<AgentRow>) {
    const response = await fetch(`/api/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to update agent";
      setError(nextError);
      showToast({ kind: "error", title: "Agent not updated", message: nextError });
      return;
    }

    setAgents((current) => current.map((item) => (item.id === agentId ? { ...item, ...result.agent } : item)));
    showToast({ kind: "success", title: "Agent updated", message: `${result.agent?.name || "Agent"} updated successfully.` });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">New Agent</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Register Agent</h3>
          </div>
          <span className="chip-warning">{agents.length} total</span>
        </div>

        <div className="mt-6 grid gap-4">
          <Input label="Agent Code" helperText="Auto-filled from numbering settings. You can still edit it." required value={form.agentCode} onChange={(event) => setForm((current) => ({ ...current, agentCode: event.target.value }))} />
          <Input label="Agent Name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Mobile" value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} />
          <Input label="Default Agreement" helperText="Example: per student, lump sum, percentage" value={form.defaultAgreement} onChange={(event) => setForm((current) => ({ ...current, defaultAgreement: event.target.value }))} />
          <Input label="Default Value" helperText="Optional default amount or rate" value={form.defaultValue} onChange={(event) => setForm((current) => ({ ...current, defaultValue: event.target.value }))} />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={saving} onClick={() => void createAgent()} type="button">
            {saving ? "Saving..." : "Save Agent"}
          </button>
          <button className="btn-secondary" onClick={() => setForm(defaultForm)} type="button">
            Reset
          </button>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Agent List</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Active Registry</h3>
          </div>
          <button className="btn-secondary" onClick={() => void loadAgents()} type="button">
            Reload
          </button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {agents.length ? (
              agents.map((agent) => (
                <article key={agent.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{agent.agentCode}</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">{agent.name}</h4>
                      <p className="mt-2 text-sm text-slate-600">
                        {agent.mobile || "No mobile"} • {agent.defaultAgreement || "No agreement set"} • {agent.defaultValue || "No default value"}
                      </p>
                    </div>
                    <div className="min-w-[220px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <ToggleSwitch
                        checked={agent.isActive}
                        label={agent.isActive ? "Active agent" : "Inactive agent"}
                        onChange={(nextValue) => void updateAgent(agent.id, { isActive: nextValue })}
                        variant={agent.isActive ? "success" : "neutral"}
                      />
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Created {new Date(agent.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No agents registered yet.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
