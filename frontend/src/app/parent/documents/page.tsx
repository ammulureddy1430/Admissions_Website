"use client";

import { useEffect, useState } from "react";
import { Loader2, FolderOpen, Layers, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ParentDocumentVaultPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = localStorage.getItem("schoolId");
    const token = localStorage.getItem("token");
    if (!schoolId || !token) {
      router.push("/login");
      return;
    }

    async function fetchApplications() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:5001/application/parent", {
          headers: {
            "x-tenant-id": schoolId || "",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Could not retrieve application list.");
        
        const apps = await res.json();
        
        // Fetch vault progress metrics for each application
        const appsWithMetrics = await Promise.all(apps.map(async (app: any) => {
          try {
            const vaultRes = await fetch(`http://localhost:5001/document/vault/${app.id}`, {
              headers: {
                "x-tenant-id": schoolId || "",
                "Authorization": `Bearer ${token}`,
              }
            });
            if (vaultRes.ok) {
              const vaultData = await vaultRes.json();
              return { ...app, metrics: vaultData.metrics };
            }
          } catch {}
          return { ...app, metrics: null };
        }));

        setApplications(appsWithMetrics);
      } catch (err: any) {
        setError(err.message || "Failed to load page.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#009b87]" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Centralized Document Vault</h1>
        <p className="text-xs text-slate-400 mt-1">
          Single source of truth for verification documents, identity proofs, and academic files.
        </p>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {applications.map((app) => {
          const metrics = app.metrics || { completionPercent: 0, verified: 0, pendingVerification: 0, rejected: 0, total: 0 };
          return (
            <div 
              key={app.id} 
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-white">
                    {app.studentFirstName} {app.studentLastName}
                  </h3>
                  <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wider">
                    {app.grade} • ID: {app.id.substring(0, 8)}
                  </span>
                </div>
                
                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                  app.status === 'SUBMITTED' ? "bg-blue-900/40 text-blue-300 border border-blue-800/30" :
                  app.status === 'APPROVED' ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/30" :
                  "bg-slate-800 text-slate-400"
                }`}>
                  {app.status}
                </span>
              </div>

              {/* Progress metrics */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-350">
                  <span>Vault Completion</span>
                  <span>{metrics.completionPercent}%</span>
                </div>
                <div className="bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${metrics.completionPercent}%` }}
                  />
                </div>
              </div>

              {/* Cards breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <span className="text-emerald-400 font-black block text-sm flex items-center justify-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {metrics.verified}
                  </span>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mt-0.5">Verified</span>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <span className="text-blue-400 font-black block text-sm flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {metrics.pendingVerification}
                  </span>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mt-0.5">Review</span>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <span className="text-rose-450 font-black block text-sm flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {metrics.rejected}
                  </span>
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mt-0.5">Rejected</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/parent/application/${app.id}?tab=documents`}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition"
                >
                  <FolderOpen className="h-4 w-4" /> Manage Document Vault
                </Link>
              </div>
            </div>
          );
        })}

        {applications.length === 0 && (
          <div className="col-span-2 text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <FolderOpen className="h-12 w-12 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white mt-4">No Active Applications</h3>
            <p className="text-xs text-slate-500 mt-1">Please start a new application to open a Document Vault.</p>
            <Link 
              href="/parent/application/new"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-xs font-bold text-white mt-4"
            >
              Apply New Student
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
