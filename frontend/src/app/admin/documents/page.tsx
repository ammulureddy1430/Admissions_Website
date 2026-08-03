"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, Layers, CheckCircle, AlertTriangle, Clock, HardDrive, 
  Search, Filter, Plus, Edit, Trash2, Eye, Download, Check, X, ShieldAlert 
} from "lucide-react";
import Link from "next/link";

export default function SchoolDocumentVaultDashboard() {
  const router = useRouter();
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"students" | "config">("students");
  
  // Search/Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // New config rule modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: "",
    categoryId: "",
    isRequired: true,
    isConditional: false,
    conditionRule: "",
    grade: "ALL",
    description: ""
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") || "" : "";

  const loadData = async () => {
    if (!token || !schoolId) return;
    setIsLoading(true);
    try {
      const headers = {
        "Authorization": `Bearer ${token}`,
        "x-tenant-id": schoolId
      };

      // 1. Fetch Dashboard Metrics
      const dashRes = await fetch("http://localhost:5001/document/vault/school/dashboard", { headers });
      if (dashRes.ok) setDashboardMetrics(await dashRes.json());

      // 2. Fetch Students Table
      const studRes = await fetch("http://localhost:5001/document/vault/school/students", { headers });
      if (studRes.ok) setStudents(await studRes.json());

      // 3. Fetch Required Docs Checklist
      const reqRes = await fetch(`http://localhost:5001/document/required`, { headers });
      if (reqRes.ok) setRequiredDocs(await reqRes.json());

      // 4. Fetch Categories
      const catRes = await fetch(`http://localhost:5001/document/categories`, { headers });
      if (catRes.ok) setCategories(await catRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !schoolId) {
      router.push("/login");
      return;
    }
    loadData();
  }, [schoolId, token]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.name || !configForm.categoryId || !token || !schoolId) return;
    
    setIsConfigSaving(true);
    try {
      const res = await fetch("http://localhost:5001/document/required", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        },
        body: JSON.stringify(configForm)
      });
      if (res.ok) {
        setShowConfigModal(false);
        setConfigForm({
          name: "",
          categoryId: "",
          isRequired: true,
          isConditional: false,
          conditionRule: "",
          grade: "ALL",
          description: ""
        });
        // Reload settings
        const reqRes = await fetch(`http://localhost:5001/document/required`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-tenant-id": schoolId
          }
        });
        if (reqRes.ok) setRequiredDocs(await reqRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConfigSaving(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Are you sure you want to delete this checklist rule? Any uploaded files mapping to this rule will lose their template association.")) return;
    try {
      const res = await fetch(`http://localhost:5001/document/required/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        }
      });
      if (res.ok) {
        setRequiredDocs(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
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

  // Filter student list
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesGrade = selectedGrade === "ALL" || student.grade === selectedGrade;
    
    const matchesStatus = selectedStatus === "ALL" || 
      (selectedStatus === "COMPLETE" && student.completionPercent === 100) ||
      (selectedStatus === "INCOMPLETE" && student.completionPercent < 100) ||
      (selectedStatus === "PENDING_VERIFY" && student.pending > 0);

    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#071633]">Document Vault Manager</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor admissions file compliance checklists, audit uploads, and perform batch verifications.
          </p>
        </div>
      </div>


      {/* 1. Dashboard Metrics Grid */}
      {dashboardMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Pending Review</span>
            <span className="text-lg font-black text-[#007f70] block mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
              {dashboardMetrics.pendingVerification}
            </span>
          </div>

          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Verified Files</span>
            <span className="text-lg font-black text-[#007f70] block mt-1 flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              {dashboardMetrics.verifiedDocuments}
            </span>
          </div>

          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Rejected Files</span>
            <span className="text-lg font-black text-[#007f70] block mt-1 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              {dashboardMetrics.rejectedDocuments}
            </span>
          </div>

          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Missing Required</span>
            <span className="text-lg font-black text-[#007f70] block mt-1 flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              {dashboardMetrics.missingDocuments}
            </span>
          </div>

          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Today's Uploads</span>
            <span className="text-lg font-black text-[#007f70] block mt-1">
              {dashboardMetrics.todaysUploads}
            </span>
          </div>

          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Vault Storage</span>
            <span className="text-xs font-black text-[#071633] block mt-2 flex items-center gap-1 font-mono">
              <HardDrive className="h-3.5 w-3.5 text-slate-450" />
              {formatStorage(dashboardMetrics.storageUsed)}
            </span>
          </div>

          <div className="bg-white border border-[#dceae6] p-4 rounded-2xl shadow-[0_8px_30px_rgba(28,65,56,.03)]">
            <span className="text-[#71818d] font-bold uppercase text-[9px] block">Avg Review Time</span>
            <span className="text-lg font-black text-[#071633] block mt-1">
              {dashboardMetrics.averageVerificationTime} hrs
            </span>
          </div>
        </div>
      )}

      {/* Sub Tabs Toggle */}
      <div className="flex gap-2 border-b border-[#dceae6]">
        <button
          onClick={() => setActiveSubTab("students")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === "students" 
              ? "border-[#009b87] text-[#007f70] bg-[#e6f7f2]/20" 
              : "border-transparent text-[#607080] hover:text-[#007f70]"
          }`}
        >
          Student Checklists Tracker
        </button>
        <button
          onClick={() => setActiveSubTab("config")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === "config" 
              ? "border-[#009b87] text-[#007f70] bg-[#e6f7f2]/20" 
              : "border-transparent text-[#607080] hover:text-[#007f70]"
          }`}
        >
          Checklist Policy Settings
        </button>
      </div>

      {/* 2. Sub Tab Contents */}
      <div className="animate-in fade-in duration-200">
        
        {/* --- STUDENT LIST CHECKLIST TRACKER --- */}
        {activeSubTab === "students" && (
          <div className="space-y-6">
            
            {/* Roster Filters */}
            <div className="bg-white border border-[#dceae6] p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between text-xs shadow-[0_4px_20px_rgba(28,65,56,.01)]">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or application..."
                  className="w-full pl-9 pr-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                />
              </div>

              <div className="flex gap-3 w-full md:w-auto items-center">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-bold text-slate-500">Filters:</span>
                </div>
                
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                >
                  <option value="ALL">All Grades</option>
                  <option value="Nursery">Nursery</option>
                  <option value="LKG">LKG</option>
                  <option value="UKG">UKG</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 5">Grade 5</option>
                  {/* ... other grades as needed ... */}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                >
                  <option value="ALL">All Checklist States</option>
                  <option value="PENDING_VERIFY">Needs Review</option>
                  <option value="COMPLETE">100% Completed</option>
                  <option value="INCOMPLETE">Incomplete</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-[#dceae6] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(28,65,56,.03)]">
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="bg-[#f6faf8] border-b border-[#dceae6] text-[#71818d] font-bold uppercase text-[9px]">
                    <th className="p-4">Student</th>
                    <th className="p-4">Application ID</th>
                    <th className="p-4">Grade</th>
                    <th className="p-4 text-center">Required Checklist</th>
                    <th className="p-4 text-center">Uploaded</th>
                    <th className="p-4 text-center text-blue-650">Needs Review</th>
                    <th className="p-4 text-center text-emerald-650">Verified</th>
                    <th className="p-4 text-center text-rose-650">Rejected</th>
                    <th className="p-4 text-center">Completeness</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f6f4]">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-[#fcfefe] transition">
                      <td className="p-4 font-bold text-[#071633]">
                        {student.studentName}
                      </td>
                      <td className="p-4 font-mono text-slate-450">{student.id.substring(0, 8)}</td>
                      <td className="p-4 font-semibold">{student.grade}</td>
                      <td className="p-4 text-center font-bold text-slate-500">{student.requiredDocsCount}</td>
                      <td className="p-4 text-center font-semibold">{student.uploaded}</td>
                      <td className="p-4 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          student.pending > 0 ? "bg-blue-100 text-blue-800" : "bg-slate-50 text-slate-400"
                        }`}>{student.pending}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          student.verified > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-400"
                        }`}>{student.verified}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          student.rejected > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-50 text-slate-400"
                        }`}>{student.rejected}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <span className="font-extrabold text-[#007f70]">{student.completionPercent}%</span>
                          <div className="w-12 bg-[#e6f7f2] h-1.5 rounded-full overflow-hidden border border-[#cceae3]">
                            <div className="bg-[#009b87] h-full rounded-full" style={{ width: `${student.completionPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/application/${student.id}?tab=documents`}
                          className="text-[#007f70] hover:text-[#005f54] font-bold hover:underline"
                        >
                          Review Vault
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-400 italic font-medium">
                        No students found matching current search and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* --- REQUIRED CHECKLIST CONFIG SETTINGS --- */}
        {activeSubTab === "config" && (
          <div className="space-y-6">
            
            {/* Header action */}
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-xs text-[#071633] uppercase tracking-wider">Required Document Checklists</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Configure what documents are requested from parents during registration.</p>
              </div>
              
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 bg-[#009b87] hover:bg-[#007f70] text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Required Check
              </button>
            </div>

            {/* Checklist Configuration Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requiredDocs.map((req) => (
                <div key={req.id} className="bg-white border border-[#dceae6] p-5 rounded-2xl shadow-[0_4px_20px_rgba(28,65,56,.01)] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h5 className="font-extrabold text-xs text-[#071633]">{req.name}</h5>
                      <span className="bg-[#f0faf8] text-[#008f7d] border border-[#cceae3] px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                        {req.category?.name.split(' ')[0] || "Custom"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{req.description || "No description provided."}</p>
                    
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[9px] font-bold">
                      {req.isRequired ? (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">REQUIRED</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">OPTIONAL</span>
                      )}
                      {req.isConditional && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-250 px-1.5 py-0.5 rounded" title={req.conditionRule}>CONDITIONAL</span>
                      )}
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">GRADE: {req.grade}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#f0f6f4] text-xs">
                    <button
                      onClick={() => handleDeleteConfig(req.id)}
                      className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Rule
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* --- ADD CHECKLIST CONFIG MODAL --- */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveConfig} className="bg-white border border-[#dceae6] rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <h3 className="font-extrabold text-sm text-[#071633] pb-2 border-b border-[#f0f6f4]">Configure Required Document</h3>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Document Name <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={configForm.name}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Birth Certificate"
                  required
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Category folder <span className="text-rose-500">*</span></label>
                <select 
                  value={configForm.categoryId}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                >
                  <option value="">-- Select Folder --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-1 font-bold text-slate-700 select-none">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={configForm.isRequired}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, isRequired: e.target.checked }))}
                    className="h-4 w-4 accent-[#009b87]"
                  /> Required Check
                </label>
                
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={configForm.isConditional}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, isConditional: e.target.checked }))}
                    className="h-4 w-4 accent-[#009b87]"
                  /> Conditional
                </label>
              </div>

              {configForm.isConditional && (
                <div className="space-y-1 animate-in slide-in-from-top duration-150">
                  <label className="font-bold text-slate-700">Condition rule description</label>
                  <input 
                    type="text" 
                    value={configForm.conditionRule}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, conditionRule: e.target.value }))}
                    placeholder="e.g. Only required if applicant age is over 15"
                    className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Applicable Grade classes</label>
                <select 
                  value={configForm.grade}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                >
                  <option value="ALL">All Grades (ALL)</option>
                  <option value="Nursery">Nursery</option>
                  <option value="LKG">LKG</option>
                  <option value="UKG">UKG</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Rule Description / Instruction</label>
                <textarea 
                  value={configForm.description}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Parent instructions: e.g. Upload scanned original Aadhaar in color format."
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl h-16"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#f0f6f4]">
              <button 
                type="button"
                onClick={() => setShowConfigModal(false)} 
                className="px-4 py-2 border border-[#dceae6] hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isConfigSaving}
                className="bg-[#009b87] hover:bg-[#007f70] px-4 py-2 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {isConfigSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save Policy Rule
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
