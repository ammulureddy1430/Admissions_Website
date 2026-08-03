"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  X,
} from "lucide-react";

const API = "http://localhost:5001";

export default function AdminDashboard() {
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [userName, setUserName] = useState("Admin");
  const [applications, setApplications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("schoolId");
    if (!id) return;
    setSchoolId(id);
    setSchoolName(localStorage.getItem("schoolName") || "Your school");
    try {
      setUserName(
        JSON.parse(localStorage.getItem("user") || "{}").firstName || "Admin",
      );
    } catch {}
  }, []);

  const authHeaders = () => ({
    "x-tenant-id": localStorage.getItem("schoolId") || "",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const loadDashboard = useCallback(
    async () => {
      if (!schoolId) return;
      try {
        const headers = authHeaders();
        const [applicationsResponse, analyticsResponse] = await Promise.all([
          fetch(`${API}/application`, { headers, cache: "no-store" }),
          fetch(`${API}/analytics/summary`, { headers, cache: "no-store" }),
        ]);
        if (
          ![applicationsResponse, analyticsResponse].every(
            (response) => response.ok,
          )
        )
          throw new Error("Dashboard data could not be loaded.");
        const [applicationData, analyticsData] = await Promise.all([
          applicationsResponse.json(),
          analyticsResponse.json(),
        ]);
        setApplications(applicationData);
        setAnalytics(analyticsData);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    if (!schoolId) return;
    loadDashboard();
    const refreshTimer = window.setInterval(() => loadDashboard(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [schoolId, loadDashboard]);

  const reviewDocument = async (
    documentId: string,
    status: string,
    rejectionReason?: string,
  ) => {
    const response = await fetch(`${API}/document/${documentId}/review`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });
    if (response.ok) {
      const applicationsResponse = await fetch(`${API}/application`, {
        headers: authHeaders(),
      });
      if (applicationsResponse.ok)
        setApplications(await applicationsResponse.json());
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );

  const totals = analytics?.totals || {};
  const pendingDocuments = applications
    .flatMap((application) =>
      (application.studentDocuments || []).map((document: any) => ({
        ...document,
        student: `${application.studentFirstName} ${application.studentLastName}`,
        type: document.fileType,
      })),
    )
    .filter(
      (document) =>
        document.status === "PENDING" || document.status === "UNDER_REVIEW",
    );
  const timeline = analytics?.revenueTimeline || [];
  const maximumRevenue = Math.max(
    ...timeline.map((item: any) => Number(item.revenue) || 0),
    0,
  );
  const approvedApplications = applications.filter(
    (application) => application.status === "APPROVED",
  ).length;
  const upcomingInterviews = applications
    .flatMap((application) =>
      (application.interviews || []).map((interview: any) => ({
        ...interview,
        student: `${application.studentFirstName} ${application.studentLastName}`,
        grade: application.grade,
      })),
    )
    .filter(
      (interview) =>
        interview.status === "SCHEDULED" &&
        new Date(interview.dateTime) >= new Date(),
    )
    .sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );
  const cards = [
    {
      label: "Applications",
      value: totals.applications ?? applications.length,
      note: "Student submissions",
      icon: ClipboardList,
      style: "text-blue-300 bg-blue-500/10 border-blue-500/15",
      tone: "admin-summary-card--applications",
      href: "/admin/applications",
    },
    {
      label: "Pending reviews",
      value: pendingDocuments.length,
      note: "Documents awaiting action",
      icon: FileCheck2,
      style: "text-amber-300 bg-amber-500/10 border-amber-500/15",
      tone: "admin-summary-card--pending",
      href: "/admin/documents",
    },
    {
      label: "Approved",
      value: totals.approved ?? approvedApplications,
      note: "Successful admissions",
      icon: Check,
      style: "admin-approved-icon",
      tone: "admin-summary-card--approved",
      href: "/admin/applications",
    },
    {
      label: "Collected revenue",
      value: `₹${(totals.revenue || 0).toLocaleString()}`,
      note: "Successful payments",
      icon: CircleDollarSign,
      style: "admin-revenue-icon",
      tone: "admin-summary-card--revenue",
      href: "/admin/payments",
    },
  ];

  const Empty = ({ text }: { text: string }) => (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/20 px-4 text-center text-xs text-slate-600">
      {text}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7 animate-in fade-in duration-300">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-800/40 bg-rose-950/20 p-4 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <header className="admin-dashboard-header">
        <div>
          <span>Admissions overview</span>
          <h1>Welcome back, {userName}.</h1>
          <p>Monitor {schoolName}&apos;s applications and daily priorities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/applications" className="admin-dashboard-action">
            <FileText className="h-4 w-4" /> Review applications
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              aria-label={`Open ${card.label}`}
              className={`admin-summary-card ${card.tone} group relative block overflow-hidden rounded-2xl border p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">
                    {card.value}
                  </p>
                </div>
                <span className={`rounded-xl border p-2.5 ${card.style}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 flex items-center justify-between text-[10px] text-slate-600">
                <span>{card.note}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Link
          href="/admin/applications"
          className="admin-dashboard-panel admin-dashboard-panel--applications group block rounded-2xl border p-6 transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white">
                Application status
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Current admission workflow stages
              </p>
            </div>
            <span className="rounded-xl bg-cyan-500/10 p-2.5">
              <ClipboardList className="h-5 w-5 text-cyan-400" />
            </span>
          </div>
          <div className="mt-6 space-y-5">
            {(analytics?.applicationsByStatus || []).length ? (
              analytics.applicationsByStatus.map((item: any) => {
                const percent = Math.round(
                  (item.count /
                    Math.max(totals.applications || applications.length, 1)) *
                    100,
                );
                return (
                  <div key={item.status}>
                    <div className="mb-2 flex justify-between text-[11px]">
                      <span className="font-bold text-slate-300">
                        {item.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-slate-500">
                        {item.count} · {percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-950">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-500 transition-all duration-700"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty text="Application status data will appear after the first submission." />
            )}
          </div>
          <span className="mt-6 flex items-center justify-end gap-1 text-[10px] font-bold text-cyan-600 transition group-hover:text-cyan-800">
            Explore applications{" "}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/admin/interviews"
          className="admin-dashboard-panel admin-dashboard-panel--interviews group block rounded-2xl border p-6 transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white">
                Upcoming interviews
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Next scheduled admission conversations
              </p>
            </div>
            <span className="rounded-xl bg-blue-500/10 p-2.5">
              <CalendarDays className="h-5 w-5 text-blue-400" />
            </span>
          </div>
          <div className="mt-6 space-y-3">
            {upcomingInterviews.length ? (
              upcomingInterviews.slice(0, 3).map((interview: any) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/25 p-3"
                >
                  <div>
                    <p className="text-xs font-bold text-white">
                      {interview.student}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {interview.grade} ·{" "}
                      {new Date(interview.dateTime).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" },
                      )}
                    </p>
                  </div>
                  <span className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-[9px] font-extrabold text-blue-400">
                    {new Date(interview.dateTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <Empty text="No upcoming interviews. Schedule the next candidate conversation." />
            )}
          </div>
          <span className="mt-6 flex items-center justify-end gap-1 text-[10px] font-bold text-blue-600 transition group-hover:text-blue-800">
            Manage interviews{" "}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/admin/payments"
          className="admin-dashboard-panel admin-dashboard-panel--revenue group block rounded-2xl border p-6 transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white">
                Revenue trend
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Successful collections · last 6 months
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="admin-revenue-live flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-extrabold"><span className="h-1.5 w-1.5 animate-pulse rounded-full" />Live</span>
              <span className="admin-revenue-card-icon rounded-xl p-2">
                <CircleDollarSign className="h-4 w-4" />
              </span>
            </div>
          </div>
          {maximumRevenue === 0 ? (
            <div className="mt-6">
              <Empty text="Revenue activity will appear after the first successful payment." />
            </div>
          ) : (() => {
            const svgWidth = 500;
            const svgHeight = 150;
            const paddingLeft = 32;
            const paddingRight = 32;
            const paddingTop = 20;
            const paddingBottom = 20;

            const chartWidth = svgWidth - paddingLeft - paddingRight;
            const chartHeight = svgHeight - paddingTop - paddingBottom;

            const points = timeline.map((item: any, index: number) => {
              const revenue = Number(item.revenue) || 0;
              const x = paddingLeft + (index / Math.max(timeline.length - 1, 1)) * chartWidth;
              const y = maximumRevenue === 0 
                ? svgHeight - paddingBottom 
                : svgHeight - paddingBottom - (revenue / maximumRevenue) * chartHeight;
              return { x, y, month: item.month, revenue };
            });

            let pathD = "";
            let areaD = "";
            if (points.length > 0) {
              pathD = `M ${points[0].x} ${points[0].y}`;
              for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const cp1x = p0.x + (p1.x - p0.x) / 3;
                const cp1y = p0.y;
                const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
                const cp2y = p1.y;
                pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
              }
              areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;
            }

            return (
              <div className="relative mt-6">
                {/* Tooltip */}
                {hoveredIndex !== null && points[hoveredIndex] && (
                  <div
                    style={{
                      left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
                      top: `${(points[hoveredIndex].y / svgHeight) * 100 - 10}%`,
                    }}
                    className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#071633] px-3 py-1.5 text-[10px] font-extrabold text-white shadow-xl transition-all duration-200"
                  >
                    <div className="flex flex-col items-center">
                      <span className="keep-white text-white">{points[hoveredIndex].month}</span>
                      <span className="keep-white text-emerald-400 mt-0.5">₹{points[hoveredIndex].revenue.toLocaleString()}</span>
                    </div>
                    <div className="absolute left-1/2 top-full h-1.5 w-1.5 -translate-x-1/2 -translate-y-[3px] rotate-45 bg-[#071633]" />
                  </div>
                )}

                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto overflow-visible"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0.25, 0.5, 0.75].map((ratio, idx) => {
                    const y = paddingTop + ratio * chartHeight;
                    return (
                      <line
                        key={idx}
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Baseline */}
                  <line
                    x1={paddingLeft}
                    y1={svgHeight - paddingBottom}
                    x2={svgWidth - paddingRight}
                    y2={svgHeight - paddingBottom}
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                  />

                  {/* Area Path */}
                  {areaD && (
                    <path
                      d={areaD}
                      fill="url(#areaGradient)"
                    />
                  )}

                  {/* Line Path */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Hover indicator line */}
                  {hoveredIndex !== null && points[hoveredIndex] && (
                    <line
                      x1={points[hoveredIndex].x}
                      y1={paddingTop}
                      x2={points[hoveredIndex].x}
                      y2={svgHeight - paddingBottom}
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Data Points */}
                  {points.map((pt: any, idx: number) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 4}
                          fill={isHovered ? "#10b981" : "#ffffff"}
                          stroke="#10b981"
                          strokeWidth={isHovered ? 2 : 2.5}
                          className="transition-all duration-200 cursor-pointer"
                        />
                        {isHovered && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="12"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            strokeOpacity="0.4"
                            className="animate-ping"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Month Labels */}
                  {points.map((pt: any, idx: number) => (
                    <text
                      key={idx}
                      x={pt.x}
                      y={svgHeight}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-400 select-none"
                    >
                      {pt.month}
                    </text>
                  ))}
                </svg>

                {/* Interactive hover zones */}
                <div 
                  className="absolute inset-0 flex" 
                  style={{ 
                    paddingLeft: `${(paddingLeft / svgWidth) * 100}%`, 
                    paddingRight: `${(paddingRight / svgWidth) * 100}%`, 
                    bottom: `${(paddingBottom / svgHeight) * 100}%`, 
                    top: `${(paddingTop / svgHeight) * 100}%` 
                  }}
                >
                  {points.map((pt: any, idx: number) => (
                    <div
                      key={idx}
                      className="h-full flex-1 cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
          <span className="mt-5 flex items-center justify-between gap-2 border-t border-[#e3eeea] pt-4 text-[10px] font-bold text-[#047857] transition group-hover:text-[#065f46]">
            <span>Total collected: ₹{Number(totals.revenue || 0).toLocaleString()}</span><span className="flex items-center gap-1">View payment history
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </span>
          </span>
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="admin-dashboard-panel admin-dashboard-panel--recent rounded-2xl border p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white">
                Recent applications
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Latest student submissions
              </p>
            </div>
            <Link
              href="/admin/applications"
              className="flex items-center gap-1 text-[10px] font-bold text-cyan-300"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {applications.length ? (
            <div className="space-y-2">
              {applications.slice(0, 4).map((application) => (
                <Link
                  key={application.id}
                  href={`/admin/application/${application.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/25 p-3 transition hover:border-cyan-900/70 hover:bg-slate-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div>
                    <p className="text-xs font-bold text-white">
                      {application.studentFirstName}{" "}
                      {application.studentLastName}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {application.grade} ·{" "}
                      {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[9px] font-bold text-cyan-300">
                    {application.status.replaceAll("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="Submitted applications will appear here." />
          )}
        </article>

        <article className="admin-dashboard-panel admin-dashboard-panel--documents rounded-2xl border p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-white">
                  Documents awaiting review
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  {pendingDocuments.length} file
                  {pendingDocuments.length === 1 ? "" : "s"} need attention
                </p>
              </div>
            </div>
            <Link
              href="/admin/documents"
              className="flex items-center gap-1 text-[10px] font-bold text-amber-500 transition hover:text-amber-700"
            >
              Open vault <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingDocuments.length ? (
            <div className="space-y-2">
              {pendingDocuments.slice(0, 4).map((document) => (
                <div
                  key={document.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/25 p-3 transition hover:border-amber-500/30 hover:bg-amber-500/[.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold text-white">
                          {document.name}
                        </p>
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-amber-500">
                          Pending
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        {document.student} · {document.type}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Link
                      href="/admin/documents"
                      className="hidden items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-2 text-[9px] font-bold text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-400 sm:flex"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Link>
                    <button
                      title="Approve document"
                      aria-label={`Approve ${document.name}`}
                      onClick={() => reviewDocument(document.id, "APPROVED")}
                      className="admin-review-approve rounded-lg p-2 transition hover:scale-105"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Reject document"
                      aria-label={`Reject ${document.name}`}
                      onClick={() =>
                        reviewDocument(
                          document.id,
                          "REJECTED",
                          "Document not readable.",
                        )
                      }
                      className="admin-review-reject rounded-lg p-2 transition hover:scale-105"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No documents are waiting for review." />
          )}
        </article>
      </section>
    </div>
  );
}
