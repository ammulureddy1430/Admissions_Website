"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  KeyRound,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

type RosterRow = {
  id: string;
  studentId: string;
  studentName: string;
  applicationId: string;
  admissionNumber: string;
  grade: string;
  section: string;
  assessmentId: string;
  assessmentName: string;
  assessmentDate: string;
  assessmentMode: "HOME" | "SCHOOL" | "BOTH";
  venueChoice: "HOME" | "SCHOOL" | null;
  venueChoiceDeadline: string;
  requiresAccessCode: boolean;
  assessmentTime: string;
  slotId: string;
  slotName: string;
  campus: string;
  building: string;
  roomNumber: string;
  seatNumber: string;
  accessCode: string;
  parentName: string;
  parentMobileNumber: string;
  emergencyContact: string;
  attendanceStatus: string;
  assessmentStatus: string;
  invigilatorRemarks: string;
};

type FilterOptions = {
  assessments: Array<{ id: string; name: string }>;
  grades: string[];
  sections: string[];
  slots: Array<{ id: string; name: string; time: string }>;
};

type RosterSummary = {
  schoolName: string;
  schoolLogo: string | null;
  assessmentName: string;
  assessmentDate: string;
  totalStudents: number;
  totalSlots: number;
  generatedBy: string;
  generatedOn: string;
};

const EMPTY_OPTIONS: FilterOptions = {
  assessments: [],
  grades: [],
  sections: [],
  slots: [],
};

const SORT_OPTIONS = [
  ["studentName", "Student Name"],
  ["applicationId", "Application ID"],
  ["assessmentTime", "Assessment Time"],
  ["slot", "Slot"],
  ["roomNumber", "Room Number"],
  ["section", "Section"],
  ["grade", "Grade"],
] as const;

function formatDate(value: string) {
  if (!value || value === "All Dates") return value || "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function AdminStudents() {
  const router = useRouter();
  const [schoolId] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("schoolId") || "",
  );
  const [token] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("token") || "",
  );
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [summary, setSummary] = useState<RosterSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentDate, setAssessmentDate] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [slotId, setSlotId] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("studentName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !token) {
      router.push("/login");
    }
  }, [router, schoolId, token]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (assessmentDate) params.set("assessmentDate", assessmentDate);
    if (assessmentId) params.set("assessmentId", assessmentId);
    if (grade) params.set("grade", grade);
    if (section) params.set("section", section);
    if (slotId) params.set("slotId", slotId);
    if (assessmentStatus) params.set("assessmentStatus", assessmentStatus);
    if (search.trim()) params.set("search", search.trim());
    params.set("sortBy", sortBy);
    params.set("sortDirection", sortDirection);
    return params.toString();
  }, [
    assessmentDate,
    assessmentId,
    grade,
    section,
    slotId,
    assessmentStatus,
    search,
    sortBy,
    sortDirection,
  ]);

  const hasActiveFilters = Boolean(
    assessmentDate ||
      assessmentId ||
      grade ||
      section ||
      slotId ||
      assessmentStatus ||
      search.trim(),
  );

  const fetchRoster = useCallback(async () => {
    if (!schoolId || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/application/student-roster?${queryString}`,
        {
          headers: {
            "x-tenant-id": schoolId,
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Could not load the student roster.");
      }
      setRows(payload.rows);
      setOptions(payload.options);
      setSummary(payload.summary);
      setCodeDrafts((current) => ({
        ...current,
        ...Object.fromEntries(
          payload.rows.map((row: RosterRow) => [
            row.studentId,
            row.accessCode || "",
          ]),
        ),
      }));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load the student roster.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [queryString, schoolId, token]);

  useEffect(() => {
    const timer = window.setTimeout(fetchRoster, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchRoster, search]);

  const resetFilters = () => {
    setAssessmentDate("");
    setAssessmentId("");
    setGrade("");
    setSection("");
    setSlotId("");
    setAssessmentStatus("");
    setSearch("");
    setSortBy("studentName");
    setSortDirection("asc");
  };

  const updateAccessCode = async (studentId: string, generate = false) => {
    const customCode = codeDrafts[studentId]?.trim() || "";
    if (!generate && !/^[A-Z0-9-]{6,20}$/.test(customCode)) {
      setError("Access codes must contain 6–20 letters, numbers, or hyphens.");
      return;
    }
    setUpdatingId(studentId);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/application/${studentId}/access-code`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": schoolId,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(generate ? {} : { accessCode: customCode }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not save the code.");
      setCodeDrafts((current) => ({ ...current, [studentId]: payload.accessCode }));
      setRows((current) =>
        current.map((row) =>
          row.studentId === studentId
            ? { ...row, accessCode: payload.accessCode }
            : row,
        ),
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the code.");
    } finally {
      setUpdatingId(null);
    }
  };

  const copyAccessCode = async (studentId: string) => {
    const code = codeDrafts[studentId];
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopiedId(studentId);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const printRoster = () => {
    if (!summary) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Allow pop-ups to print the roster.");
      return;
    }
    const bodyRows = rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td><td>${escapeHtml(row.studentName)}</td>
            <td>${escapeHtml(row.applicationId)}</td><td>${escapeHtml(row.admissionNumber || "—")}</td>
            <td>${escapeHtml(row.grade)}</td>
            <td>${escapeHtml(row.section)}</td><td>${escapeHtml(row.slotName)}<br>${escapeHtml(row.assessmentTime)}</td>
            <td>${escapeHtml(row.campus)}<br>${escapeHtml(row.building)}</td>
            <td>${escapeHtml(row.roomNumber)}</td><td>${escapeHtml(row.seatNumber)}</td>
            <td>${escapeHtml(row.parentName)}</td><td>${escapeHtml(row.parentMobileNumber)}</td>
            <td>${escapeHtml(row.emergencyContact)}</td>
            <td class="code">${escapeHtml(row.accessCode)}</td>
            <td>${escapeHtml(row.assessmentStatus)}</td><td></td><td></td><td></td><td></td>
          </tr>`,
      )
      .join("");
    printWindow.document.write(`<!doctype html><html><head><title>Assessment Roster</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); } }
        * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #102a36; margin: 0; font-size: 9px; }
        header { display:flex; align-items:center; gap:14px; border-bottom:2px solid #008f80; padding-bottom:10px; margin-bottom:10px; }
        .logo { width:48px; height:48px; object-fit:contain; } h1 { margin:0; font-size:18px; color:#075e54; }
        .subtitle { margin-top:3px; color:#526a77; } .summary { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; margin:10px 0; }
        .summary div { border:1px solid #d8e6e3; border-radius:5px; padding:6px; } .summary span { display:block; color:#71818d; font-size:7px; text-transform:uppercase; margin-bottom:2px; }
        table { width:100%; border-collapse:collapse; table-layout:fixed; } thead { display:table-header-group; }
        th { background:#075e54; color:white; font-size:6.5px; line-height:1.2; padding:5px 2px; } td { border:1px solid #b9cbc7; padding:5px 2px; font-size:7px; line-height:1.25; word-break:break-word; vertical-align:top; }
        tr { break-inside:avoid; } .code { font-family:monospace; font-weight:bold; } footer { margin-top:8px; color:#71818d; }
      </style></head><body>
      <header>${summary.schoolLogo ? `<img class="logo" src="${escapeHtml(summary.schoolLogo)}" alt="">` : ""}
        <div><h1>${escapeHtml(summary.schoolName)}</h1><div class="subtitle">At-School Assessment Student Roster</div></div>
      </header>
      <section class="summary">
        <div><span>Assessment</span>${escapeHtml(summary.assessmentName)}</div>
        <div><span>Assessment Date</span>${escapeHtml(formatDate(summary.assessmentDate))}</div>
        <div><span>Grade</span>${escapeHtml(grade || "All Grades")}</div>
        <div><span>Section</span>${escapeHtml(section || "All Sections")}</div>
        <div><span>Total Students / Slots</span>${rows.length} / ${summary.totalSlots}</div>
        <div><span>Generated By</span>${escapeHtml(summary.generatedBy)}</div>
      </section>
      <table><thead><tr><th>S.No</th><th>Student Name</th><th>Application ID</th><th>Admission Number</th><th>Grade</th><th>Section</th><th>Selected Slot</th><th>Campus / Building</th><th>Room</th><th>Seat</th><th>Parent / Guardian</th><th>Parent Mobile</th><th>Emergency Contact</th><th>Access Code</th><th>Assessment Status</th><th>Attendance</th><th>Invigilator Signature</th><th>Student Signature</th><th>Remarks</th></tr></thead>
      <tbody>${bodyRows}</tbody></table>
      <footer>Generated on ${escapeHtml(new Date(summary.generatedOn).toLocaleString())}</footer>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#071633]">
            Student Management
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={printRoster}
            disabled={!rows.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cddfdb] bg-white px-4 text-xs font-extrabold text-[#294257] transition hover:border-[#80c9be] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer className="h-4 w-4" /> Print List
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#d8e6e3] bg-white shadow-[0_10px_30px_rgba(25,69,61,0.06)]">
        <div className="grid gap-x-4 gap-y-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-[10px] font-bold text-slate-500">
            Assessment Date
            <input
              type="date"
              value={assessmentDate}
              onChange={(event) => setAssessmentDate(event.target.value)}
              className="block h-10 w-full rounded-lg border border-[#cfdfdc] bg-white px-3 text-xs font-semibold text-[#294257] outline-none focus:border-[#008f80]"
            />
          </label>
          <FilterSelect label="Assessment Template" value={assessmentId} onChange={setAssessmentId}>
            <option value="">All Assessments</option>
            {options.assessments.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Grade" value={grade} onChange={setGrade}>
            <option value="">All Grades</option>
            {options.grades.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Section" value={section} onChange={setSection}>
            <option value="">All Sections</option>
            {options.sections.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Slot" value={slotId} onChange={setSlotId}>
            <option value="">All Slots</option>
            {options.slots.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.time}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Assessment Status" value={assessmentStatus} onChange={setAssessmentStatus}>
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PUBLISHED">Published</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="EVALUATED">Evaluated</option>
          </FilterSelect>
          <label className="space-y-1 text-[10px] font-bold text-slate-500 xl:col-span-2">
            Search Student
            <span className="relative block">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, ID, code…"
                className="h-10 w-full rounded-lg border border-[#cfdfdc] bg-white pl-9 pr-3 text-xs font-semibold text-[#294257] outline-none focus:border-[#008f80]"
              />
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-[#e7efed] bg-[#fbfdfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-semibold text-[#6d817d]">
            Showing <span className="font-extrabold text-[#173349]">{rows.length}</span>{" "}
            {rows.length === 1 ? "assignment" : "assignments"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="mr-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-[10px] font-extrabold text-[#087466] transition hover:border-[#bcd8d2] hover:bg-[#eef7f5] disabled:cursor-not-allowed disabled:text-[#a4b2af] disabled:hover:border-transparent disabled:hover:bg-transparent"
            >
              <X className="h-3.5 w-3.5" /> Reset Filters
            </button>
            <span className="text-[10px] font-bold text-slate-500">Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-9 rounded-lg border border-[#cfdfdc] bg-white px-3 text-[10px] font-bold text-[#294257] outline-none focus:border-[#008f80]">
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")} className="h-9 rounded-lg border border-[#cfdfdc] bg-white px-3 text-[10px] font-extrabold text-[#294257] transition hover:border-[#82c4b9] hover:bg-[#f4faf8]">
              {sortDirection === "asc" ? "A → Z" : "Z → A"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl !border !border-[#fecdd3] !bg-[#fff1f2] px-4 py-3 !text-[#881337] shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 !text-[#e11d48]" />
          <p className="text-xs font-bold leading-5 !text-[#881337]">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#008f80]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cddfda] bg-white/70 px-6 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-[#7a918d]" />
          <h2 className="mt-3 text-sm font-extrabold text-[#173349]">No scheduled students found</h2>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
            No student matches the selected assessment filters.
          </p>
        </div>
      ) : rows.length > 0 ? (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-[#dceae6] bg-white p-5 shadow-[0_10px_30px_rgba(28,65,56,.06)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-extrabold text-[#071633]">{row.studentName}</h3>
                  <p className="mt-1 truncate font-mono text-[10px] font-bold text-indigo-600">
                    APP: {row.applicationId} {row.admissionNumber ? `· ADM: ${row.admissionNumber}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold text-emerald-700">
                  {row.assessmentStatus}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-[#dce8e5] bg-[#f7faf9] p-3.5">
                <p className="text-xs font-extrabold text-[#087466]">{row.assessmentName}</p>
                <div className="mt-2 grid gap-2 text-[10px] text-[#526a77] sm:grid-cols-3">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(row.assessmentDate)}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {row.assessmentTime
                      ? `${row.slotName} · ${row.assessmentTime}`
                      : `${row.assessmentMode} assessment`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {row.roomNumber
                      ? `${row.campus}, ${row.building} · Room ${row.roomNumber}`
                      : row.assessmentMode === "HOME"
                        ? "Home assessment"
                        : row.assessmentMode === "BOTH"
                          ? row.venueChoice === "HOME"
                            ? "At-home assessment selected"
                            : row.venueChoice === "SCHOOL"
                              ? "At-school assessment selected"
                              : "Venue choice pending"
                          : "Location not assigned"}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-[10px] sm:grid-cols-4">
                <CardDetail label="Grade" value={row.grade} />
                <CardDetail label="Section" value={row.section || "—"} />
                <CardDetail label="Attendance" value={row.attendanceStatus} />
                <CardDetail label="Parent Contact" value={row.parentMobileNumber || "—"} />
              </div>

              {row.assessmentMode === "BOTH" && (
                <div className={`mt-4 rounded-xl border px-3 py-2.5 ${
                  row.venueChoice === "SCHOOL"
                    ? "!border-[#a7f3d0] !bg-[#ecfdf5]"
                    : row.venueChoice === "HOME"
                      ? "!border-[#bae6fd] !bg-[#f0f9ff]"
                      : "!border-[#f5d48a] !bg-[#fff8e7]"
                }`}>
                  <p className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    row.venueChoice === "SCHOOL"
                      ? "!text-[#065f46]"
                      : row.venueChoice === "HOME"
                        ? "!text-[#075985]"
                        : "!text-[#713f12]"
                  }`}>
                    {row.venueChoice === "SCHOOL"
                      ? "Student selected: At School"
                      : row.venueChoice === "HOME"
                        ? "Student selected: At Home — no access code required"
                        : "Waiting for assessment venue selection"}
                  </p>
                  {row.venueChoiceDeadline && (
                    <p className={`mt-1 text-[9px] font-semibold ${
                      row.venueChoice === "SCHOOL"
                        ? "!text-[#047857]"
                        : row.venueChoice === "HOME"
                          ? "!text-[#0369a1]"
                          : "!text-[#92400e]"
                    }`}>
                      Selection deadline: {formatDate(row.venueChoiceDeadline)}
                    </p>
                  )}
                </div>
              )}

              {row.requiresAccessCode && (
              <div className="mt-4 border-t border-[#e5eeeb] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#526a77]">
                    <KeyRound className="h-3.5 w-3.5 text-[#008f80]" /> Assessment Access Code
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={codeDrafts[row.studentId] || ""}
                    onChange={(event) => setCodeDrafts((current) => ({ ...current, [row.studentId]: event.target.value.toUpperCase() }))}
                    maxLength={20}
                    placeholder="Generate or enter code"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[#cfdfdc] bg-white px-3 font-mono text-[11px] font-bold tracking-wider text-[#173349] outline-none focus:border-[#008f80]"
                  />
                  <IconButton label="Save code" onClick={() => updateAccessCode(row.studentId)} disabled={updatingId === row.studentId || !codeDrafts[row.studentId]}>
                    {updatingId === row.studentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </IconButton>
                  <IconButton label="Generate code" onClick={() => updateAccessCode(row.studentId, true)} disabled={updatingId === row.studentId}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton label="Copy code" onClick={() => copyAccessCode(row.studentId)} disabled={!codeDrafts[row.studentId]}>
                    {copiedId === row.studentId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </IconButton>
                </div>
              </div>
              )}
            </article>
          ))}
        </div>
      ) : null}

    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-[10px] font-bold text-slate-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="block h-10 w-full rounded-lg border border-[#cfdfdc] bg-white px-2.5 text-xs font-semibold text-[#294257] outline-none focus:border-[#008f80]">
        {children}
      </select>
    </label>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-bold text-[#294257]" title={value}>{value}</p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cfdfdc] bg-white text-[#617686] transition hover:border-[#80c9be] hover:text-[#008f80] disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}
