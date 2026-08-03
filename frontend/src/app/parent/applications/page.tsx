"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const mockParentApplications = [
  {
    id: "mock-app-diya",
    studentFirstName: "Diya",
    studentLastName: "Sharma",
    studentDob: "2021-09-20T00:00:00.000Z",
    grade: "Nursery",
    paymentStatus: "PENDING",
    status: "DRAFT",
    createdAt: "2026-07-23T10:00:00.000Z"
  },
  {
    id: "mock-app-aarav",
    studentFirstName: "Aarav",
    studentLastName: "Sharma",
    studentDob: "2018-05-15T00:00:00.000Z",
    grade: "Grade 1",
    paymentStatus: "PAID",
    status: "ASSESSMENT",
    createdAt: "2026-07-23T10:00:00.000Z"
  },
  {
    id: "mock-app-vihaan",
    studentFirstName: "Vihaan",
    studentLastName: "Sharma",
    studentDob: "2016-06-12T00:00:00.000Z",
    grade: "Grade 4",
    paymentStatus: "PAID",
    status: "SUBMITTED",
    createdAt: "2026-07-23T10:00:00.000Z"
  },
  {
    id: "mock-app-meera",
    studentFirstName: "Meera",
    studentLastName: "Sharma",
    studentDob: "2013-11-05T00:00:00.000Z",
    grade: "Grade 7",
    paymentStatus: "PAID",
    status: "SUBMITTED",
    createdAt: "2026-07-23T10:00:00.000Z"
  }
];

export default function ParentApplications() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = localStorage.getItem("schoolId");
    const token = localStorage.getItem("token");
    if (!schoolId || !token) {
      setIsLoading(false);
      setError("Your session is missing. Please sign in again.");
      return;
    }
    const activeSchoolId = schoolId;
    const accessToken = token;

    async function fetchApplications() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:5001/application/parent", {
          headers: {
            "x-tenant-id": activeSchoolId,
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        if (res.status === 401) {
          throw new Error("Your session has expired. Please sign in again.");
        }
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Applications could not be loaded. Please try again.");
        }
        setApplications(await res.json());
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Children's Applications</h1>
          <p className="text-xs text-slate-400 mt-1">Audit status, reviews, payment records and files verification progress.</p>
        </div>
        <Link 
          href="/parent/application/new" 
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg active:scale-95"
        >
          New Application
        </Link>
      </div>

      {error && (
        <div className="bg-rose-955/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Applications list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="p-4">Student</th>
              <th className="p-4">Grade</th>
              <th className="p-4">Registration Fee</th>
              <th className="p-4">Process Status</th>
              <th className="p-4">Assessment</th>
              <th className="p-4">Submission Date</th>
              <th className="p-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {(applications.length > 0 ? applications : mockParentApplications).map((app) => (
              <tr key={app.id} className="hover:bg-slate-800/20">
                <td className="p-4 font-bold text-white">
                  {app.studentFirstName} {app.studentLastName} <br />
                  <span className="text-[10px] text-slate-500 font-normal">DOB: {new Date(app.studentDob).toLocaleDateString()}</span>
                </td>
                <td className="p-4 font-semibold">{app.grade}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    app.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}>{app.paymentStatus}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    app.status === "SUBMITTED" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                    app.status === "DRAFT" ? "bg-slate-100 text-slate-700 border border-slate-200" :
                    app.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                    "bg-indigo-100 text-indigo-800 border border-indigo-200"
                  }`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  {app.assessmentRequired === false ? (
                    <div>
                      <span className="inline-flex rounded-full border border-emerald-700/40 bg-emerald-900/30 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                        Assessment Not Required
                      </span>
                      <p className="mt-1.5 max-w-48 text-[10px] leading-4 text-slate-400">
                        The school has moved this application directly to the next admission stage.
                      </p>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Assessment required</span>
                  )}
                </td>
                <td className="p-4 text-slate-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <Link 
                    href={`/parent/application/${app.id}`}
                    className="text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
