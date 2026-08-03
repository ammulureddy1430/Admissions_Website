"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, AlertCircle, FileText, CheckCircle, X, Eye, Save, Send,
  Laptop, Smartphone, File, CheckSquare, Square, Download, ChevronDown, FileCode, MessageCircle
} from "lucide-react";
import Link from "next/link";

export default function AdminApplications() {
  const router = useRouter();
  
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);

  // Email Draft Modal States
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [previewTab, setPreviewTab] = useState<"edit" | "desktop" | "mobile" | "text">("edit");
  const [compiledPreview, setCompiledPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [modalMeta, setModalMeta] = useState<any>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  const schoolName = schoolDetails?.name || (typeof window !== "undefined" ? localStorage.getItem("schoolName") : "") || "School";
  const schoolAddress = [schoolDetails?.address, schoolDetails?.city, schoolDetails?.state, schoolDetails?.country]
    .filter(Boolean)
    .join(", ");

  const handleDownload = (format: "pdf" | "docx" | "txt") => {
    setIsDownloadMenuOpen(false);
    const sName = modalMeta?.studentName ? modalMeta.studentName.replace(/\s+/g, "_") : "Student";
    const filename = `Admission_Offer_${sName}.${format}`;
    const content = `SUBJECT: ${draftSubject}\n\n${draftBody}`;
    const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    if (format === "txt") {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "docx") {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Admission Offer</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #071633;">${schoolName} - Admission Offer Letter</h2>
          ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
          <p><strong>Generated on:</strong> ${generatedDate}</p>
          <hr/>
          <p><strong>Student:</strong> ${modalMeta?.studentName || ''} (${modalMeta?.grade || ''})</p>
          <p><strong>Parent:</strong> ${modalMeta?.parentName || ''} (${modalMeta?.parentEmail || ''})</p>
          <br/>
          <h4 style="color: #008f7d;">Subject: ${draftSubject}</h4>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${draftBody}</div>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Admission Offer Letter - ${modalMeta?.studentName || ''}</title>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
                .header { border-bottom: 2px solid #009b87; padding-bottom: 12px; margin-bottom: 24px; }
                .header h1 { margin: 0; color: #071633; font-size: 22px; }
                .header p { margin: 4px 0 0 0; color: #64748b; font-size: 13px; }
                .generated-date { text-align: right; color: #64748b; font-size: 12px; margin-bottom: 16px; }
                .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
                .subject { font-size: 15px; font-weight: bold; color: #007f70; margin-bottom: 16px; }
                .body { white-space: pre-wrap; font-size: 14px; color: #334155; }
                @media print {
                  body { margin: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${schoolName}</h1>
                <p>Official Admission Selection & Offer Notice</p>
                ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
              </div>
              <div class="generated-date"><strong>Generated on:</strong> ${generatedDate}</div>
              <div class="meta">
                <strong>Student:</strong> ${modalMeta?.studentName || ''} (${modalMeta?.grade || ''}) | <strong>Parent:</strong> ${modalMeta?.parentName || ''} (${modalMeta?.parentEmail || ''})
              </div>
              <div class="subject">Subject: ${draftSubject}</div>
              <div class="body">${draftBody}</div>
              <script>
                window.onload = function() { window.print(); };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
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
    fetch("http://localhost:5001/school/details", {
      headers: {
        "x-tenant-id": schoolId,
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((details) => {
        if (details) setSchoolDetails(details);
      })
      .catch(console.error);
  }, [schoolId, token]);

  const fetchApplications = async () => {
    if (!schoolId || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5001/application", {
        headers: { 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
      });
      if (res.ok) setApplications(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [schoolId, token]);

  const handleUpdateAppStatus = async (appId: string, status: string) => {
    if (!token) return;

    if (status === "SELECTED") {
      // Open email draft modal instead of immediately saving
      openEmailDraftModal(appId);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5001/application/${appId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setApplications(prev =>
          prev.map((a) => (a.id === appId ? { ...a, status } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssessmentRequirement = async (appId: string, assessmentRequired: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5001/application/${appId}/assessment-requirement`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ assessmentRequired }),
      });
      const body = await res.json();
      if (!res.ok) {
        alert(body?.message || "Unable to update the assessment requirement.");
        return;
      }
      setApplications((current) => current.map((app) => app.id === appId ? body : app));
    } catch (error) {
      console.error(error);
      alert("Unable to update the assessment requirement.");
    }
  };

  const handleIssueAdmissionLetter = async (appId: string) => {
    if (!token) return;
    setActionLoading(true);
    try {
      const letterUrl = `https://admissionsos-storage.s3.amazonaws.com/tenants/${schoolId}/letters/${appId}_admission_offer.pdf`;
      const res = await fetch(`http://localhost:5001/application/${appId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (res.ok) {
        setApplications(prev =>
          prev.map((a) => (a.id === appId ? { ...a, status: "APPROVED", admissionLetterUrl: letterUrl } : a))
        );
        alert("Admission offer letter issued to parent successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const compileBodyText = (text: string, meta: any) => {
    if (!text) return "";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const joiningDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const feeDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    
    return text
      .replaceAll("{{ParentName}}", meta?.parentName || "Parent")
      .replaceAll("{{StudentName}}", meta?.studentName || "Student")
      .replaceAll("{{Grade}}", meta?.grade || "Grade 1")
      .replaceAll("{{SchoolName}}", meta?.schoolName || schoolName)
      .replaceAll("{{AcademicYear}}", "2026-2027")
      .replaceAll("{{ApplicationNumber}}", meta?.applicationNumber ? meta.applicationNumber.toUpperCase() : "APP-2026-001")
      .replaceAll("{{AdmissionDate}}", today)
      .replaceAll("{{JoiningDate}}", joiningDate)
      .replaceAll("{{FeeDeadline}}", feeDeadline);
  };

  // Open Draft Modal
  const openEmailDraftModal = async (appId: string) => {
    setSelectedAppId(appId);
    setPreviewTab("edit");
    setCompiledPreview(null);
    setSelectedTemplateId("");
    setDraftSaveStatus("idle");

    const targetApp = applications.find(a => a.id === appId);
    let metaInfo = null;
    if (targetApp) {
      metaInfo = {
        studentName: `${targetApp.studentFirstName} ${targetApp.studentLastName}`,
        applicationNumber: targetApp.id.substring(0, 8),
        grade: targetApp.grade,
        parentName: `${targetApp.parent?.firstName} ${targetApp.parent?.lastName}`,
        parentEmail: targetApp.parent?.email,
        parentPhone: targetApp.parent?.phone,
        schoolName,
        schoolAddress,
      };
      setModalMeta(metaInfo);
    }

    try {
      // 1. Fetch Draft
      const draftRes = await fetch(`http://localhost:5001/email-workflow/draft/${appId}`, {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (draftRes.ok) {
        const draft = await draftRes.json();
        setDraftSubject(draft.subject);
        setDraftBody(compileBodyText(draft.body, metaInfo));
        setDraftAttachments(draft.attachments.map((att: any) => ({ ...att, selected: true })));
      }

      // 2. Fetch Templates
      const templatesRes = await fetch(`http://localhost:5001/email-workflow/template`, {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (templatesRes.ok) {
        setTemplates(await templatesRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Select another template
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setDraftSubject(selectedTemplate.subject);
      setDraftBody(compileBodyText(selectedTemplate.body, modalMeta));
      setDraftSaveStatus("idle");
    }
  };

  // Toggle Attachment selection
  const toggleAttachment = (idx: number) => {
    setDraftSaveStatus("idle");
    setDraftAttachments(prev =>
      prev.map((att, i) => (i === idx ? { ...att, selected: !att.selected } : att))
    );
  };

  // Compile and fetch live preview
  const handleFetchPreview = async () => {
    if (!selectedAppId) return;
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/email-workflow/preview/${selectedAppId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject: draftSubject, body: draftBody }),
      });
      if (res.ok) {
        setCompiledPreview(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (previewTab !== "edit" && selectedAppId) {
      handleFetchPreview();
    }
  }, [previewTab]);

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedAppId) return;
    setIsDraftSaving(true);
    setDraftSaveStatus("saving");
    try {
      const res = await fetch(`http://localhost:5001/email-workflow/draft/${selectedAppId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: draftSubject,
          body: draftBody,
          attachments: draftAttachments,
        }),
      });
      if (res.ok) {
        setApplications(prev =>
          prev.map((a) => (a.id === selectedAppId ? { ...a, emailStatus: "Draft" } : a))
        );
        setDraftSaveStatus("saved");
      } else {
        setDraftSaveStatus("error");
      }
    } catch (err) {
      console.error(err);
      setDraftSaveStatus("error");
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Send Email Offer
  const handleSendEmail = async () => {
    if (!selectedAppId) return;
    setIsDraftSaving(true);
    try {
      // 1. First save draft
      await fetch(`http://localhost:5001/email-workflow/draft/${selectedAppId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: draftSubject,
          body: draftBody,
          attachments: draftAttachments,
        }),
      });

      // 2. Send email
      const res = await fetch(`http://localhost:5001/email-workflow/send/${selectedAppId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject: draftSubject, body: draftBody }),
      });

      if (res.ok) {
        const parentEmail = modalMeta?.parentEmail || "";
        const mailtoUrl = `mailto:${encodeURIComponent(parentEmail)}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;
        window.location.href = mailtoUrl;

        alert("Offer Letter Email sent to parent successfully! Mail application opened with prefilled details.");
        setApplications(prev =>
          prev.map((a) => (a.id === selectedAppId ? { ...a, status: "SELECTED", emailStatus: "Sent" } : a))
        );
        setSelectedAppId(null);
        // Reload list to get tracking simulation updates after a few seconds
        setTimeout(() => {
          fetchApplications();
        }, 5000);
      } else {
        const errorData = await res.json();
        alert(`Failed to send offer letter email: ${errorData?.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const rawPhone = modalMeta?.parentPhone || "";
    let phone = rawPhone.replace(/\D/g, "");

    if (!phone) {
      alert("Parent WhatsApp phone number is not available.");
      return;
    }

    if (phone.length === 10) phone = `91${phone}`;
    if (phone.length === 11 && phone.startsWith("0")) phone = `91${phone.slice(1)}`;

    const message = `${draftSubject}\n\n${draftBody}`;
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
        <h1 className="text-2xl font-extrabold text-white">Student Admissions Applications</h1>
        <p className="text-xs text-slate-400 mt-1">Review student profiles, grade admissions, verify documents, and issue offer letters.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-955 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="p-4">Student</th>
              <th className="p-4">Parent Details</th>
              <th className="p-4">Applied Grade</th>
              <th className="p-4">Registration Fee</th>
              <th className="p-4">Process Status</th>
              <th className="p-4">Assessment</th>
              <th className="p-4">Email Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-800/20">
                <td className="p-4 font-bold text-white">
                  <Link href={`/admin/application/${app.id}`} className="hover:text-indigo-400 hover:underline">
                    {app.studentFirstName} {app.studentLastName}
                  </Link> <br />
                  <span className="text-[10px] text-slate-500 font-normal">{new Date(app.studentDob).toLocaleDateString()} • {app.studentGender}</span>
                </td>
                <td className="p-4">
                  {app.parent?.firstName} {app.parent?.lastName} <br />
                  <span className="text-[10px] text-slate-500">{app.parent?.email}</span>
                </td>
                <td className="p-4 font-semibold">{app.grade}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    app.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800 border border-rose-200"
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
                    <option value="SELECTED">SELECTED</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </td>
                <td className="p-4">
                  <select
                    value={app.assessmentRequired === false ? "NOT_REQUIRED" : "REQUIRED"}
                    onChange={(event) => handleAssessmentRequirement(app.id, event.target.value === "REQUIRED")}
                    className={`border rounded px-2 py-1 text-[10px] font-bold ${app.assessmentRequired === false ? "bg-emerald-950/40 border-emerald-700 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-300"}`}
                  >
                    <option value="REQUIRED">Assessment Required</option>
                    <option value="NOT_REQUIRED">Assessment Not Required</option>
                  </select>
                  {app.assessmentRequired === false && (
                    <p className="mt-1 text-[9px] text-emerald-400">Proceeds directly to interview</p>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    !app.emailStatus || app.emailStatus === "PENDING" ? "bg-slate-100 text-slate-700 border border-slate-200" :
                    app.emailStatus === "Draft" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                    app.emailStatus === "FAILED" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                    "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}>
                    {app.emailStatus || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- SELECTION EMAIL DRAFT MODAL --- */}
      {selectedAppId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1728] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-extrabold text-white">Create Admission Offer Email Draft</h3>
                {modalMeta && (
                  <p className="text-xs text-slate-400 mt-1">
                    Student: <strong className="text-indigo-400">{modalMeta.studentName}</strong> ({modalMeta.grade}) · Parent: <strong>{modalMeta.parentName}</strong> ({modalMeta.parentEmail})
                  </p>
                )}
              </div>
              <button 
                onClick={() => setSelectedAppId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs / Controls */}
            <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-3">
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPreviewTab("edit")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    previewTab === "edit" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Edit Draft
                </button>
                <button
                  onClick={() => setPreviewTab("desktop")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewTab === "desktop" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5" /> Desktop Preview
                </button>
                <button
                  onClick={() => setPreviewTab("mobile")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewTab === "mobile" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile Preview
                </button>
                <button
                  onClick={() => setPreviewTab("text")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    previewTab === "text" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Plain Text
                </button>
              </div>

              {previewTab === "edit" && templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Use Template:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-indigo-400 rounded-lg px-2.5 py-1 font-bold focus:outline-none"
                  >
                    <option value="" disabled>Select template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Body / Editor */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-[350px]">
              {previewTab === "edit" ? (
                <div className="grid md:grid-cols-3 gap-6 h-full">
                  {/* Left Column: Form Editor */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subject</label>
                      <input 
                        type="text"
                        value={draftSubject}
                        onChange={(e) => {
                          setDraftSubject(e.target.value);
                          setDraftSaveStatus("idle");
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        placeholder="Congratulations! Admission selection offer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Body</label>
                        <span className="text-[9px] text-slate-500 font-medium">Use placeholders: &#123;&#123;StudentName&#125;&#125;, &#123;&#123;ParentName&#125;&#125;, etc.</span>
                      </div>
                      <textarea 
                        value={draftBody}
                        onChange={(e) => {
                          setDraftBody(e.target.value);
                          setDraftSaveStatus("idle");
                        }}
                        rows={11}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="Type email body template..."
                      />
                    </div>
                  </div>

                  {/* Right Column: Attachments Checklist */}
                  <div className="space-y-4 bg-slate-950/30 p-4 border border-slate-800/80 rounded-2xl">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Attachments</h5>
                    <div className="space-y-2">
                      {draftAttachments.map((att, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleAttachment(idx)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-850 hover:bg-slate-900 bg-slate-950/40 text-left transition"
                        >
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-indigo-400" />
                            <div>
                              <span className="text-xs font-semibold block text-slate-300">{att.name}</span>
                              <span className="text-[8px] font-mono text-slate-500 block">PDF Asset File</span>
                            </div>
                          </div>
                          {att.selected ? (
                            <CheckSquare className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Compile Preview View */
                <div className="flex items-center justify-center h-full">
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                      <span className="text-xs text-slate-400">Compiling variables preview...</span>
                    </div>
                  ) : compiledPreview ? (
                    <div className="w-full max-w-2xl mx-auto">
                      {previewTab === "desktop" && (
                        <div className="border border-slate-800 rounded-2xl bg-white text-slate-900 overflow-hidden shadow-lg">
                          {/* Desktop Browser Mail Header */}
                          <div className="bg-slate-100 p-4 border-b border-slate-200 text-xs text-slate-500 space-y-1">
                            <div><span className="font-semibold text-slate-700">From:</span> Admissions Academy &lt;admissions@school.edu&gt;</div>
                            <div><span className="font-semibold text-slate-700">To:</span> {compiledPreview.parentEmail}</div>
                            <div><span className="font-semibold text-slate-700">Subject:</span> <strong className="text-slate-800">{compiledPreview.subject}</strong></div>
                          </div>
                          {/* Desktop Browser Mail Body */}
                          <div className="p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-line min-h-[250px] bg-white">
                            {compiledPreview.body}
                          </div>
                          {/* Attachments Section */}
                          {draftAttachments.some(a => a.selected) && (
                            <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-wrap gap-2 text-xs">
                              <span className="font-semibold text-slate-500 w-full mb-1">Attached Documents:</span>
                              {draftAttachments.filter(a => a.selected).map((a, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                  <File className="h-3 w-3" /> {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {previewTab === "mobile" && (
                        <div className="border-[8px] border-slate-800 rounded-[2.5rem] bg-white text-slate-900 overflow-hidden shadow-xl max-w-[340px] mx-auto min-h-[500px]">
                          {/* Mobile Status Bar */}
                          <div className="bg-slate-900 text-white text-[9px] px-6 py-1.5 flex justify-between">
                            <span>7:30 PM</span>
                            <span>5G</span>
                          </div>
                          {/* Mobile Mail Header */}
                          <div className="p-4 border-b border-slate-150 text-[10px] text-slate-500 space-y-0.5">
                            <div className="text-indigo-600 font-bold text-[11px] mb-1">Office of Admissions</div>
                            <div>Subject: <strong className="text-slate-800">{compiledPreview.subject}</strong></div>
                          </div>
                          {/* Mobile Mail Body */}
                          <div className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line min-h-[280px]">
                            {compiledPreview.body}
                          </div>
                          {/* Mobile Attachments */}
                          {draftAttachments.some(a => a.selected) && (
                            <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1">
                              <span className="font-semibold text-slate-500 text-[10px] block">Attachments:</span>
                              {draftAttachments.filter(a => a.selected).map((a, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-200 text-slate-700 font-semibold text-[9px]">
                                  <File className="h-3 w-3" /> {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {previewTab === "text" && (
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-xs text-slate-350 whitespace-pre-line leading-relaxed">
                          Subject: {compiledPreview.subject}
                          {"\n\n"}
                          {compiledPreview.body}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">Preview could not be loaded. Please check your template structure.</span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#e6f0ed] bg-[#f8faf9] flex justify-end items-center relative">
              <div className="flex gap-3 items-center relative">
                {/* Download Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    className="px-4 py-2.5 bg-[#009b87] hover:bg-[#007f70] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
                  >
                    <Download className="h-4 w-4 text-white shrink-0" />
                    <span>Download Offer</span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/80 shrink-0" />
                  </button>

                  {isDownloadMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-[#dceae6] rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        onClick={() => handleDownload("pdf")}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#071633] hover:bg-[#e6f7f2] hover:text-[#008f7d] rounded-lg flex items-center gap-2 transition"
                      >
                        <FileText className="h-4 w-4 text-rose-500 shrink-0" /> Download as PDF (.pdf)
                      </button>
                      <button
                        onClick={() => handleDownload("docx")}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#071633] hover:bg-[#e6f7f2] hover:text-[#008f7d] rounded-lg flex items-center gap-2 transition"
                      >
                        <File className="h-4 w-4 text-indigo-500 shrink-0" /> Download Word (.docx)
                      </button>
                      <button
                        onClick={() => handleDownload("txt")}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#071633] hover:bg-[#e6f7f2] hover:text-[#008f7d] rounded-lg flex items-center gap-2 transition"
                      >
                        <FileCode className="h-4 w-4 text-amber-500 shrink-0" /> Download Text (.txt)
                      </button>
                    </div>
                  )}
                </div>

                <button
                  disabled={isDraftSaving}
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 bg-white border border-[#009b87] hover:bg-[#e6f7f2] text-[#006054] rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs active:scale-95"
                >
                  {draftSaveStatus === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#009b87]" />
                  ) : draftSaveStatus === "saved" ? (
                    <CheckCircle className="h-4 w-4 text-[#009b87] shrink-0" />
                  ) : draftSaveStatus === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Save className="h-4 w-4 text-[#009b87] shrink-0" />
                  )}
                  <span>{draftSaveStatus === "saving" ? "Saving..." : draftSaveStatus === "saved" ? "Draft Saved" : draftSaveStatus === "error" ? "Retry Save" : "Save Draft"}</span>
                </button>

                <button
                  disabled={isDraftSaving}
                  onClick={handleSendEmail}
                  className="px-5 py-2.5 bg-[#009b87] hover:bg-[#007f70] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm active:scale-95"
                >
                  {isDraftSaving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white shrink-0" />}
                  <span>Send Email Offer</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppRedirect}
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#1fb958] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm active:scale-95"
                >
                  <MessageCircle className="h-4 w-4 text-white shrink-0" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
