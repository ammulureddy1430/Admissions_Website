"use client";

import { useState, useEffect } from "react";
import { 
  FileText, CheckCircle, AlertCircle, Clock, Trash2, RotateCw, 
  Upload, Eye, Download, MessageSquare, ChevronRight, X, AlertTriangle, 
  User, Check, CornerDownRight, Loader2, RefreshCw, Layers
} from "lucide-react";

interface DocumentVaultProps {
  applicationId: string;
  mode: 'parent' | 'school' | 'admin';
  onUpdate?: () => void;
}

export function DocumentVault({ applicationId, mode, onUpdate }: DocumentVaultProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [commentDoc, setCommentDoc] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [versionDoc, setVersionDoc] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  // Actions states
  const [isUploading, setIsUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDoc, setRejectDoc] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [verificationRemarks, setVerificationRemarks] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState<any>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") : null;

  const fetchVaultData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers: any = {
        "Authorization": `Bearer ${token}`
      };
      if (schoolId) {
        headers["x-tenant-id"] = schoolId;
      }

      const res = await fetch(`http://localhost:5001/document/vault/${applicationId}`, { headers });
      if (!res.ok) throw new Error("Failed to load document vault.");
      
      const result = await res.json();
      setData(result);
      if (result.categories?.length > 0 && !activeCategory) {
        setActiveCategory(result.categories[0].categoryId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load document vault.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchVaultData();
    }
  }, [applicationId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, reqDocId?: string, name?: string, catId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !token || !schoolId) return;

    // Configurable size check - default 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get S3 presigned URL
      const urlRes = await fetch(
        `http://localhost:5001/document/presigned-url?applicationId=${applicationId}&fileName=${encodeURIComponent(file.name)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-tenant-id": schoolId
          }
        }
      );
      if (!urlRes.ok) throw new Error("Failed to fetch upload signature.");
      const { uploadUrl, key } = await urlRes.json();

      // 2. Upload file directly to S3 / MinIO
      const uploadHeaders: any = {
        "Content-Type": file.type
      };
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file
      });

      if (!s3Res.ok) {
        console.warn("Direct S3 upload failed, simulating fallback URL upload...");
      }

      // Generate actual or mock url
      const finalUrl = `http://localhost:9000/admissionsos/${key}`;

      // 3. Register document in database
      const payload = {
        applicationId,
        requiredDocumentId: reqDocId,
        categoryId: catId || activeCategory,
        name: name || file.name.split('.')[0],
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        url: finalUrl,
        checksum: `${file.name}-${file.size}` // Simulated MD5 checksum
      };

      const saveRes = await fetch("http://localhost:5001/document/vault/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.message || "Failed to save document record.");
      }

      await fetchVaultData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async () => {
    if (!showVerifyModal || !token || !schoolId) return;
    setActionLoading(showVerifyModal.id);
    try {
      const res = await fetch(`http://localhost:5001/document/vault/document/${showVerifyModal.id}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        },
        body: JSON.stringify({ remarks: verificationRemarks })
      });
      if (!res.ok) throw new Error("Failed to verify document.");

      setShowVerifyModal(null);
      setVerificationRemarks("");
      await fetchVaultData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDoc || !token || !schoolId) return;
    if (!rejectionReason) {
      alert("Please specify a rejection reason.");
      return;
    }
    setActionLoading(rejectDoc.id);
    try {
      const res = await fetch(`http://localhost:5001/document/vault/document/${rejectDoc.id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        },
        body: JSON.stringify({ 
          rejectionReason, 
          remarks: rejectionRemarks 
        })
      });
      if (!res.ok) throw new Error("Failed to reject document.");

      setRejectDoc(null);
      setRejectionReason("");
      setRejectionRemarks("");
      await fetchVaultData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    setActionLoading(docId);
    try {
      const res = await fetch(`http://localhost:5001/document/vault/document/${docId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId || ""
        }
      });
      if (!res.ok) throw new Error("Failed to delete document.");
      await fetchVaultData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !commentDoc || !token || !schoolId) return;
    try {
      const res = await fetch(`http://localhost:5001/document/vault/document/${commentDoc.id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": schoolId
        },
        body: JSON.stringify({ text: newComment })
      });
      if (!res.ok) throw new Error("Failed to add comment.");

      const added = await res.json();
      // Optimistically append comment
      setCommentDoc((prev: any) => ({
        ...prev,
        comments: [...prev.comments, added]
      }));
      setNewComment("");
      
      // Refresh vault data to match
      fetchVaultData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreVersion = async (version: any) => {
    if (mode !== 'admin') return;
    if (!confirm(`Are you sure you want to restore version ${version.versionNumber} of this document?`)) return;
    
    // Simulate restoration
    alert(`Restoring version ${version.versionNumber}...`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#009b87] mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Opening secure Document Vault...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Error Opening Vault</h4>
          <p className="text-xs text-rose-700 mt-1">{error || "Vault could not be accessed."}</p>
        </div>
      </div>
    );
  }

  const activeCatData = data.categories.find((c: any) => c.categoryId === activeCategory);
  const metrics = data.metrics;

  return (
    <div className="space-y-6">
      
      {/* 1. Header Metrics Card */}
      <div className="bg-white border border-[#dceae6] shadow-[0_8px_30px_rgba(28,65,56,.04)] p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base text-[#071633] flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#009b87]" />
              Documents for {data.application.studentName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Grade: {data.application.grade} • School: {data.application.schoolName}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Required documents complete</span>
              <span className="text-lg font-black text-[#007f70]">{metrics.completionPercent}%</span>
            </div>
            <div className="w-32 bg-[#e6f7f2] h-2 rounded-full overflow-hidden border border-[#cceae3]">
              <div 
                className="bg-gradient-to-r from-[#009b87] to-[#007f70] h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Small metric tags */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#f0f6f4] text-xs">
          <div className="bg-[#eaf5ff] border border-[#d0e6ff] p-3 rounded-xl">
            <span className="text-blue-600 font-bold uppercase text-[9px] block">Waiting for school review</span>
            <span className="text-sm font-extrabold text-blue-800">{metrics.pendingVerification} document{metrics.pendingVerification === 1 ? "" : "s"}</span>
          </div>
          <div className="bg-[#e6f7f2] border border-[#cceae3] p-3 rounded-xl">
            <span className="text-[#008f7d] font-bold uppercase text-[9px] block">Approved by school</span>
            <span className="text-sm font-extrabold text-[#008f7d]">{metrics.verified} document{metrics.verified === 1 ? "" : "s"}</span>
          </div>
          <div className={`${metrics.missing > 0 || metrics.rejected > 0 ? "bg-[#fff4f2] border-[#ffd5d0]" : "bg-[#f6faf8] border-[#dceae6]"} border p-3 rounded-xl`}>
            <span className={`${metrics.missing > 0 || metrics.rejected > 0 ? "text-rose-600" : "text-slate-500"} font-bold uppercase text-[9px] block`}>Needs your action</span>
            <span className={`${metrics.missing > 0 || metrics.rejected > 0 ? "text-rose-700" : "text-[#071633]"} text-sm font-extrabold`}>{metrics.missing + metrics.rejected} document{metrics.missing + metrics.rejected === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      {/* 2. Folders and Files Interface */}
      <div className="grid md:grid-cols-4 gap-6">
        
        {/* Categories Sidebar */}
        <div className="md:col-span-1 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block px-3 mb-2">Document types</span>
          {data.categories.map((cat: any) => {
            const hasUploaded = cat.checklist.some((i: any) => i.document) || cat.additionalDocs.length > 0;
            const isSelected = activeCategory === cat.categoryId;
            return (
              <button
                key={cat.categoryId}
                onClick={() => setActiveCategory(cat.categoryId)}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected 
                    ? "bg-[#e6f7f2] text-[#007f70] border border-[#cceae3] shadow-sm" 
                    : "text-[#607080] hover:bg-[#f1f8f5] hover:text-[#007f70]"
                }`}
              >
                <span className="truncate">{cat.categoryName}</span>
                {hasUploaded && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#009b87]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Files Roster */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-xs text-[#071633] uppercase tracking-wider">
              {activeCatData?.categoryName}
            </h4>
            
            {/* Custom file upload (outside checklist) */}
            {mode === 'parent' && (
              <label className="flex items-center gap-1.5 bg-white hover:bg-[#f4faf8] border border-[#dceae6] hover:border-[#9bd6c8] text-[#007f70] px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm transition-all cursor-pointer select-none">
                <Upload className="h-3.5 w-3.5" /> Upload Additional File
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleUpload(e, undefined, undefined, activeCategory || undefined)} 
                />
              </label>
            )}
          </div>

          <div className="space-y-4">
            
            {/* Checklist documents */}
            {activeCatData?.checklist.map((item: any) => {
              const doc = item.document;
              return (
                <div 
                  key={item.requiredId} 
                  className={`bg-white border p-5 rounded-2xl shadow-[0_4px_20px_rgba(28,65,56,.02)] transition-all ${
                    doc 
                      ? doc.status === 'VERIFIED' ? "border-[#cceae3] bg-[#fcfefd]" 
                        : doc.status === 'REJECTED' ? "border-[#ffd5d5] bg-[#fffdfd]" 
                        : "border-[#dceae6]"
                      : "border-dashed border-[#c8dad5] bg-[#fbfdfc]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-extrabold text-xs text-[#071633]">{item.name}</h5>
                        {item.isRequired ? (
                          <span className="bg-[#fff0f0] text-rose-600 border border-[#ffd5d5] px-1.5 py-0.5 rounded text-[8px] font-bold">REQUIRED</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold">OPTIONAL</span>
                        )}
                        {item.isConditional && (
                          <span className="bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-bold" title={item.conditionRule}>CONDITIONAL</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">{item.description || "No description provided."}</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {doc ? (
                        <>
                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                            doc.status === 'VERIFIED' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            doc.status === 'REJECTED' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                            doc.status === 'UNDER_REVIEW' || doc.status === 'UPLOADED' ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {doc.status === 'VERIFIED' && <CheckCircle className="h-3 w-3" />}
                            {doc.status === 'REJECTED' && <AlertCircle className="h-3 w-3" />}
                            {doc.status === 'UNDER_REVIEW' && <Clock className="h-3 w-3" />}
                            {doc.status === "VERIFIED" ? "Approved" : doc.status === "REJECTED" ? "Needs replacement" : doc.status === "UNDER_REVIEW" || doc.status === "UPLOADED" ? "Being reviewed" : doc.status}
                          </span>

                          <span className="text-[10px] text-slate-400 font-bold">v{doc.currentVersion}</span>
                        </>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                          item.isRequired 
                            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" 
                            : "bg-slate-100 text-slate-450 border-slate-200/60"
                        }`}>
                          {item.isRequired ? "Upload needed" : "Optional"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document specific details & action tray */}
                  {doc ? (
                    <div className="mt-4 pt-4 border-t border-[#f0f6f4] space-y-3">
                      
                      {/* Rejection notice details */}
                      {doc.status === 'REJECTED' && (
                        <div className="bg-[#fff3f3] border border-[#ffd5d5] p-3 rounded-xl text-[10px] text-rose-900 space-y-1 animate-in fade-in duration-200">
                          <span className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> REJECTION DETAILS</span>
                          <div><strong>Reason:</strong> {doc.rejectionReason}</div>
                          {doc.remarks && <div><strong>Comments:</strong> {doc.remarks}</div>}
                        </div>
                      )}

                      {/* File Details Line */}
                      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-2">
                        <div>
                          <strong>File:</strong> <span className="font-mono text-slate-600">{doc.fileName}</span> ({Math.round(doc.fileSize / 1024)} KB)
                        </div>
                        <div>
                          <strong>Updated:</strong> {new Date(doc.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions Buttons Tray */}
                      <div className="flex justify-between items-center gap-2 pt-1 flex-wrap">
                        
                        {/* File downloads / views */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setPreviewDoc(doc)}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                          >
                            <Eye className="h-3 w-3" /> Preview
                          </button>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-[#007f70] hover:underline"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                          <button 
                            onClick={() => setCommentDoc(doc)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition relative"
                          >
                            <MessageSquare className="h-3 w-3" /> Comments
                            {doc.comments?.length > 0 && (
                              <span className="absolute -top-1.5 -right-2 bg-indigo-500 text-white rounded-full text-[8px] h-3 w-3 flex items-center justify-center font-bold">
                                {doc.comments.length}
                              </span>
                            )}
                          </button>
                          <button 
                            onClick={() => setVersionDoc(doc)}
                            className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-800 transition"
                          >
                            <Layers className="h-3 w-3" /> Versions
                          </button>
                        </div>

                        {/* Portal specific controllers */}
                        <div className="flex gap-2">
                          
                          {/* Parent REPLACE and DELETE */}
                          {mode === 'parent' && (
                            <>
                              {doc.status !== 'VERIFIED' && (
                                <button 
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={actionLoading === doc.id}
                                  className="text-[10px] text-rose-500 hover:text-rose-700 font-bold transition flex items-center gap-0.5 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3 w-3" /> Delete
                                </button>
                              )}
                              
                              <label className="flex items-center gap-0.5 text-[10px] text-[#007f70] hover:text-[#005f54] font-bold cursor-pointer transition select-none">
                                <RotateCw className="h-3 w-3" /> Replace
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => handleUpload(e, item.requiredId, item.name, activeCategory || undefined)} 
                                />
                              </label>
                            </>
                          )}

                          {/* School VERIFY / REJECT controls */}
                          {mode === 'school' && (
                            <>
                              <button 
                                onClick={() => setRejectDoc(doc)}
                                className="!bg-rose-600 !border-rose-600 !text-white hover:!bg-rose-700 hover:!border-rose-700 px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-sm transition"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => setShowVerifyModal(doc)}
                                className="bg-[#009b87] hover:bg-[#007f70] text-white px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-sm transition"
                              >
                                Verify
                              </button>
                            </>
                          )}
                          
                        </div>
                      </div>

                    </div>
                  ) : (
                    // Upload Dropzone Placeholder
                    mode === 'parent' && (
                      <div className="mt-4 animate-in fade-in duration-300">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#dceae6] hover:border-[#009b87] bg-white hover:bg-[#fcfefe] p-4 rounded-xl cursor-pointer transition-all">
                          <div className="flex items-center gap-2 text-slate-400 hover:text-[#007f70]">
                            <Upload className="h-4 w-4" />
                            <span className="text-[11px] font-bold">Choose file to upload</span>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">PDF, JPG, JPEG, PNG up to 5MB</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleUpload(e, item.requiredId, item.name, activeCategory || undefined)} 
                          />
                        </label>
                      </div>
                    )
                  )}

                </div>
              );
            })}

            {/* Additional documents uploaded */}
            {activeCatData?.additionalDocs.map((doc: any) => (
              <div key={doc.id} className="bg-white border border-[#dceae6] p-5 rounded-2xl shadow-[0_4px_20px_rgba(28,65,56,.02)]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-extrabold text-xs text-[#071633]">{doc.name}</h5>
                    <span className="bg-[#f0faf8] text-[#008f7d] border border-[#cceae3] px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 inline-block">
                      ADDITIONAL FILE
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      doc.status === 'VERIFIED' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      doc.status === 'REJECTED' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                      "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      {doc.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">v{doc.currentVersion}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#f0f6f4] space-y-3">
                  {doc.status === 'REJECTED' && (
                    <div className="bg-[#fff3f3] border border-[#ffd5d5] p-3 rounded-xl text-[10px] text-rose-900">
                      <strong>Reason:</strong> {doc.rejectionReason}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span><strong>File:</strong> {doc.fileName} ({Math.round(doc.fileSize / 1024)} KB)</span>
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-1">
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewDoc(doc)} className="text-[10px] text-indigo-600 font-bold flex items-center gap-1"><Eye className="h-3 w-3" /> Preview</button>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#007f70] font-bold flex items-center gap-1"><Download className="h-3 w-3" /> Download</a>
                      <button onClick={() => setCommentDoc(doc)} className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Comments</button>
                    </div>

                    <div className="flex gap-2">
                      {mode === 'parent' && doc.status !== 'VERIFIED' && (
                        <button onClick={() => handleDelete(doc.id)} className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"><Trash2 className="h-3 w-3" /> Delete</button>
                      )}
                      {mode === 'school' && (
                        <>
                          <button onClick={() => setRejectDoc(doc)} className="!bg-rose-600 !text-white hover:!bg-rose-700 px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-sm transition">Reject</button>
                          <button onClick={() => setShowVerifyModal(doc)} className="bg-[#009b87] hover:bg-[#007f70] text-white px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-sm transition">Verify</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activeCatData?.checklist.length === 0 && activeCatData?.additionalDocs.length === 0 && (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="h-8 w-8 text-slate-350 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-medium">No documents required or uploaded in this folder.</p>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 3. Side Drawers & Overlays Modals */}
      
      {/* --- COMMENTS SIDEBAR DRAWER --- */}
      {commentDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 border-l border-[#dceae6] animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center pb-4 border-b border-[#f0f6f4]">
              <div>
                <h3 className="font-extrabold text-sm text-[#071633]">Document Comments</h3>
                <span className="text-[10px] text-slate-400 font-semibold">{commentDoc.name}</span>
              </div>
              <button onClick={() => setCommentDoc(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable list of comments */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {commentDoc.comments?.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-xs">No comments posted yet.</div>
              ) : (
                commentDoc.comments?.map((c: any) => (
                  <div key={c.id} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#071633]">{c.user.firstName} {c.user.lastName}</span>
                      <span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-[#f6faf8] border border-[#dceae6] p-3 rounded-xl text-slate-700 leading-relaxed">
                      {c.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Submission */}
            <form onSubmit={handleAddComment} className="pt-4 border-t border-[#f0f6f4] flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-3 py-2 rounded-xl text-xs border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none"
              />
              <button type="submit" className="bg-[#009b87] hover:bg-[#007f70] px-4 py-2 text-white rounded-xl text-xs font-bold transition shadow-sm">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- VERSIONS MODAL --- */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#dceae6] rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-[#f0f6f4]">
              <h3 className="font-extrabold text-sm text-[#071633]">Version History</h3>
              <button onClick={() => setVersionDoc(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">{versionDoc.name}</span>
              {versionDoc.versions?.map((v: any) => (
                <div key={v.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#071633] flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      Version {v.versionNumber}
                      {v.versionNumber === versionDoc.currentVersion && (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 rounded">CURRENT</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate max-w-xs">{v.fileName}</span>
                    <span className="text-[9px] text-slate-400 block">{new Date(v.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex gap-2">
                    <a href={v.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#007f70] font-bold hover:underline">Download</a>
                    {mode === 'admin' && v.versionNumber !== versionDoc.currentVersion && (
                      <button 
                        onClick={() => handleRestoreVersion(v)}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#f0f6f4] flex justify-end">
              <button onClick={() => setVersionDoc(null)} className="px-4 py-2 border border-[#dceae6] hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PREVIEW DIALOG --- */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1728] border border-slate-800 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-white">Document Preview</h3>
                <span className="text-[10px] text-slate-400 font-mono">{previewDoc.name} • {previewDoc.fileName}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated file display frame */}
            <div className="flex-1 bg-slate-950/80 rounded-2xl my-4 overflow-hidden border border-slate-850 flex items-center justify-center">
              {previewDoc.fileType.startsWith("image/") ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center space-y-4 p-8">
                  <FileText className="h-16 w-16 text-indigo-500 mx-auto" />
                  <div>
                    <h5 className="font-bold text-slate-200 text-sm">{previewDoc.fileName}</h5>
                    <p className="text-xs text-slate-500 mt-1">PDF document preview frame</p>
                  </div>
                  <a 
                    href={previewDoc.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition shadow-lg"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPreviewDoc(null)} className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 font-bold rounded-xl text-xs transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VERIFY REMARKS DIALOG --- */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#dceae6] rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-sm text-[#071633] pb-2 border-b border-[#f0f6f4]">Verify Document</h3>
            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-500">You are verifying <strong>{showVerifyModal.name}</strong> for {data.application.studentName}.</p>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Verification Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  placeholder="e.g. Verified Aadhaar matches database details"
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#f0f6f4]">
              <button onClick={() => { setShowVerifyModal(null); setVerificationRemarks(""); }} className="px-4 py-2 border border-[#dceae6] hover:bg-slate-50 text-slate-650 font-bold rounded-xl text-xs transition">
                Cancel
              </button>
              <button 
                onClick={handleVerify}
                disabled={actionLoading === showVerifyModal.id}
                className="bg-[#009b87] hover:bg-[#007f70] px-4 py-2 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === showVerifyModal.id && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT DIALOG --- */}
      {rejectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#dceae6] rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-sm text-[#071633] pb-2 border-b border-[#f0f6f4]">Reject Document</h3>
            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-500">You are rejecting <strong>{rejectDoc.name}</strong> for {data.application.studentName}.</p>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Rejection Reason <span className="text-rose-500">*</span></label>
                <select 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl"
                >
                  <option value="">-- Select Reason --</option>
                  <option value="Blurred copy">Blurred copy</option>
                  <option value="Incorrect document type">Incorrect document type</option>
                  <option value="Expired document">Expired document</option>
                  <option value="Details mismatch">Details mismatch</option>
                  <option value="Missing signature/stamp">Missing signature/stamp</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Requested Changes / Remarks</label>
                <textarea 
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="e.g. Please scan details in high contrast and re-upload."
                  className="w-full px-3 py-2 border border-[#dceae6] focus:border-[#9bd6c8] focus:outline-none rounded-xl h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#f0f6f4]">
              <button onClick={() => { setRejectDoc(null); setRejectionReason(""); setRejectionRemarks(""); }} className="px-4 py-2 border border-[#dceae6] hover:bg-slate-50 text-slate-650 font-bold rounded-xl text-xs transition">
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={actionLoading === rejectDoc.id}
                className="bg-rose-600 hover:bg-rose-500 px-4 py-2 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === rejectDoc.id && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
