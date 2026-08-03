"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, X, Calendar, MessageCircle } from "lucide-react";
import { mapCursorPosition } from "../../../lib/cursor";

export default function AdminInterviews() {
  const router = useRouter();
  
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [newSlot, setNewSlot] = useState({ applicationId: "", interviewerId: "", dateTime: "", meetingLink: "" });
  const [feedbackData, setFeedbackData] = useState({ id: "", status: "COMPLETED", feedback: "", score: 85 });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const feedbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastGeneratedScore, setLastGeneratedScore] = useState<number | null>(null);
  const [lastGeneratedFeedback, setLastGeneratedFeedback] = useState("");

  const handleSpellCheck = async () => {
    const textarea = feedbackTextareaRef.current;
    if (!textarea) return;

    const originalText = textarea.value;
    if (!originalText.trim()) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    setSpellLoading(true);
    try {
      const prompt = `Proofread, fix any spelling or grammar errors, but keep the exact same style, meaning, and formatting. Do not rephrase or rewrite. Correct only the spelling mistakes in this admission feedback: '${originalText}' while preserving the core message.`;

      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "x-tenant-id": localStorage.getItem("schoolId") || "",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data = await response.json();
      if (data.response) {
        const correctedText = data.response;
        const newStart = mapCursorPosition(originalText, correctedText, selectionStart);
        const newEnd = mapCursorPosition(originalText, correctedText, selectionEnd);

        setFeedbackData((prev) => ({ ...prev, feedback: correctedText }));
        setLastGeneratedFeedback(correctedText.trim());
        textarea.value = correctedText;

        textarea.setSelectionRange(newStart, newEnd);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newStart, newEnd);
        }, 0);
      }
    } catch (error) {
      console.error("Spell check failed:", error);
      alert("Spell check service is temporarily unavailable. Please try again.");
    } finally {
      setSpellLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    const currentFeedback = (feedbackTextareaRef.current?.value ?? feedbackData.feedback).trim();
    if (currentFeedback && !confirm("This will overwrite your current feedback text with fresh AI-generated feedback. Do you want to proceed?")) {
      return;
    }

    setAiLoading(true);
    try {
      const score = feedbackData.score || 0;
      const prompt = `Generate detailed admission feedback for a candidate with an interview score of ${score}/100. Write a professional, constructive paragraph summarizing their performance. Do not use generic statements.`;

      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "x-tenant-id": localStorage.getItem("schoolId") || "",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data = await response.json();
      if (data.response) {
        setFeedbackData((prev) => ({ ...prev, feedback: data.response }));
        setLastGeneratedScore(score);
        setLastGeneratedFeedback(data.response.trim());
        if (feedbackTextareaRef.current) feedbackTextareaRef.current.value = data.response;
      }
    } catch (error) {
      console.error("AI feedback generation failed:", error);
      alert("AI service is temporarily unavailable. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem("schoolId");
    const tok = localStorage.getItem("token");
    if (!id || !tok) {
      router.push("/login");
      return;
    }
    setSchoolId(id);
    setToken(tok);
  }, [router]);

  useEffect(() => {
    if (!schoolId || !token) return;

    async function fetchInterviews() {
      setIsLoading(true);
      try {
        const headers = { 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        };
        const [intersRes, appsRes, staffRes] = await Promise.all([
          fetch("http://localhost:5001/interview", { headers }),
          fetch("http://localhost:5001/application", { headers }),
          fetch("http://localhost:5001/interview/staff", { headers }),
        ]);

        if (intersRes.ok) setInterviews(await intersRes.json());
        if (appsRes.ok) setApplications(await appsRes.json());
        if (staffRes.ok) setInterviewers(await staffRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInterviews();
  }, [schoolId, token]);

  const handleCreateInterviewSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/interview", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newSlot),
      });
      if (res.ok) {
        const intRes = await fetch("http://localhost:5001/interview", { 
          headers: { 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          } 
        });
        if (intRes.ok) setInterviews(await intRes.json());
        setNewSlot({ applicationId: "", interviewerId: "", dateTime: "", meetingLink: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/interview/${feedbackData.id}/feedback`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: feedbackData.status,
          feedback: feedbackData.feedback,
          score: Number(feedbackData.score),
        }),
      });
      if (res.ok) {
        setInterviews(prev =>
          prev.map((i) => i.id === feedbackData.id ? { ...i, status: feedbackData.status, feedback: feedbackData.feedback, score: feedbackData.score } : i)
        );
        setIsFeedbackOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWhatsAppRedirect = (interview: any) => {
    const rawPhone = interview.application?.parent?.phone || "";
    let phone = rawPhone.replace(/\D/g, "");

    if (!phone) {
      alert("Parent WhatsApp phone number is not available.");
      return;
    }

    if (phone.length === 10) phone = `91${phone}`;
    if (phone.length === 11 && phone.startsWith("0")) phone = `91${phone.slice(1)}`;

    const studentName = `${interview.application?.studentFirstName || ""} ${interview.application?.studentLastName || ""}`.trim();
    const parentName = `${interview.application?.parent?.firstName || ""} ${interview.application?.parent?.lastName || ""}`.trim();
    const scheduledAt = new Date(interview.dateTime).toLocaleString("en-IN", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const schoolName = interview.application?.school?.name || "the school";
    const meetingDetails = interview.meetingLink ? `\nMeeting link: ${interview.meetingLink}` : "";
    const message = `Dear ${parentName || "Parent/Guardian"},\n\nThe admission interview for ${studentName} has been scheduled.\n\nDate & Time: ${scheduledAt}\nInterviewer: ${interview.interviewer?.firstName || ""} ${interview.interviewer?.lastName || ""}${meetingDetails}\n\nRegards,\nAdmissions Office\n${schoolName}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Interview Assessment Scheduler</h1>
        <p className="text-xs text-slate-400 mt-1">Book slots, assign admissions evaluators, and record assessment grading parameters.</p>
      </div>

      {/* Create Interview Slot Form */}
      <form onSubmit={handleCreateInterviewSlot} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl grid md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase">Select Application</label>
          <select 
            required
            value={newSlot.applicationId}
            onChange={(e) => setNewSlot(prev => ({ ...prev, applicationId: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="">-- Select --</option>
            {applications
              .filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.studentFirstName} {a.studentLastName} ({a.grade})
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase">Assigned Staff</label>
          <select 
            required
            value={newSlot.interviewerId}
            onChange={(e) => setNewSlot(prev => ({ ...prev, interviewerId: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="">-- Select --</option>
            {interviewers.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.firstName} {staff.lastName} ({staff.role})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase">Datetime</label>
          <input required type="datetime-local" value={newSlot.dateTime} onChange={(e) => setNewSlot(prev => ({ ...prev, dateTime: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
        </div>
        <button disabled={actionLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 font-bold py-2 rounded-lg text-xs text-white">
          Save Schedule Slot
        </button>
      </form>

      {/* Interviews List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-955 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="p-4">Applicant</th>
              <th className="p-4">Interviewer</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Feedback / Score</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {interviews.map((inter) => (
              <tr key={inter.id} className="hover:bg-slate-800/20">
                <td className="p-4 font-bold text-white">
                  {inter.application?.studentFirstName} {inter.application?.studentLastName}
                </td>
                <td className="p-4">{inter.interviewer?.firstName} {inter.interviewer?.lastName}</td>
                <td className="p-4 font-mono text-indigo-400">{new Date(inter.dateTime).toLocaleString()}</td>
                <td className="p-4">
                  {inter.feedback ? (
                    <span className="text-[#344054]">Score: <b className="text-[#007f70]">{inter.score}</b> <br /> <span className="text-[10px] text-[#526474]">{inter.feedback}</span></span>
                  ) : (
                    <span className="text-slate-550 font-medium">Pending Feedback</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      const initialFeedback = inter.feedback || "";
                      const initialScore = inter.score || 80;
                      setFeedbackData({ id: inter.id, status: inter.status, feedback: initialFeedback, score: initialScore });
                      setLastGeneratedScore(initialFeedback ? initialScore : null);
                      setLastGeneratedFeedback(initialFeedback.trim());
                      setIsFeedbackOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded font-bold text-[10px]"
                  >
                    Grade Interview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWhatsAppRedirect(inter)}
                    className="bg-[#128C7E] hover:bg-[#0F766E] px-3 py-1 rounded font-bold text-[10px] !text-white inline-flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grading feedback Modal overlay */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleUpdateFeedback} className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Grade Assessment</h3>
              <button type="button" onClick={() => setIsFeedbackOpen(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Score (0-100) *</label>
              <input type="number" required value={feedbackData.score} onChange={(e) => setFeedbackData(prev => ({ ...prev, score: Number(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-400">Feedback Details *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSpellCheck}
                    disabled={spellLoading || !feedbackData.feedback}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 flex items-center gap-1 transition-colors"
                  >
                    {spellLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span>✏️ Spell Check</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-1 transition-colors"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                    ) : (
                      <span>✨ Generate with AI</span>
                    )}
                  </button>
                </div>
              </div>
              <textarea ref={feedbackTextareaRef} required rows={4} spellCheck={true} value={feedbackData.feedback} onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white resize-y" />
            </div>
            <button disabled={actionLoading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg text-xs font-bold text-white">
              Submit Score & Feedback
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
