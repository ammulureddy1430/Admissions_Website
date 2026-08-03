"use client";

import { useState } from "react";
import { Loader2, Download, FileCheck } from "lucide-react";

export default function AdminReports() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadBlob = (content: BlobPart, filename: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const fetchApplications = async () => {
    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    if (!token || !schoolId) throw new Error("Your session has expired. Please sign in again.");
    const response = await fetch("http://localhost:5001/application", {
      headers: { Authorization: `Bearer ${token}`, "x-tenant-id": schoolId },
    });
    if (!response.ok) throw new Error("Could not load application records for export.");
    return response.json();
  };

  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  const exportCsv = (applications: any[]) => {
    const headers = ["Application ID", "Student Name", "Date of Birth", "Gender", "Grade", "Status", "Payment Status", "Parent Name", "Parent Email", "Parent Phone", "Father Name", "Father Phone", "Mother Name", "Mother Phone", "Documents", "Payment Receipt IDs", "Submitted At"];
    const rows = applications.map((app) => [
      app.id,
      `${app.studentFirstName || ""} ${app.studentLastName || ""}`.trim(),
      app.studentDob ? new Date(app.studentDob).toLocaleDateString("en-IN") : "",
      app.studentGender,
      app.grade,
      app.status,
      app.paymentStatus,
      `${app.parent?.firstName || ""} ${app.parent?.lastName || ""}`.trim(),
      app.parent?.email,
      app.parent?.phone,
      app.fatherName,
      app.fatherPhone,
      app.motherName,
      app.motherPhone,
      app.documents?.length || 0,
      app.payments?.filter((payment: any) => payment.status === "SUCCESS").map((payment: any) => payment.razorpayPaymentId || payment.razorpayOrderId).join("; ") || "",
      app.createdAt ? new Date(app.createdAt).toLocaleString("en-IN") : "",
    ]);
    const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
    downloadBlob(csv, `student-applications-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
  };

  const exportPdf = async (applications: any[]) => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const schoolName = localStorage.getItem("schoolName") || applications[0]?.school?.name || "School";
    const generatedAt = new Date().toLocaleString("en-IN");
    const columns = [
      { title: "Student", width: 46 }, { title: "Grade", width: 25 }, { title: "Parent", width: 44 },
      { title: "Contact", width: 55 }, { title: "Status", width: 31 }, { title: "Payment", width: 28 }, { title: "Submitted", width: 32 },
    ];
    const startX = 14;
    const drawHeader = () => {
      pdf.setTextColor(7, 22, 51); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
      pdf.text(`${schoolName} — Student Applications Report`, startX, 16);
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(96, 112, 128); pdf.setFontSize(8);
      pdf.text(`Generated: ${generatedAt}  |  Total records: ${applications.length}`, startX, 22);
      pdf.setFillColor(0, 143, 125); pdf.rect(startX, 27, 261, 8, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
      let x = startX;
      columns.forEach(column => { pdf.text(column.title, x + 2, 32); x += column.width; });
    };
    drawHeader();
    let y = 35;
    applications.forEach((app: any, index: number) => {
      if (y + 13 > 198) { pdf.addPage(); drawHeader(); y = 35; }
      const values = [
        `${app.studentFirstName || ""} ${app.studentLastName || ""}`.trim(), app.grade || "—",
        `${app.parent?.firstName || ""} ${app.parent?.lastName || ""}`.trim() || "—",
        app.parent?.email || app.parent?.phone || "—", app.status || "—", app.paymentStatus || "PENDING",
        app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "—",
      ];
      pdf.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255);
      pdf.rect(startX, y, 261, 13, "F");
      pdf.setDrawColor(220, 234, 230); pdf.line(startX, y + 13, 275, y + 13);
      pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
      let x = startX;
      values.forEach((value, columnIndex) => {
        const lines = pdf.splitTextToSize(String(value), columns[columnIndex].width - 4).slice(0, 2);
        pdf.text(lines, x + 2, y + 5);
        x += columns[columnIndex].width;
      });
      y += 13;
    });
    if (applications.length === 0) {
      pdf.setTextColor(100, 116, 139); pdf.setFontSize(10); pdf.text("No application records were found.", startX, 46);
    }
    pdf.save(`student-applications-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExport = async (format: "csv" | "pdf", type: string) => {
    setDownloading(`${type}_${format}`);
    setError(null);
    try {
      const applications = await fetchApplications();
      if (format === "csv") exportCsv(applications);
      else await exportPdf(applications);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Reports & Data Exports</h1>
        <p className="text-xs text-slate-400 mt-1">Export student application records in standard CSV or PDF formats.</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-indigo-400" /> Student Applications Records
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Extract list of submitted applications containing process states, family configurations, and payment receipts.
          </p>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-4 pt-2">
            <button 
              disabled={downloading !== null}
              onClick={() => handleExport("csv", "apps")}
              className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              {downloading === "apps_csv" ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4.5 w-4.5 text-indigo-400" />} Export CSV
            </button>
            <button 
              disabled={downloading !== null}
              onClick={() => handleExport("pdf", "apps")}
              className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 py-2.5 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              {downloading === "apps_pdf" ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4.5 w-4.5 text-indigo-400" />} Export PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
