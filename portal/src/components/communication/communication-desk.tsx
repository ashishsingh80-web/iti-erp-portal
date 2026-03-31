"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchJsonSafe } from "@/lib/fetch-json";
import { showToast } from "@/lib/toast";

type TemplateRow = {
  id: string;
  title: string;
  category: string;
  channel: string;
  subjectLine: string;
  bodyText: string;
  isActive: boolean;
};

type LogRow = {
  id: string;
  title: string;
  channel: string;
  targetType: string;
  targetName: string;
  targetMobile: string;
  targetEmail: string;
  status: string;
  createdBy: string;
  createdAt: string;
  note: string;
  category: string;
};

type TargetRow = {
  targetType: string;
  targetId: string;
  targetName: string;
  targetMobile: string;
  targetEmail: string;
  category: string;
  helper: string;
  defaultMessage: string;
};

const channelOptions = [
  { label: "SMS", value: "SMS" },
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "Email", value: "EMAIL" },
  { label: "Call", value: "CALL" }
];

const categoryOptions = [
  { label: "Fees Due", value: "FEES_DUE" },
  { label: "Documents Pending", value: "DOCUMENTS_PENDING" },
  { label: "Scholarship Query", value: "SCHOLARSHIP_QUERY" },
  { label: "Enquiry Follow-up", value: "ENQUIRY_FOLLOW_UP" },
  { label: "General Notice", value: "GENERAL_NOTICE" }
];

const defaultTemplateForm = {
  title: "",
  category: "GENERAL_NOTICE",
  channel: "SMS",
  subjectLine: "",
  bodyText: ""
};

const defaultMessageForm = {
  templateId: "",
  channel: "SMS",
  targetType: "STUDENT",
  targetId: "",
  targetName: "",
  targetMobile: "",
  targetEmail: "",
  subjectLine: "",
  bodyText: "",
  note: ""
};

export function CommunicationDesk() {
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);
  const [messageForm, setMessageForm] = useState(defaultMessageForm);
  const [sendingReady, setSendingReady] = useState(false);
  const [sendingById, setSendingById] = useState<Record<string, boolean>>({});

  async function loadData(nextSearch = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      const response = await fetch(`/api/communication?${params.toString()}`);
      const result = await fetchJsonSafe(response);
      if (!response.ok) {
        showToast({ kind: "error", title: "Communication load failed", message: (result as any)?.message || "Unable to load communication desk" });
        setTemplates([]);
        setLogs([]);
        setTargets([]);
        return;
      }
      setTemplates((result as any).templates || []);
      setLogs((result as any).logs || []);
      setTargets((result as any).reminderTargets || []);
    } catch (error) {
      showToast({
        kind: "error",
        title: "Communication load failed",
        message: error instanceof Error ? error.message : "Unable to load communication desk"
      });
      setTemplates([]);
      setLogs([]);
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    try {
      const response = await fetch("/api/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "template",
          ...templateForm
        })
      });
      const result = await fetchJsonSafe(response);

      if (!response.ok) {
        showToast({ kind: "error", title: "Template not saved", message: (result as any)?.message || "Unable to save template" });
        return;
      }

      showToast({ kind: "success", title: "Template saved", message: (result as any)?.template?.title || "Template saved." });
      setTemplateForm(defaultTemplateForm);
      await loadData();
    } catch (error) {
      showToast({ kind: "error", title: "Template not saved", message: error instanceof Error ? error.message : "Unable to save template" });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handlePrepareMessage() {
    setSavingMessage(true);
    try {
      const response = await fetch("/api/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageForm)
      });
      const result = await fetchJsonSafe(response);

      if (!response.ok) {
        showToast({ kind: "error", title: "Message not prepared", message: (result as any)?.message || "Unable to save message" });
        return;
      }

      showToast({ kind: "success", title: "Message prepared", message: "Communication entry is now in the log." });
      setMessageForm(defaultMessageForm);
      await loadData();
    } catch (error) {
      showToast({ kind: "error", title: "Message not prepared", message: error instanceof Error ? error.message : "Unable to save message" });
    } finally {
      setSavingMessage(false);
    }
  }

  async function handleSendReady(limit = 20) {
    setSendingReady(true);
    try {
      const response = await fetch("/api/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send-ready", limit })
      });
      const result = await fetchJsonSafe(response);

      if (!response.ok) {
        showToast({ kind: "error", title: "Queue send failed", message: (result as any)?.message || "Unable to send ready messages" });
        return;
      }

      const payload = (result as any)?.result || {};
      showToast({
        kind: payload.failedCount ? "info" : "success",
        title: "Queue send complete",
        message: `Processed ${payload.processed || 0} messages • Sent ${payload.sentCount || 0} • Failed ${payload.failedCount || 0}`
      });
      await loadData();
    } catch (error) {
      showToast({ kind: "error", title: "Queue send failed", message: error instanceof Error ? error.message : "Unable to send ready messages" });
    } finally {
      setSendingReady(false);
    }
  }

  async function handleSendSingle(logId: string) {
    setSendingById((current) => ({ ...current, [logId]: true }));
    try {
      const response = await fetch("/api/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send", logId })
      });
      const result = await fetchJsonSafe(response);

      if (!response.ok) {
        showToast({ kind: "error", title: "Message send failed", message: (result as any)?.message || "Unable to send message" });
        return;
      }

      const delivery = (result as any)?.result || {};
      showToast({
        kind: delivery.delivered ? "success" : "warning",
        title: delivery.delivered ? "Message sent" : "Message failed",
        message: delivery.message || (delivery.delivered ? "Delivered successfully." : "Delivery failed.")
      });
      await loadData();
    } catch (error) {
      showToast({ kind: "error", title: "Message send failed", message: error instanceof Error ? error.message : "Unable to send message" });
    } finally {
      setSendingById((current) => ({ ...current, [logId]: false }));
    }
  }

  const readyCount = useMemo(() => logs.filter((item) => item.status === "READY").length, [logs]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Communication</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Reminder Desk, Templates, and Message Queue</h3>
            <p className="mt-2 text-sm text-slate-600">Prepare reminder messages for fees, documents, scholarship, and enquiry follow-up. These are logged now and can be connected to SMS, WhatsApp, or email APIs later.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-success">{templates.length} templates</span>
            <span className="chip-warning">{targets.length} live targets</span>
            <span className="chip-success">{readyCount} ready messages</span>
            <button className="btn-secondary" disabled={sendingReady || readyCount === 0} onClick={() => void handleSendReady()} type="button">
              {sendingReady ? "Sending..." : "Send Ready Queue"}
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input label="Search" placeholder="Student, enquiry, mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadData(search)} type="button">
              Apply
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="surface p-6">
          <p className="eyebrow-compact">Template Bank</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Save Communication Template</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input label="Template Title" required value={templateForm.title} onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))} />
            <Select label="Category" required options={categoryOptions} value={templateForm.category} onChange={(event) => setTemplateForm((current) => ({ ...current, category: event.target.value }))} />
            <Select label="Channel" required options={channelOptions} value={templateForm.channel} onChange={(event) => setTemplateForm((current) => ({ ...current, channel: event.target.value }))} />
            <Input label="Subject" helperText="Optional for SMS/WhatsApp" value={templateForm.subjectLine} onChange={(event) => setTemplateForm((current) => ({ ...current, subjectLine: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Message Body" required value={templateForm.bodyText} onChange={(event) => setTemplateForm((current) => ({ ...current, bodyText: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingTemplate} onClick={() => void handleSaveTemplate()} type="button">
              {savingTemplate ? "Saving..." : "Save Template"}
            </button>
          </div>
        </article>

        <article className="surface p-6">
          <p className="eyebrow-compact">Prepare Message</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Create Reminder Entry</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Select
              label="Use Template"
              options={templates.filter((item) => item.isActive).map((item) => ({ label: `${item.title} (${item.channel})`, value: item.id }))}
              value={messageForm.templateId}
              onChange={(event) => {
                const nextTemplate = templates.find((item) => item.id === event.target.value);
                setMessageForm((current) => ({
                  ...current,
                  templateId: event.target.value,
                  channel: nextTemplate?.channel || current.channel,
                  subjectLine: nextTemplate?.subjectLine || current.subjectLine,
                  bodyText: nextTemplate?.bodyText || current.bodyText
                }));
              }}
              placeholder="No template"
            />
            <Select label="Channel" required options={channelOptions} value={messageForm.channel} onChange={(event) => setMessageForm((current) => ({ ...current, channel: event.target.value }))} />
            <Select
              label="Live Target"
              options={targets.map((item) => ({ label: `${item.targetName} • ${item.category} • ${item.helper}`, value: `${item.targetType}::${item.targetId}` }))}
              value={messageForm.targetId ? `${messageForm.targetType}::${messageForm.targetId}` : ""}
              onChange={(event) => {
                const [targetType, targetId] = event.target.value.split("::");
                const nextTarget = targets.find((item) => item.targetType === targetType && item.targetId === targetId);
                if (!nextTarget) return;
                setMessageForm((current) => ({
                  ...current,
                  targetType: nextTarget.targetType,
                  targetId: nextTarget.targetId,
                  targetName: nextTarget.targetName,
                  targetMobile: nextTarget.targetMobile,
                  targetEmail: nextTarget.targetEmail,
                  bodyText: current.bodyText || nextTarget.defaultMessage
                }));
              }}
              placeholder="Choose target"
            />
            <Input label="Target Name" required value={messageForm.targetName} onChange={(event) => setMessageForm((current) => ({ ...current, targetName: event.target.value }))} />
            <Input label="Mobile" helperText="Optional" value={messageForm.targetMobile} onChange={(event) => setMessageForm((current) => ({ ...current, targetMobile: event.target.value }))} />
            <Input label="Email" helperText="Optional" value={messageForm.targetEmail} onChange={(event) => setMessageForm((current) => ({ ...current, targetEmail: event.target.value }))} />
            <Input label="Subject" helperText="Optional" value={messageForm.subjectLine} onChange={(event) => setMessageForm((current) => ({ ...current, subjectLine: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Message" required value={messageForm.bodyText} onChange={(event) => setMessageForm((current) => ({ ...current, bodyText: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Note" helperText="Optional" value={messageForm.note} onChange={(event) => setMessageForm((current) => ({ ...current, note: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingMessage} onClick={() => void handlePrepareMessage()} type="button">
              {savingMessage ? "Saving..." : "Prepare Message"}
            </button>
          </div>
        </article>
      </section>

      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : (
        <>
          <section className="surface p-6">
            <p className="eyebrow-compact">Live Reminder Targets</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Operational Follow-up Queue</h4>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Mobile</th>
                    <th>Helper</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((item, index) => (
                    <tr key={`${item.targetType}-${item.targetId}-${index}`}>
                      <td>{item.targetName}</td>
                      <td>{item.category}</td>
                      <td>{item.targetMobile || "—"}</td>
                      <td>{item.helper}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface p-6">
            <p className="eyebrow-compact">Communication Log</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Prepared Messages</h4>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Category</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Prepared By</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium text-slate-900">{item.targetName}</div>
                        <div className="text-xs text-slate-500">{item.targetMobile || item.targetEmail || "No contact"}</div>
                      </td>
                      <td>{item.category || "Custom"}</td>
                      <td>{item.channel}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>{item.createdBy}</td>
                      <td>{item.createdAt.slice(0, 10)}</td>
                      <td>
                        {item.status === "READY" || item.status === "FAILED" ? (
                          <button
                            className="btn-secondary"
                            disabled={Boolean(sendingById[item.id])}
                            onClick={() => void handleSendSingle(item.id)}
                            type="button"
                          >
                            {sendingById[item.id] ? "Sending..." : "Send"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
