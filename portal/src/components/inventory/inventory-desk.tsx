"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { showToast } from "@/lib/toast";

type ItemRow = {
  id: string;
  itemCode: string;
  itemName: string;
  department: string;
  unitLabel: string;
  currentStock: string;
  reorderLevel: string;
  storageLocation: string;
  note: string;
  isActive: boolean;
  openIssueCount: number;
  stockWarning: string;
};

type IssueRow = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  department: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  instituteName: string;
  tradeName: string;
  quantityIssued: string;
  quantityReturned: string;
  quantityPending: string;
  issueDate: string;
  expectedReturnDate: string;
  lastReturnDate: string;
  status: string;
  remark: string;
};

type StudentOption = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  session: string;
  yearLabel: string;
};

const departmentOptions = [
  { label: "Store", value: "STORE" },
  { label: "Workshop", value: "WORKSHOP" }
];

const defaultItemForm = {
  itemCode: "",
  itemName: "",
  department: "STORE",
  unitLabel: "pcs",
  currentStock: "",
  reorderLevel: "",
  storageLocation: "",
  note: ""
};

const defaultIssueForm = {
  itemId: "",
  studentId: "",
  quantityIssued: "",
  issueDate: new Date().toISOString().slice(0, 10),
  expectedReturnDate: "",
  remark: ""
};

const defaultReturnForm = {
  issueId: "",
  quantityReturned: "",
  returnDate: new Date().toISOString().slice(0, 10),
  remark: ""
};

export function InventoryDesk() {
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [itemForm, setItemForm] = useState(defaultItemForm);
  const [issueForm, setIssueForm] = useState(defaultIssueForm);
  const [returnForm, setReturnForm] = useState(defaultReturnForm);

  async function loadData(nextSearch = search, nextDepartment = departmentFilter) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextDepartment) params.set("department", nextDepartment);
    const response = await fetch(`/api/inventory?${params.toString()}`);
    const result = await response.json();
    setItems(result.items || []);
    setIssues(result.issues || []);
    setStudents(result.students || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateItem() {
    setSavingItem(true);
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemForm)
    });
    const result = await response.json();
    setSavingItem(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Item not created", message: result?.message || "Unable to create item" });
      return;
    }

    showToast({ kind: "success", title: "Item created", message: `${result.item?.itemCode || "Item"} is ready.` });
    setItemForm(defaultItemForm);
    await loadData();
  }

  async function handleIssueItem() {
    setSavingIssue(true);
    const response = await fetch("/api/inventory/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueForm)
    });
    const result = await response.json();
    setSavingIssue(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Issue failed", message: result?.message || "Unable to issue item" });
      return;
    }

    showToast({ kind: "success", title: "Item issued", message: "Student issue entry saved." });
    setIssueForm(defaultIssueForm);
    await loadData();
  }

  async function handleReturnItem() {
    if (!returnForm.issueId) {
      showToast({ kind: "error", title: "Select issue", message: "Choose a pending issue first." });
      return;
    }

    setSavingReturn(true);
    const response = await fetch(`/api/inventory/issues/${returnForm.issueId}/return`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnForm)
    });
    const result = await response.json();
    setSavingReturn(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Return failed", message: result?.message || "Unable to return item" });
      return;
    }

    showToast({ kind: "success", title: "Return saved", message: "Stock and no-dues impact updated." });
    setReturnForm(defaultReturnForm);
    await loadData();
  }

  const openIssues = useMemo(() => issues.filter((item) => item.status !== "RETURNED"), [issues]);
  const lowStockCount = useMemo(() => items.filter((item) => item.stockWarning !== "OK").length, [items]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Inventory & Workshop</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Store Issue, Workshop Tools, and Pending Return Desk</h3>
            <p className="mt-2 text-sm text-slate-600">Manage stock, issue items to students, capture returns, and automatically block store/workshop no-dues when items are still pending.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-success">{items.length} items</span>
            <span className="chip-warning">{openIssues.length} open issues</span>
            <span className={lowStockCount ? "chip-danger" : "chip-success"}>{lowStockCount} low stock</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input label="Search" placeholder="Item, code, student, location" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select label="Department" options={departmentOptions} value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} placeholder="All departments" />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadData(search, departmentFilter)} type="button">
              Apply
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="surface p-6">
          <p className="eyebrow-compact">Item Master</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Add Inventory Item</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input label="Item Code" required value={itemForm.itemCode} onChange={(event) => setItemForm((current) => ({ ...current, itemCode: event.target.value }))} />
            <Input label="Item Name" required value={itemForm.itemName} onChange={(event) => setItemForm((current) => ({ ...current, itemName: event.target.value }))} />
            <Select label="Department" required options={departmentOptions} value={itemForm.department} onChange={(event) => setItemForm((current) => ({ ...current, department: event.target.value }))} />
            <Input label="Unit" helperText="Example: pcs, set, book" value={itemForm.unitLabel} onChange={(event) => setItemForm((current) => ({ ...current, unitLabel: event.target.value }))} />
            <Input label="Opening Stock" type="number" min="0" step="0.01" value={itemForm.currentStock} onChange={(event) => setItemForm((current) => ({ ...current, currentStock: event.target.value }))} />
            <Input label="Reorder Level" type="number" min="0" step="0.01" value={itemForm.reorderLevel} onChange={(event) => setItemForm((current) => ({ ...current, reorderLevel: event.target.value }))} />
            <Input label="Location" helperText="Optional" value={itemForm.storageLocation} onChange={(event) => setItemForm((current) => ({ ...current, storageLocation: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Note" helperText="Optional" value={itemForm.note} onChange={(event) => setItemForm((current) => ({ ...current, note: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingItem} onClick={() => void handleCreateItem()} type="button">
              {savingItem ? "Saving..." : "Save Item"}
            </button>
          </div>
        </article>

        <article className="surface p-6">
          <p className="eyebrow-compact">Issue Entry</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Issue Item to Student</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Select
              label="Item"
              required
              options={items.filter((item) => item.isActive).map((item) => ({ label: `${item.itemCode} - ${item.itemName} (${item.currentStock} ${item.unitLabel})`, value: item.id }))}
              value={issueForm.itemId}
              onChange={(event) => setIssueForm((current) => ({ ...current, itemId: event.target.value }))}
            />
            <Select
              label="Student"
              required
              options={students.map((student) => ({ label: `${student.studentCode} - ${student.fullName} (${student.tradeName})`, value: student.id }))}
              value={issueForm.studentId}
              onChange={(event) => setIssueForm((current) => ({ ...current, studentId: event.target.value }))}
            />
            <Input label="Quantity Issued" required type="number" min="0.01" step="0.01" value={issueForm.quantityIssued} onChange={(event) => setIssueForm((current) => ({ ...current, quantityIssued: event.target.value }))} />
            <Input label="Issue Date" required type="date" value={issueForm.issueDate} onChange={(event) => setIssueForm((current) => ({ ...current, issueDate: event.target.value }))} />
            <Input label="Expected Return Date" type="date" helperText="Optional" value={issueForm.expectedReturnDate} onChange={(event) => setIssueForm((current) => ({ ...current, expectedReturnDate: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Remark" helperText="Optional" value={issueForm.remark} onChange={(event) => setIssueForm((current) => ({ ...current, remark: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingIssue} onClick={() => void handleIssueItem()} type="button">
              {savingIssue ? "Saving..." : "Save Issue"}
            </button>
          </div>
        </article>
      </section>

      <section className="surface p-6">
        <p className="eyebrow-compact">Return Entry</p>
        <h4 className="mt-2 text-xl font-semibold text-slate-900">Receive Item Return</h4>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Pending Issue"
            required
            options={openIssues.map((issue) => ({
              label: `${issue.itemCode} -> ${issue.studentCode} (${issue.quantityPending} pending)`,
              value: issue.id
            }))}
            value={returnForm.issueId}
            onChange={(event) => setReturnForm((current) => ({ ...current, issueId: event.target.value }))}
          />
          <Input label="Quantity Returned" required type="number" min="0.01" step="0.01" value={returnForm.quantityReturned} onChange={(event) => setReturnForm((current) => ({ ...current, quantityReturned: event.target.value }))} />
          <Input label="Return Date" required type="date" value={returnForm.returnDate} onChange={(event) => setReturnForm((current) => ({ ...current, returnDate: event.target.value }))} />
          <Input label="Remark" helperText="Optional" value={returnForm.remark} onChange={(event) => setReturnForm((current) => ({ ...current, remark: event.target.value }))} />
        </div>
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" disabled={savingReturn} onClick={() => void handleReturnItem()} type="button">
            {savingReturn ? "Saving..." : "Save Return"}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : (
        <>
          <section className="surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow-compact">Current Stock</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Inventory Items</h4>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Department</th>
                    <th>Stock</th>
                    <th>Reorder</th>
                    <th>Location</th>
                    <th>Open Issues</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium text-slate-900">{item.itemName}</div>
                        <div className="text-xs text-slate-500">{item.itemCode}</div>
                      </td>
                      <td>{item.department}</td>
                      <td>
                        {item.currentStock} {item.unitLabel}
                      </td>
                      <td>{item.reorderLevel}</td>
                      <td>{item.storageLocation || "—"}</td>
                      <td>{item.openIssueCount}</td>
                      <td>
                        <StatusBadge
                          status={
                            item.stockWarning === "LOW_STOCK"
                              ? "LOW STOCK"
                              : item.stockWarning === "OUT_OF_STOCK"
                                ? "OUT OF STOCK"
                                : item.isActive
                                  ? "ACTIVE"
                                  : "INACTIVE"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow-compact">Issue Register</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Student Item Movement</h4>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Item</th>
                    <th>Issue</th>
                    <th>Returned</th>
                    <th>Pending</th>
                    <th>Issue Date</th>
                    <th>Expected Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <div className="font-medium text-slate-900">{issue.studentName}</div>
                        <div className="text-xs text-slate-500">
                          {issue.studentCode} • {issue.tradeName}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-slate-900">{issue.itemName}</div>
                        <div className="text-xs text-slate-500">{issue.itemCode}</div>
                      </td>
                      <td>{issue.quantityIssued}</td>
                      <td>{issue.quantityReturned}</td>
                      <td>{issue.quantityPending}</td>
                      <td>{issue.issueDate}</td>
                      <td>{issue.expectedReturnDate || "—"}</td>
                      <td>
                        <StatusBadge status={issue.status} />
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
