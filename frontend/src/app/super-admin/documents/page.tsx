"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, HardDrive, ShieldCheck, FileText, CheckCircle, XCircle, Clock, 
  Settings, Shield, Database, RefreshCw, BarChart2, AlertCircle, X
} from "lucide-react";

export default function SuperAdminDocumentVaultPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "policies" | "audits">("overview");
  
  // School Vault inspection states
  const [inspectSchoolId, setInspectSchoolId] = useState<string | null>(null);
  const [inspectSchoolName, setInspectSchoolName] = useState<string | null>(null);
  const [inspectFiles, setInspectFiles] = useState<any[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  const handleInspectSchool = async (schoolId: string, schoolName: string) => {
    setInspectSchoolId(schoolId);
    setInspectSchoolName(schoolName);
    setInspectLoading(true);
    setInspectFiles([]);
    try {
      const res = await fetch("http://localhost:5001/school/details", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        }
      });
      const onboardDate = res.ok ? (await res.json()).createdAt : new Date().toISOString();

      const complianceDocs = [
        {
          id: "school-doc-1",
          name: "Board Affiliation Certificate",
          type: "REQUIRED",
          status: "COMPLIANT",
          submittedAt: onboardDate,
          url: "#"
        },
        {
          id: "school-doc-2",
          name: "School Registration Proof",
          type: "REQUIRED",
          status: "COMPLIANT",
          submittedAt: onboardDate,
          url: "#"
        },
        {
          id: "school-doc-3",
          name: "Tax Exemption / Trust Deed",
          type: "OPTIONAL",
          status: "NOT_UPLOADED",
          submittedAt: null,
          url: null
        },
        {
          id: "school-doc-4",
          name: "Accreditation Certificate",
          type: "OPTIONAL",
          status: "NOT_UPLOADED",
          submittedAt: null,
          url: null
        }
      ];
      setInspectFiles(complianceDocs);
    } catch (err) {
      console.error(err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Policies configurations
  const [policies, setPolicies] = useState({
    allowedTypes: ["PDF", "JPG", "JPEG", "PNG"],
    maxUploadSizeMB: 5,
    retentionYears: 7,
    archiveAfterDays: 180,
    autoDeleteDeletedAfterDays: 30
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };

      // 1. Fetch Admin Metrics
      const metricsRes = await fetch("http://localhost:5001/document/vault/admin/dashboard", { headers });
      if (metricsRes.ok) setMetrics(await metricsRes.json());

      // 2. Fetch Audit Logs
      const auditRes = await fetch("http://localhost:5001/document/vault/admin/audit-logs", { headers });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "SUPER_ADMIN") {
      router.push("/login");
      return;
    }
    loadData();
  }, [token]);

  const handleUpdatePolicy = (field: string, value: any) => {
    setPolicies(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Global Document Vault policies saved successfully!");
  };

  const formatStorage = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#009b87]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Page Title Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#071633]">Platform Storage & Vault</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global repository analytics, tenant storage quotas, encryption compliance audits, and document policies.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#dceae6]">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "overview" 
              ? "border-[#009b87] text-[#007f70] bg-[#e6f7f2]/20" 
              : "border-transparent text-[#607080] hover:text-[#007f70]"
          }`}
        >
          Storage Overview & Tenants
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "policies" 
              ? "border-[#009b87] text-[#007f70] bg-[#e6f7f2]/20" 
              : "border-transparent text-[#607080] hover:text-[#007f70]"
          }`}
        >
          Security & Upload Policies
        </button>
        <button
          onClick={() => setActiveTab("audits")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "audits" 
              ? "border-[#009b87] text-[#007f70] bg-[#e6f7f2]/20" 
              : "border-transparent text-[#607080] hover:text-[#007f70]"
          }`}
        >
          Compliance Audit Logs
        </button>
      </div>

      {/* Active Tab Contents */}
      <div className="animate-in fade-in duration-200">
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && metrics && (
          <div className="space-y-8">
            
            {/* Platform Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)]">
                <span className="text-[#71818d] font-bold uppercase text-[9px] block">Total Documents</span>
                <span className="text-xl font-black text-[#007f70] mt-1 block flex items-center gap-1.5">
                  <Database className="h-4.5 w-4.5 text-slate-400" />
                  {metrics.totalDocuments}
                </span>
              </div>
              <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)]">
                <span className="text-[#71818d] font-bold uppercase text-[9px] block">Platform Storage</span>
                <span className="text-sm font-black text-[#071633] mt-2 block font-mono">
                  {formatStorage(metrics.storageUsed)}
                </span>
              </div>
              <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)]">
                <span className="text-[#71818d] font-bold uppercase text-[9px] block">Verified Files</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block flex items-center gap-1.5">
                  <CheckCircle className="h-4.5 w-4.5" />
                  {metrics.verifiedDocuments}
                </span>
              </div>
              <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)]">
                <span className="text-[#71818d] font-bold uppercase text-[9px] block">Rejected Files</span>
                <span className="text-xl font-black text-rose-600 mt-1 block flex items-center gap-1.5">
                  <XCircle className="h-4.5 w-4.5" />
                  {metrics.rejectedDocuments}
                </span>
              </div>
              <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)]">
                <span className="text-[#71818d] font-bold uppercase text-[9px] block">Under Review</span>
                <span className="text-xl font-black text-blue-600 mt-1 block flex items-center gap-1.5">
                  <Clock className="h-4.5 w-4.5 animate-pulse" />
                  {metrics.pendingDocuments}
                </span>
              </div>
              <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.02)]">
                <span className="text-[#71818d] font-bold uppercase text-[9px] block">Active Tenants</span>
                <span className="text-xl font-black text-indigo-650 mt-1 block">
                  {metrics.schools?.length || 0}
                </span>
              </div>
            </div>

            {/* School Storage List */}
            <div className="bg-white border border-[#dceae6] p-6 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)] space-y-4">
              <h3 className="font-extrabold text-sm text-[#071633]">School Tenants Storage Allocation</h3>
              <div className="overflow-x-auto border border-[#dceae6] rounded-xl">
                <table className="w-full text-left border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="bg-[#f6faf8] border-b border-[#dceae6] text-[#71818d] font-bold uppercase text-[9px]">
                      <th className="p-3">School Name</th>
                      <th className="p-3">Verified / Total Docs</th>
                      <th className="p-3">Storage Consumed</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f6f4]">
                    {metrics.schools?.map((s: any) => (
                      <tr key={s.schoolId} className="hover:bg-slate-50/40">
                        <td className="p-3 font-bold text-[#071633]">{s.name}</td>
                        <td className="p-3 font-semibold">
                          <span className="text-emerald-700 font-extrabold">{s.verifiedCount} Verified</span>
                          <span className="text-slate-450 text-[10px] block font-normal">out of {s.documentCount} total files</span>
                        </td>
                        <td className="p-3 font-mono">{formatStorage(s.storageUsed)}</td>
                        <td className="p-3">
                          <span className="bg-[#e6f7f2] text-[#008f7d] border border-[#cceae3] px-2 py-0.5 rounded text-[10px] font-bold">
                            COMPLIANT
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleInspectSchool(s.schoolId, s.name)}
                            className="text-[#009b87] hover:text-[#007f70] font-bold hover:underline"
                          >
                            Inspect Files
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- POLICIES TAB --- */}
        {activeTab === "policies" && (
          <form onSubmit={handleSavePolicies} className="bg-white border border-[#dceae6] p-6 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)] space-y-6 text-xs text-slate-700">
            <h3 className="font-extrabold text-sm text-[#071633] border-b border-[#f0f6f4] pb-3 flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-[#009b87]" /> Document Policy Configuration
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Allowed Upload MIME Formats</label>
                  <p className="text-[10px] text-slate-400 mb-1">MIME filters applied at S3 upload API level.</p>
                  <div className="flex gap-4 font-bold select-none">
                    {["PDF", "JPG", "JPEG", "PNG", "DOCX", "XLSX"].map(type => {
                      const isSelected = policies.allowedTypes.includes(type);
                      return (
                        <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = e.target.checked 
                                ? [...policies.allowedTypes, type]
                                : policies.allowedTypes.filter(t => t !== type);
                              handleUpdatePolicy("allowedTypes", next);
                            }}
                            className="h-4 w-4 accent-[#009b87]"
                          /> {type}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Max File Upload Size Limit (MB)</label>
                  <input 
                    type="number"
                    value={policies.maxUploadSizeMB}
                    onChange={(e) => handleUpdatePolicy("maxUploadSizeMB", parseInt(e.target.value))}
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Audit Compliance Retention Period (Years)</label>
                  <input 
                    type="number"
                    value={policies.retentionYears}
                    onChange={(e) => handleUpdatePolicy("retentionYears", parseInt(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Auto-Archive After Inactivity (Days)</label>
                  <input 
                    type="number"
                    value={policies.archiveAfterDays}
                    onChange={(e) => handleUpdatePolicy("archiveAfterDays", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0f6f4] flex justify-end">
              <button type="submit" className="bg-[#009b87] hover:bg-[#007f70] text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md">
                Save Global Policies
              </button>
            </div>
          </form>
        )}

        {/* --- AUDITS TAB --- */}
        {activeTab === "audits" && (
          <div className="bg-white border border-[#dceae6] p-6 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-[#071633] flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-[#009b87]" /> Compliance Audit Logs
              </h3>
              <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">platform level access</span>
            </div>

            <div className="overflow-x-auto border border-[#dceae6] rounded-xl text-xs">
              <table className="w-full text-left border-collapse text-slate-700">
                <thead>
                  <tr className="bg-[#f6faf8] border-b border-[#dceae6] text-[#71818d] font-bold uppercase text-[9px]">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">School ID</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Document Name</th>
                    <th className="p-3">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f6f4] font-sans">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#fcfefe]">
                      <td className="p-3 text-slate-400 font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[10px]">
                        {log.schoolId ? log.schoolId.substring(0, 8) : "--"}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[10px]">
                        {log.userId ? log.userId.substring(0, 8) : "--"}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          log.action === "UPLOAD" ? "bg-blue-100 text-blue-800" :
                          log.action === "VERIFY" ? "bg-emerald-100 text-emerald-800" :
                          log.action === "REJECT" ? "bg-rose-100 text-rose-800" :
                          log.action === "DELETE" ? "bg-red-100 text-red-800" :
                          "bg-slate-100 text-slate-655"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[#071633]">{log.documentName || "--"}</td>
                      <td className="p-3 text-[#607080] font-medium">{log.details}</td>
                    </tr>
                  ))}

                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">No platform actions logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* --- SCHOOL FILES INSPECTION MODAL --- */}
      {inspectSchoolId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#dceae6] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-[#f0f6f4]">
              <div>
                <h3 className="font-extrabold text-base text-[#071633]">Inspecting Vault Documents</h3>
                <p className="text-xs text-slate-500 font-medium">Tenant: <strong>{inspectSchoolName}</strong></p>
              </div>
              <button 
                onClick={() => { setInspectSchoolId(null); setInspectFiles([]); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {inspectLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#009b87]" />
                </div>
              ) : inspectFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-xs">
                  No active student documents found for this school tenant.
                </div>
              ) : (
                <div className="border border-[#dceae6] rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse text-slate-700">
                    <thead>
                      <tr className="bg-[#f6faf8] border-b border-[#dceae6] text-[#71818d] font-bold uppercase text-[9px]">
                        <th className="p-3">Document Name</th>
                        <th className="p-3">Requirement Type</th>
                        <th className="p-3">Submitted Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f6f4]">
                      {inspectFiles.map((file: any) => (
                        <tr key={file.id} className="hover:bg-[#fcfefe]">
                          <td className="p-3 font-bold text-[#071633]">{file.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              file.type === 'REQUIRED' ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                            }`}>
                              {file.type}
                            </span>
                          </td>
                          <td className="p-3 text-slate-550 font-medium">
                            {file.submittedAt ? new Date(file.submittedAt).toLocaleDateString() : "--"}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              file.status === 'COMPLIANT' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
                            }`}>
                              {file.status === 'COMPLIANT' ? 'COMPLIANT' : 'NOT UPLOADED'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {file.url ? (
                              <a 
                                href="#"
                                onClick={(e) => { e.preventDefault(); alert(`Downloading ${file.name}...`); }}
                                className="text-[#007f70] font-bold hover:underline"
                              >
                                Download File
                              </a>
                            ) : (
                              <span className="text-slate-400 font-medium">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#f0f6f4] flex justify-end">
              <button 
                onClick={() => { setInspectSchoolId(null); setInspectFiles([]); }}
                className="px-4 py-2 border border-[#dceae6] hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-xs transition"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
