"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCcw, Search, XCircle } from "lucide-react";

type Row = Record<string, any>;
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export default function AIQuestionsPage({ embedded = false }: { embedded?: boolean }) {
  const [questions, setQuestions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        "x-tenant-id": localStorage.getItem("schoolId") || "",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Request failed.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request("game-assessments/questions/review?pageSize=100");
      setQuestions(result.items || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "AI questions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  const review = async (questionId: string, nextStatus: "APPROVED" | "REJECTED") => {
    setBusy(questionId + nextStatus);
    setError("");
    try {
      await request(`game-assessments/questions/${nextStatus === "APPROVED" ? "approve" : "reject"}`, {
        method: "POST",
        body: JSON.stringify({ questionIds: [questionId], note: nextStatus === "REJECTED" ? "Rejected during question review." : "Approved during question review." }),
      });
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Question review failed.");
    } finally {
      setBusy("");
    }
  };

  const filtered = useMemo(() => questions.filter((question) =>
    (!status || question.status === status)
    && (!search || `${question.questionText} ${question.correctAnswer} ${question.gameAssessment?.name || ""}`.toLowerCase().includes(search.toLowerCase()))
  ), [questions, search, status]);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#071633] to-[#007f70] p-5 shadow-lg">
        {!embedded && <Link href="/admin/game-assessments" className="keep-white inline-flex items-center gap-1 text-xs font-bold opacity-80"><ArrowLeft className="keep-white h-4 w-4" /> Game-Based Assessments</Link>}
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="keep-white text-2xl font-black">AI-generated questions</h1><p className="keep-white mt-1 text-xs opacity-80">Review the question, answer choices, correct answer, and textbook source before students play.</p></div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#007f70]"><RefreshCcw className="h-4 w-4" /> Refresh</button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#8a98a3]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions or assessments" className="input pl-9" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input sm:w-48"><option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option><option>DRAFT</option></select>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
      {loading ? <div className="grid min-h-52 place-items-center rounded-2xl border bg-white"><Loader2 className="h-7 w-7 animate-spin text-[#007f70]" /></div> : (
        <div className="space-y-4">
          <p className="text-xs font-bold text-[#607080]">{filtered.length} questions</p>
          {filtered.map((question, index) => (
            <article key={question.id} className="rounded-2xl border border-[#dceae6] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-[9px] font-extrabold uppercase"><span className="rounded-full bg-[#e6f7f2] px-2.5 py-1 text-[#007f70]">Question {index + 1}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{question.questionType}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{question.difficulty}</span></div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${question.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : question.status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{question.status}</span>
              </div>
              <h2 className="mt-4 text-sm font-extrabold leading-6 text-[#071633]">{question.questionText}</h2>
              {question.options?.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option: Row) => <div key={option.id} className={`rounded-xl border p-3 text-xs font-bold ${option.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[#e0ece8] bg-[#fafdfc] text-[#526474]"}`}><span className="mr-2 font-black">{option.optionKey}.</span>{option.optionText}{option.isCorrect && <span className="ml-2 text-[9px] uppercase">Correct</span>}</div>)}</div>}
              <div className="mt-4 rounded-xl bg-[#f5faf8] p-3 text-[10px] leading-5 text-[#607080]">
                <p><b className="text-[#071633]">Age Group & subject:</b> {question.gameAssessment?.ageGroup || "—"} · {question.gameAssessment?.subject || "—"}</p>
                <p><b className="text-[#071633]">Correct answer:</b> {question.correctAnswer}</p>
                <p><b className="text-[#071633]">Source:</b> {question.processedTextbook?.textbookVersion?.textbook?.title || "Textbook"} · Page {question.pageNumber || "—"}</p>
                <p><b className="text-[#071633]">Explanation:</b> {question.explanation || "No explanation provided."}</p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" disabled={!!busy} onClick={() => void review(question.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-extrabold text-rose-700 hover:bg-rose-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                <button type="button" disabled={!!busy} onClick={() => void review(question.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#007f70] px-3 py-2 text-[10px] font-extrabold text-white hover:bg-[#006b5e]"><CheckCircle2 className="keep-white h-3.5 w-3.5" /> Approve</button>
              </div>
            </article>
          ))}
          {!filtered.length && <div className="rounded-2xl border border-dashed border-[#cfe1dd] bg-white p-8 text-center text-xs font-bold text-[#71818d]">No generated questions match these filters.</div>}
        </div>
      )}
    </div>
  );
}
