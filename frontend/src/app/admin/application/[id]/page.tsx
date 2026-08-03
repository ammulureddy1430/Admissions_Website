"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, ArrowLeft, AlertCircle, FileText, CheckCircle, 
  Send, RefreshCw, Eye, X, Download, ShieldCheck, Mail, Calendar, CreditCard, Clock, Activity, MessageSquare,
  Layers, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { DocumentVault } from "@/components/DocumentVault";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminApplicationDetail({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [app, setApp] = useState<any>(null);
  const [vaultMetrics, setVaultMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState("overview");

  // Admin Session and Email History States
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") || "" : "";
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedPreviewEmail, setSelectedPreviewEmail] = useState<any>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const fetchEmailHistory = async () => {
    if (!token || !schoolId || id.startsWith("mock-")) return;
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/email-workflow/history/${id}`, {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setEmailHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchVaultMetrics = async () => {
    if (!token || id.startsWith("mock-")) return;
    try {
      const headers: any = { "Authorization": `Bearer ${token}` };
      if (schoolId) headers["x-tenant-id"] = schoolId;
      const res = await fetch(`http://localhost:5001/document/vault/${id}`, { headers });
      if (res.ok) {
        const vaultData = await res.json();
        setVaultMetrics(vaultData.metrics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab");
      if (tab) setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (!schoolId || !token) return;

    async function fetchDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5001/application/${id}`, {
          headers: { 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          },
        });
        if (!res.ok) throw new Error("Failed to load details.");
        const matched = await res.json();
        setApp(matched);
      } catch (err: any) {
        setError(err.message || "Failed to load application details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (id.startsWith("mock-")) {
      // Local mock data loading
      const mockAaravDetails = {
        id: "mock-app-aarav",
        studentFirstName: "Aarav",
        studentLastName: "Reddy",
        studentDob: "2016-04-12T00:00:00.000Z",
        studentGender: "MALE",
        grade: "Grade 5",
        bloodGroup: "O+",
        nationality: "Indian",
        religion: "Hindu",
        motherTongue: "Telugu",
        fatherName: "Rajesh Reddy",
        fatherOccupation: "Software Engineer",
        fatherPhone: "+91 98765 43210",
        motherName: "Saritha Reddy",
        motherOccupation: "Homemaker",
        motherPhone: "+91 98765 43211",
        primaryAddress: "Flat 402, Sai Residency, Madhapur",
        city: "Hyderabad",
        state: "Telangana",
        zipCode: "500081",
        allergies: "None",
        medicalConditions: "None",
        emergencyContactName: "Rajesh Reddy",
        emergencyContactPhone: "+91 98765 43210",
        previousSchoolName: "Oakridge International School",
        previousSchoolGrade: "Grade 4",
        previousSchoolMarks: "92%",
        transportRequired: "YES",
        transportRoute: "Route 12 (Madhapur)",
        status: "SUBMITTED",
        paymentStatus: "PAID",
        createdAt: "2026-07-15T10:00:00.000Z",
        documents: [
          { id: "doc-1", name: "Student Birth Certificate", type: "Birth Certificate", status: "VERIFIED" },
          { id: "doc-2", name: "Previous Academic Transcripts", type: "Transcripts", status: "VERIFIED" }
        ],
        interviews: [
          { id: "int-1", status: "SCHEDULED", scheduledAt: "2026-07-20T10:00:00.000Z", interviewer: { firstName: "Admissions", lastName: "Office" } }
        ],
        payments: [
          { id: "pay-1", status: "SUCCESS", amount: 500, razorpayOrderId: "order_mock_123", razorpayPaymentId: "pay_mock_123", createdAt: "2026-07-15T10:00:00.000Z" }
        ]
      };
      setApp(mockAaravDetails);
      setIsLoading(false);
    } else {
      fetchDetails();
      fetchVaultMetrics();
    }
  }, [id, token, schoolId]);

  useEffect(() => {
    if (app) {
      fetchEmailHistory();
    }
  }, [app]);

  // Resend logic
  const handleResendEmail = async (historyId: string) => {
    if (!token || !schoolId) return;
    if (!confirm("Are you sure you want to resend this offer letter email?")) return;
    setIsActionProcessing(true);
    try {
      const res = await fetch(`http://localhost:5001/email-workflow/resend/${historyId}`, {
        method: "POST",
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert("Offer Letter resent successfully!");
        fetchEmailHistory();
      } else {
        alert("Failed to resend offer letter");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  // Preview sent copy
  const handleDownloadCopy = (email: any) => {
    const docHtml = `
      <html>
        <head>
          <title>${email.subject}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 650px; margin: auto; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 30px; font-size: 0.85rem; color: #555; }
            .subject { font-size: 1.1rem; font-weight: bold; color: #000; margin-top: 10px; }
            .body { white-space: pre-line; }
            .attachments { margin-top: 40px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; font-size: 0.8rem; }
            .btn-print { margin-bottom: 20px; display: inline-block; background: #008f7d; color: #fff; border: 0; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">Print Letter</button>
          <div class="header">
            <div><strong>From:</strong> School Admissions &lt;admissions@school.edu&gt;</div>
            <div><strong>Date:</strong> ${new Date(email.sentAt).toLocaleString()}</div>
            <div class="subject">Subject: ${email.subject}</div>
          </div>
          <div class="body">${email.body}</div>
          ${email.attachments?.length ? `
            <div class="attachments">
              <strong>Attachments:</strong>
              <ul>
                ${email.attachments.map((a: any) => `<li>${a.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(docHtml);
    win?.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mx-auto" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="p-8 text-rose-650 font-semibold">{error || "Failed loading application."}</div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Page Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/applications" className="text-slate-400 hover:text-[#007f70]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#071633]">Student Profile Review</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reviewing details for applicant {app.studentFirstName} {app.studentLastName} ({app.grade})
          </p>
        </div>
      </div>

      {/* 2. Tabs Selector Nav */}
      <div className="border-b border-[#dceae6] flex gap-2 overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
          { id: "application", label: "Application details", icon: <FileText className="h-4 w-4" /> },
          { id: "documents", label: "⭐ Documents Vault", icon: <Layers className="h-4 w-4" /> },
          { id: "payments", label: "Payments Log", icon: <CreditCard className="h-4 w-4" /> },
          { id: "interview", label: "Interview slot", icon: <Calendar className="h-4 w-4" /> },
          { id: "timeline", label: "Timeline", icon: <Clock className="h-4 w-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-[#009b87] text-[#007f70] bg-[#e6f7f2]/40" 
                : "border-transparent text-[#607080] hover:text-[#007f70] hover:bg-[#f1f8f5]/40"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents Layout */}
      <div className="animate-in fade-in duration-200">
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              
              {/* Application Details Summary */}
              <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-[#071633]">Application Review Summary</h3>
                <div className="grid grid-cols-2 gap-6 text-xs pt-2">
                  <div className="bg-[#f6faf8] border border-[#dceae6] p-4 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Process Status</span>
                    <span className="text-sm font-black text-[#007f70] block mt-1 uppercase tracking-wide">
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-[#f6faf8] border border-[#dceae6] p-4 rounded-xl">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Registration Payment</span>
                    <span className={`text-sm font-black block mt-1 ${
                      app.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {app.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document checklist completeness */}
              {vaultMetrics && (
                <div className="bg-[#e6f7f2] border border-[#cceae3] p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-[#007f70]">Verification Document Progress</h3>
                    <span className="text-[#008f7d] text-sm font-extrabold">{vaultMetrics.completionPercent}%</span>
                  </div>
                  <div className="bg-white h-2.5 rounded-full overflow-hidden border border-[#cceae3]">
                    <div 
                      className="bg-gradient-to-r from-[#009b87] to-[#007f70] h-full rounded-full transition-all duration-300"
                      style={{ width: `${vaultMetrics.completionPercent}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-[10px] text-[#607080] pt-1 font-semibold">
                    <span>Verified: <strong>{vaultMetrics.verified}</strong></span>
                    <span>Reviewing: <strong>{vaultMetrics.pendingVerification}</strong></span>
                    <span>Missing: <strong>{vaultMetrics.missing}</strong></span>
                  </div>
                  <button 
                    onClick={() => setActiveTab("documents")}
                    className="text-xs font-bold text-[#007f70] hover:text-[#005f54] flex items-center gap-1 mt-2"
                  >
                    Open Documents Vault <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

            </div>

            {/* Side column summary widgets */}
            <div className="space-y-6">
              
              {/* Interview Widget */}
              <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
                <h4 className="font-bold text-xs text-[#071633] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#f0f6f4] pb-3">
                  <Calendar className="h-4 w-4 text-[#009b87]" /> Interview Status
                </h4>
                {app.interviews?.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-[#f0f6f4] pb-2">
                      <span className="text-[#607080]">Status</span>
                      <span className="font-bold text-indigo-650 uppercase">{app.interviews[0].status}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#f0f6f4] pb-2">
                      <span className="text-[#607080]">Scheduled At</span>
                      <span className="font-bold text-slate-700">{new Date(app.interviews[0].dateTime || app.interviews[0].scheduledAt).toLocaleString()}</span>
                    </div>
                    {app.interviews[0].meetingLink && (
                      <a 
                        href={app.interviews[0].meetingLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="bg-[#009b87] hover:bg-[#007f70] w-full text-center block py-2.5 rounded-xl text-[10px] font-bold text-white shadow-sm mt-3"
                      >
                        Join Meeting Room
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No interview slots assigned yet.</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --- APPLICATION FORM DATA TAB --- */}
        {activeTab === "application" && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              
              {/* Section 1: Student info */}
              <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-[#071633]">Student Personal Details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Full Name</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.studentFirstName} {app.studentLastName}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Applied Grade</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.grade}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Date of Birth</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{new Date(app.studentDob).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Gender</span>
                    <span className="text-slate-800 mt-0.5 block font-bold capitalize">{app.studentGender}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Blood Group</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.bloodGroup || "--"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Mother Tongue</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.motherTongue || "--"}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Parent details */}
              <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-[#071633]">Family / Guardian Details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Father's Name</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.fatherName || "--"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Father's Occupation</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.fatherOccupation || "--"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Father's Phone</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.fatherPhone || "--"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Mother's Name</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.motherName || "--"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Mother's Occupation</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.motherOccupation || "--"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Mother's Phone</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.motherPhone || "--"}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Health & History */}
              <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-[#071633]">Academic History & Medical Details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Previous School</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.previousSchoolName || "None"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Previous Grade / Marks</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.previousSchoolGrade || "--"} ({app.previousSchoolMarks || "--"})</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Allergies / Conditions</span>
                    <span className="text-rose-600 font-bold block">{app.allergies || "None"}</span>
                  </div>
                  <div>
                    <span className="text-[#71818d] font-semibold uppercase block text-[9px] tracking-wider">Medical Conditions</span>
                    <span className="text-slate-800 mt-0.5 block font-bold">{app.medicalConditions || "None"}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Admin Email Management */}
            <div className="space-y-6">
              <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
                <h4 className="font-bold text-xs text-[#071633] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#f0f6f4] pb-3">
                  <Mail className="h-4 w-4 text-[#009b87]" /> Email Offer Settings
                </h4>
                
                <div className="space-y-4 text-xs text-slate-700">
                  <div className="flex justify-between items-center bg-[#f6faf8] border border-[#dceae6] p-3 rounded-xl">
                    <span className="text-slate-500">Current Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      !app.emailStatus || app.emailStatus === "PENDING" ? "bg-slate-100 text-slate-500 border border-slate-200" :
                      app.emailStatus === "Draft" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                      app.emailStatus === "FAILED" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      {app.emailStatus || "Pending"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Communication Logs</h5>
                    {isHistoryLoading ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching history...
                      </div>
                    ) : emailHistory.length === 0 ? (
                      <div className="text-slate-400 italic bg-[#fcfefe] p-3 rounded-lg border border-dashed border-[#dceae6] text-center">
                        No offer emails sent to parent yet.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {emailHistory.map((history) => (
                          <div key={history.id} className="p-3 bg-[#f6faf8] border border-[#dceae6] rounded-xl space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-slate-700 block leading-tight text-[11px]">{history.subject}</span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  Sent on {new Date(history.sentAt).toLocaleDateString()}
                                </span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                history.status === "OPENED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                history.status === "DELIVERED" ? "bg-cyan-100 text-cyan-800 border border-cyan-200" :
                                history.status === "FAILED" ? "bg-rose-100 text-rose-850" :
                                "bg-slate-200 text-slate-655"
                              }`}>{history.status}</span>
                            </div>

                            <div className="flex gap-2 pt-1.5 border-t border-[#e8f3f0] justify-end">
                              <button
                                onClick={() => setSelectedPreviewEmail(history)}
                                className="text-[9px] text-[#007f70] font-bold flex items-center gap-1 hover:underline"
                              >
                                <Eye className="h-3 w-3" /> Preview
                              </button>
                              <button
                                onClick={() => handleDownloadCopy(history)}
                                className="text-[9px] text-slate-650 font-bold flex items-center gap-1 hover:underline"
                              >
                                <Download className="h-3 w-3" /> Download
                              </button>
                              <button
                                disabled={isActionProcessing}
                                onClick={() => handleResendEmail(history.id)}
                                className="text-[9px] text-amber-700 font-bold flex items-center gap-1 disabled:opacity-50 hover:underline"
                              >
                                <RefreshCw className="h-3 w-3" /> Resend
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- DOCUMENTS VAULT TAB --- */}
        {activeTab === "documents" && (
          <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl">
            <DocumentVault 
              applicationId={id} 
              mode="school" 
              onUpdate={fetchVaultMetrics}
            />
          </div>
        )}

        {/* --- PAYMENTS LOG TAB --- */}
        {activeTab === "payments" && (
          <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-[#071633]">Billing & Registration Payments</h3>
            {app.payments?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-750">
                  <thead>
                    <tr className="bg-[#f6faf8] border-b border-[#dceae6] text-[#71818d] font-bold uppercase text-[9px]">
                      <th className="p-3">Payment ID / Order ID</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f6f4]">
                    {app.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-3 font-mono">
                          {p.razorpayPaymentId || "Pending confirmation"} <br />
                          <span className="text-[10px] text-slate-400">Order: {p.razorpayOrderId}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">INR {p.amount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === "SUCCESS" || p.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>{p.status}</span>
                        </td>
                        <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No payment transactions recorded.</p>
            )}
          </div>
        )}

        {/* --- INTERVIEW DETAILS TAB --- */}
        {activeTab === "interview" && (
          <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-6">
            <h3 className="font-bold text-sm text-[#071633]">Admissions Interview Slot</h3>
            
            {app.interviews?.length > 0 ? (
              app.interviews.map((int: any) => (
                <div key={int.id} className="bg-[#f6faf8] border border-[#dceae6] p-5 rounded-xl space-y-4 text-xs">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="bg-indigo-100 text-indigo-850 border border-indigo-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                        {int.status}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#071633] mt-1">
                        Interview with {int.interviewer?.firstName || "Admissions"} {int.interviewer?.lastName || "Staff"}
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">{new Date(int.dateTime || int.scheduledAt).toLocaleString()}</span>
                  </div>

                  {int.meetingLink && (
                    <div className="flex gap-3 items-center">
                      <span className="text-slate-400">Meeting Room URL:</span>
                      <a href={int.meetingLink} target="_blank" rel="noreferrer" className="text-[#007f70] font-bold hover:underline">
                        {int.meetingLink}
                      </a>
                    </div>
                  )}

                  {int.feedback && (
                    <div className="bg-white p-3 rounded-lg border border-[#dceae6] space-y-1">
                      <strong className="text-slate-700 block">Feedback / Evaluation</strong>
                      <p className="text-slate-600">{int.feedback}</p>
                      {int.score && <div className="text-[10px] text-indigo-650 font-bold pt-1">Score Awarded: {int.score}/10</div>}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-450 italic">No interview schedules set up for this applicant yet.</p>
            )}
          </div>
        )}

        {/* --- AUDIT TIMELINE LOG TAB --- */}
        {activeTab === "timeline" && (
          <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl space-y-6">
            <h3 className="font-bold text-sm text-[#071633]">Application Event Log</h3>
            
            <div className="relative border-l-2 border-[#dceae6] ml-4 pl-6 space-y-6 text-xs text-slate-650">
              
              <div className="relative">
                <span className="absolute -left-[31px] bg-white border-2 border-[#009b87] h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-[#007f70]">1</span>
                <div>
                  <h5 className="font-bold text-[#071633]">Application File Opened</h5>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{new Date(app.createdAt).toLocaleString()}</span>
                  <p className="text-[10px] mt-1">Parent initialized student registration profile draft.</p>
                </div>
              </div>

              {app.paymentStatus === 'PAID' && (
                <div className="relative">
                  <span className="absolute -left-[31px] bg-white border-2 border-emerald-500 h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-600">✓</span>
                  <div>
                    <h5 className="font-bold text-[#071633]">Registration Fee Processed</h5>
                    <p className="text-[10px] mt-1">Cleared processing order for payment confirmation.</p>
                  </div>
                </div>
              )}

              {app.status !== 'DRAFT' && (
                <div className="relative">
                  <span className="absolute -left-[31px] bg-white border-2 border-[#009b87] h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-[#007f70]">2</span>
                  <div>
                    <h5 className="font-bold text-[#071633]">Application Form Submitted</h5>
                    <p className="text-[10px] mt-1">Profile successfully queued into review backlog.</p>
                  </div>
                </div>
              )}

              {app.status === 'APPROVED' && (
                <div className="relative">
                  <span className="absolute -left-[31px] bg-white border-2 border-emerald-500 h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-600">✓</span>
                  <div>
                    <h5 className="font-bold text-[#071633]">Admission Approved & Offered</h5>
                    <p className="text-[10px] mt-1">Issued final admission confirmation and sent copy.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* --- SENT EMAIL PREVIEW MODAL --- */}
      {selectedPreviewEmail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#dceae6] rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#dceae6] flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-[#071633]">Sent Email Offer Preview</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Message ID: {selectedPreviewEmail.messageId}</p>
              </div>
              <button 
                onClick={() => setSelectedPreviewEmail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-slate-50 p-4 border border-[#dceae6] rounded-xl text-xs space-y-1">
                <div><span className="text-slate-500">Subject:</span> <strong className="text-[#071633]">{selectedPreviewEmail.subject}</strong></div>
                <div><span className="text-slate-500">Sent On:</span> <span className="text-slate-700">{new Date(selectedPreviewEmail.sentAt).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Sent By:</span> <span className="text-slate-700">{selectedPreviewEmail.sentBy?.firstName} {selectedPreviewEmail.sentBy?.lastName}</span></div>
              </div>
              <div className="p-4 bg-slate-50/20 border border-[#dceae6] rounded-xl text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {selectedPreviewEmail.body}
              </div>

              {selectedPreviewEmail.attachments?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Attached Documents:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedPreviewEmail.attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-[#dceae6] transition"
                      >
                        <span className="font-semibold text-slate-655">{att.name}</span>
                        <span className="text-[9px] text-[#009b87] font-bold hover:underline">View</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#dceae6] bg-slate-50/40 flex justify-end">
              <button
                onClick={() => setSelectedPreviewEmail(null)}
                className="px-4 py-2 border border-[#dceae6] hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
