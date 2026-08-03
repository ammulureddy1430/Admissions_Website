"use client";
import { INDIAN_MOBILE_PATTERN, sanitizeIndianMobile } from "@/lib/phone";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck, Settings, Trash2, Upload } from "lucide-react";

export default function AdminSettings() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>({ logo: "", phone: "" });

  const [schoolSettings, setSchoolSettings] = useState<any>({
    admissionFee: 1500,
    autoApproveLeads: false,
    supportEmail: "info@school.edu",
    supportPhone: "+919876543210",
    paymentUpiId: "",
    paymentPageUrl: "",
    aiContext: "",
    assessmentAiEnabled: true,
    assessmentAiMode: "BOTH",
    assessmentAiLogChats: false,
  });

  useEffect(() => {
    const id = localStorage.getItem("schoolId");
    if (!id) {
      router.push("/login");
      return;
    }
    setSchoolId(id);
  }, [router]);

  useEffect(() => {
    if (!schoolId) return;

    async function fetchSettings() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5001/school/details", {
          headers: { 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const details = await res.json();
          if (details.settings) setSchoolSettings(details.settings);
          setSchoolProfile({ logo: details.logo || "", phone: details.phone || "" });
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchSettings();
  }, [schoolId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose a PNG, JPG, WebP, or SVG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("School logo must be smaller than 2 MiB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSchoolProfile((prev: any) => ({ ...prev, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/school/settings", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          admissionFee: Number(schoolSettings.admissionFee),
          autoApproveLeads: schoolSettings.autoApproveLeads,
          supportEmail: schoolSettings.supportEmail,
          supportPhone: schoolSettings.supportPhone,
          paymentUpiId: schoolSettings.paymentUpiId || "",
          paymentPageUrl: schoolSettings.paymentPageUrl || "",
          aiContext: schoolSettings.aiContext,
          assessmentAiEnabled: schoolSettings.assessmentAiEnabled,
          assessmentAiMode: schoolSettings.assessmentAiMode,
          assessmentAiLogChats: schoolSettings.assessmentAiLogChats,
          logo: schoolProfile.logo || null,
          schoolPhone: schoolProfile.phone,
        }),
      });
      if (res.ok) {
        setMessage("School configuration details updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">School Configuration Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure admissions fees, auto-approval workflows, and evaluations panel parameters.</p>
      </div>

      {message && (
        <div className="bg-[#ecfdf5] border border-[#6ee7b7] text-[#065f46] p-4 rounded-xl text-xs font-bold flex items-center gap-2 max-w-2xl shadow-sm">
          <ShieldCheck className="h-4 w-4 text-[#047857]" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleUpdateSettings} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 max-w-2xl">
        <div className="space-y-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#2dd4bf]" /> Payment &amp; School Branding
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure how parents identify and pay your school. Payments go directly to your UPI ID or payment page.
          </p>

          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold block">School Logo</label>
            <p className="text-[10px] text-slate-500">Displayed on newly generated receipts and school documents. Maximum size: 2 MiB.</p>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 rounded-xl bg-white border border-slate-700 p-2 flex items-center justify-center overflow-hidden">
                {schoolProfile.logo ? (
                  <img src={schoolProfile.logo} alt="School logo preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-500 text-center">No logo</span>
                )}
              </div>
              <label className="cursor-pointer border border-slate-700 hover:border-[#2dd4bf] text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition">
                <Upload className="h-4 w-4" /> {schoolProfile.logo ? "Replace" : "Upload"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoChange} className="hidden" />
              </label>
              {schoolProfile.logo && (
                <button type="button" onClick={() => setSchoolProfile((prev: any) => ({ ...prev, logo: "" }))} className="border border-[#fca5a5] text-[#dc2626] bg-white hover:bg-[#fee2e2] hover:border-[#ef4444] px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">UPI ID</label>
            <input type="text" value={schoolSettings.paymentUpiId || ""} onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, paymentUpiId: e.target.value }))} placeholder="your-school@okhdfcbank" className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]" />
            <p className="text-[10px] text-slate-500">Parents will use this UPI ID for direct school payments.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">School Contact Phone</label>
            <input required type="tel" inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number" value={schoolProfile.phone || ""} onChange={(e) => setSchoolProfile((prev: any) => ({ ...prev, phone: sanitizeIndianMobile(e.target.value) }))} placeholder="+919876543210" className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]" />
            <p className="text-[10px] text-slate-500">Shown to parents for payment and fee-related queries.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">Payment Page URL <span className="normal-case font-normal">(optional)</span></label>
            <input type="url" value={schoolSettings.paymentPageUrl || ""} onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, paymentPageUrl: e.target.value }))} placeholder="https://your-school.razorpay.com/pay" className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]" />
            <p className="text-[10px] text-slate-500">Your Razorpay, Cashfree, or other hosted payment-page link. Leave blank for UPI-only.</p>
          </div>
        </div>

        <div className="border-t border-slate-850 pt-6">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Settings className="h-4 w-4 text-indigo-400" /> Admissions Parameters
        </h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">Registration Admission Fee (INR)</label>
            <input 
              required 
              type="number" 
              value={schoolSettings.admissionFee} 
              onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, admissionFee: Number(e.target.value) }))} 
              className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">Auto Approve Leads</label>
            <select 
              value={String(schoolSettings.autoApproveLeads)} 
              onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, autoApproveLeads: e.target.value === "true" }))}
              className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="false">Manual Review</option>
              <option value="true">Auto Approve New Inquiries</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 border-t border-slate-850 pt-6">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">Support Email Address</label>
            <input 
              required 
              type="email" 
              value={schoolSettings.supportEmail || ""} 
              onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, supportEmail: e.target.value }))} 
              className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">Support Phone Helpline</label>
            <input 
              required 
              type="tel"
              inputMode="numeric"
              maxLength={13}
              pattern={INDIAN_MOBILE_PATTERN}
              title="Enter a valid 10-digit Indian mobile number"
              value={schoolSettings.supportPhone || ""} 
              onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, supportPhone: sanitizeIndianMobile(e.target.value) }))} 
              className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-850 pt-6">
          <label className="text-xs text-slate-400 font-semibold uppercase block">AI Assistant System Prompt / Context FAQ</label>
          <span className="text-[10px] text-slate-500 block leading-normal">
            Customize the AI bot's instructions. Provide details on K-12 curriculums, school values, school bus transport rules, or sports amenities.
          </span>
          <textarea 
            rows={6}
            placeholder="Greenwood International School is affiliated with CBSE board. Tuition fees range from ₹60,000 to ₹1,20,000 annually..."
            value={schoolSettings.aiContext || ""} 
            onChange={(e) => setSchoolSettings((prev: any) => ({ ...prev, aiContext: e.target.value }))} 
            className="w-full bg-slate-955 border border-slate-850 rounded-lg p-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed" 
          />
        </div>

        <div className="space-y-4 border-t border-slate-850 pt-6">
          <div>
            <label className="text-xs text-slate-300 font-semibold uppercase block">Assessment AI Learning Assistant</label>
            <p className="mt-1 text-[10px] text-slate-500">Controls integrity-safe explanations and hints during active assessments.</p>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
            Enable during assessments
            <input type="checkbox" checked={schoolSettings.assessmentAiEnabled ?? true} onChange={e => setSchoolSettings((prev: any) => ({ ...prev, assessmentAiEnabled: e.target.checked }))} className="h-4 w-4 accent-[#009b87]" />
          </label>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Allowed assistance</label>
            <select value={schoolSettings.assessmentAiMode || "BOTH"} onChange={e => setSchoolSettings((prev: any) => ({ ...prev, assessmentAiMode: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white">
              <option value="CONCEPTS_ONLY">Concept explanations only</option>
              <option value="HINTS_ONLY">Hints only</option>
              <option value="BOTH">Explanations and hints</option>
            </select>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
            Save chat logs for post-assessment review
            <input type="checkbox" checked={schoolSettings.assessmentAiLogChats ?? false} onChange={e => setSchoolSettings((prev: any) => ({ ...prev, assessmentAiLogChats: e.target.checked }))} className="h-4 w-4 accent-[#009b87]" />
          </label>
        </div>

        <button 
          type="submit" 
          disabled={actionLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-colors shadow-lg shadow-indigo-600/10 active:scale-95"
        >
          {actionLoading ? "Updating Configurations..." : "Save Settings"}
        </button>
      </form>

      {/* Compliance Verification Documents */}
      <div className="bg-[#f6faf8] border border-[#dceae6] p-6 rounded-2xl space-y-4 max-w-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)] animate-in fade-in duration-300">
        <h3 className="font-bold text-sm text-[#071633] flex items-center gap-2 border-b border-[#e8f3f0] pb-3">
          <ShieldCheck className="h-4.5 w-4.5 text-[#009b87]" /> Onboarding Compliance Documents
        </h3>
        <p className="text-[11px] text-slate-500 font-medium">
          These documents were submitted to the Pehchaan Super Admin during the school instance onboarding for accreditation verification:
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs pt-1 text-slate-700">
          <div className="bg-white border border-[#dceae6] p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-[#071633] block text-[11px]">Board Affiliation Certificate</span>
              <span className="text-[9px] text-[#008f7d] font-bold uppercase tracking-wider block mt-0.5">COMPLIANT</span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Downloading Board Affiliation Certificate..."); }} className="text-[#009b87] hover:underline font-bold text-[10px]">Download</a>
          </div>
          
          <div className="bg-white border border-[#dceae6] p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-[#071633] block text-[11px]">School Registration Proof</span>
              <span className="text-[9px] text-[#008f7d] font-bold uppercase tracking-wider block mt-0.5">COMPLIANT</span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Downloading School Registration Proof..."); }} className="text-[#009b87] hover:underline font-bold text-[10px]">Download</a>
          </div>

          <div className="bg-white border border-[#dceae6] p-3 rounded-xl flex items-center justify-between opacity-80">
            <div>
              <span className="font-bold text-[#071633] block text-[11px]">Tax Exemption / Trust Deed</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">OPTIONAL</span>
            </div>
            <span className="text-slate-400 text-[10px] font-bold">Not Uploaded</span>
          </div>

          <div className="bg-white border border-[#dceae6] p-3 rounded-xl flex items-center justify-between opacity-80">
            <div>
              <span className="font-bold text-[#071633] block text-[11px]">Accreditation Certificate</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">OPTIONAL</span>
            </div>
            <span className="text-slate-400 text-[10px] font-bold">Not Uploaded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
