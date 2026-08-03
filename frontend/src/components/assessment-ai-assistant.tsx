"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Send, Sparkles, Trash2, X } from "lucide-react";

type ChatMessage = { role: "assistant" | "user"; content: string };

export function AssessmentAiAssistant({
  assessmentId,
  submissionId,
  subject,
  grade,
  topic,
  questionId,
  questionNumber,
  tokenStorageKey = "token",
  schoolIdStorageKey = "schoolId",
  schoolId: suppliedSchoolId,
}: {
  assessmentId: string;
  submissionId?: string;
  subject: string;
  grade: string;
  topic: string;
  questionId: string;
  questionNumber: number;
  tokenStorageKey?: string;
  schoolIdStorageKey?: string;
  schoolId?: string;
}) {
  const intro = "Ask me to explain concepts, definitions, formulas, or problem-solving methods.";
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: intro }]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(tokenStorageKey);
    const schoolId = suppliedSchoolId || localStorage.getItem(schoolIdStorageKey);
    fetch("http://localhost:5001/school/details", {
      headers: { Authorization: `Bearer ${token}`, "x-tenant-id": schoolId || "" },
    })
      .then(response => response.ok ? response.json() : null)
      .then(details => setEnabled(details?.settings?.assessmentAiEnabled !== false))
      .catch(() => setEnabled(false));
  }, [schoolIdStorageKey, suppliedSchoolId, tokenStorageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text = input, action?: "EXPLAIN" | "HINT" | "EXAMPLE") => {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    setMessages(current => [...current, { role: "user", content: message }]);
    setLoading(true);
    try {
      const token = localStorage.getItem(tokenStorageKey);
      const schoolId = suppliedSchoolId || localStorage.getItem(schoolIdStorageKey);
      const response = await fetch("http://localhost:5001/ai/assessment-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": schoolId || "",
        },
        body: JSON.stringify({
          assessmentId, submissionId, questionId, questionNumber, message, action,
          history: messages.slice(-8),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Assistant unavailable");
      setMessages(current => [...current, { role: "assistant", content: payload.response }]);
    } catch (error: any) {
      setMessages(current => [...current, { role: "assistant", content: error.message || "The assistant is temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  const startDrag = (event: React.PointerEvent) => {
    if (maximized || window.innerWidth < 640) return;
    dragRef.current = { x: event.clientX, y: event.clientY, startX: position.x, startY: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPosition({
      x: dragRef.current.startX + event.clientX - dragRef.current.x,
      y: dragRef.current.startY + event.clientY - dragRef.current.y,
    });
  };
  const endDrag = () => { dragRef.current = null; };

  if (!enabled) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label="Open AI Learning Assistant" className="fixed bottom-5 right-5 z-[100000] flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008f7d] text-white shadow-[0_16px_40px_rgba(0,143,125,.35)] transition hover:-translate-y-1 hover:bg-[#007f70]">
        <Sparkles className="h-7 w-7 text-white" />
      </button>
    );
  }

  return (
    <section
      style={maximized ? undefined : { transform: `translate(${position.x}px, ${position.y}px)` }}
      className={`assessment-ai-panel fixed z-[100000] overflow-hidden border border-[#cde3dd] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
        maximized ? "inset-3 rounded-2xl sm:inset-8" : "bottom-5 right-5 w-[calc(100vw-2rem)] rounded-2xl sm:w-[380px]"
      } ${minimized ? "h-auto" : maximized ? "flex flex-col" : "h-[540px] max-h-[75vh] flex flex-col"}`}
    >
      <header onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} className="assessment-ai-header flex cursor-move items-center justify-between bg-gradient-to-r from-[#007f70] to-[#00a78f] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-white" />
          <div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-white">AI Learning Assistant</h3><p className="truncate text-[9px] text-emerald-50">{grade} · {subject} · Question {questionNumber}</p></div>
        </div>
        <div className="flex items-center gap-1">
          <span className="hidden text-sm tracking-[-2px] text-emerald-100 sm:block" aria-hidden="true">•••</span>
          <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => setMinimized(value => !value)} className="rounded-lg px-2 py-1 text-sm font-black text-white hover:bg-white/15" aria-label={minimized ? "Restore chat" : "Minimize chat"}>−</button>
          <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => { setMaximized(value => !value); setMinimized(false); }} className="rounded-lg px-2 py-1 text-xs font-black text-white hover:bg-white/15" aria-label="Maximize chat">□</button>
          <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close chat"><X className="h-4 w-4 text-white" /></button>
        </div>
      </header>
      {!minimized && <>
        <div className="flex items-center justify-between border-b border-[#e3efeb] bg-[#f4fbf8] px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <p className="truncate text-[10px] font-semibold text-[#607080]">{topic}</p>
          <button type="button" onClick={() => setMessages([{ role: "assistant", content: intro }])} className="flex items-center gap-1 text-[9px] font-bold text-[#007f70]"><Trash2 className="h-3 w-3" /> Clear</button>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f8fbfa] p-4 dark:bg-slate-950">
          {messages.map((message, index) => (
            <div key={index} className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[86%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed ${message.role === "user" ? "assessment-ai-user-message rounded-br-md bg-[#008f7d] text-white" : "rounded-bl-md border border-[#dceae6] bg-white text-[#203247] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}>
                {message.content}
                {message.role === "assistant" && index > 0 && <button type="button" onClick={() => navigator.clipboard.writeText(message.content)} className="mt-2 flex items-center gap-1 text-[9px] font-bold text-[#71818d] opacity-0 transition group-hover:opacity-100"><Copy className="h-3 w-3" /> Copy</button>}
              </div>
            </div>
          ))}
          {loading && <div className="flex gap-1 rounded-2xl rounded-bl-md border border-[#dceae6] bg-white p-3 w-fit"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#008f7d]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#008f7d] [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#008f7d] [animation-delay:240ms]" /></div>}
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-[#e3efeb] bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          {[
            { label: "Explain this concept", action: "EXPLAIN" as const },
            { label: "Give me a hint", action: "HINT" as const },
            { label: "Show a similar example", action: "EXAMPLE" as const },
          ].map(item => (
            <button
              key={item.action}
              type="button"
              disabled={loading}
              onClick={() => send(item.label, item.action)}
              className="shrink-0 rounded-full border border-[#b9ddd4] bg-[#f2faf7] px-3 py-1.5 text-[9px] font-bold text-[#007f70] hover:bg-[#e3f6f0] disabled:cursor-wait disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
        <form onSubmit={event => { event.preventDefault(); send(); }} className="flex gap-2 border-t border-[#e3efeb] bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <input value={input} onChange={event => setInput(event.target.value)} maxLength={1000} placeholder="Ask for an explanation or hint…" className="min-w-0 flex-1 rounded-xl border border-[#cfe3de] bg-white px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d] dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <button type="submit" disabled={!input.trim() || loading} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#008f7d] text-white disabled:opacity-40"><Send className="h-4 w-4 text-white" /></button>
        </form>
      </>}
    </section>
  );
}
