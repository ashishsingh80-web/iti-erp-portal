"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { showToast } from "@/lib/toast";

type BookRow = {
  id: string;
  accessionNumber: string;
  title: string;
  authorName: string;
  category: string;
  publisherName: string;
  editionLabel: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
  note: string;
  isActive: boolean;
  issuedCount: number;
  availabilityStatus: string;
};

type LibraryIssueRow = {
  id: string;
  bookId: string;
  accessionNumber: string;
  bookTitle: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  instituteName: string;
  tradeName: string;
  issueDate: string;
  expectedReturnDate: string;
  returnDate: string;
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

const defaultBookForm = {
  accessionNumber: "",
  title: "",
  authorName: "",
  category: "",
  publisherName: "",
  editionLabel: "",
  totalCopies: "1",
  shelfLocation: "",
  note: ""
};

const defaultIssueForm = {
  bookId: "",
  studentId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  expectedReturnDate: "",
  remark: ""
};

const defaultReturnForm = {
  issueId: "",
  returnDate: new Date().toISOString().slice(0, 10),
  remark: ""
};

export function LibraryDesk() {
  const [loading, setLoading] = useState(true);
  const [savingBook, setSavingBook] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [issues, setIssues] = useState<LibraryIssueRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [bookForm, setBookForm] = useState(defaultBookForm);
  const [issueForm, setIssueForm] = useState(defaultIssueForm);
  const [returnForm, setReturnForm] = useState(defaultReturnForm);

  async function loadData(nextSearch = search, nextCategory = categoryFilter) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextCategory.trim()) params.set("category", nextCategory.trim());
    const response = await fetch(`/api/library?${params.toString()}`);
    const result = await response.json();
    setBooks(result.books || []);
    setIssues(result.issues || []);
    setStudents(result.students || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateBook() {
    setSavingBook(true);
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookForm)
    });
    const result = await response.json();
    setSavingBook(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Book not created", message: result?.message || "Unable to create book" });
      return;
    }

    showToast({ kind: "success", title: "Book added", message: `${result.book?.accessionNumber || "Book"} saved.` });
    setBookForm(defaultBookForm);
    await loadData();
  }

  async function handleIssueBook() {
    setSavingIssue(true);
    const response = await fetch("/api/library/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueForm)
    });
    const result = await response.json();
    setSavingIssue(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Issue failed", message: result?.message || "Unable to issue book" });
      return;
    }

    showToast({ kind: "success", title: "Book issued", message: "Library issue saved." });
    setIssueForm(defaultIssueForm);
    await loadData();
  }

  async function handleReturnBook() {
    if (!returnForm.issueId) {
      showToast({ kind: "error", title: "Select issue", message: "Choose a pending library issue first." });
      return;
    }

    setSavingReturn(true);
    const response = await fetch(`/api/library/issues/${returnForm.issueId}/return`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnForm)
    });
    const result = await response.json();
    setSavingReturn(false);

    if (!response.ok) {
      showToast({ kind: "error", title: "Return failed", message: result?.message || "Unable to return book" });
      return;
    }

    showToast({ kind: "success", title: "Book returned", message: "Library and no-dues status updated." });
    setReturnForm(defaultReturnForm);
    await loadData();
  }

  const openIssues = useMemo(() => issues.filter((issue) => issue.status !== "RETURNED"), [issues]);
  const unavailableCount = useMemo(() => books.filter((book) => book.availableCopies <= 0).length, [books]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Library</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Library Book Issue, Return, and No-Dues Desk</h3>
            <p className="mt-2 text-sm text-slate-600">Maintain the book register, issue books to students, receive returns, and automatically block library no-dues while books are still pending.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-success">{books.length} books</span>
            <span className="chip-warning">{openIssues.length} issued</span>
            <span className={unavailableCount ? "chip-danger" : "chip-success"}>{unavailableCount} unavailable</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input label="Search" placeholder="Book, accession no., student" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input label="Category" helperText="Optional" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadData(search, categoryFilter)} type="button">
              Apply
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="surface p-6">
          <p className="eyebrow-compact">Book Master</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Add Library Book</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input label="Accession Number" required value={bookForm.accessionNumber} onChange={(event) => setBookForm((current) => ({ ...current, accessionNumber: event.target.value }))} />
            <Input label="Title" required value={bookForm.title} onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))} />
            <Input label="Author" helperText="Optional" value={bookForm.authorName} onChange={(event) => setBookForm((current) => ({ ...current, authorName: event.target.value }))} />
            <Input label="Category" helperText="Optional" value={bookForm.category} onChange={(event) => setBookForm((current) => ({ ...current, category: event.target.value }))} />
            <Input label="Publisher" helperText="Optional" value={bookForm.publisherName} onChange={(event) => setBookForm((current) => ({ ...current, publisherName: event.target.value }))} />
            <Input label="Edition" helperText="Optional" value={bookForm.editionLabel} onChange={(event) => setBookForm((current) => ({ ...current, editionLabel: event.target.value }))} />
            <Input label="Total Copies" required type="number" min="1" step="1" value={bookForm.totalCopies} onChange={(event) => setBookForm((current) => ({ ...current, totalCopies: event.target.value }))} />
            <Input label="Shelf Location" helperText="Optional" value={bookForm.shelfLocation} onChange={(event) => setBookForm((current) => ({ ...current, shelfLocation: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Note" helperText="Optional" value={bookForm.note} onChange={(event) => setBookForm((current) => ({ ...current, note: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingBook} onClick={() => void handleCreateBook()} type="button">
              {savingBook ? "Saving..." : "Save Book"}
            </button>
          </div>
        </article>

        <article className="surface p-6">
          <p className="eyebrow-compact">Issue Entry</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Issue Book to Student</h4>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Select
              label="Book"
              required
              options={books.filter((book) => book.isActive && book.availableCopies > 0).map((book) => ({ label: `${book.accessionNumber} - ${book.title} (${book.availableCopies} available)`, value: book.id }))}
              value={issueForm.bookId}
              onChange={(event) => setIssueForm((current) => ({ ...current, bookId: event.target.value }))}
            />
            <Select
              label="Student"
              required
              options={students.map((student) => ({ label: `${student.studentCode} - ${student.fullName} (${student.tradeName})`, value: student.id }))}
              value={issueForm.studentId}
              onChange={(event) => setIssueForm((current) => ({ ...current, studentId: event.target.value }))}
            />
            <Input label="Issue Date" required type="date" value={issueForm.issueDate} onChange={(event) => setIssueForm((current) => ({ ...current, issueDate: event.target.value }))} />
            <Input label="Expected Return Date" type="date" helperText="Optional" value={issueForm.expectedReturnDate} onChange={(event) => setIssueForm((current) => ({ ...current, expectedReturnDate: event.target.value }))} />
          </div>
          <div className="mt-3">
            <Textarea label="Remark" helperText="Optional" value={issueForm.remark} onChange={(event) => setIssueForm((current) => ({ ...current, remark: event.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={savingIssue} onClick={() => void handleIssueBook()} type="button">
              {savingIssue ? "Saving..." : "Save Issue"}
            </button>
          </div>
        </article>
      </section>

      <section className="surface p-6">
        <p className="eyebrow-compact">Return Entry</p>
        <h4 className="mt-2 text-xl font-semibold text-slate-900">Receive Book Return</h4>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Select
            label="Pending Issue"
            required
            options={openIssues.map((issue) => ({ label: `${issue.accessionNumber} - ${issue.bookTitle} -> ${issue.studentCode}`, value: issue.id }))}
            value={returnForm.issueId}
            onChange={(event) => setReturnForm((current) => ({ ...current, issueId: event.target.value }))}
          />
          <Input label="Return Date" required type="date" value={returnForm.returnDate} onChange={(event) => setReturnForm((current) => ({ ...current, returnDate: event.target.value }))} />
          <Input label="Remark" helperText="Optional" value={returnForm.remark} onChange={(event) => setReturnForm((current) => ({ ...current, remark: event.target.value }))} />
        </div>
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" disabled={savingReturn} onClick={() => void handleReturnBook()} type="button">
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
            <p className="eyebrow-compact">Book Register</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Library Stock</h4>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Accession</th>
                    <th>Book</th>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Available</th>
                    <th>Shelf</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td>{book.accessionNumber}</td>
                      <td>
                        <div className="font-medium text-slate-900">{book.title}</div>
                        <div className="text-xs text-slate-500">{book.authorName || "—"}</div>
                      </td>
                      <td>{book.category || "—"}</td>
                      <td>{book.totalCopies}</td>
                      <td>{book.availableCopies}</td>
                      <td>{book.shelfLocation || "—"}</td>
                      <td>
                        <StatusBadge status={book.availabilityStatus === "AVAILABLE" ? "AVAILABLE" : book.availabilityStatus === "LOW" ? "LOW STOCK" : "ISSUED OUT"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface p-6">
            <p className="eyebrow-compact">Issue Register</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Student Book Movement</h4>
            <div className="mt-5 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Book</th>
                    <th>Issue Date</th>
                    <th>Expected Return</th>
                    <th>Return Date</th>
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
                        <div className="font-medium text-slate-900">{issue.bookTitle}</div>
                        <div className="text-xs text-slate-500">{issue.accessionNumber}</div>
                      </td>
                      <td>{issue.issueDate}</td>
                      <td>{issue.expectedReturnDate || "—"}</td>
                      <td>{issue.returnDate || "—"}</td>
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
