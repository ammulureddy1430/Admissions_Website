"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight,
  Download, Eye, FileText, Loader2,
  Pencil, Plus, Search, ShieldCheck, Trash2,
  Upload, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
type Row = Record<string, any>;

export default function TextbookLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [books, setBooks] = useState<Row[]>([]);
  const [curriculum, setCurriculum] = useState<Record<string, Row[]>>({});
  const [filters, setFilters] = useState<Row>({ search: "", boardId: "", academicYearId: "", gradeId: "", subjectId: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState<"form" | "details" | "replace" | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Row | null>(null);
  const [error, setError] = useState("");

  const headers = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    "x-tenant-id": localStorage.getItem("schoolId") || "",
  }), []);
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}/${path}`, {
      ...init,
      headers: { ...headers(), ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join(", ") : body?.message || "Request failed.");
    return body;
  }, [headers]);

  const loadReferenceData = useCallback(async () => {
    try {
      const paths = ["boards", "academic-years", "grades", "subjects"];
      const result = await Promise.all(paths.map((path) => request(path)));
      setCurriculum({ boards: result[0], years: result[1], grades: result[2], subjects: result[3] });
    } catch (e) { setError(message(e)); }
  }, [request]);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "12" });
      Object.entries(filters).forEach(([key, value]) => value && query.set(key, String(value)));
      const result = await request(`textbooks?${query}`);
      setBooks(result.items); setTotal(result.total); setTotalPages(result.totalPages || 1);
    } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }, [request, page, filters]);

  useEffect(() => { void loadReferenceData(); }, [loadReferenceData]);
  useEffect(() => { const timer = setTimeout(() => void loadBooks(), 250); return () => clearTimeout(timer); }, [loadBooks]);

  const metrics = useMemo(() => ({
    active: books.filter((book) => book.status === "ACTIVE").length,
    pdfs: books.filter((book) => book.versions?.[0]?.file).length,
  }), [books]);

  const openCreate = () => {
    setSelected(null); setFile(null); setError("");
    setForm({
      title: "", boardId: "",
      academicYearId: "", gradeId: "", subjectId: "", language: "English",
      publisher: "School", author: "School Faculty", edition: "Current", status: "ACTIVE",
      versionNumber: "1.0", numberOfPages: "", changeNote: "Initial textbook upload",
    });
    setModal("form");
  };
  const openEdit = (book: Row) => {
    setSelected(book); setFile(null); setError("");
    setForm({ ...book, language: book.language?.name, publisher: book.publisher?.name, author: book.author?.name });
    setModal("form");
  };
  const openDetails = async (book: Row) => {
    setError("");
    try {
      const detail = await request(`textbooks/${book.id}`);
      setSelected(detail); setPreview(null); setModal("details");
    } catch (e) { setError(message(e)); }
  };
  const save = async () => {
    setSaving(true); setError("");
    try {
      if (!form.title?.trim() || !form.boardId || !form.academicYearId || !form.gradeId || !form.subjectId) {
        throw new Error("Enter a title and select the board, academic year, grade, and subject.");
      }
      if (!selected && !file) throw new Error("Choose the textbook PDF.");
      const metadata = clean(form);
      const book = await request(selected ? `textbooks/${selected.id}` : "textbooks", {
        method: selected ? "PUT" : "POST", body: JSON.stringify(metadata),
      });
      if (file) await uploadPdf(book.id, false);
      setModal(null); await Promise.all([loadBooks(), loadReferenceData()]);
    } catch (e) { setError(message(e)); }
    finally { setSaving(false); }
  };
  const uploadPdf = async (id: string, replace: boolean) => {
    if (!file) throw new Error("Choose a PDF file.");
    const body = new FormData(); body.append("file", file); body.append("versionNumber", String(form.versionNumber || "1.0"));
    if (form.numberOfPages) body.append("numberOfPages", String(form.numberOfPages));
    if (form.changeNote) body.append("changeNote", form.changeNote);
    return request(`textbooks/${id}/${replace ? "replace" : "upload"}`, { method: "POST", body });
  };
  const replace = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try { await uploadPdf(selected.id, true); setModal(null); await loadBooks(); }
    catch (e) { setError(message(e)); } finally { setSaving(false); }
  };
  const getPreview = async (book: Row, versionId?: string) => {
    try { setPreview(await request(`textbooks/${book.id}/preview${versionId ? `?versionId=${versionId}` : ""}`)); }
    catch (e) { setError(message(e)); }
  };
  const download = async (book: Row, versionId?: string) => {
    try {
      const result = await request(`textbooks/${book.id}/download${versionId ? `?versionId=${versionId}` : ""}`);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (e) { setError(message(e)); }
  };
  const remove = async (book: Row) => {
    if (!confirm(`Delete "${book.title}" and all stored PDF versions?`)) return;
    try { await request(`textbooks/${book.id}`, { method: "DELETE" }); await loadBooks(); }
    catch (e) { setError(message(e)); }
  };

  return <div>
    <div className="min-h-full space-y-5 rounded-[2rem] bg-[#f6faf8] text-[#071633]">
      <header className="textbook-library-hero overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#071633] via-[#113d59] to-[#008c78] p-6 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div><span className="textbook-hero-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.18em]"><ShieldCheck className="h-3.5 w-3.5" /> Secure textbook repository</span>
            <h1 className="keep-white mt-3 text-2xl font-black sm:text-3xl">Textbook Library</h1><p className="keep-white mt-1 max-w-2xl text-sm font-medium leading-6 opacity-85">Upload and manage the active textbooks used for assessments.</p></div>
          <button onClick={openCreate} className="textbook-upload-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#006f62] shadow-sm hover:bg-[#f4fffc]"><Plus className="h-5 w-5" /> Upload textbook</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Metric icon={<BookOpen />} value={total} label="Textbooks" /><Metric icon={<CheckCircle2 />} value={metrics.active} label="Active" /><Metric icon={<FileText />} value={metrics.pdfs} label="PDFs" /></div>
      </header>

      <section className="rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_repeat(4,1fr)]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Search title, ID, ISBN…" className="library-filter pl-9" /></label>
          <Filter value={filters.boardId} onChange={(v: any) => setFilter("boardId", v)} rows={curriculum.boards} label="All boards" />
          <Filter value={filters.academicYearId} onChange={(v: any) => setFilter("academicYearId", v)} rows={curriculum.years?.filter((x) => !x.boardId || x.boardId === filters.boardId)} label={filters.boardId ? "All years" : "Select board first"} disabled={!filters.boardId} />
          <Filter value={filters.gradeId} onChange={(v: any) => setFilter("gradeId", v)} rows={uniqueByName(curriculum.grades?.filter((x) => x.boardId === filters.boardId && x.academicYearId === filters.academicYearId))} label={filters.academicYearId ? "All grades" : "Select year first"} disabled={!filters.academicYearId} />
          <Filter value={filters.subjectId} onChange={(v: any) => setFilter("subjectId", v)} rows={uniqueByName(curriculum.subjects?.filter((x) => x.gradeId === filters.gradeId))} label={filters.gradeId ? "All subjects" : "Select grade first"} disabled={!filters.gradeId} />
        </div>
        {error && <div className="mt-3 flex justify-between rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
      </section>

      {loading ? <Skeletons /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => <BookCard key={book.id} book={book} onDetails={() => openDetails(book)} onEdit={() => openEdit(book)} onReplace={() => { setSelected(book); setForm({ versionNumber: nextVersion(book.versions?.[0]?.versionNumber), changeNote: "Updated PDF version" }); setFile(null); setModal("replace"); }} onDownload={() => download(book)} onDelete={() => remove(book)} />)}
        {!books.length && <Empty />}
      </div>}

      <div className="flex items-center justify-end gap-3 pb-3 text-xs font-bold"><span>{total} textbooks · Page {page} of {totalPages}</span><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="pager"><ChevronLeft /></button><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="pager"><ChevronRight /></button></div>
    </div>

    {modal === "form" && <Dialog title={selected ? "Edit Textbook" : "Upload Textbook"} onClose={() => setModal(null)}>
      <MetadataForm form={form} setForm={setForm} curriculum={curriculum} />
      {!selected && <PdfFields form={form} setForm={setForm} file={file} setFile={setFile} initial />}
      {error && <ErrorText text={error} />}<Actions saving={saving} onCancel={() => setModal(null)} onSave={save} label={selected ? "Save changes" : "Upload textbook"} />
    </Dialog>}
    {modal === "replace" && selected && <Dialog title={`Replace PDF · ${selected.title}`} onClose={() => setModal(null)}>
      <PdfFields form={form} setForm={setForm} file={file} setFile={setFile} />
      <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-4 text-amber-800">The current PDF remains in version history. The new version becomes active after upload.</div>
      {error && <ErrorText text={error} />}<Actions saving={saving} onCancel={() => setModal(null)} onSave={replace} label="Upload new version" />
    </Dialog>}
    {modal === "details" && selected && <Dialog title="Textbook Details" onClose={() => setModal(null)} wide>
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]"><Cover book={selected} /><div className="flex flex-col justify-between"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black text-[#009b87]">{selected.textbookId}</p><h2 className="mt-1 text-xl font-black text-[#071633]">{selected.title}</h2></div><Status value={selected.status} /></div>
        <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => getPreview(selected)} className="primary"><Eye className="h-4 w-4" /> Preview PDF</button><button onClick={() => download(selected)} className="secondary inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download</button></div></div></div>
      {preview && <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600"><span>{preview.fileName} · Version {preview.versionNumber}</span><a href={preview.url} target="_blank" rel="noreferrer" className="text-[#007f70]">Open full screen</a></div><iframe src={preview.url} title={`${selected.title} PDF preview`} className="h-[55vh] w-full bg-slate-100" /></div>}
    </Dialog>}
  </div>;

  function setFilter(key: string, value: string) {
    setPage(1); setFilters((current) => ({ ...current, [key]: value,
      ...(key === "boardId" ? { academicYearId: "", gradeId: "", subjectId: "" } : {}),
      ...(key === "academicYearId" ? { gradeId: "", subjectId: "" } : {}),
      ...(key === "gradeId" ? { subjectId: "" } : {}),
    }));
  }
}

function MetadataForm({ form, setForm, curriculum }: any) {
  const set = (key: string, value: any) => setForm((current: Row) => ({ ...current, [key]: value,
    ...(key === "boardId" ? { academicYearId: "", gradeId: "", subjectId: "" } : {}),
    ...(key === "academicYearId" ? { gradeId: "", subjectId: "" } : {}),
    ...(key === "gradeId" ? { subjectId: "" } : {}),
  }));
  return <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Input label="Textbook title" value={form.title} onChange={(v: string) => set("title", v)} /></div>
    <Select label="Board" value={form.boardId} onChange={(v: string) => set("boardId", v)} rows={curriculum.boards} />
    <Select label="Academic year" value={form.academicYearId} onChange={(v: string) => set("academicYearId", v)} rows={curriculum.years?.filter((x: Row) => form.boardId && (!x.boardId || x.boardId === form.boardId))} disabled={!form.boardId} placeholder={form.boardId ? "Select academic year" : "Select board first"} />
    <Select label="Grade" value={form.gradeId} onChange={(v: string) => set("gradeId", v)} rows={curriculum.grades?.filter((x: Row) => x.boardId === form.boardId && x.academicYearId === form.academicYearId)} disabled={!form.academicYearId} placeholder={form.academicYearId ? "Select grade" : "Select academic year first"} />
    <Select label="Subject" value={form.subjectId} onChange={(v: string) => set("subjectId", v)} rows={curriculum.subjects?.filter((x: Row) => x.gradeId === form.gradeId)} disabled={!form.gradeId} placeholder={form.gradeId ? "Select subject" : "Select grade first"} />
  </div>;
}
function PdfFields({ form, setForm, file, setFile, initial = false }: any) { return <div className="rounded-2xl border border-dashed border-[#9bcfc3] bg-[#f4fbf9] p-4"><div className="flex items-center gap-2 text-xs font-black text-[#007f70]"><Upload className="h-4 w-4" /> Textbook PDF</div><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#008c78] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /><p className="mt-2 text-[9px] text-slate-500">PDF only · Maximum 50 MB</p>{!initial && <div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="New version number" value={form.versionNumber} onChange={(v: string) => setForm({ ...form, versionNumber: v })} /><Input label="Change note" value={form.changeNote} onChange={(v: string) => setForm({ ...form, changeNote: v })} /></div>}{file && <p className="mt-3 text-[10px] font-bold text-emerald-700">{file.name} · {bytes(file.size)}</p>}</div>; }
function BookCard({ book, onDetails, onEdit, onReplace, onDownload, onDelete }: any) { const version = book.versions?.[0]; return <article className="group overflow-hidden rounded-2xl border border-[#dceae6] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="grid grid-cols-[100px_1fr]"><Cover book={book} compact /><div className="p-4"><div className="flex justify-between gap-2"><p className="text-[9px] font-black text-[#009b87]">{book.textbookId}</p><Status value={book.status} /></div><h3 className="mt-1 line-clamp-2 text-sm font-black">{book.title}</h3><p className="mt-1 text-[10px] text-slate-500">{book.author?.name} · {book.publisher?.name}</p><div className="mt-3 flex flex-wrap gap-1 text-[8px] font-bold text-slate-500"><span className="pill">{book.language?.name}</span><span className="pill">v{version?.versionNumber || "—"}</span><span className="pill">{version?.numberOfPages || "—"} pages</span></div></div></div><div className="flex flex-wrap gap-1 border-t border-slate-100 p-3 dark:border-slate-800"><SmallButton title="Details" onClick={onDetails}><Eye /></SmallButton><SmallButton title="Edit" onClick={onEdit}><Pencil /></SmallButton><SmallButton title="Replace PDF" onClick={onReplace}><Upload /></SmallButton><SmallButton title="Download" onClick={onDownload}><Download /></SmallButton><SmallButton title="Delete" onClick={onDelete} danger><Trash2 /></SmallButton></div></article>; }
function Cover({ book, compact = false }: any) { return <div className={`textbook-cover relative overflow-hidden bg-gradient-to-br from-[#071633] via-[#174a63] to-[#00a58e] text-white ${compact ? "min-h-40 p-3" : "h-72 rounded-2xl p-5"}`}>{book.coverImage ? <img src={book.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <><BookOpen className={compact ? "h-7 w-7" : "h-12 w-12"} /><p className="absolute bottom-4 left-4 right-4 line-clamp-4 text-xs font-black">{book.title}</p></>}</div>; }
function Dialog({ title, onClose, children, wide = false }: any) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm lg:pl-64" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6 ${wide ? "max-w-5xl" : "max-w-3xl"}`}><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#071633]">{title}</h2><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="space-y-5">{children}</div></div></div>; }
function Filter({ value, onChange, rows = [], label, disabled = false }: any) { return <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="library-filter disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{label}</option>{uniqueByName(rows).map((row: Row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>; }
function uniqueByName(rows: Row[] = []) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = String(row.name || "").trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function Input({ label, value = "", onChange, type = "text" }: any) { return <label className="field">{label}<input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="form-input" /></label>; }
function Select({ label, value = "", onChange, rows = [], disabled = false, placeholder = "Select…" }: any) { return <label className="field">{label}<select value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="form-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"><option value="">{placeholder}</option>{rows.map((row: Row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>; }
function TextArea({ label, value = "", onChange }: any) { return <label className="field sm:col-span-2">{label}<textarea rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} className="form-input resize-none" /></label>; }
function Metric({ icon, value, label }: any) { return <div className="textbook-metric rounded-2xl border p-3"><div className="flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4">{icon}<span className="text-[10px] font-black uppercase tracking-wide">{label}</span></div><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function Status({ value }: any) { return <span className={`rounded-full px-2 py-1 text-[8px] font-black ${value === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : value === "ARCHIVED" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{value}</span>; }
function SmallButton({ title, onClick, children, danger = false }: any) { return <button title={title} aria-label={title} onClick={onClick} className={`textbook-action-button grid h-9 w-9 place-items-center rounded-xl border [&_svg]:h-4 [&_svg]:w-4 ${danger ? "danger" : ""}`}>{children}</button>; }
function Actions({ saving, onCancel, onSave, label }: any) { return <div className="flex justify-end gap-2"><button onClick={onCancel} className="secondary">Cancel</button><button onClick={onSave} disabled={saving} className="primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button></div>; }
function ErrorText({ text }: any) { return <div role="alert" className="textbook-upload-error"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{text}</span></div>; }
function Empty() { return <div className="col-span-full rounded-2xl border border-dashed border-[#b9d8d1] bg-white p-12 text-center text-xs text-slate-500 dark:bg-slate-900"><BookOpen className="mx-auto mb-3 h-9 w-9 text-[#73b7aa]" />No textbooks match the current filters.</div>; }
function Skeletons() { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>; }
function clean(form: Row) { const keys = ["textbookId", "title", "subtitle", "description", "boardId", "academicYearId", "gradeId", "subjectId", "language", "publisher", "author", "edition", "isbn", "coverImage", "status"]; return Object.fromEntries(keys.filter((key) => form[key] !== undefined).map((key) => [key, form[key]])); }
function nextVersion(value?: string) { const parts = (value || "0.0").split("."); return `${Number(parts[0]) || 0}.${(Number(parts[1]) || 0) + 1}`; }
function bytes(value?: number) { if (!value) return "—"; return value > 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`; }
function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong."; }
