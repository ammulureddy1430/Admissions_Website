"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mapCursorPosition } from "../../../lib/cursor";
import { 
  School, 
  Users, 
  Sparkles, 
  Sliders, 
  CreditCard, 
  MessageSquare, 
  LogOut, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar, 
  Globe, 
  TrendingUp, 
  PlusCircle, 
  Check, 
  X,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [user, setUser] = useState<any>(null);

  // States for database entities
  const [leads, setLeads] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cmsPages, setCmsPages] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);

  // Loader & error states
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newLead, setNewLead] = useState({ firstName: "", lastName: "", email: "", phone: "", grade: "", notes: "" });
  const [newSlot, setNewSlot] = useState({ applicationId: "", interviewerId: "", dateTime: "", meetingLink: "" });
  const [newCMSPage, setNewCMSPage] = useState({ title: "", slug: "", content: "", published: true });
  const [feedbackData, setFeedbackData] = useState({ id: "", status: "COMPLETED", feedback: "", score: 85 });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const feedbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
        setLastGeneratedFeedback(correctedText);
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
        setLastGeneratedFeedback(data.response);
        if (feedbackTextareaRef.current) feedbackTextareaRef.current.value = data.response;
      }
    } catch (error) {
      console.error("AI feedback generation failed:", error);
      alert("AI service is temporarily unavailable. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // Analytics & Settings states
  const [analytics, setAnalytics] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>({
    admissionFee: 1500,
    autoApproveLeads: false,
    supportEmail: "info@greenwood.edu",
    supportPhone: "+919876543210",
    aiContext: "",
  });

  // Load context on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedSchoolId = localStorage.getItem("schoolId");
    const storedSchoolName = localStorage.getItem("schoolName");
    const storedSubdomain = localStorage.getItem("subdomain");

    if (!storedUser || !storedSchoolId) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    setSchoolId(storedSchoolId);
    setSchoolName(storedSchoolName || "Oakridge Academy");
    setSubdomain(storedSubdomain || "demo");
  }, [router]);

  // Fetch all dashboard data once schoolId is set
  useEffect(() => {
    if (!schoolId) return;

    async function fetchAllData() {
      setIsLoading(true);
      setError(null);

      try {
        const headers = { "x-tenant-id": schoolId };

        const [leadsRes, appsRes, intersRes, paysRes, notifsRes, cmsRes, staffRes, analyticsRes, settingsRes] = await Promise.all([
          fetch("http://localhost:5001/lead", { headers }),
          fetch("http://localhost:5001/application", { headers }),
          fetch("http://localhost:5001/interview", { headers }),
          fetch("http://localhost:5001/payment", { headers }),
          fetch("http://localhost:5001/notification", { headers }),
          fetch("http://localhost:5001/cms", { headers }),
          fetch("http://localhost:5001/interview/staff", { headers }),
          fetch("http://localhost:5001/analytics/summary", { headers }),
          fetch("http://localhost:5001/school/details", { headers }),
        ]);

        if (leadsRes.ok) setLeads(await leadsRes.json());
        if (appsRes.ok) setApplications(await appsRes.json());
        if (intersRes.ok) setInterviews(await intersRes.json());
        if (paysRes.ok) setPayments(await paysRes.json());
        if (notifsRes.ok) setNotifications(await notifsRes.json());
        if (cmsRes.ok) setCmsPages(await cmsRes.json());
        if (staffRes.ok) setInterviewers(await staffRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (settingsRes.ok) {
          const detail = await settingsRes.json();
          if (detail.settings) setSchoolSettings(detail.settings);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Failed to fetch dashboard data. Make sure backend is running.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllData();
  }, [schoolId]);

  // Action methods
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        const lead = await res.json();
        setLeads((prev) => [lead, ...prev]);
        setNewLead({ firstName: "", lastName: "", email: "", phone: "", grade: "", notes: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      const res = await fetch(`http://localhost:5001/lead/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status } : l))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCMSPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify(newCMSPage),
      });
      if (res.ok) {
        const page = await res.json();
        setCmsPages((prev) => [page, ...prev]);
        setNewCMSPage({ title: "", slug: "", content: "", published: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/school/settings", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId 
        },
        body: JSON.stringify({
          admissionFee: Number(schoolSettings.admissionFee),
          autoApproveLeads: schoolSettings.autoApproveLeads,
          supportEmail: schoolSettings.supportEmail,
          supportPhone: schoolSettings.supportPhone,
          aiContext: schoolSettings.aiContext,
        }),
      });
      if (res.ok) {
        alert("School configuration settings updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: string) => {
    try {
      const res = await fetch(`http://localhost:5001/application/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInterviewSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify(newSlot),
      });
      if (res.ok) {
        const inter = await res.json();
        // Reload interviews
        const intRes = await fetch("http://localhost:5001/interview", { headers: { "x-tenant-id": schoolId } });
        if (intRes.ok) setInterviews(await intRes.json());
        setNewSlot({ applicationId: "", interviewerId: "", dateTime: "", meetingLink: "" });
        // Auto-update application state
        setApplications((prev) =>
          prev.map((a) => (a.id === newSlot.applicationId ? { ...a, status: "INTERVIEW_SCHEDULED" } : a))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/interview/${feedbackData.id}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify({
          status: feedbackData.status,
          feedback: feedbackData.feedback,
          score: Number(feedbackData.score),
        }),
      });
      if (res.ok) {
        setInterviews((prev) =>
          prev.map((i) =>
            i.id === feedbackData.id
              ? { ...i, status: feedbackData.status, feedback: feedbackData.feedback, score: feedbackData.score }
              : i
          )
        );
        setIsFeedbackOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentReview = async (docId: string, status: string, reason?: string) => {
    try {
      const res = await fetch(`http://localhost:5001/document/${docId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      if (res.ok) {
        // Reload applications list to reflect document state updates
        const appsRes = await fetch("http://localhost:5001/application", { headers: { "x-tenant-id": schoolId } });
        if (appsRes.ok) setApplications(await appsRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400">Loading Pehchaan Dashboard Context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 shrink-0 flex flex-col justify-between">
        <div>
          {/* Tenant Title Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <School className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-sm text-white truncate">{schoolName}</h3>
              <span className="text-[10px] text-slate-500 font-mono">{subdomain}.localhost</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: "overview", label: "Overview", icon: <TrendingUp className="h-4 w-4" /> },
              { id: "leads", label: "Leads CRM", icon: <Users className="h-4 w-4" /> },
              { id: "applications", label: "Applications", icon: <FileText className="h-4 w-4" /> },
              { id: "interviews", label: "Interviews", icon: <Calendar className="h-4 w-4" /> },
              { id: "payments", label: "Payments Logs", icon: <CreditCard className="h-4 w-4" /> },
              { id: "notifications", label: "Alert Logs", icon: <MessageSquare className="h-4 w-4" /> },
              { id: "cms", label: "CMS Website", icon: <Globe className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer User Block */}
        <div className="p-4 border-t border-slate-800/80 space-y-4">
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
          >
            <Sliders className="h-4 w-4" /> Settings
          </button>
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400 uppercase">
              {user?.firstName?.[0] || "A"}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{user?.firstName} {user?.lastName}</h4>
              <span className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {error && (
          <div className="bg-rose-950/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-extrabold text-white">System Analytics & Overview</h1>
              <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 px-3 py-1 rounded-full text-[10px] font-bold font-mono">
                Admission Fee: ₹{schoolSettings?.admissionFee}
              </span>
            </div>

            {/* Top metrics widgets */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { title: "Total Leads", val: analytics?.totals?.leads || leads.length, col: "text-indigo-400" },
                { title: "Applications", val: analytics?.totals?.applications || applications.length, col: "text-purple-400" },
                { title: "Total Invoiced Revenue", val: `₹${(analytics?.totals?.revenue || 0).toLocaleString()}`, col: "text-emerald-400" },
                { title: "Student Conversion Rate", val: `${analytics?.totals?.conversionRate || 0}%`, col: "text-amber-400" },
              ].map((stat, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.title}</span>
                  <h3 className={`text-2xl font-extrabold mt-2 ${stat.col}`}>{stat.val}</h3>
                </div>
              ))}
            </div>

            {/* Custom charts layout */}
            <div className="grid grid-cols-3 gap-8">
              {/* Chart 1: Leads by Marketing Source */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Leads by Marketing Source</h4>
                <div className="space-y-4 pt-2">
                  {(analytics?.leadsBySource || []).map((item: any, idx: number) => {
                    const totalLeads = analytics?.totals?.leads || leads.length || 1;
                    const percent = Math.min(100, Math.round((item.count / totalLeads) * 100));
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span className="font-bold font-mono">{item.source}</span>
                          <span>{item.count} leads ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                          <div style={{ width: `${percent}%` }} className="bg-indigo-500 h-full rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Grade Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Applicant Grade Breakdown</h4>
                <div className="space-y-4 pt-2">
                  {(analytics?.applicationsByGrade || []).map((item: any, idx: number) => {
                    const totalApps = analytics?.totals?.applications || applications.length || 1;
                    const percent = Math.min(100, Math.round((item.count / totalApps) * 100));
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span className="font-bold font-mono">{item.grade}</span>
                          <span>{item.count} apps ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                          <div style={{ width: `${percent}%` }} className="bg-purple-500 h-full rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 3: Revenue Timeline */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Revenue Collection Growth</h4>
                <div className="flex items-end gap-3 h-32 pt-4">
                  {(analytics?.revenueTimeline || []).map((item: any, idx: number) => {
                    const heights = ["h-1/5", "h-2/5", "h-2/5", "h-3/5", "h-4/5", "h-full"];
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute -top-6 bg-slate-950 border border-slate-800 text-[9px] text-emerald-400 font-mono px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          ₹{item.revenue}
                        </div>
                        <div className={`w-full bg-gradient-to-t from-emerald-600/30 to-emerald-500 rounded-t ${heights[idx] || "h-1/2"}`} />
                        <span className="text-[10px] text-slate-500 mt-2 font-semibold font-mono">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Action Tables */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="font-bold text-sm text-white mb-4">Recent Leads Capture</h4>
                <div className="space-y-3">
                  {leads.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-950/50 border border-slate-900">
                      <div>
                        <h5 className="font-bold text-white">{lead.firstName} {lead.lastName}</h5>
                        <span className="text-[10px] text-slate-500">{lead.grade} • {lead.email}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lead.status === "NEW" ? "bg-indigo-950/50 text-indigo-400" : "bg-emerald-950/50 text-emerald-400"
                      }`}>{lead.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="font-bold text-sm text-white mb-4">Pending Document Reviews</h4>
                <div className="space-y-3">
                  {applications
                    .flatMap(a => a.documents.map((d: any) => ({ ...d, student: `${a.studentFirstName} ${a.studentLastName}` })))
                    .filter(d => d.status === "PENDING")
                    .slice(0, 3)
                    .map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-950/50 border border-slate-900">
                        <div>
                          <h5 className="font-bold text-white">{doc.name}</h5>
                          <span className="text-[10px] text-slate-500">Applicant: {doc.student} • Type: {doc.type}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDocumentReview(doc.id, "APPROVED")}
                            className="bg-emerald-600 hover:bg-emerald-500 p-1 rounded text-white"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => handleDocumentReview(doc.id, "REJECTED", "Document not readable.")}
                            className="bg-rose-600 hover:bg-rose-500 p-1 rounded text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leads CRM Tab */}
        {activeTab === "leads" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-extrabold text-white">Leads inquiry Pipeline</h1>
              <span className="text-xs text-slate-500 font-mono">Multi-tenant logical separation validation</span>
            </div>
            
            {/* Create Lead Form */}
            <form onSubmit={handleCreateLead} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl grid md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">First Name</label>
                <input required type="text" placeholder="Sarah" value={newLead.firstName} onChange={(e) => setNewLead(prev => ({ ...prev, firstName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Last Name</label>
                <input required type="text" placeholder="Miller" value={newLead.lastName} onChange={(e) => setNewLead(prev => ({ ...prev, lastName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Email</label>
                <input required type="email" placeholder="sarah@yahoo.com" value={newLead.email} onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Phone</label>
                <input required type="text" placeholder="+919988776611" value={newLead.phone} onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Target Grade</label>
                <input required type="text" placeholder="Grade 6" value={newLead.grade} onChange={(e) => setNewLead(prev => ({ ...prev, grade: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <button disabled={actionLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 font-bold py-2 rounded-lg text-xs text-white flex items-center justify-center gap-1">
                <PlusCircle className="h-4 w-4" /> Add Lead
              </button>
            </form>

            {/* Leads Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-4">Contact</th>
                    <th className="p-4">Target Grade</th>
                    <th className="p-4">Date Recieved</th>
                    <th className="p-4">Pipeline Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-bold text-white">
                        {lead.firstName} {lead.lastName} <br />
                        <span className="text-[10px] text-slate-500 font-normal">{lead.email} • {lead.phone}</span>
                      </td>
                      <td className="p-4">{lead.grade}</td>
                      <td className="p-4 text-slate-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <select 
                          value={lead.status}
                          onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-indigo-400 font-bold"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="APPLIED">APPLIED</option>
                          <option value="LOST">LOST</option>
                        </select>
                      </td>
                      <td className="p-4 text-right text-slate-500">
                        --
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-extrabold text-white">Student Admissions Applications</h1>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-4">Student</th>
                    <th className="p-4">Parent Details</th>
                    <th className="p-4">Applied Grade</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Review Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-bold text-white">
                        {app.studentFirstName} {app.studentLastName} <br />
                        <span className="text-[10px] text-slate-500 font-normal">{new Date(app.studentDob).toLocaleDateString()} • {app.studentGender}</span>
                      </td>
                      <td className="p-4">
                        {app.parent?.firstName} {app.parent?.lastName} <br />
                        <span className="text-[10px] text-slate-500">{app.parent?.email}</span>
                      </td>
                      <td className="p-4 font-semibold">{app.grade}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.paymentStatus === "PAID" ? "bg-emerald-950/50 text-emerald-400" : "bg-rose-950/50 text-rose-400"
                        }`}>{app.paymentStatus}</span>
                      </td>
                      <td className="p-4">
                        <select 
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-indigo-400 font-bold"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="SUBMITTED">SUBMITTED</option>
                          <option value="UNDER_REVIEW">UNDER REVIEW</option>
                          <option value="INTERVIEW_SCHEDULED">INTERVIEW SCHEDULED</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        {app.status === "UNDER_REVIEW" && (
                          <button
                            onClick={() => {
                              setNewSlot(prev => ({ ...prev, applicationId: app.id }));
                              setActiveTab("interviews");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded font-bold text-[10px]"
                          >
                            Schedule Assessment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Interviews Tab */}
        {activeTab === "interviews" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-extrabold text-white">Interview Assessment Scheduler</h1>
            
            {/* Create Interview Slot Form */}
            <form onSubmit={handleCreateInterviewSlot} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl grid md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Select Application</label>
                <select 
                  required
                  value={newSlot.applicationId}
                  onChange={(e) => setNewSlot(prev => ({ ...prev, applicationId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
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
                <input required type="datetime-local" value={newSlot.dateTime} onChange={(e) => setNewSlot(prev => ({ ...prev, dateTime: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white" />
              </div>
              <button disabled={actionLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 font-bold py-2 rounded-lg text-xs text-white">
                Save Schedule Slot
              </button>
            </form>

            {/* Interviews List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-4">Applicant</th>
                    <th className="p-4">Interviewer</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Meeting link</th>
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
                      <td className="p-4 text-slate-500 truncate max-w-xs">{inter.meetingLink}</td>
                      <td className="p-4">
                        {inter.feedback ? (
                          <span className="text-[#344054]">Score: <b className="text-[#007f70]">{inter.score}</b> <br /> <span className="text-[10px] text-[#526474]">{inter.feedback}</span></span>
                        ) : (
                          <span className="text-slate-500 font-medium">Pending Feedback</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            const initialFeedback = inter.feedback || "";
                            setFeedbackData({ id: inter.id, status: inter.status, feedback: initialFeedback, score: inter.score || 80 });
                            setLastGeneratedFeedback(initialFeedback);
                            setIsFeedbackOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded font-bold text-[10px]"
                        >
                          Grade Interview
                        </button>
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
        )}

        {/* Payments Logs Tab */}
        {activeTab === "payments" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-extrabold text-white">Razorpay Transactions & Invoicing</h1>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-4">Receipt Order ID</th>
                    <th className="p-4">Applicant</th>
                    <th className="p-4">Amount (INR)</th>
                    <th className="p-4">Razorpay Payment ID</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-mono font-bold text-white">{pay.razorpayOrderId}</td>
                      <td className="p-4">{pay.application?.studentFirstName} {pay.application?.studentLastName}</td>
                      <td className="p-4 font-semibold">₹{pay.amount}</td>
                      <td className="p-4 font-mono text-slate-500">{pay.razorpayPaymentId || "--"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pay.status === "SUCCESS" ? "bg-emerald-950/50 text-emerald-400" : "bg-amber-955/50 text-amber-400"
                        }`}>{pay.status}</span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(pay.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications Alert Logs Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-extrabold text-white">Multi-Channel Notification Dispatch Logs</h1>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Title / Alert</th>
                    <th className="p-4">Message Context</th>
                    <th className="p-4">Channel</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {notifications.map((notif) => (
                    <tr key={notif.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-bold text-white">
                        {notif.user?.firstName} {notif.user?.lastName} <br />
                        <span className="text-[10px] text-slate-500 font-normal">{notif.user?.email}</span>
                      </td>
                      <td className="p-4 font-semibold">{notif.title}</td>
                      <td className="p-4 text-slate-400 truncate max-w-sm">{notif.message}</td>
                      <td className="p-4 font-mono font-bold text-indigo-400">{notif.type}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          notif.status === "SENT" ? "bg-emerald-950/50 text-emerald-400" : "bg-rose-955/50 text-rose-400"
                        }`}>{notif.status}</span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(notif.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CMS Configuration Tab */}
        {activeTab === "cms" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-extrabold text-white">School Website Pages CMS Configuration</h1>
            
            {/* Create Page Form */}
            <form onSubmit={handleCreateCMSPage} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Page Title *</label>
                  <input required type="text" placeholder="e.g. Sports Curriculum" value={newCMSPage.title} onChange={(e) => setNewCMSPage(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Page Slug (Unique URL Path) *</label>
                  <input required type="text" placeholder="e.g. sports" value={newCMSPage.slug} onChange={(e) => setNewCMSPage(prev => ({ ...prev, slug: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Page Markdown Content *</label>
                <textarea required rows={4} placeholder="# Sports Activities..." value={newCMSPage.content} onChange={(e) => setNewCMSPage(prev => ({ ...prev, content: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono" />
              </div>
              <button disabled={actionLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 font-bold py-2 px-5 rounded-lg text-xs text-white">
                Publish Page
              </button>
            </form>

            {/* Pages list */}
            <div className="grid md:grid-cols-2 gap-6">
              {cmsPages.map((page) => (
                <div key={page.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white">{page.title}</h4>
                      <span className="text-xs font-mono text-indigo-400">/{page.slug}</span>
                    </div>
                    <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">Published</span>
                  </div>
                  <pre className="bg-slate-950 p-3 border border-slate-850 rounded text-[10px] font-mono overflow-x-auto text-slate-400 max-h-32">
                    {page.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Configuration Tab */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <h1 className="text-2xl font-extrabold text-white">School Settings & AI Chatbot Config</h1>
            
            <form onSubmit={handleUpdateSettings} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 max-w-2xl">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Registration Admission Fee (INR)</label>
                  <input 
                    required 
                    type="number" 
                    value={schoolSettings?.admissionFee || 1500} 
                    onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, admissionFee: Number(e.target.value) }))} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Auto Approve Leads</label>
                  <select 
                    value={String(schoolSettings?.autoApproveLeads || false)} 
                    onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, autoApproveLeads: e.target.value === "true" }))}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="false">Manual Review</option>
                    <option value="true">Auto Approve New Inquiries</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 border-t border-slate-800 pt-6">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Support Email Address</label>
                  <input 
                    required 
                    type="email" 
                    value={schoolSettings?.supportEmail || ""} 
                    onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, supportEmail: e.target.value }))} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Support Phone Helpline</label>
                  <input 
                    required 
                    type="text" 
                    value={schoolSettings?.supportPhone || ""} 
                    onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, supportPhone: e.target.value }))} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-6">
                <label className="text-xs text-slate-400 font-semibold uppercase block">AI Assistant System Prompt / Context FAQ</label>
                <span className="text-[10px] text-slate-500 block leading-normal">
                  Customize the AI bot's instructions. Provide details on K-12 curriculums, school values, school bus transport rules, or sports amenities.
                </span>
                <textarea 
                  rows={6}
                  placeholder="Greenwood International School is affiliated with CBSE board. Tuition fees range from ₹60,000 to ₹1,20,000 annually..."
                  value={schoolSettings?.aiContext || ""} 
                  onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, aiContext: e.target.value }))} 
                  className="w-full bg-slate-955 border border-slate-850 rounded-lg p-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed" 
                />
              </div>

              <button 
                type="submit" 
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-colors shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                {actionLoading ? "Updating Configurations..." : "Save Settings"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
