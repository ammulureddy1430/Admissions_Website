"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, Loader2, Search } from "lucide-react";

type Application = {
  id: string;
  studentFirstName: string;
  studentLastName: string;
  grade: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  school: { id: string; name: string };
  parent: { firstName: string; lastName: string; email: string };
};

export default function SuperAdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const response = await fetch("http://localhost:5001/super-admin/applications", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Applications could not be loaded.");
        setApplications(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Applications could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return applications;
    return applications.filter((application) =>
      [
        application.studentFirstName,
        application.studentLastName,
        application.school.name,
        application.parent.firstName,
        application.parent.lastName,
        application.parent.email,
        application.grade,
        application.status,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [applications, query]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#009b87]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#071633]">Applications</h1>
          <p className="mt-1 text-xs text-[#71818d]">Review student applications across every school tenant.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71818d]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search applications"
            className="w-full rounded-xl border border-[#dceae6] bg-white py-2.5 pl-9 pr-3 text-xs text-[#071633] outline-none transition focus:border-[#009b87]"
          />
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#dceae6] bg-white shadow-sm">
        {filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FileText className="h-8 w-8 text-[#9aaba5]" />
            <p className="mt-3 text-sm font-bold text-[#071633]">No applications found</p>
            <p className="mt-1 text-xs text-[#71818d]">Applications submitted to schools will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="border-b border-[#dceae6] bg-[#f4faf7] text-[10px] font-bold uppercase tracking-wider text-[#607080]">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">School</th>
                  <th className="p-4">Parent</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Application</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8f0ed]">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="transition hover:bg-[#f8fbfa]">
                    <td className="p-4 font-bold text-[#071633]">{application.studentFirstName} {application.studentLastName}</td>
                    <td className="p-4 font-semibold text-[#008f7d]">{application.school.name}</td>
                    <td className="p-4 text-[#526474]">
                      {application.parent.firstName} {application.parent.lastName}
                      <span className="mt-0.5 block text-[10px] text-[#8a9994]">{application.parent.email}</span>
                    </td>
                    <td className="p-4 text-[#526474]">{application.grade}</td>
                    <td className="p-4"><StatusBadge value={application.status} /></td>
                    <td className="p-4"><StatusBadge value={application.paymentStatus} /></td>
                    <td className="p-4 text-[#71818d]">{new Date(application.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const positive = ["APPROVED", "PAID", "SUCCESS"].includes(value);
  const negative = ["REJECTED", "FAILED"].includes(value);
  const color = positive
    ? "bg-emerald-50 text-emerald-700"
    : negative
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${color}`}>{value.replaceAll("_", " ")}</span>;
}
