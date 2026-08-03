"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, FileSearch, Loader2, RefreshCcw, RotateCcw, Search, X } from "lucide-react";

type Row = Record<string, any>;

export default function DocumentProcessingDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [books, setBooks] = useState<Row[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [details, setDetails] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`http://localhost:5001/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "x-tenant-id": localStorage.getItem("schoolId") || "", "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Request failed.");
    return payload;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [documents, textbooks] = await Promise.all([
        request("game-assessments/documents?pageSize=100"),
        request("textbooks?pageSize=100"),
      ]);
      setRows(documents.items || []);
      setBooks(textbooks.items || []);
    } catch (e) { setError(message(e)); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const versions = useMemo(() => books.flatMap((book) => (book.versions || []).map((version: Row) => ({ ...version, title: book.title }))), [books]);
  const filtered = rows.filter((row) => (!status || row.status === status) && `${row.textbookVersion?.textbook?.title} ${row.textbookVersion?.versionNumber}`.toLowerCase().includes(search.toLowerCase()));

  const process = async () => {
    if (!selectedVersion) return;
    setBusy("process"); setError("");
    try {
      const row = await request("game-assessments/documents/process", { method: "POST", body: JSON.stringify({ textbookVersionId: selectedVersion }) });
      setDetails(row); await load();
    } catch (e) { setError(message(e)); } finally { setBusy(""); }
  };

  const inspect = async (row: Row) => {
    setBusy(row.id); setError("");
    try { setDetails(await request(`game-assessments/documents/${row.id}`)); }
    catch (e) { setError(message(e)); } finally { setBusy(""); }
  };

  const retry = async (row: Row) => {
    setBusy(row.id); setError("");
    try {
      const updated = await request("game-assessments/documents/reprocess", { method: "POST", body: JSON.stringify({ processedTextbookId: row.id }) });
      setDetails(updated); await load();
    } catch (e) { setError(message(e)); } finally { setBusy(""); }
  };

  return <div className="space-y-5">
    <header className="rounded-3xl bg-gradient-to-r from-[#071633] via-[#0b3150] to-[#007f70] p-6 text-white shadow-xl">
      <Link href="/admin/game-assessments" className="inline-flex items-center gap-1 text-xs font-bold text-white/70 hover:text-white"><ArrowLeft className="h-4 w-4" /> Game-Based Assessments</Link>
      <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider">Internal processing engine</span><h1 className="mt-3 text-2xl font-black">Document Processing Dashboard</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-white/70">Page-aware PDF extraction and deterministic textbook structuring, isolated to Game-Based Assessments.</p></div><div className="grid grid-cols-3 gap-2 text-center">{[["Ready", rows.filter(x => x.status === "READY").length],["Processing", rows.filter(x => x.status === "PROCESSING").length],["Failed", rows.filter(x => x.status === "FAILED").length]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-white/10 px-4 py-2"><p className="text-lg font-black">{value}</p><p className="text-[9px] uppercase text-white/60">{label}</p></div>)}</div></div>
    </header>

    <section className="rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black">Process a textbook version</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)} className="input flex-1"><option value="">Select active textbook PDF</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.title} · Version {version.versionNumber}</option>)}</select><button onClick={process} disabled={!selectedVersion || !!busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy === "process" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} Process PDF</button></div>
    </section>

    <section className="rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm"><div className="flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search processed textbooks…" className="input pl-9" /></label><select value={status} onChange={(e) => setStatus(e.target.value)} className="input sm:max-w-48"><option value="">All statuses</option>{["PENDING","PROCESSING","COMPLETED","FAILED","READY"].map(x => <option key={x}>{x}</option>)}</select><button onClick={() => void load()} className="inline-flex items-center justify-center rounded-xl border border-[#dceae6] px-3"><RefreshCcw className="h-4 w-4" /></button></div>{error && <div className="mt-3 flex justify-between rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}</section>

    {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(x => <div key={x} className="h-48 animate-pulse rounded-2xl bg-white" />)}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(row => <article key={row.id} className="rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#007f70]">{busy === row.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookOpen className="h-5 w-5" />}</div><Status value={row.status} /></div><h3 className="mt-3 text-sm font-black">{row.textbookVersion?.textbook?.title}</h3><p className="mt-1 text-[10px] text-slate-500">Version {row.textbookVersion?.versionNumber} · {row.pageCount} pages</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#00a58e]" style={{ width: `${row.progress}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-[9px]"><Metric label="Chapters" value={row.chapterCount} /><Metric label="Topics" value={row.topicCount} /><Metric label="Words" value={row.wordCount.toLocaleString()} /></div><div className="mt-4 flex gap-2 border-t border-slate-100 pt-3"><button onClick={() => inspect(row)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold">Details <ChevronRight className="h-3 w-3" /></button><button onClick={() => retry(row)} className="rounded-lg border border-slate-200 p-2" title="Retry processing"><RotateCcw className="h-3.5 w-3.5" /></button></div></article>)}{!filtered.length && <div className="col-span-full rounded-2xl border border-dashed border-[#b9d8d1] bg-white p-12 text-center text-xs text-slate-500">No processed documents found.</div>}</div>}

    {details && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={() => setDetails(null)}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase text-[#007f70]">Structured textbook</p><h2 className="text-xl font-black">{details.textbookVersion?.textbook?.title}</h2><p className="text-xs text-slate-500">Version {details.textbookVersion?.versionNumber} · {details.pageCount} pages · {details.wordCount?.toLocaleString()} words</p></div><button onClick={() => setDetails(null)}><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-5 md:grid-cols-2"><div><h3 className="text-xs font-black uppercase text-slate-500">Detected structure</h3><div className="mt-3 space-y-2">{details.chapters?.map((chapter: Row) => <div key={chapter.id} className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-black">{chapter.chapterNumber ? `${chapter.chapterNumber} · ` : ""}{chapter.title}</p><p className="text-[9px] text-slate-400">Pages {chapter.startPage}–{chapter.endPage}</p>{chapter.topics?.map((topic: Row) => <div key={topic.id} className="ml-3 mt-2 border-l-2 border-emerald-100 pl-3 text-[10px]"><p className="font-bold">{topic.topicNumber ? `${topic.topicNumber} ` : ""}{topic.title}</p>{topic.subtopics?.map((sub: Row) => <p key={sub.id} className="mt-1 text-slate-500">↳ {sub.title}</p>)}</div>)}</div>)}</div></div><div><h3 className="text-xs font-black uppercase text-slate-500">Processing logs</h3><div className="mt-3 space-y-2">{details.processingLogs?.map((log: Row) => <div key={log.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between"><span className="text-[9px] font-black text-[#007f70]">{log.stage}</span><span className="text-[8px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span></div><p className="mt-1 text-[10px] text-slate-600">{log.message}</p></div>)}</div></div></div></div></div>}
  </div>;
}

function Status({ value }: { value: string }) { const color = value === "READY" ? "bg-emerald-100 text-emerald-700" : value === "FAILED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"; return <span className={`rounded-full px-2 py-1 text-[9px] font-black ${color}`}>{value}</span>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-slate-50 p-2"><p className="font-black text-slate-700">{value}</p><p className="text-slate-400">{label}</p></div>; }
function message(e: unknown) { return e instanceof Error ? e.message : "Document processing failed."; }
