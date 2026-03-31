"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/types";

type DocumentItem = {
  id: string;
  documentType: string;
  ownerType: string;
  originalName: string;
  fileUrl: string;
  verificationStatus: string;
  remarks: string | null;
  createdAt: string;
};

type DocumentPanelProps = {
  studentId: string;
  initialDocuments: DocumentItem[];
};

export function DocumentPanel({ studentId, initialDocuments }: DocumentPanelProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("STUDENT_AADHAAR");
  const [ownerType, setOwnerType] = useState("STUDENT");
  const [remarks, setRemarks] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [documentTypeOptions, setDocumentTypeOptions] = useState<SelectOption[]>([
    { label: "Student Aadhaar", value: "STUDENT_AADHAAR" },
    { label: "Parent Aadhaar", value: "PARENT_AADHAAR" },
    { label: "10th Marksheet", value: "TENTH_MARKSHEET" },
    { label: "Student Photo", value: "STUDENT_PHOTO" },
    { label: "Caste Certificate", value: "CASTE_CERTIFICATE" },
    { label: "Income Certificate", value: "INCOME_CERTIFICATE" },
    { label: "Bank Passbook", value: "BANK_PASSBOOK" },
    { label: "Signed Undertaking", value: "SIGNED_UNDERTAKING" },
    { label: "Other", value: "OTHER" }
  ]);

  useEffect(() => {
    async function loadDocumentTypeMasters() {
      const response = await fetch("/api/masters");
      const result = await response.json();
      if (response.ok && Array.isArray(result?.documentTypes) && result.documentTypes.length) {
        setDocumentTypeOptions(result.documentTypes);
      }
    }

    void loadDocumentTypeMasters();
  }, []);

  async function uploadDocument() {
    if (!selectedFile) {
      const nextError = "Please select a file";
      setError(nextError);
      showToast({ kind: "error", title: "Document not uploaded", message: nextError });
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("documentType", documentType);
      formData.append("ownerType", ownerType);
      formData.append("remarks", remarks);
      formData.append("file", selectedFile);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        const nextError = result?.message || "Upload failed";
        setError(nextError);
        showToast({ kind: "error", title: "Document not uploaded", message: nextError });
        return;
      }

      setDocuments((current) => [result.document, ...current]);
      setMessage("Document uploaded successfully");
      showToast({
        kind: "success",
        title: "Document uploaded",
        message: result.document?.originalName || selectedFile.name
      });
      setSelectedFile(null);
      setRemarks("");
    } catch (uploadError) {
      const nextError = uploadError instanceof Error ? uploadError.message : "Upload failed";
      setError(nextError);
      showToast({ kind: "error", title: "Document not uploaded", message: nextError });
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(documentId: string, status: string) {
    setError("");
    setMessage("");

    const response = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to update document status";
      setError(nextError);
      showToast({ kind: "error", title: "Document status not updated", message: nextError });
      return;
    }

    setDocuments((current) =>
      current.map((item) =>
        item.id === documentId ? { ...item, verificationStatus: result.document.verificationStatus } : item
      )
    );
    setMessage(`Document marked ${status}`);
    showToast({ kind: "success", title: "Document status updated", message: `Marked ${status.replaceAll("_", " ").toLowerCase()}` });
  }

  async function deleteDocument(documentId: string) {
    setError("");
    setMessage("");

    const response = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to delete document";
      setError(nextError);
      showToast({ kind: "error", title: "Document not deleted", message: nextError });
      return;
    }

    setDocuments((current) => current.filter((item) => item.id !== documentId));
    setDocumentToDelete(null);
    setMessage("Document deleted successfully");
    showToast({ kind: "success", title: "Document moved to recycle bin" });
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Documents</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Upload & Verify</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {documents.length} uploaded
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <select
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          onChange={(event) => setDocumentType(event.target.value)}
          value={documentType}
        >
          {documentTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          onChange={(event) => setOwnerType(event.target.value)}
          value={ownerType}
        >
          <option value="STUDENT">Student</option>
          <option value="PARENT">Parent</option>
        </select>
        <input
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Remarks"
          value={remarks}
        />
        <input
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          type="file"
        />
        <button
          className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
          disabled={uploading}
          onClick={uploadDocument}
          type="button"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {(message || error) ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      ) : null}

      <div className="data-table-wrap mt-6">
        <table className="data-table">
          <thead>
            <tr>
              {["Type", "Owner", "File", "Status", "Remarks", "Action"].map((header) => (
                <th key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.length ? (
              documents.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium text-slate-900">{item.documentType.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString("en-IN")}</div>
                  </td>
                  <td>{item.ownerType}</td>
                  <td>
                    <a className="text-emerald-800 hover:underline" href={item.fileUrl} target="_blank">
                      {item.originalName}
                    </a>
                  </td>
                  <td><StatusBadge status={item.verificationStatus} /></td>
                  <td>{item.remarks || "-"}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700" onClick={() => updateStatus(item.id, "VERIFIED")} type="button">
                        Verify
                      </button>
                      <button className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700" onClick={() => updateStatus(item.id, "INCOMPLETE")} type="button">
                        Incomplete
                      </button>
                      <button className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700" onClick={() => updateStatus(item.id, "REJECTED")} type="button">
                        Reject
                      </button>
                      <button className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => setDocumentToDelete(item)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="data-table-empty" colSpan={6}>
                  No documents uploaded yet. Once files are added, verification actions will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!documentToDelete}
        title="Delete Document"
        message={documentToDelete ? `Delete ${documentToDelete.originalName}? You can restore it later from the recycle bin.` : ""}
        confirmLabel="Delete Document"
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={() => documentToDelete ? void deleteDocument(documentToDelete.id) : undefined}
      />
    </section>
  );
}
