"use client";

import { useEffect, useState, use } from "react";
import { 
  School, 
  Sparkles, 
  MessageSquare, 
  Send, 
  X, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { INDIAN_MOBILE_PATTERN, sanitizeIndianMobile } from "@/lib/phone";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default function SchoolCMSLanding({ params }: PageProps) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  // Context resolved states
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [cmsPages, setCmsPages] = useState<any[]>([]);
  const [activeSlug, setActiveSlug] = useState("home");
  
  // Loading & error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Floating AI Chat Widget state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", content: "Welcome! Ask me anything about admissions criteria, age requirements, fee packages, or extracurricular sports." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Lead inquiry form state
  const [inquiry, setInquiry] = useState({ firstName: "", lastName: "", email: "", phone: "", grade: "", notes: "" });
  const [inquiryStatus, setInquiryStatus] = useState<"IDLE" | "SENDING" | "SUCCESS" | "ERROR">("IDLE");

  // Load school details and pages
  useEffect(() => {
    async function resolveSchool() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch schools list to resolve subdomain to schoolId
        const schoolRes = await fetch("http://localhost:5001/school/list");
        if (!schoolRes.ok) throw new Error("Could not contact school registrar server.");
        const schools = await schoolRes.json();
        
        const matchedSchool = schools.find((s: any) => s.subdomain.toLowerCase() === subdomain.toLowerCase() || s.id === subdomain);
        if (!matchedSchool) {
          throw new Error(`School with subdomain "${subdomain}" not found.`);
        }

        setSchoolId(matchedSchool.id);
        setSchoolName(matchedSchool.name);

        // 2. Fetch CMS pages and settings for matched schoolId
        const headers = { "x-tenant-id": matchedSchool.id };
        const [cmsRes, detailsRes] = await Promise.all([
          fetch("http://localhost:5001/cms", { headers }),
          // backend endpoint details returns school details containing settings
          fetch("http://localhost:5001/school/details", { 
            headers: {
              ...headers,
              // Backend detail endpoint expects authorization, let's try public fallback or check
            }
          })
        ]);

        if (cmsRes.ok) {
          const pages = await cmsRes.json();
          setCmsPages(pages);
          if (pages.length > 0) {
            setActiveSlug(pages[0].slug);
          }
        }

        // Mock settings fallback if details unauthorized or fails
        if (detailsRes.ok) {
          const detail = await detailsRes.json();
          setSchoolSettings(detail.settings);
        } else {
          setSchoolSettings({
            admissionFee: 1500,
            supportEmail: `admissions@${subdomain}.edu`,
            supportPhone: "+91 9988776655",
            aiContext: "",
          });
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed loading portal.");
      } finally {
        setIsLoading(false);
      }
    }
    resolveSchool();
  }, [subdomain]);

  // Lead inquiry creation handler
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryStatus("SENDING");
    try {
      const res = await fetch("http://localhost:5001/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify({
          ...inquiry,
          source: "WEBSITE",
        }),
      });
      if (res.ok) {
        setInquiryStatus("SUCCESS");
        setInquiry({ firstName: "", lastName: "", email: "", phone: "", grade: "", notes: "" });
      } else {
        setInquiryStatus("ERROR");
      }
    } catch (err) {
      console.error(err);
      setInquiryStatus("ERROR");
    }
  };

  // AI Chat inquiry handler
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsAiLoading(true);

    try {
      const res = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had an error reading my AI modules." }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Could not connect to chatbot." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const activePageData = cmsPages.find((p) => p.slug === activeSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400">Loading CMS Website...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="text-center space-y-4 max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl">
          <School className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="font-extrabold text-lg text-white">Website Offline</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <Link href="/" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-5 rounded-lg transition-colors">
            Back to Registry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-900 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <School className="h-5 w-5" />
          </div>
          <h2 className="font-extrabold text-base text-white tracking-tight">{schoolName}</h2>
        </div>

        {/* Dynamic Pages Menu navbar */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
          {cmsPages.map((page) => (
            <button
              key={page.slug}
              onClick={() => setActiveSlug(page.slug)}
              className={`capitalize transition-colors ${
                activeSlug === page.slug ? "text-indigo-400 border-b border-indigo-400/50 pb-1" : "text-slate-400 hover:text-white"
              }`}
            >
              {page.title}
            </button>
          ))}
        </nav>

        {/* Action button */}
        <Link 
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all hover:shadow-lg hover:shadow-indigo-600/10 active:scale-95"
        >
          Portal Login
        </Link>
      </header>

      {/* Main CMS Display & Inquiry layout */}
      <main className="max-w-7xl mx-auto w-full px-8 py-12 grid md:grid-cols-3 gap-12 flex-1">
        
        {/* Left 2 Columns: CMS Page markdown contents */}
        <div className="md:col-span-2 space-y-6">
          {activePageData ? (
            <article className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 md:p-10 space-y-6">
              <h1 className="text-3xl font-extrabold text-white capitalize">{activePageData.title}</h1>
              <div className="h-0.5 w-12 bg-indigo-500 rounded" />
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {activePageData.content}
              </div>
            </article>
          ) : (
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-12 text-center text-slate-500">
              <p className="text-sm">No page content found.</p>
            </div>
          )}
        </div>

        {/* Right 1 Column: Lead inquiry Capture Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Admission Inquiry</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Interested in enrolling your child? Submit a lead inquiry and our admissions team will contact you.
              </p>
            </div>

            {inquiryStatus === "SUCCESS" ? (
              <div className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 p-4 rounded-xl text-xs space-y-2 text-center">
                <CheckCircle className="h-8 w-8 mx-auto" />
                <h5 className="font-bold">Inquiry Sent Successfully!</h5>
                <p className="text-[10px] text-slate-400">Our admissions office will reach out to you via phone or email.</p>
                <button 
                  onClick={() => setInquiryStatus("IDLE")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded text-[10px] transition-colors"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">First Name *</label>
                    <input required type="text" placeholder="Sarah" value={inquiry.firstName} onChange={(e) => setInquiry(prev => ({ ...prev, firstName: e.target.value }))} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Last Name *</label>
                    <input required type="text" placeholder="Miller" value={inquiry.lastName} onChange={(e) => setInquiry(prev => ({ ...prev, lastName: e.target.value }))} className="w-full bg-slate-950 border border-slate-855 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Email *</label>
                  <input required type="email" placeholder="sarah@gmail.com" value={inquiry.email} onChange={(e) => setInquiry(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-white" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Phone *</label>
                    <input required type="tel" inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number" placeholder="+919876543211" value={inquiry.phone} onChange={(e) => setInquiry(prev => ({ ...prev, phone: sanitizeIndianMobile(e.target.value) }))} className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Target Grade *</label>
                    <input required type="text" placeholder="Grade 3" value={inquiry.grade} onChange={(e) => setInquiry(prev => ({ ...prev, grade: e.target.value }))} className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Inquiry message</label>
                  <textarea rows={2} placeholder="Any specific requirements..." value={inquiry.notes} onChange={(e) => setInquiry(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-950 border border-slate-855 rounded-lg px-3 py-2 text-white" />
                </div>

                <button 
                  disabled={inquiryStatus === "SENDING"}
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2 rounded-lg text-white transition-all shadow-md active:scale-95"
                >
                  {inquiryStatus === "SENDING" ? "Submitting Inquiry..." : "Submit Inquiry"}
                </button>
              </form>
            )}
          </div>

          {/* School contacts widget */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-4">
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Contact Admissions Desk</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-indigo-400" />
                <span>{schoolSettings?.supportEmail || "admissions@school.edu"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-indigo-400" />
                <span>{schoolSettings?.supportPhone || "+919988776655"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-indigo-400" />
                <span>Greenwood Campus, Sector 4</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-slate-900 py-8 px-8 text-center text-xs text-slate-600 bg-slate-950/20 shrink-0">
        <p>© 2026 Pehchaan School Admissions Platform. All rights reserved.</p>
      </footer>

      {/* Floating AI Chat widget bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl hover:shadow-indigo-600/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90"
          >
            <MessageSquare className="h-6 w-6" />
          </button>
        ) : (
          <div className="w-80 h-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">
            {/* Chat header */}
            <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                <h4 className="font-extrabold text-[11px] text-white uppercase tracking-wide">AI Admissions Assistant</h4>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-[11px]">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`max-w-[85%] rounded-xl p-2.5 leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white ml-auto rounded-tr-none" 
                      : "bg-slate-950 border border-slate-850 text-slate-350 mr-auto rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic pl-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                </div>
              )}
            </div>

            {/* Chat input form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 bg-slate-950/50 flex gap-2">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about syllabus, bus route..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
