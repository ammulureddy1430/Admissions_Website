"use client";

import { useEffect, useState } from "react";
import fixWebmDuration from "fix-webm-duration";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import {
  ClipboardList, 
  Plus, 
  Sparkles, 
  CheckCircle, 
  Calendar, 
  ArrowLeft, 
  ArrowRight,
  AlertTriangle,
  BookOpen, 
  Users, 
  Check, 
  Loader2,
  Trash2,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  RotateCcw,
  ShieldCheck,
  FileText,
  Headphones,
  Mic2,
  Mic,
  Camera,
  ChevronDown,
  ChevronUp,
  Sliders,
  Mail,
  MessageCircle,
  Download
} from "lucide-react";

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  Nursery: ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  LKG: ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  UKG: ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  "Grade 1": ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  "Grade 2": ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  "Grade 3": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "EVS", "General Knowledge"],
  "Grade 4": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "EVS", "General Knowledge"],
  "Grade 5": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "EVS", "General Knowledge"],
  "Grade 6": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 7": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 8": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 9": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 10": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
};

const formatMarks = (value: unknown) => Math.round(Number(value) || 0);
const formatMillisecondsAsMinutes = (value: unknown) => {
  const totalSeconds = Math.max(0, Math.round((Number(value) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds} sec`;
};
const describeGamePlay = (game: { componentName?: string; name?: string; ageGroup?: string } | null | undefined) => ({
  FOLLOW_THE_LIGHTS: "The student watches an expanding sequence of lights and repeats it in the same order. Each round measures how accurately and quickly the sequence is recalled.",
  BALL_STACK: "The student drops and aligns balls to build a stable tower. The game records placement precision, reaction time, successful placements, and tower stability.",
  SOUND_DETECTIVE: "The student listens to sounds and selects the matching object or animal. The game records correct responses, mistakes, listening accuracy, and response time.",
  COLOR_PATH: "The student observes color cues and chooses the matching path. Each selection records visual recognition, observation accuracy, mistakes, and response time.",
  MAGIC_PAINT: "The student paints interactive objects using different colors. The activity records completed objects, color exploration, interaction consistency, and cause-and-effect completion.",
  TRAIN_TRACK_BUILDER: "The student rotates and connects track pieces to create a successful train route. The game records completed tracks, logical accuracy, rotations, and completion time.",
  PACKAGE_SORTER: "The student sorts moving packages into the correct destinations. The game records correct and incorrect deliveries, organization, decision-making, and decision time.",
  RESCUE_MISSION: "The student chooses tools and actions to complete friendly rescue scenarios. The game records successful rescues, problem-solving choices, strategy changes, and solution time.",
  PARKING_ESCAPE: "The student moves vehicles to clear a path for the target car. The game records levels completed, efficient and unnecessary moves, planning, spatial reasoning, and completion time.",
  WATER_PIPELINE: "The student rotates pipe pieces to connect a complete water route. The game records successful connections, failed connections, rotations, logical reasoning, and solution time.",
  MAGIC_TRAIN: "The student builds a train by recognizing and continuing visual patterns. The game records sequence completion, pattern accuracy, and progression.",
  ROOM_DESIGNER: "The student studies a room and places furniture to recreate it. The game records visual-memory accuracy, placement choices, and planning performance.",
} as Record<string, string>)[game?.componentName || ""] || `The student completes the interactive ${game?.name || "game"} tasks designed for ${game?.ageGroup || "the assigned age group"}. The game records submitted progress and performance metrics as the student plays.`;
const formatGameMetricLabel = (key: string) => ({
  colorsUsed: "Colors explored",
  interactionsPerObject: "Interactions by object",
  averageCompletionTime: "Average object time",
  interactionConsistency: "Interaction consistency",
  causeEffectScore: "Cause-and-effect score",
  objectsCompleted: "Objects completed",
} as Record<string, string>)[key] || key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
const formatGameMetricValue = (key: string, value: unknown) => {
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (Array.isArray(value)) {
    if (!value.length) return "Not available";
    if (key === "interactionsPerObject") return value.map((item) => `${Number(item) || 0}`).join(" · ");
    return value.map((item) => String(item).replaceAll("_", " ")).join(", ");
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not available";
  const number = Number(value || 0);
  if (/time/i.test(key)) return `${number >= 100 ? (number / 1000).toFixed(2) : number.toFixed(1)}s`;
  if (/score|percentage|accuracy|alignment|consistency|attention|memory|potential|stability|efficiency/i.test(key)) return `${Math.round(number * 10) / 10}%`;
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
};
const formatSavedResponse = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).replaceAll("_", " ");
  if (Array.isArray(value)) return value.length ? value.map(formatSavedResponse).join(" → ") : "Not available";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const response = record.response && typeof record.response === "object" ? record.response as Record<string, unknown> : record;
    const parts = Object.entries(response)
      .filter(([key, item]) => item !== null && item !== undefined && !/url|image|audio/i.test(key))
      .map(([key, item]) => `${formatGameMetricLabel(key)}: ${formatSavedResponse(item)}`);
    return parts.length ? parts.join(" · ") : "Not available";
  }
  return "Not available";
};
const findSavedMedia = (value: unknown, kind: "image" | "audio"): string | null => {
  if (!value || typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string" && new RegExp(kind, "i").test(key) && /url|src/i.test(key)) return item;
    const nested = findSavedMedia(item, kind);
    if (nested) return nested;
  }
  return null;
};
const paintColorName = (color: string) => ({
  "#ff4f64": "Red",
  "#19c37d": "Green",
  "#3b82f6": "Blue",
  "#ffd229": "Yellow",
  "#9b5de5": "Purple",
  "#ff8a34": "Orange",
  "#16c1c8": "Teal",
} as Record<string, string>)[color.toLowerCase()] || "Saved color";
const displaySlot = (slot: { slotName?: string; startTime?: string; endTime?: string }) => {
  const name = slot.slotName || "";
  if (/mid[- ]morning/i.test(name)) {
    return { ...slot, slotName: "Afternoon Slot 1", startTime: "01:00 PM", endTime: "01:30 PM" };
  }
  if (/late[- ]morning|late afternoon/i.test(name)) {
    return { ...slot, slotName: "Afternoon Slot 2", startTime: "02:00 PM", endTime: "02:30 PM" };
  }
  return slot;
};

const GamePerformanceChart = ({ games, onSelect }: { games: Array<{ id: string; score: number; accuracy?: number | null; game?: { name?: string } }>; onSelect: (id: string) => void }) => {
  const width = 860;
  const height = 350;
  const left = 58;
  const top = 34;
  const bottom = 82;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - 20;
  const slot = plotWidth / Math.max(1, games.length);
  const hasMeasuredScore = games.some((game) => Number(game.score) > 0);
  const bestScore = Math.max(...games.map((game) => Number(game.score || 0)));
  const colors = ["#0b927e", "#4f73c8", "#9b62c7", "#e48b32", "#df5f73", "#3b9bb8", "#759442"];
  const points = games.map((game, index) => { const score = Math.max(0, Math.min(100, Number(game.score || 0))); return { x: left + index * slot + slot / 2, y: top + plotHeight - score / 100 * plotHeight, score }; });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${points[0]?.x || left},${top + plotHeight} ${linePoints} ${points[points.length - 1]?.x || width - 20},${top + plotHeight}`;
  return <div className="overflow-x-auto rounded-2xl border border-[#d7e7e3] bg-[linear-gradient(180deg,#ffffff_0%,#fbfefd_100%)] p-4 shadow-[0_8px_28px_rgba(19,84,72,0.06)]">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Student score by completed game" className="min-w-[680px] w-full">
      <title>Student score by completed game</title>
      <defs><linearGradient id="game-line-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f73c8" stopOpacity=".24" /><stop offset="100%" stopColor="#4f73c8" stopOpacity=".02" /></linearGradient></defs>
      <rect x={left} y={top} width={plotWidth} height={plotHeight} rx="16" fill="#fbfefd" />
      {[0, 25, 50, 75, 100].map((tick) => { const y = top + plotHeight - tick / 100 * plotHeight; return <g key={tick}><line x1={left} x2={width - 20} y1={y} y2={y} stroke={tick === 0 ? "#bfcfcb" : "#dce8e5"} strokeWidth={tick === 0 ? 1.4 : 1} strokeDasharray={tick === 0 ? undefined : "5 7"} /><text x={left - 12} y={y + 4} textAnchor="end" fontSize="11" fontWeight={tick === 0 ? "700" : "500"} fill="#748691">{tick}%</text></g>; })}
      <polygon points={areaPoints} fill="url(#game-line-area)" /><polyline points={linePoints} fill="none" stroke="#315a9f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {games.map((game, index) => { const { x, y, score } = points[index]; const label = game.game?.name || "Game"; const short = label.length > 18 ? `${label.slice(0, 16)}…` : label; const best = score > 0 && score === bestScore; const band = score >= 80 ? "Strong" : score >= 60 ? "On track" : "Develop"; return <g key={game.id} role="button" className="cursor-pointer" style={{ outline: "none" }} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(game.id)}><title>{`${label}: ${Math.round(score)}% · ${band}${game.accuracy == null ? "" : ` · ${Math.round(game.accuracy)}% accuracy`}`}</title>{best && <g><rect x={x - 28} y={Math.max(2, y - 42)} width="56" height="19" rx="9.5" fill="#e3f7f1" /><text x={x} y={Math.max(15, y - 29)} textAnchor="middle" fontSize="8" fontWeight="800" fill="#007460">BEST</text></g>}<circle cx={x} cy={y} r="9" fill={colors[index % colors.length]} stroke="white" strokeWidth="4" /><text x={x} y={best ? Math.max(26, y - 8) : Math.max(18, y - 14)} textAnchor="middle" fontSize="13" fontWeight="900" fill="#071633">{Math.round(score)}%</text><text x={x} y={height - 50} textAnchor="middle" fontSize="11" fontWeight="800" fill="#2c4051">{short}</text><rect x={x - 30} y={height - 42} width="60" height="18" rx="9" fill={score >= 80 ? "#e3f7f1" : score >= 60 ? "#fff5df" : "#fff0f1"} /><text x={x} y={height - 29} textAnchor="middle" fontSize="8" fontWeight="800" fill={score >= 80 ? "#007460" : score >= 60 ? "#a96000" : "#b8424d"}>{band.toUpperCase()}</text><text x={x} y={height - 9} textAnchor="middle" fontSize="9" fill="#81919b">{game.accuracy == null ? "Accuracy not recorded" : `${Math.round(game.accuracy)}% accuracy`}</text></g>; })}
      <text x="14" y={top + plotHeight / 2} textAnchor="middle" fontSize="10" fontWeight="800" fill="#607080" transform={`rotate(-90 14 ${top + plotHeight / 2})`}>Performance score</text>
    </svg>
    {!hasMeasuredScore && <div className="mx-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold leading-5 text-amber-800">No measurable gameplay performance was captured. These games were submitted with zero recorded play time or without game analytics, so no best game can be determined.</div>}
  </div>;
};

const SkillColumnChart = ({ skills }: { skills: Array<{ name: string; score: number }> }) => {
  const displayed = skills.slice(0, 10);
  const width = Math.max(760, displayed.length * 100);
  const height = 330, left = 48, top = 34, bottom = 86;
  const plotHeight = height - top - bottom, plotWidth = width - left - 20;
  const slot = plotWidth / displayed.length, barWidth = Math.min(54, slot * .58);
  const colors = ["#078f7a", "#4f73c8", "#9b62c7", "#e48b32", "#df5f73", "#3b9bb8", "#7a9440", "#cf6aa5", "#64748b", "#b7791f"];
  return <div className="overflow-x-auto rounded-2xl border border-[#d7e7e3] bg-white p-4"><div><p className="text-[9px] font-black uppercase tracking-wide text-[#607080]">Skill scores</p><p className="mt-1 text-[9px] text-[#71818d]">Taller columns show stronger skills.</p></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Column chart of skill scores" className="mt-2 min-w-[760px] w-full"><title>Skill scores</title>{[0, 25, 50, 75, 100].map((tick) => { const y = top + plotHeight - tick / 100 * plotHeight; return <g key={tick}><line x1={left} x2={width - 20} y1={y} y2={y} stroke={tick === 0 ? "#b9cbc6" : "#dce8e5"} strokeDasharray={tick === 0 ? undefined : "5 6"} /><text x={left - 9} y={y + 4} textAnchor="end" fontSize="9" fill="#7b8d97">{tick}%</text></g>; })}{displayed.map((skill, index) => { const score = Math.max(0, Math.min(100, Math.round(Number(skill.score || 0)))); const x = left + index * slot + (slot - barWidth) / 2; const renderedHeight = score > 0 ? score / 100 * plotHeight : 4; const y = top + plotHeight - renderedHeight; const words = skill.name.split(" "); const firstLine = words.slice(0, 2).join(" "); const secondLine = words.slice(2).join(" "); return <g key={skill.name}><rect x={x} y={y} width={barWidth} height={renderedHeight} rx="8" fill={colors[index]} opacity=".92" /><text x={x + barWidth / 2} y={Math.max(18, y - 8)} textAnchor="middle" fontSize="11" fontWeight="900" fill="#071633">{score}%</text><text x={x + barWidth / 2} y={height - 50} textAnchor="middle" fontSize="9" fontWeight="800" fill="#34475a"><tspan x={x + barWidth / 2}>{firstLine}</tspan>{secondLine && <tspan x={x + barWidth / 2} dy="12">{secondLine.length > 15 ? `${secondLine.slice(0, 13)}…` : secondLine}</tspan>}</text></g>; })}</svg></div>;
};

export default function AdminAssessments() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");
  
  const [activeTab, setActiveTab] = useState<"templates" | "submissions" | "requests" | "bookings">("templates");
  const [deepLinkedGameResultId, setDeepLinkedGameResultId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sourceDocuments, setSourceDocuments] = useState<any[]>([]);
  const [sourceUploading, setSourceUploading] = useState(false);
  const [sourceMode, setSourceMode] = useState<"GOOGLE_VERTEX" | "DEMO_LOCAL">("DEMO_LOCAL");

  // Scheduling & Booking States
  const [assessmentDate, setAssessmentDate] = useState("");
  const [campus, setCampus] = useState("Main Campus");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [venueDescription, setVenueDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactDesignation, setContactDesignation] = useState("Assessment Coordinator");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [instructions, setInstructions] = useState("");
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [slots, setSlots] = useState<Array<{ id: string; slotName: string; startTime: string; endTime: string; capacity: number }>>([
    { id: "1", slotName: "Morning Slot", startTime: "09:00 AM", endTime: "09:30 AM", capacity: 20 },
    { id: "2", slotName: "Afternoon Slot 1", startTime: "01:00 PM", endTime: "01:30 PM", capacity: 20 },
    { id: "3", slotName: "Afternoon Slot 2", startTime: "02:00 PM", endTime: "02:30 PM", capacity: 20 }
  ]);
  const [autoBook, setAutoBook] = useState(false);
  const [allowStudentRescheduling, setAllowStudentRescheduling] = useState(false);
  const [notifyPrefs, setNotifyPrefs] = useState({
    parent: true,
    student: true,
    email: true,
    sms: true,
    inApp: true
  });
  
  // Bookings Tab States
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingAssessmentId, setSelectedBookingAssessmentId] = useState<string | null>(null);
  const [bookingSchedule, setBookingSchedule] = useState<any>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<any>(null);
  const [slotCapacityDrafts, setSlotCapacityDrafts] = useState<Record<string, number>>({});
  const [savingSlotCapacityId, setSavingSlotCapacityId] = useState<string | null>(null);

  // Core Data
  const [templates, setTemplates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [reassignmentRequests, setReassignmentRequests] = useState<any[]>([]);
  const [requestFilter, setRequestFilter] = useState("PENDING");
  const [approvingRequest, setApprovingRequest] = useState<any | null>(null);
  const [reassignmentQuestionPreview, setReassignmentQuestionPreview] = useState<any[]>([]);
  const [writtenQuestionCount, setWrittenQuestionCount] = useState(0);
  const [approvalForm, setApprovalForm] = useState({
    questionCount: 5, totalMarks: 50, timeLimit: 30, dueDate: "", difficulty: "MEDIUM", passingMarks: 25,
    hasWritten: true, hasListening: false, hasReading: false, hasSpeaking: false,
    proctoringEnabled: false,
    readingText: "", readingInstructions: "",
    listeningActivityType: "Listen and Answer Questions", listeningTranscript: "", listeningInstructions: "",
    speakingActivityType: "Introduce Yourself", speakingPrompt: "",
  });
  const [applications, setApplications] = useState<any[]>([]);

  // View States
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<any | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gameResultSubmission, setGameResultSubmission] = useState<any | null>(null);
  const [gamePerformanceDetail, setGamePerformanceDetail] = useState<any | null>(null);
  const [studentGamesPerformance, setStudentGamesPerformance] = useState<any | null>(null);
  const [gamePerformanceLoading, setGamePerformanceLoading] = useState(false);
  const [gamePdfError, setGamePdfError] = useState("");
  const [gamePdfPreview, setGamePdfPreview] = useState<{ url: string; fileName: string } | null>(null);
  const [showSelectedGameDetails, setShowSelectedGameDetails] = useState(false);
  const [peerGameSummaries, setPeerGameSummaries] = useState<any[]>([]);
  const [selectedPeerStudentId, setSelectedPeerStudentId] = useState("");
  const [gameResponseReviewOpen, setGameResponseReviewOpen] = useState(false);
  const [gameResponseReviewIndex, setGameResponseReviewIndex] = useState(0);
  const [gameSchoolReview, setGameSchoolReview] = useState("");
  const [gameReviewSaving, setGameReviewSaving] = useState(false);
  const [gameNoteSaveState, setGameNoteSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [gameplayVideoUrl, setGameplayVideoUrl] = useState("");
  const [readingPlaybackError, setReadingPlaybackError] = useState(false);
  const [speakingPlaybackError, setSpeakingPlaybackError] = useState(false);

  useEffect(() => {
    const modalOpen = Boolean(gameResultSubmission || gamePdfPreview);
    document.body.classList.toggle("assessment-result-modal-open", modalOpen);
    return () => document.body.classList.remove("assessment-result-modal-open");
  }, [gamePdfPreview, gameResultSubmission]);

  const openGameScore = async (submission: any) => {
    if (submission.gameResult?.status !== "COMPLETED") return;
    setGameResponseReviewOpen(false);
    setGameResponseReviewIndex(0);
    setGameSchoolReview(submission.gameResult?.schoolReview || "");
    setGameResultSubmission(submission);
    setGamePerformanceDetail(null);
    setStudentGamesPerformance(null);
    setShowSelectedGameDetails(false);
    setPeerGameSummaries([]);
    setSelectedPeerStudentId("");
    setGamePdfError("");
    if (!String(submission.gameSource || "").startsWith("REAL_TIME_GAMES")) return;
    if (!submission.gameResult?.id) return;
    setGamePerformanceLoading(true);
    try {
      const headers = { "x-tenant-id": schoolId, Authorization: `Bearer ${token}` };
      const [detailResponse, summaryResponse] = await Promise.all([
        fetch(`http://localhost:5001/games/results/${submission.gameResult.id}`, { headers }),
        fetch(`http://localhost:5001/games/results/summary?studentId=${encodeURIComponent(submission.application?.id || submission.gameResult?.studentId || "")}&status=COMPLETED`, { headers }),
      ]);
      const [detailPayload, summaryPayload] = await Promise.all([detailResponse.json().catch(() => null), summaryResponse.json().catch(() => null)]);
      if (!detailResponse.ok) throw new Error(detailPayload?.message || "Unable to load performance analytics.");
      setGamePerformanceDetail(detailPayload);
      if (summaryResponse.ok) setStudentGamesPerformance(summaryPayload?.studentSummaries?.[0] || null);
    } catch (error) {
      setGamePdfError(error instanceof Error ? error.message : "Unable to load performance analytics.");
    } finally {
      setGamePerformanceLoading(false);
    }
  };

  const downloadGamePerformancePdf = () => {
    if (!gamePerformanceDetail) return;
    try {
      setGamePdfError("");
      const detail = gamePerformanceDetail;
      const doc = new jsPDF(); let y = 18;
      const add = (label: string, value: unknown) => { if (value === null || value === undefined || value === "") return; doc.setFont("helvetica", "bold"); doc.text(label, 16, y); doc.setFont("helvetica", "normal"); doc.text(String(value), 74, y); y += 7; };
      doc.setFillColor(0, 127, 112); doc.rect(0, 0, 210, 9, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Game Performance Report", 16, y); y += 8; doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(detail.schoolName || "School", 16, y); y += 10;
      add("Student", detail.student?.name); add("Grade", detail.student?.grade); add("Game", detail.game?.name); add("Age group", detail.game?.ageGroup); add("Category", detail.game?.category); add("Difficulty", detail.game?.difficulty); add("Date played", detail.completedAt ? new Date(detail.completedAt).toLocaleString() : null); add("Overall score", `${Math.round(detail.score)}%`); add("Accuracy", detail.accuracy == null ? null : `${Math.round(detail.accuracy)}%`); add("Average response", detail.averageResponseTime == null ? null : formatMillisecondsAsMinutes(detail.averageResponseTime)); add("Duration", detail.durationSeconds == null ? null : `${Math.floor(Number(detail.durationSeconds) / 60)} min ${Math.round(Number(detail.durationSeconds) % 60)} sec`); add("Mistakes", detail.mistakes); add("Rounds completed", detail.roundsCompleted);
      if (detail.skills?.length) { y += 4; doc.setTextColor(0, 127, 112); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Skills assessed", 16, y); y += 8; doc.setTextColor(20, 35, 50); doc.setFontSize(10); detail.skills.forEach((skill: any) => add(skill.name, `${Math.round(skill.score)}%`)); }
      y += 4; doc.setTextColor(0, 127, 112); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Performance summary", 16, y); y += 8; doc.setTextColor(20, 35, 50); doc.setFontSize(10); doc.setFont("helvetica", "normal"); const summary = `${detail.student?.name || "The student"} completed ${detail.game?.name || "the game"} with an overall score of ${Math.round(detail.score)}%${detail.accuracy != null ? ` and ${Math.round(detail.accuracy)}% accuracy` : ""}.`; doc.text(doc.splitTextToSize(summary, 178), 16, y);
      y += 12; if (y > 260) { doc.addPage(); y = 18; } doc.setTextColor(0, 127, 112); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Game description", 16, y); y += 8; doc.setTextColor(20, 35, 50); doc.setFontSize(10); doc.setFont("helvetica", "normal"); const description = detail.game?.description || "No game description is available."; const descriptionLines = doc.splitTextToSize(description, 178); doc.text(descriptionLines, 16, y); y += descriptionLines.length * 5 + 6; doc.setFont("helvetica", "bold"); doc.text("How the game works", 16, y); y += 6; doc.setFont("helvetica", "normal"); const howToPlay = describeGamePlay(detail.game); doc.text(doc.splitTextToSize(howToPlay, 178), 16, y);
      const fileName = `${(detail.student?.name || "student").replaceAll(" ", "-")}-${(detail.game?.name || "game").replaceAll(" ", "-")}-report.pdf`;
      const url = URL.createObjectURL(doc.output("blob"));
      setGamePdfPreview((current) => { if (current) URL.revokeObjectURL(current.url); return { url, fileName }; });
    } catch {
      setGamePdfError("Unable to generate the report. Please try again.");
    }
  };

  const downloadAllGamesPdf = () => {
    if (!studentGamesPerformance?.games?.length) return;
    try {
      setGamePdfError("");
      const report = studentGamesPerformance;
      const highestPerformance = Math.max(...report.games.map((game: any) => Number(game.score || 0)));
      const doc = new jsPDF();
      const schoolName = gamePerformanceDetail?.schoolName || "School";
      const teal = [0, 127, 112] as const;
      const navy = [7, 22, 51] as const;
      const muted = [102, 122, 136] as const;
      let y = 22;
      const addPageHeader = () => {
        const initials = schoolName.split(/\s+/).filter(Boolean).map((word: string) => word[0]).slice(0, 2).join("").toUpperCase() || "SC";
        doc.setFillColor(...navy); doc.rect(0, 0, 210, 15, "F");
        doc.setFillColor(...teal); doc.rect(0, 15, 210, 1.5, "F");
        doc.roundedRect(16, 3.5, 8, 8, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255); doc.text(initials, 20, 8.7, { align: "center", baseline: "middle" });
        doc.setFontSize(8); doc.text(schoolName.toUpperCase(), 28, 8.5, { baseline: "middle" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(196, 217, 215); doc.text("STUDENT ASSESSMENT REPORT", 194, 8.5, { align: "right", baseline: "middle" });
        y = 23;
      };
      const ensureSpace = (height: number) => { if (y + height > 278) { doc.addPage(); addPageHeader(); } };
      const sectionTitle = (eyebrow: string, title: string) => {
        ensureSpace(18); doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...teal); doc.text(eyebrow.toUpperCase(), 16, y);
        doc.setFontSize(15); doc.setTextColor(...navy); doc.text(title, 16, y + 7); y += 15;
      };
      const scoreColor = (score: number): [number, number, number] => score >= 70 ? [0, 127, 112] : score >= 40 ? [221, 145, 28] : [205, 79, 74];

      addPageHeader();
      doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(...navy); doc.text("Complete Assessment Report", 16, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...muted); doc.text("A consolidated view of performance, skills, and learning observations", 16, y); y += 7;
      const studentName = report.student?.name || "Student";
      const studentInitials = studentName.split(/\s+/).filter(Boolean).map((word: string) => word[0]).slice(0, 2).join("").toUpperCase() || "ST";
      doc.setFillColor(244, 249, 248); doc.roundedRect(16, y, 178, 18, 3, 3, "F");
      doc.setFillColor(...teal); doc.circle(27, y + 9, 6, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text(studentInitials, 27, y + 9, { align: "center", baseline: "middle" });
      doc.setFontSize(10.5); doc.setTextColor(...navy); doc.text(studentName, 37, y + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...muted); doc.text(`Grade ${report.student?.grade || "Not available"}`, 37, y + 13);
      doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(...teal); doc.text("REPORT DATE", 188, y + 6, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...muted); doc.text(new Date().toLocaleDateString(), 188, y + 13, { align: "right" }); y += 24;

      const kpis = [
        ["ASSESSMENTS", String(report.gamesCompleted)],
        ["HIGHEST PERFORMANCE", `${Math.round(highestPerformance)}%`],
        ["AVG. ACCURACY", report.averageAccuracy == null ? "N/A" : `${Math.round(report.averageAccuracy)}%`],
      ];
      kpis.forEach(([label, value], index) => {
        const x = 16 + index * 61; const accent = index === 0 ? [71, 102, 128] as const : index === 1 ? teal : [36, 86, 116] as const;
        doc.setFillColor(index === 1 ? 232 : 247, index === 1 ? 247 : 250, index === 1 ? 243 : 249); doc.roundedRect(x, y, 56, 18, 3, 3, "F");
        doc.setFillColor(accent[0], accent[1], accent[2]); doc.roundedRect(x, y, 56, 1.5, 1, 1, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...muted); doc.text(label, x + 5, y + 7);
        doc.setFontSize(13);
        if (index === 1) doc.setTextColor(...teal); else doc.setTextColor(...navy);
        doc.text(value, x + 51, y + 14, { align: "right" });
      }); y += 24;

      sectionTitle("01 / PERFORMANCE", "Assessment performance");
      report.games.forEach((assessment: any, index: number) => {
        ensureSpace(13); const score = Math.max(0, Math.min(100, Number(assessment.score || 0))); const color = scoreColor(score);
        doc.setFont("helvetica", index === 0 ? "bold" : "normal"); doc.setFontSize(9); doc.setTextColor(...navy); doc.text(`${index + 1}. ${assessment.game?.name || "Assessment"}`, 16, y + 3);
        doc.setFillColor(231, 239, 237); doc.roundedRect(91, y, 78, 5, 2, 2, "F"); doc.setFillColor(...color); if (score > 0) doc.roundedRect(91, y, 78 * score / 100, 5, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setTextColor(...color); doc.text(`${Math.round(score)}%`, 188, y + 4, { align: "right" }); y += 11;
      });

      y += 4; sectionTitle("02 / CAPABILITIES", "Skills demonstrated");
      (report.skills || []).forEach((skill: any, index: number) => {
        const column = index % 2; const rowY = y + Math.floor(index / 2) * 13; const x = 16 + column * 91; const score = Math.max(0, Math.min(100, Number(skill.score || 0))); const color = scoreColor(score);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...navy); doc.text(String(skill.name), x, rowY);
        doc.setFontSize(8); doc.setTextColor(...color); doc.text(`${Math.round(score)}%`, x + 84, rowY, { align: "right" });
        doc.setFillColor(231, 239, 237); doc.roundedRect(x, rowY + 3, 84, 3, 1.5, 1.5, "F"); doc.setFillColor(...color); if (score > 0) doc.roundedRect(x, rowY + 3, 84 * score / 100, 3, 1.5, 1.5, "F");
      });
      y += Math.ceil((report.skills || []).length / 2) * 13 + 7;

      doc.addPage(); addPageHeader(); sectionTitle("03 / DETAILED REVIEW", "Assessment observations");
      report.games.forEach((assessment: any, index: number) => {
        const description = assessment.game?.description || "No assessment description is available.";
        const playText = describeGamePlay(assessment.game).replaceAll("game", "assessment").replaceAll("Game", "Assessment");
        const performance = assessment.durationSeconds === 0 && Number(assessment.score || 0) === 0
          ? "No measurable activity was captured for this submission, so a performance interpretation is not available."
          : `The student completed this assessment with a score of ${Math.round(assessment.score || 0)}%${assessment.accuracy == null ? "" : ` and ${Math.round(assessment.accuracy)}% accuracy`}${assessment.roundsCompleted == null ? "" : ` across ${assessment.roundsCompleted} completed rounds`}${assessment.averageResponseTime == null ? "" : `, with an average response time of ${formatMillisecondsAsMinutes(assessment.averageResponseTime)}`}.`;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        const descriptionLines = doc.splitTextToSize(description, 76); const playLines = doc.splitTextToSize(playText, 76); const performanceLines = doc.splitTextToSize(performance, 164);
        const contentLineHeight = 3.7;
        const overviewHeight = 6 + Math.max(descriptionLines.length, playLines.length) * contentLineHeight;
        const performanceHeight = 6 + performanceLines.length * contentLineHeight;
        const cardHeight = 37 + overviewHeight + performanceHeight;
        ensureSpace(cardHeight + 4); const score = Number(assessment.score || 0); const color = scoreColor(score);
        doc.setDrawColor(221, 234, 231); doc.setFillColor(250, 252, 252); doc.roundedRect(16, y, 178, cardHeight, 3, 3, "FD");
        doc.setFillColor(244, 249, 248); doc.roundedRect(16, y, 178, 23, 3, 3, "F"); doc.rect(16, y + 19, 178, 4, "F");
        doc.setFillColor(...teal); doc.circle(23, y + 7.5, 3.2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(255, 255, 255); doc.text(String(index + 1), 23, y + 7.5, { align: "center", baseline: "middle" });
        doc.setFontSize(7); doc.setTextColor(...muted); doc.text("GAME PERFORMANCE", 29, y + 8);
        doc.setFontSize(12); doc.setTextColor(...navy); doc.text(assessment.game?.name || "Assessment", 22, y + 16);
        const badgeX = 165; const badgeY = y + 5; const badgeWidth = 23; const badgeHeight = 13;
        doc.setFillColor(...color); doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(5); doc.setTextColor(220, 246, 241); doc.text("OVERALL SCORE", badgeX + badgeWidth / 2, badgeY + 4, { align: "center" });
        doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text(`${Math.round(score)}%`, badgeX + badgeWidth / 2, badgeY + 9.5, { align: "center", baseline: "middle" });
        const overviewY = y + 31;
        [["PURPOSE", descriptionLines, 22], ["HOW IT WORKS", playLines, 108]].forEach(([label, lines, x]) => {
          doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...teal); doc.text(label as string, x as number, overviewY);
          doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(49, 68, 82); doc.text(lines as string[], x as number, overviewY + 4.5);
        });
        const dividerY = overviewY + overviewHeight + 1;
        doc.setDrawColor(225, 235, 232); doc.line(105, overviewY - 3, 105, dividerY - 4);
        doc.setFillColor(245, 250, 249); doc.roundedRect(21, dividerY + 2, 168, cardHeight - (dividerY - y) - 7, 2, 2, "F");
        const performanceY = dividerY + 6;
        doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...teal); doc.text("PERFORMANCE", 22, performanceY);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(49, 68, 82); doc.text(performanceLines, 22, performanceY + 4.5);
        y += cardHeight + 4;
      });

      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page); doc.setDrawColor(225, 234, 232); doc.line(16, 286, 194, 286);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...muted); doc.text("CONFIDENTIAL STUDENT ASSESSMENT REPORT", 16, 291); doc.text(`Page ${page} of ${totalPages}`, 194, 291, { align: "right" });
      }
      const fileName = `${(report.student?.name || "student").replaceAll(" ", "-")}-assessment-report.pdf`;
      const url = URL.createObjectURL(doc.output("blob"));
      setGamePdfPreview((current) => { if (current) URL.revokeObjectURL(current.url); return { url, fileName }; });
    } catch {
      setGamePdfError("Unable to generate the report. Please try again.");
    }
  };

  const shareGameReportWithParent = (channel: "gmail" | "whatsapp") => {
    if (!gamePdfPreview) return;
    setGamePdfError("");
    const parent = gameResultSubmission?.application?.parent;
    const studentName = studentGamesPerformance?.student?.name || gamePerformanceDetail?.student?.name || "your child";
    const schoolName = gamePerformanceDetail?.schoolName || "the school";
    const subject = `${studentName} - Assessment Performance Report`;
    const message = `Dear Parent,\n\nPlease find ${studentName}'s complete assessment performance report from ${schoolName}.\n\nRegards,\n${schoolName}`;
    const download = document.createElement("a");
    download.href = gamePdfPreview.url;
    download.download = gamePdfPreview.fileName;
    download.click();

    const attachmentNote = "The PDF report has been downloaded. Please attach it before sending.";
    const redirectUrl = channel === "gmail"
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(parent?.email || "")}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${message}\n\n${attachmentNote}`)}`
      : `https://wa.me/${String(parent?.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`${message}\n\n${attachmentNote}`)}`;
    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  };

  const viewCompletedGameDetail = async (resultId: string) => {
    setGamePerformanceLoading(true);
    setGamePdfError("");
    setPeerGameSummaries([]);
    setSelectedPeerStudentId("");
    try {
      const response = await fetch(`http://localhost:5001/games/results/${resultId}`, { headers: { "x-tenant-id": schoolId, Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load this game result.");
      setGamePerformanceDetail(payload);
      setShowSelectedGameDetails(true);
      const peerParams = new URLSearchParams({ gameId: payload.game?.id || "", ageGroup: payload.game?.ageGroup || "", status: "COMPLETED" });
      const peerResponse = await fetch(`http://localhost:5001/games/results/summary?${peerParams}`, { headers: { "x-tenant-id": schoolId, Authorization: `Bearer ${token}` } });
      if (peerResponse.ok) {
        const peerPayload = await peerResponse.json();
        const peers = (peerPayload.studentSummaries || []).filter((summary: any) => summary.student?.id !== payload.student?.id);
        setPeerGameSummaries(peers);
        setSelectedPeerStudentId(peers[0]?.student?.id || "");
      } else {
        setPeerGameSummaries([]);
        setSelectedPeerStudentId("");
      }
    } catch (error) {
      setGamePdfError(error instanceof Error ? error.message : "Unable to load this game result.");
    } finally {
      setGamePerformanceLoading(false);
    }
  };

  const libraryGamesBundleOpen = String(gameResultSubmission?.gameSource || "").startsWith("REAL_TIME_GAMES");
  const displayedSubmissions = submissions;

  // Form States
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    grade: "Grade 1",
    subject: "All",
    chapter: "",
    difficulty: "MEDIUM",
    assessmentMode: "HOME",
    proctoringEnabled: false,
    questionCount: 5,
    timeLimit: 30,
    totalMarks: 50,
    passingMarks: 25,
    writtenPassingMarks: 25,
    dueDate: "",
    allowCalculator: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultImmediately: true,
    allowRetake: false,
    retakeCount: 1,
    hasWritten: false,
    hasReading: false,
    hasSpeaking: false,
    hasListening: false,
    readingMaterialType: "PASSAGE",
    readingMaterialUrl: "",
    readingText: "",
    readingTime: 60,
    readingRecordDuration: 60,
    readingInstructions: "",
    readingTotalMarks: 20,
    readingPassingMarks: 10,
    speakingActivityType: "Introduce Yourself",
    speakingMaterialType: "PROMPT",
    speakingMaterialUrl: "",
    speakingPrompt: "",
    speakingPrepTime: 60,
    speakingTimeLimit: 120,
    speakingTotalMarks: 20,
    speakingPassingMarks: 10,
    listeningActivityType: "Listen and Answer Questions",
    listeningMaterialType: "AUDIO",
    listeningMaterialUrl: "",
    listeningTranscript: "",
    listeningInstructions: "",
    listeningPlaysAllowed: 1,
    listeningAudioSpeed: 1.0,
    listeningPrepTime: 30,
    listeningDuration: 0,
    listeningTotalMarks: 20,
    listeningPassingMarks: 10,
    listeningTimeLimit: 10,
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [generatingMaterial, setGeneratingMaterial] = useState(false);
  const [showAdvancedListening, setShowAdvancedListening] = useState(false);
  const [showAdvancedReading, setShowAdvancedReading] = useState(false);
  const [showAdvancedSpeaking, setShowAdvancedSpeaking] = useState(false);

  // Publish Form State
  const [publishTargetAppIds, setPublishTargetAppIds] = useState<string[]>([]);
  const [publishDueDate, setPublishDueDate] = useState("");
  const [assignmentType, setAssignmentType] = useState("SELECTED"); // ALL, SECTION, GROUP, SELECTED
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  // Grading Form State
  const [gradingAnswers, setGradingAnswers] = useState<any[]>([]);
  const [gradingStatus, setGradingStatus] = useState("PASS");
  const [gradingRemarks, setGradingRemarks] = useState("");
  const [readingScoreOverride, setReadingScoreOverride] = useState<number>(0);
  const [readingRemarksOverride, setReadingRemarksOverride] = useState<string>("");
  const [speakingScoreOverride, setSpeakingScoreOverride] = useState<number>(0);
  const [speakingRemarksOverride, setSpeakingRemarksOverride] = useState<string>("");
  const [listeningScoreOverride, setListeningScoreOverride] = useState<number>(0);
  const [listeningRemarksOverride, setListeningRemarksOverride] = useState<string>("");
  const [readingAiData, setReadingAiData] = useState<any>(null);
  const [speakingAiData, setSpeakingAiData] = useState<any>(null);
  const [listeningAiData, setListeningAiData] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem("schoolId");
    const tok = localStorage.getItem("token");
    if (!id || !tok) {
      router.push("/login");
      return;
    }
    setSchoolId(id);
    setToken(tok);
    const params = new URLSearchParams(window.location.search);
    const linkedResultId = params.get("gameResultId");
    if (params.get("tab") === "submissions" || linkedResultId) setActiveTab("submissions");
    if (linkedResultId) setDeepLinkedGameResultId(linkedResultId);
  }, [router]);

  useEffect(() => {
    if (!deepLinkedGameResultId || activeTab !== "submissions" || !submissions.length) return;
    const submission = submissions.find((row: any) => row.gameResult?.id === deepLinkedGameResultId);
    if (!submission) return;
    setDeepLinkedGameResultId(null);
    void openGameScore(submission);
  }, [activeTab, deepLinkedGameResultId, submissions]);

  useEffect(() => {
    if (!schoolId || !token) return;
    fetchData();
    loadSourceDocuments();
  }, [schoolId, token, activeTab, requestFilter]);

  useEffect(() => {
    if (!schoolId || !token || activeTab !== "submissions") return;
    let active = true;
    const refreshMonitoring = async () => {
      try {
        const response = await fetch("http://localhost:5001/assessments/submissions/list", {
          cache: "no-store",
          headers: { "x-tenant-id": schoolId, Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const rows = await response.json();
        if (active) setSubmissions(rows);
      } catch {
        // Preserve the last successful monitoring snapshot during a brief network interruption.
      }
    };
    void refreshMonitoring();
    const timer = window.setInterval(refreshMonitoring, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeTab, schoolId, token]);

  const loadSourceDocuments = async () => {
    if (!schoolId || !token) return;
    try {
      const headers = {
        "x-tenant-id": schoolId,
        "Authorization": `Bearer ${token}`,
      };
      const [response, modeResponse] = await Promise.all([
        fetch("http://localhost:5001/ai/sources", { headers }),
        fetch("http://localhost:5001/ai/source-mode", { headers }),
      ]);
      if (response.ok) setSourceDocuments(await response.json());
      if (modeResponse.ok) {
        const mode = await modeResponse.json();
        setSourceMode(mode.mode);
      }
    } catch (error) {
      console.error("Unable to load AI source documents", error);
    }
  };

  const handleSourceUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please select a PDF textbook or learning document.");
      return;
    }
    setSourceUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("sourceName", file.name);
      body.append("grade", formData.grade);
      body.append("subject", formData.subject);
      if (formData.chapter.trim()) body.append("chapter", formData.chapter.trim());
      const response = await fetch("http://localhost:5001/ai/sources/upload", {
        method: "POST",
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`,
        },
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "The PDF could not be processed.");
      }
      await loadSourceDocuments();
      alert("Textbook uploaded and processed. It is ready for source-based generation.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "The PDF upload failed.");
      await loadSourceDocuments();
    } finally {
      setSourceUploading(false);
    }
  };

  // Synchronize dynamic total and passing marks in template form
  useEffect(() => {
    const writtenTotal = formData.hasWritten
      ? questions.filter(q => !q.isListening).reduce((acc, q) => acc + (Number(q.marks) || 0), 0)
      : 0;
    const readingTotal = formData.hasReading ? Number(formData.readingTotalMarks || 0) : 0;
    const speakingTotal = formData.hasSpeaking ? Number(formData.speakingTotalMarks || 0) : 0;
    const listeningTotal = formData.hasListening ? Number(formData.listeningTotalMarks || 0) : 0;
    const computedTotal = writtenTotal + readingTotal + speakingTotal + listeningTotal;

    // Overall passing marks calculation
    const writtenPassing = formData.hasWritten ? Number(formData.writtenPassingMarks || 25) : 0;
    const readingPassing = formData.hasReading ? Number(formData.readingPassingMarks || 0) : 0;
    const speakingPassing = formData.hasSpeaking ? Number(formData.speakingPassingMarks || 0) : 0;
    const listeningPassing = formData.hasListening ? Number(formData.listeningPassingMarks || 0) : 0;
    
    const computedPassing = (formData.hasReading || formData.hasSpeaking || formData.hasListening)
      ? (writtenPassing + readingPassing + speakingPassing + listeningPassing)
      : writtenPassing;

    setFormData(prev => {
      const updates: Partial<typeof formData> = {};
      if (prev.totalMarks !== computedTotal) {
        updates.totalMarks = computedTotal;
      }
      if (prev.passingMarks !== computedPassing) {
        updates.passingMarks = computedPassing;
      }
      if (Object.keys(updates).length > 0) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, [
    questions,
    formData.hasWritten,
    formData.hasReading,
    formData.readingTotalMarks,
    formData.readingPassingMarks,
    formData.hasSpeaking,
    formData.speakingTotalMarks,
    formData.speakingPassingMarks,
    formData.writtenPassingMarks,
  ]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { 
        "x-tenant-id": schoolId,
        "Authorization": `Bearer ${token}`
      };
      
      const [templatesRes, submissionsRes, appsRes, requestsRes] = await Promise.all([
        fetch("http://localhost:5001/assessments", { headers }),
        fetch("http://localhost:5001/assessments/submissions/list", { headers }),
        fetch("http://localhost:5001/application", { headers }),
        fetch(`http://localhost:5001/assessments/reassignment-requests/list?status=${requestFilter}`, { headers })
      ]);

      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (submissionsRes.ok) setSubmissions(await submissionsRes.json());
      if (appsRes.ok) setApplications(await appsRes.json());
      if (requestsRes.ok) setReassignmentRequests(await requestsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const resultId = gameResultSubmission?.gameResult?.id;
    if (!resultId || !schoolId || !token) return;
    let active = true;
    const refreshLiveResult = async () => {
      try {
        const response = await fetch("http://localhost:5001/assessments/submissions/list", { headers: { "x-tenant-id": schoolId, Authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const rows = await response.json();
        const latest = rows.find((row: any) => row.submissionType === "GAME" && row.gameResult?.id === resultId);
        if (!active || !latest) return;
        setGameResultSubmission(latest);
        setSubmissions(rows);
      } catch {
        // Keep the last valid result visible if a polling request is interrupted.
      }
    };
    void refreshLiveResult();
    const timer = window.setInterval(refreshLiveResult, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [gameResultSubmission?.gameResult?.id, schoolId, token]);

  useEffect(() => {
    const sessionId = showSelectedGameDetails && gamePerformanceDetail?.recordingSessionId
      ? gamePerformanceDetail.recordingSessionId
      : gameResultSubmission?.gameResult?.recordingSessionId;
    if (!sessionId || gameResultSubmission?.gameResult?.status !== "COMPLETED") {
      setGameplayVideoUrl("");
      return;
    }
    let active = true;
    let objectUrl = "";
    void fetch(`http://localhost:5001/game-assessments/engine/sessions/${sessionId}/recording-url`, {
      headers: { "x-tenant-id": schoolId, Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.url || !active) return;
      try {
        const recordingResponse = await fetch(payload.url);
        if (!recordingResponse.ok) throw new Error("Recording download failed");
        const rawBlob = await recordingResponse.blob();
        const durationMs = Math.max(1000, Number(gameResultSubmission?.timeTaken || 0) * 1000);
        const playableBlob = await fixWebmDuration(rawBlob, durationMs, { logger: false });
        if (!active) return;
        objectUrl = URL.createObjectURL(playableBlob);
        setGameplayVideoUrl(objectUrl);
      } catch {
        if (active) setGameplayVideoUrl(payload.url);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [gamePerformanceDetail?.recordingSessionId, showSelectedGameDetails, gameResultSubmission?.gameResult?.recordingSessionId, gameResultSubmission?.gameResult?.status, gameResultSubmission?.timeTaken, schoolId, token]);

  useEffect(() => {
    const gameId = gameResultSubmission?.gameResult?.gameId;
    const resultId = gameResultSubmission?.gameResult?.id;
    const savedNote = gameResultSubmission?.gameResult?.schoolReview || "";
    if (String(gameResultSubmission?.gameSource || "").startsWith("REAL_TIME_GAMES") || !gameId || !resultId || gameResultSubmission?.gameResult?.status !== "COMPLETED" || gameSchoolReview === savedNote) return;
    setGameNoteSaveState("saving");
    const timer = window.setTimeout(async () => {
      const currentStatus = gameResultSubmission?.gameResult?.reviewStatus;
      const reviewStatus = currentStatus === "REVIEWED" || currentStatus === "NEEDS_FOLLOW_UP" ? currentStatus : "PENDING";
      try {
        const response = await fetch(`http://localhost:5001/games/${gameId}/reviews/${resultId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-tenant-id": schoolId, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reviewStatus, schoolReview: gameSchoolReview }),
        });
        if (!response.ok) throw new Error("Unable to save note");
        setGameResultSubmission((current: any) => current ? ({ ...current, gameResult: { ...current.gameResult, schoolReview: gameSchoolReview, reviewStatus } }) : current);
        setGameNoteSaveState("saved");
      } catch {
        setGameNoteSaveState("error");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [gameSchoolReview, gameResultSubmission?.gameResult?.gameId, gameResultSubmission?.gameResult?.id, gameResultSubmission?.gameResult?.reviewStatus, gameResultSubmission?.gameResult?.schoolReview, gameResultSubmission?.gameResult?.status, schoolId, token]);

  const fetchBookings = async (id: string) => {
    if (!id) {
      setBookings([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:5001/assessments/bookings?assessmentId=${id}`, {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch bookings", e);
    }
  };

  const fetchBookingSchedule = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5001/assessments/schedule/${id}`, {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const schedule = await res.json();
        const scheduleSlots = Array.isArray(schedule?.slots) ? schedule.slots : [];
        setBookingSchedule({
          ...schedule,
          slots: scheduleSlots.map(displaySlot),
        });
        setSlotCapacityDrafts(Object.fromEntries(scheduleSlots.map((slot: any) => [slot.id, Number(slot.capacity)])));
      } else {
        setBookingSchedule(null);
      }
    } catch (e) {
      console.error("Failed to fetch booking schedule", e);
    }
  };

  const saveSlotCapacity = async (slot: any) => {
    const capacity = Number(slotCapacityDrafts[slot.id]);
    if (!Number.isInteger(capacity) || capacity < 1) {
      alert("Maximum capacity must be a whole number greater than zero.");
      return;
    }
    setSavingSlotCapacityId(slot.id);
    try {
      const res = await fetch(`http://localhost:5001/assessments/schedule/slots/${slot.id}/capacity`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ capacity }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Unable to update capacity");
      await Promise.all([
        fetchBookingSchedule(selectedBookingAssessmentId!),
        fetchBookings(selectedBookingAssessmentId!),
      ]);
    } catch (error: any) {
      alert(error.message || "Unable to update capacity.");
    } finally {
      setSavingSlotCapacityId(null);
    }
  };

  useEffect(() => {
    if (selectedBookingAssessmentId && token && schoolId) {
      fetchBookings(selectedBookingAssessmentId);
      fetchBookingSchedule(selectedBookingAssessmentId);
    } else {
      setBookings([]);
      setBookingSchedule(null);
    }
  }, [selectedBookingAssessmentId, token, schoolId]);

  const openApprovalDialog = (request: any) => {
    const assessment = request.assessment;
    setApprovalForm({
      questionCount: assessment.questionCount,
      totalMarks: assessment.totalMarks,
      timeLimit: assessment.timeLimit,
      dueDate: assessment.dueDate ? new Date(assessment.dueDate).toISOString().slice(0, 10) : "",
      difficulty: assessment.difficulty,
      passingMarks: assessment.passingMarks,
      hasWritten: assessment.hasWritten ?? true,
      hasListening: assessment.hasListening ?? false,
      hasReading: assessment.hasReading ?? false,
      hasSpeaking: assessment.hasSpeaking ?? false,
      proctoringEnabled: assessment.proctoringEnabled ?? false,
      readingText: assessment.readingText || "",
      readingInstructions: assessment.readingInstructions || "",
      listeningActivityType: assessment.listeningActivityType || "Listen and Answer Questions",
      listeningTranscript: assessment.listeningTranscript || "",
      listeningInstructions: assessment.listeningInstructions || "",
      speakingActivityType: assessment.speakingActivityType || "Introduce Yourself",
      speakingPrompt: assessment.speakingPrompt || "",
    });
    setReassignmentQuestionPreview([]);
    setWrittenQuestionCount(0);
    setApprovingRequest(request);
  };

  const handleGenerateReassignmentPreview = async () => {
    if (!approvingRequest) return;
    setAiLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/assessments/reassignment-requests/${approvingRequest.id}/generate-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId, "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          questionCount: approvalForm.questionCount,
          difficulty: approvalForm.difficulty,
          writtenQuestionCount,
          hasWritten: approvalForm.hasWritten,
          hasListening: approvalForm.hasListening,
          hasReading: approvalForm.hasReading,
          hasSpeaking: approvalForm.hasSpeaking,
          listeningActivityType: approvalForm.listeningActivityType,
          listeningTranscript: approvalForm.listeningTranscript,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Question generation failed");
      setReassignmentQuestionPreview(payload);
    } catch (e: any) {
      alert(e.message || "Unable to generate fresh questions.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateReassessmentMaterial = async (component: "reading" | "listening" | "speaking") => {
    if (!approvingRequest) return;
    setGeneratingMaterial(true);
    try {
      const prompts = {
        reading: `Generate a fresh 120-160 word reading passage for ${approvingRequest.assessment.grade}, subject ${approvingRequest.assessment.subject}, difficulty ${approvalForm.difficulty}. Return only the passage.`,
        listening: `Generate a fresh 100-140 word listening transcript for ${approvingRequest.assessment.grade}, subject ${approvingRequest.assessment.subject}, difficulty ${approvalForm.difficulty}, activity "${approvalForm.listeningActivityType}". Return only the spoken transcript.`,
        speaking: `Generate one fresh speaking assessment prompt for ${approvingRequest.assessment.grade}, subject ${approvingRequest.assessment.subject}, difficulty ${approvalForm.difficulty}, activity "${approvalForm.speakingActivityType}". Keep it under 70 words and return only the prompt.`,
      };
      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId, "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: prompts[component] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Material generation failed");
      const field = component === "reading" ? "readingText" : component === "listening" ? "listeningTranscript" : "speakingPrompt";
      setApprovalForm(prev => ({ ...prev, [field]: payload.response }));
      if (component === "listening") setReassignmentQuestionPreview([]);
    } catch (error: any) {
      const grade = approvingRequest.assessment.grade;
      const subject = approvingRequest.assessment.subject;
      if (component === "reading") {
        setApprovalForm(prev => ({
          ...prev,
          readingText: `${subject} Discovery\n\nDuring a class activity, the students explored an important idea from ${subject}. They observed examples, discussed what they noticed, and recorded their findings carefully. Each student explained the idea in their own words and connected it to something familiar from daily life. By the end of the activity, the class understood that careful observation, clear thinking, and good communication help us learn new concepts. Their teacher asked them to read the passage aloud with accurate pronunciation, natural pauses, and expression suitable for ${grade}.`,
          readingInstructions: `Read the passage aloud clearly. Use accurate pronunciation, a steady pace, natural pauses, and suitable expression for ${grade}.`,
        }));
      } else if (component === "listening") {
        setApprovalForm(prev => ({
          ...prev,
          listeningTranscript: `Welcome, students. Today we are learning about ${subject}. First, listen for the main idea. Next, notice the important details and the order in which they are explained. A good listener stays focused, remembers key words, and connects each new detail to the topic. At the end, use only the information you heard to complete the ${prev.listeningActivityType.toLowerCase()} activity.`,
          listeningInstructions: "Listen carefully to the complete recording before answering. Base every answer only on the information you hear.",
        }));
        setReassignmentQuestionPreview([]);
      } else {
        setApprovalForm(prev => ({
          ...prev,
          speakingPrompt: `Speak for one to two minutes about an important idea you learned in ${subject}. Explain the idea clearly, give one relevant example, and describe why it is useful or interesting to a student in ${grade}.`,
        }));
      }
    } finally {
      setGeneratingMaterial(false);
    }
  };

  const handleApproveReassignment = async () => {
    if (!approvingRequest) return;
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/assessments/reassignment-requests/${approvingRequest.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId, "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...approvalForm, questions: reassignmentQuestionPreview }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Approval failed");
      setApprovingRequest(null);
      await fetchData();
      alert("A fresh assessment was generated and assigned successfully.");
    } catch (e: any) {
      alert(e.message || "Unable to approve this request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReassignment = async (request: any) => {
    const reason = window.prompt("Enter the rejection reason:");
    if (!reason?.trim()) return;
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/assessments/reassignment-requests/${request.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId, "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Rejection failed");
      await fetchData();
      alert("The request was rejected and the parent was notified.");
    } catch (e: any) {
      alert(e.message || "Unable to reject this request.");
    } finally {
      setActionLoading(false);
    }
  };

  const decideGameReassessment = async (request: any, decision: "APPROVED" | "REJECTED") => {
    const label = decision === "APPROVED" ? "approve one additional attempt" : "reject this request";
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/game-assessments/game-reassessment-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": schoolId, "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "The request could not be updated.");
      await fetchData();
    } catch (error: any) {
      alert(error.message || "The request could not be updated.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAIQuestions = async () => {
    if (!formData.grade || !formData.subject) {
      alert("Please select both a Class/Grade and Subject first.");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch("http://localhost:5001/assessments/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: formData.grade,
          subject: formData.subject,
          chapter: formData.chapter.trim() || undefined,
          difficulty: formData.difficulty,
          questionCount: formData.questionCount,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message;
        alert(message || "Source-grounded question generation failed.");
        return;
      }

      const generated = await response.json();
      setQuestions(generated);
      if (generated.some((question: any) => question.generationMode === "DEMO_LOCAL")) {
        alert("Demo assessment generated only from the uploaded sample PDF. This was not processed by Google NotebookLM.");
      }
      
      // Auto calculate marks based on marks parameter inside generated questions
      const total = generated.reduce((acc: number, curr: any) => acc + (curr.marks || 10), 0);
      setFormData(prev => ({ ...prev, totalMarks: total, passingMarks: Math.round(total * 0.5) }));

    } catch (e) {
      alert(e instanceof Error ? e.message : "Source-grounded assessment generation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateReadingPassage = async () => {
    setGeneratingMaterial(true);
    try {
      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Generate a Reading ${formData.readingMaterialType.toLowerCase()} for Grade '${formData.grade}', Subject '${formData.subject}', Difficulty '${formData.difficulty}'. Provide a simple title on the first line, then the text (about 80-120 words) for the student to read. Only output the ${formData.readingMaterialType.toLowerCase()}. No other text.`
        }),
      });
      if (!response.ok) throw new Error("AI Generation failed");
      const data = await response.json();
      setFormData(prev => ({ ...prev, readingText: data.response }));
    } catch (e) {
      console.error(e);
      alert("AI Generation failed. Filled with fallback passage.");
      setFormData(prev => ({
        ...prev,
        readingText: `The Forest Path\n\nWalk slowly down the path in the woods. You will see green leaves, brown trees, and a small stream of blue water. Birds sing in the branches above. A little rabbit hops past, looking for a sweet orange carrot. Keep walking until you reach the wooden bridge, then take a deep breath and enjoy the fresh forest air.`
      }));
    } finally {
      setGeneratingMaterial(false);
    }
  };

  const handleGenerateSpeakingTopic = async () => {
    setGeneratingMaterial(true);
    try {
      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Generate a speaking topic for Grade '${formData.grade}', Topic Type '${formData.speakingActivityType}'. Give instructions or prompts suitable for speaking. Keep it under 60 words.`
        }),
      });
      if (!response.ok) throw new Error("AI Generation failed");
      const data = await response.json();
      setFormData(prev => ({ ...prev, speakingPrompt: data.response }));
    } catch (e) {
      console.error(e);
      alert("AI Generation failed. Filled with fallback topic.");
      setFormData(prev => ({
        ...prev,
        speakingPrompt: `Introduce yourself to the admissions committee. Tell us your name, your age, what you like to do in your free time, and what you are looking forward to learning in your new class.`
      }));
    } finally {
      setGeneratingMaterial(false);
    }
  };

  const handleGenerateListeningTranscript = async () => {
    setGeneratingMaterial(true);
    try {
      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Generate a short listening exercise transcript suitable for Grade '${formData.grade}', Subject '${formData.subject}', Difficulty '${formData.difficulty}', and Activity Type '${formData.listeningActivityType}'. Keep it under 150 words. Do not include any formatting or questions, just the spoken text.`
        }),
      });
      if (!response.ok) throw new Error("AI Generation failed");
      const data = await response.json();
      setFormData(prev => ({ ...prev, listeningTranscript: data.response }));
    } catch (e) {
      console.error(e);
      alert("AI Generation failed. Filled with fallback transcript.");
      setFormData(prev => ({
        ...prev,
        listeningTranscript: "Hello students. Today we are going to learn about the solar system. The sun is at the center of the solar system, and eight planets orbit around it. Earth is the third planet from the sun and is the only planet known to support life."
      }));
    } finally {
      setGeneratingMaterial(false);
    }
  };

  const handleGenerateListeningQuestions = async () => {
    if (!formData.grade || !formData.subject) {
      alert("Please select both a Class/Grade and Subject first.");
      return;
    }

    setGeneratingMaterial(true);
    try {
      const response = await fetch("http://localhost:5001/assessments/generate-listening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: formData.grade,
          subject: formData.subject,
          difficulty: formData.difficulty,
          activityType: formData.listeningActivityType,
          transcript: formData.listeningTranscript,
          questionCount: formData.questionCount || 5,
        }),
      });

      if (!response.ok) throw new Error("AI Question generation failed");

      const data = await response.json();
      
      // Update transcript if AI returned a generated one
      if (data.transcript && !formData.listeningTranscript) {
        setFormData(prev => ({ ...prev, listeningTranscript: data.transcript }));
      }

      const newListeningQuestions = data.questions.map((q: any) => ({
        ...q,
        isListening: true,
      }));

      setQuestions(prev => {
        const filtered = prev.filter(item => !item.isListening);
        const combined = [...filtered, ...newListeningQuestions];
        
        // Compute marks sum
        const writtenTotal = filtered.reduce((acc: number, curr: any) => acc + (curr.marks || 10), 0);
        const listeningTotal = formData.hasListening ? Number(formData.listeningTotalMarks || 20) : 0;
        const readingTotal = formData.hasReading ? Number(formData.readingTotalMarks || 20) : 0;
        const speakingTotal = formData.hasSpeaking ? Number(formData.speakingTotalMarks || 20) : 0;
        
        const total = writtenTotal + listeningTotal + readingTotal + speakingTotal;
        setTimeout(() => {
          setFormData(prevForm => ({
            ...prevForm,
            totalMarks: total,
            passingMarks: Math.round(total * 0.5),
            writtenPassingMarks: Math.round(writtenTotal * 0.5),
          }));
        }, 0);

        return combined;
      });

      alert("AI questions generated successfully based on transcript.");
    } catch (e) {
      console.error(e);
      alert(`AI Question generation failed. Added fallback questions matching "${formData.listeningActivityType}".`);
      const activity = formData.listeningActivityType.toLowerCase();
      const count = Math.max(1, Number(formData.questionCount) || 5);
      const fallbackQuestions = Array.from({ length: count }, (_, index) => {
        if (activity.includes("match the following")) {
          const matches = [
            ["The Sun", "The star at the center of the solar system"],
            ["Earth", "The third planet from the Sun"],
            ["Eight", "The number of planets orbiting the Sun"],
            ["Life", "What Earth is known to support"],
          ];
          const pair = matches[index % matches.length];
          return {
            type: "MCQ",
            questionText: `Match "${pair[0]}" with the correct description.`,
            options: matches.map(match => match[1]),
            correctAnswer: pair[1],
            explanation: "The matching relationship is stated in the transcript.",
            marks: 5,
            isListening: true,
          };
        }
        if (activity.includes("fill in the blank") || activity.includes("complete sentence")) {
          const blanks = [
            ["The sun is at the _____ of the solar system.", "center"],
            ["_____ planets orbit around the sun.", "Eight"],
            ["Earth is the _____ planet from the sun.", "third"],
          ];
          return { type: "WRITTEN", questionText: blanks[index % blanks.length][0], options: [], correctAnswer: blanks[index % blanks.length][1], explanation: "The missing phrase is stated in the transcript.", marks: 5, isListening: true };
        }
        if (activity.includes("true or false")) {
          const statements = [
            ["The Sun is at the center of the solar system.", "True"],
            ["Earth is the fourth planet from the Sun.", "False"],
            ["Eight planets orbit the Sun.", "True"],
            ["Earth is known to support life.", "True"],
          ];
          const statement = statements[index % statements.length];
          return { type: "MCQ", questionText: statement[0], options: ["True", "False"], correctAnswer: statement[1], explanation: "The answer is stated in the transcript.", marks: 5, isListening: true };
        }
        if (activity.includes("choose the correct answer")) {
          return { type: "MCQ", questionText: index % 2 ? "Which planet is third from the sun?" : "How many planets orbit the sun?", options: index % 2 ? ["Earth", "Mars", "Venus", "Jupiter"] : ["Six", "Seven", "Eight", "Nine"], correctAnswer: index % 2 ? "Earth" : "Eight", explanation: "The answer is stated in the transcript.", marks: 5, isListening: true };
        }
        if (activity.includes("sequence event")) {
          const sequenceTasks = [
            ["Arrange these events in the order heard: (A) Earth is described as supporting life; (B) the Sun is introduced at the center; (C) eight planets are said to orbit the Sun; (D) Earth is identified as the third planet.", "B → C → D → A"],
            ["Which order matches the passage? Write the letters in order: (A) Earth supports life; (B) eight planets orbit; (C) Earth is third from the Sun.", "B → C → A"],
            ["Put these ideas in listening order: (A) number of planets; (B) location of the Sun; (C) Earth’s position.", "B → A → C"],
          ];
          const task = sequenceTasks[index % sequenceTasks.length];
          return { type: "WRITTEN", questionText: task[0], options: [], correctAnswer: task[1], explanation: "The order follows the sequence of statements in the transcript.", marks: 5, isListening: true };
        }
        if (activity.includes("summarize")) {
          return { type: "WRITTEN", questionText: `Summarize the listening passage${index ? `, focusing on key idea ${index + 1}` : ""}.`, options: [], correctAnswer: "The solar system has the Sun at its center, eight orbiting planets, and Earth is the third planet and supports life.", explanation: "The response should include the main ideas.", marks: 5, isListening: true };
        }
        if (activity.includes("identify keyword")) {
          return { type: "WRITTEN", questionText: `Write the important keyword connected to ${["the center of the system", "the number of planets", "the third planet", "supporting living things"][index % 4]}.`, options: [], correctAnswer: ["Sun", "Eight", "Earth", "Life"][index % 4], explanation: "The keyword is spoken in the transcript.", marks: 5, isListening: true };
        }
        if (activity.includes("short question")) {
          return { type: "WRITTEN", questionText: ["What is at the center of the solar system?", "How many planets orbit the Sun?", "Which planet is third from the Sun?", "What is Earth known to support?"][index % 4], options: [], correctAnswer: ["The Sun", "Eight", "Earth", "Life"][index % 4], explanation: "The answer is stated directly in the transcript.", marks: 5, isListening: true };
        }
        const transcriptSentences = formData.listeningTranscript
          .replace(/\s+/g, " ")
          .split(/(?<=[.!?])\s+/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 25);
        const sentence = transcriptSentences[index % Math.max(1, transcriptSentences.length)] || formData.listeningTranscript.trim();
        const cleaned = sentence.replace(/^(welcome class[.!]?\s*|today\s+we\s+(?:will|are going to)\s+)/i, "").trim();
        const whenMatch = cleaned.match(/\bwhen\s+(.+?),\s*(.+?)[.!?]?$/i);
        if (whenMatch) {
          return { type: "WRITTEN", questionText: `According to the passage, what happens when ${whenMatch[1]}?`, options: [], correctAnswer: whenMatch[2].replace(/[.!?]+$/, ""), explanation: "The answer is stated directly in the transcript.", marks: 5, isListening: true };
        }
        const relationMatch = cleaned.match(/^(.+?)\s+(is|are|was|were|has|have|can|will)\s+(.+?)[.!?]?$/i);
        if (relationMatch) {
          return { type: "WRITTEN", questionText: `What does the passage say about ${relationMatch[1]}?`, options: [], correctAnswer: `${relationMatch[2]} ${relationMatch[3]}`.replace(/[.!?]+$/, ""), explanation: "The answer is stated directly in the transcript.", marks: 5, isListening: true };
        }
        const topic = cleaned.split(/\s+/).slice(0, 7).join(" ").replace(/[,:;.!?]+$/, "");
        return { type: "WRITTEN", questionText: `What information does the speaker give about ${topic}?`, options: [], correctAnswer: cleaned.replace(/[.!?]+$/, ""), explanation: "Use the corresponding detail from the listening passage.", marks: 5, isListening: true };
      });

      setQuestions(prev => [
        ...prev.filter(q => !q.isListening),
        ...fallbackQuestions
      ]);
    } finally {
      setGeneratingMaterial(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        type: "MCQ",
        questionText: "New Question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option A",
        explanation: "",
        marks: 10,
        order: prev.length,
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      const writtenTotal = filtered.filter(item => !item.isListening).reduce((acc: number, curr: any) => acc + (curr.marks || 10), 0);
      const listeningTotal = formData.hasListening ? Number(formData.listeningTotalMarks || 20) : 0;
      const readingTotal = formData.hasReading ? Number(formData.readingTotalMarks || 20) : 0;
      const speakingTotal = formData.hasSpeaking ? Number(formData.speakingTotalMarks || 20) : 0;
      
      const total = (formData.hasWritten ? writtenTotal : 0) + readingTotal + speakingTotal + listeningTotal;
      setTimeout(() => {
        setFormData(prevForm => ({
          ...prevForm,
          totalMarks: total,
          passingMarks: Math.round(total * 0.5),
          writtenPassingMarks: Math.round(writtenTotal * 0.5),
        }));
      }, 0);

      return filtered;
    });
  };

  const handleQuestionChange = (idx: number, field: string, val: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...(q.options || [])];
      opts[optIdx] = val;
      return { ...q, options: opts };
    }));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.hasWritten && !formData.hasReading && !formData.hasSpeaking && !formData.hasListening) {
      alert("Please enable at least one assessment component (Written, Reading, Speaking, or Listening).");
      return;
    }

    if (formData.hasWritten && questions.filter(q => !q.isListening).length === 0) {
      alert("Please add/generate at least one question for the Written Assessment before saving.");
      return;
    }

    if (formData.hasListening && questions.filter(q => q.isListening).length === 0) {
      alert("Please add/generate at least one question for the Listening Skills Assessment before saving.");
      return;
    }

    setActionLoading(true);
    try {
      const computedTotal = (formData.hasWritten ? questions.filter(q => !q.isListening).reduce((acc, q) => acc + (Number(q.marks) || 10), 0) : 0) +
        (formData.hasReading ? Number(formData.readingTotalMarks || 0) : 0) +
        (formData.hasSpeaking ? Number(formData.speakingTotalMarks || 0) : 0) +
        (formData.hasListening ? Number(formData.listeningTotalMarks || 0) : 0);

      const computedPassing = (formData.hasWritten ? Number((formData.hasReading || formData.hasSpeaking || formData.hasListening) ? (formData.writtenPassingMarks || 25) : formData.passingMarks) : 0) +
        (formData.hasReading ? Number(formData.readingPassingMarks || 0) : 0) +
        (formData.hasSpeaking ? Number(formData.speakingPassingMarks || 0) : 0) +
        (formData.hasListening ? Number(formData.listeningPassingMarks || 0) : 0);

      const selectedQuestions = [
        ...(formData.hasWritten ? questions.filter(q => !q.isListening) : []),
        ...(formData.hasListening ? questions.filter(q => q.isListening) : []),
      ];
      const filteredQuestions = selectedQuestions.map((question, index) => ({
        type: question.type,
        questionText: question.questionText,
        options: Array.isArray(question.options) ? question.options : [],
        correctAnswer: question.correctAnswer || undefined,
        explanation: question.explanation || undefined,
        marks: Number(question.marks) || 0,
        order: question.order ?? index,
        isListening: Boolean(question.isListening),
      }));

      // Source chapter controls RAG retrieval and is not persisted on the assessment template.
      const { writtenPassingMarks, chapter, ...apiPayload } = {
        ...formData,
        dueDate: formData.dueDate || undefined,
        totalMarks: computedTotal,
        passingMarks: computedPassing,
        questions: filteredQuestions,
      };

      const url = editingTemplateId 
        ? `http://localhost:5001/assessments/${editingTemplateId}`
        : "http://localhost:5001/assessments";

      const method = editingTemplateId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Template save failed details:", errData);
        throw new Error(errData.message ? (Array.isArray(errData.message) ? errData.message.join(", ") : errData.message) : "Failed to save template");
      }

      setIsCreating(false);
      setEditingTemplateId(null);
      fetchData();
      alert("Assessment template saved successfully.");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to save template: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/${id}`, {
        method: "DELETE",
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Delete template failed");
      fetchData();
      alert("Template deleted successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete template.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishClick = async (template: any) => {
    try {
      const response = await fetch("http://localhost:5001/application", {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (response.ok) {
        setApplications(await response.json());
      }
    } catch (error) {
      // Keep the last loaded candidates if a background refresh fails.
      console.error("Could not refresh assessment candidates:", error);
    }

    setIsPublishing(template);
    setPublishDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days from now
    setPublishTargetAppIds([]);
    setAssignmentType("SELECTED");
    setSelectedSection("");
    setSelectedGroup("");
    setAllowStudentRescheduling(false);
  };

  const hasExistingAssignment = (application: any, template: any) =>
    application.assessments?.some(
      (assessment: any) =>
        assessment.status !== "ARCHIVED" &&
        assessment.title === template.title &&
        assessment.grade === template.grade &&
        assessment.subject === template.subject,
    );

  const handleToggleTargetApp = (appId: string) => {
    setPublishTargetAppIds(prev => 
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const handleAssignmentTypeChange = (type: string) => {
    setAssignmentType(type);
    if (!isPublishing) return;
    const gradeApps = applications.filter((app: any) => app.grade === isPublishing.grade && app.assessmentRequired !== false);
    const eligibleApps = gradeApps.filter((app: any) => !hasExistingAssignment(app, isPublishing));
    
    if (type === "ALL") {
      setPublishTargetAppIds(eligibleApps.map((app: any) => app.id));
    } else if (type === "SELECTED") {
      setPublishTargetAppIds([]);
    } else if (type === "SECTION") {
      setPublishTargetAppIds([]);
      setSelectedSection("");
    } else if (type === "GROUP") {
      setPublishTargetAppIds([]);
      setSelectedGroup("");
    }
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    if (!isPublishing) return;
    const gradeApps = applications.filter((app: any) => app.grade === isPublishing.grade && app.assessmentRequired !== false);
    const eligibleApps = gradeApps.filter((app: any) => !hasExistingAssignment(app, isPublishing));
    const sectionApps = eligibleApps.filter((app: any) => (app.section || "A").toUpperCase() === section.toUpperCase());
    setPublishTargetAppIds(sectionApps.map((app: any) => app.id));
  };

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    if (!isPublishing) return;
    const gradeApps = applications.filter((app: any) => app.grade === isPublishing.grade && app.assessmentRequired !== false);
    const eligibleApps = gradeApps.filter((app: any) => !hasExistingAssignment(app, isPublishing));
    
    let filtered: any[] = [];
    if (group === "Group X") {
      filtered = eligibleApps.filter((_, idx) => idx % 2 === 0);
    } else if (group === "Group Y") {
      filtered = eligibleApps.filter((_, idx) => idx % 2 !== 0);
    } else if (group === "Group Z") {
      filtered = eligibleApps;
    }
    setPublishTargetAppIds(filtered.map((app: any) => app.id));
  };

  const handlePublishSubmit = async () => {
    if (publishTargetAppIds.length === 0) {
      alert("Please select at least one student application.");
      return;
    }

    if (isPublishing && ['SCHOOL', 'BOTH'].includes(isPublishing.assessmentMode)) {
      if (!assessmentDate) {
        alert("Please select the Assessment Date.");
        return;
      }
      if (!campus || !building || !floor || !roomNumber) {
        alert("Please fill all venue details.");
        return;
      }
      if (!contactName || !contactPhone || !contactEmail) {
        alert("Please fill all contact details.");
        return;
      }
      if (slots.length === 0) {
        alert("Please add at least one slot.");
        return;
      }
      for (const s of slots) {
        if (!s.slotName || !s.startTime || !s.endTime || s.capacity <= 0) {
          alert("Please fill all slot fields with valid capacity.");
          return;
        }
      }
    }

    setActionLoading(true);
    try {
      const response = await fetch("http://localhost:5001/assessments/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          assessmentId: isPublishing.id,
          applicationIds: publishTargetAppIds,
          dueDate: publishDueDate,
          ...(['SCHOOL', 'BOTH'].includes(isPublishing.assessmentMode) && {
            schedule: {
              assessmentDate,
              campus,
              building,
              floor,
              roomNumber,
              venue: venueDescription,
              instructions,
              contactPerson: `${contactName} (${contactDesignation})`,
              contactPhone,
              contactEmail,
              documentsRequired: requiredDocs,
              allowStudentRescheduling,
            },
            slots: slots.map(s => ({
              slotName: s.slotName,
              startTime: s.startTime,
              endTime: s.endTime,
              capacity: s.capacity,
            })),
            autoBook,
            notificationPreferences: notifyPrefs,
          }),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message;
        throw new Error(message || "Failed to publish assessment");
      }

      setIsPublishing(null);
      fetchData();
      alert("Assessment assigned and published successfully.");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Publish failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGradingClick = async (sub: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/submissions/${sub.id}`, {
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch submission details");
      const details = await res.json();
      setGradingSubmission(details);
      
      // Initialize grading state for answers
      setGradingAnswers(details.answers.map((a: any) => ({
        answerId: a.id,
        questionId: a.questionId,
        marksObtained: a.marksObtained !== null ? a.marksObtained : 0,
        isCorrect: a.isCorrect !== null ? a.isCorrect : false,
        teacherRemarks: a.teacherRemarks || "",
        type: a.question.type,
        maxMarks: a.question.marks,
        isListening: a.question.isListening ?? false,
      })));

       const initialReadingScore = details.readingManualScore ?? (details.readingAiScore ? Math.round((details.readingAiScore / 100) * details.assessment.readingTotalMarks) : 0);
      const initialSpeakingScore = details.speakingManualScore ?? (details.speakingAiScore ? Math.round((details.speakingAiScore / 100) * details.assessment.speakingTotalMarks) : 0);
      const initialListeningScore = details.listeningManualScore ?? (details.listeningAiScore ? Math.round((details.listeningAiScore / 100) * details.assessment.listeningTotalMarks) : 0);
      
      setReadingScoreOverride(initialReadingScore);
      setReadingRemarksOverride(details.readingTeacherRemarks || "");
      setSpeakingScoreOverride(initialSpeakingScore);
      setSpeakingRemarksOverride(details.speakingTeacherRemarks || "");
      setListeningScoreOverride(initialListeningScore);
      setListeningRemarksOverride(details.listeningTeacherRemarks || "");
      setReadingAiData(details.readingEvaluation);
      setSpeakingAiData(details.speakingEvaluation);
      setListeningAiData(details.listeningEvaluation);

      let initialScore = 0;
      if (details.assessment.hasWritten) {
        initialScore += details.answers.filter((a: any) => !a.question?.isListening).reduce((acc: number, curr: any) => acc + (curr.marksObtained || 0), 0);
      }
      if (details.assessment.hasReading) {
        initialScore += initialReadingScore;
      }
      if (details.assessment.hasSpeaking) {
        initialScore += initialSpeakingScore;
      }
      if (details.assessment.hasListening) {
        initialScore += initialListeningScore;
      }

      setGradingStatus(initialScore >= details.assessment.passingMarks ? "PASS" : "FAIL");
      setGradingRemarks("");
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGradingAnswerChange = (ansId: string, field: string, val: any) => {
    setGradingAnswers(prev => prev.map(a => {
      if (a.answerId !== ansId) return a;
      
      const updated = { ...a, [field]: val };
      // auto calculate isCorrect if marksObtained matches maxMarks or is above 50%
      if (field === 'marksObtained') {
        const score = Number(val);
        updated.isCorrect = score >= (a.maxMarks * 0.5);
      }
      return updated;
    }));
  };

  const handleGradingSubmit = async (publish: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch("http://localhost:5001/assessments/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId: gradingSubmission.id,
          publish,
          answers: gradingAnswers.map(a => ({
            answerId: a.answerId,
            marksObtained: Number(a.marksObtained),
            isCorrect: a.isCorrect,
            teacherRemarks: a.teacherRemarks,
          })),
          status: gradingStatus,
          remarks: gradingRemarks,
          readingManualScore: gradingSubmission.assessment.hasReading ? Number(readingScoreOverride) : undefined,
          readingTeacherRemarks: gradingSubmission.assessment.hasReading ? readingRemarksOverride : undefined,
          speakingManualScore: gradingSubmission.assessment.hasSpeaking ? Number(speakingScoreOverride) : undefined,
          speakingTeacherRemarks: gradingSubmission.assessment.hasSpeaking ? speakingRemarksOverride : undefined,
          listeningManualScore: gradingSubmission.assessment.hasListening ? Number(listeningScoreOverride) : undefined,
          listeningTeacherRemarks: gradingSubmission.assessment.hasListening ? listeningRemarksOverride : undefined,
        }),
      });

      if (!res.ok) throw new Error("Submission grading failed");

      setGradingSubmission(null);
      fetchData();
      alert(publish ? "Grades and scorecard published successfully." : "Grades approved and saved as Reviewed.");
    } catch (e) {
      console.error(e);
      alert("Failed to post grading.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAIGradeClick = async () => {
    if (!gradingSubmission) return;
    setAiLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/assessments/submissions/${gradingSubmission.id}/ai-grade`, {
        method: "POST",
        headers: {
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("AI auto-grading request failed");
      const data = await response.json();

      setGradingSubmission((current: any) => current ? ({
        ...current,
        readingAiScore: data.readingAiScore ?? current.readingAiScore,
        readingEvaluation: data.readingEvaluation ?? current.readingEvaluation,
        speakingAiScore: data.speakingAiScore ?? current.speakingAiScore,
        speakingEvaluation: data.speakingEvaluation ?? current.speakingEvaluation,
        listeningAiScore: data.listeningAiScore ?? current.listeningAiScore,
        listeningEvaluation: data.listeningEvaluation ?? current.listeningEvaluation,
      }) : current);
      
      // Update local state gradingAnswers
      setGradingAnswers(prev => prev.map(a => {
        const matchingGraded = data.answers.find((g: any) => g.answerId === a.answerId);
        if (matchingGraded) {
          return {
            ...a,
            marksObtained: matchingGraded.marksObtained,
            isCorrect: matchingGraded.isCorrect,
            teacherRemarks: matchingGraded.teacherRemarks
          };
        }
        return a;
      }));

      if (gradingSubmission.assessment.hasReading && data.readingAiScore !== undefined) {
        setReadingScoreOverride(Math.round((data.readingAiScore / 100) * gradingSubmission.assessment.readingTotalMarks));
        setReadingAiData(data.readingEvaluation);
      }
      if (gradingSubmission.assessment.hasSpeaking && data.speakingAiScore !== undefined) {
        setSpeakingScoreOverride(Math.round((data.speakingAiScore / 100) * gradingSubmission.assessment.speakingTotalMarks));
        setSpeakingAiData(data.speakingEvaluation);
      }
      if (gradingSubmission.assessment.hasListening && data.listeningAiScore !== undefined) {
        setListeningScoreOverride(Math.round((data.listeningAiScore / 100) * gradingSubmission.assessment.listeningTotalMarks));
        setListeningAiData(data.listeningEvaluation);
      }

      // Update decision status and remarks dynamically based on score
      setGradingStatus(data.status);
      setGradingRemarks(data.remarks);
      
      alert("AI grading evaluation suggestions have been calculated and populated! Please review the responses before publishing.");
    } catch (err) {
      console.error(err);
      alert("AI Auto-grading is currently unavailable. Please grade manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const saveGameSchoolReview = async (reviewStatus: "REVIEWED" | "NEEDS_FOLLOW_UP") => {
    const gameId = gameResultSubmission?.gameResult?.gameId;
    const resultId = gameResultSubmission?.gameResult?.id;
    if (!gameId || !resultId || !gameSchoolReview.trim()) return;
    setGameReviewSaving(true);
    try {
      const isBundle = String(gameResultSubmission?.gameSource || "").startsWith("REAL_TIME_GAMES");
      const studentId = gameResultSubmission?.application?.id || gameResultSubmission?.gameResult?.studentId;
      const endpoint = isBundle ? `http://localhost:5001/games/results/student/${studentId}/review` : `http://localhost:5001/games/${gameId}/reviews/${resultId}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewStatus, schoolReview: gameSchoolReview.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to save the school review.");
      setGameResultSubmission((current: any) => current ? ({
        ...current,
        gameResult: { ...current.gameResult, reviewStatus, schoolReview: gameSchoolReview.trim(), reviewedAt: payload.reviewedAt },
      }) : current);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save the school review.");
    } finally {
      setGameReviewSaving(false);
    }
  };

  const handleEditClick = async (template: any) => {
    try {
      const response = await fetch(
        `http://localhost:5001/assessments/${template.id}`,
        {
          headers: {
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("Could not load the assessment template.");
      }
      template = await response.json();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not open the assessment template.",
      );
      return;
    }

    setEditingTemplateId(template.id);
    setFormData({
      title: template.title,
      description: template.description || "",
      instructions: template.instructions || "",
      grade: template.grade,
      subject: template.subject,
      chapter: "",
      difficulty: template.difficulty,
      assessmentMode: template.assessmentMode || "HOME",
      proctoringEnabled: template.proctoringEnabled ?? false,
      questionCount: template.questionCount,
      timeLimit: template.timeLimit,
      totalMarks: template.totalMarks,
      passingMarks: template.passingMarks,
      dueDate: "",
      allowCalculator: template.allowCalculator,
      shuffleQuestions: template.shuffleQuestions,
      shuffleOptions: template.shuffleOptions,
      showResultImmediately: template.showResultImmediately,
      allowRetake: template.allowRetake,
      retakeCount: template.retakeCount,
      hasWritten: template.hasWritten ?? false,
      hasReading: template.hasReading ?? false,
      hasSpeaking: template.hasSpeaking ?? false,
      readingMaterialType: template.readingMaterialType || "PASSAGE",
      readingMaterialUrl: template.readingMaterialUrl || "",
      readingText: template.readingText || "",
      readingTime: template.readingTime || 60,
      readingRecordDuration: template.readingRecordDuration || 60,
      readingInstructions: template.readingInstructions || "",
      readingTotalMarks: template.readingTotalMarks || 20,
      readingPassingMarks: template.readingPassingMarks || 10,
      speakingActivityType: template.speakingActivityType || "Introduce Yourself",
      speakingMaterialType: template.speakingMaterialType || "PROMPT",
      speakingMaterialUrl: template.speakingMaterialUrl || "",
      speakingPrompt: template.speakingPrompt || "",
      speakingPrepTime: template.speakingPrepTime || 60,
      speakingTimeLimit: template.speakingTimeLimit || 120,
      speakingTotalMarks: template.speakingTotalMarks || 20,
      speakingPassingMarks: template.speakingPassingMarks || 10,
      writtenPassingMarks: template.writtenPassingMarks || (template.passingMarks - (template.hasReading ? (template.readingPassingMarks || 0) : 0) - (template.hasSpeaking ? (template.speakingPassingMarks || 0) : 0) - (template.hasListening ? (template.listeningPassingMarks || 0) : 0)) || 25,
      hasListening: template.hasListening ?? false,
      listeningActivityType: template.listeningActivityType || "Listen and Answer Questions",
      listeningMaterialType: template.listeningMaterialType || "AUDIO",
      listeningMaterialUrl: template.listeningMaterialUrl || "",
      listeningTranscript: template.listeningTranscript || "",
      listeningInstructions: template.listeningInstructions || "",
      listeningPlaysAllowed: template.listeningPlaysAllowed ?? 1,
      listeningAudioSpeed: template.listeningAudioSpeed ?? 1.0,
      listeningPrepTime: template.listeningPrepTime || 30,
      listeningDuration: template.listeningDuration || 0,
      listeningTotalMarks: template.listeningTotalMarks || 20,
      listeningPassingMarks: template.listeningPassingMarks || 10,
      listeningTimeLimit: template.listeningTimeLimit || 10,
    });
    setQuestions((template.questions || []).map((q: any) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    })));
    setIsCreating(true);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleNewClick = () => {
    setEditingTemplateId(null);
    setFormData({
      title: "",
      description: "",
      instructions: "",
      grade: "Grade 1",
      subject: "All",
      chapter: "",
      difficulty: "MEDIUM",
      assessmentMode: "HOME",
      proctoringEnabled: false,
      questionCount: 5,
      timeLimit: 30,
      totalMarks: 50,
      passingMarks: 25,
      dueDate: "",
      allowCalculator: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultImmediately: true,
      allowRetake: false,
      retakeCount: 1,
      hasWritten: false,
      hasReading: false,
      hasSpeaking: false,
      readingMaterialType: "PASSAGE",
      readingMaterialUrl: "",
      readingText: "",
      readingTime: 60,
      readingRecordDuration: 60,
      readingInstructions: "",
      readingTotalMarks: 20,
      readingPassingMarks: 10,
      speakingActivityType: "Introduce Yourself",
      speakingMaterialType: "PROMPT",
      speakingMaterialUrl: "",
      speakingPrompt: "",
      speakingTimeLimit: 120,
      speakingTotalMarks: 20,
      speakingPassingMarks: 10,
      speakingPrepTime: 60,
      writtenPassingMarks: 25,
      hasListening: false,
      listeningActivityType: "Listen and Answer Questions",
      listeningMaterialType: "AUDIO",
      listeningMaterialUrl: "",
      listeningTranscript: "",
      listeningInstructions: "",
      listeningPlaysAllowed: 1,
      listeningAudioSpeed: 1.0,
      listeningPrepTime: 30,
      listeningDuration: 0,
      listeningTotalMarks: 20,
      listeningPassingMarks: 10,
      listeningTimeLimit: 10,
    });
    setQuestions([]);
    setIsCreating(true);
  };

  const renderQuestionEditor = (q: any, idx: number, displayNumber: number) => (
    <div key={q.id || idx} className={`p-5 border rounded-2xl space-y-4 relative ${q.isListening ? 'border-[#007f70]/30 bg-[#eefaf7]/20' : 'border-[#dceae6] bg-[#fafdfc]'}`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${q.isListening ? 'bg-[#eefaf7] text-[#007f70] border border-[#b2e2d5]' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
          {q.isListening ? 'Listening Question' : 'Written Question'}
        </span>
        <button type="button" onClick={() => handleRemoveQuestion(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-[#607080] uppercase tracking-wider mb-1">Question {displayNumber} Text</label>
          <input type="text" required value={q.questionText} onChange={(e) => handleQuestionChange(idx, "questionText", e.target.value)} className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#607080] uppercase tracking-wider mb-1">
            {q.isListening ? "Activity Format" : "Type"}
          </label>
          {q.isListening ? (
            <div className="min-h-[38px] w-full rounded-xl border border-[#b2e2d5] bg-[#eefaf7] p-2.5 text-xs font-semibold text-[#007f70]">
              {formData.listeningActivityType}
            </div>
          ) : (
            <select value={q.type} onChange={(e) => handleQuestionChange(idx, "type", e.target.value)} className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none">
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="WRITTEN">Written / Subjective</option>
            </select>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#607080] uppercase tracking-wider mb-1">Marks</label>
          <input type="number" required min={1} value={q.marks} onChange={(e) => handleQuestionChange(idx, "marks", Number(e.target.value))} className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none" />
        </div>
      </div>

      {q.type === "MCQ" && (
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-[#607080] uppercase tracking-wider mb-1">Options & Correct Answer Choice</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((optIdx) => (
              <div key={optIdx} className="flex items-center gap-2 bg-white border border-[#dceae6] px-3 py-1.5 rounded-xl">
                <input type="radio" name={`correct-${idx}`} checked={q.options?.[optIdx] === q.correctAnswer} onChange={() => handleQuestionChange(idx, "correctAnswer", q.options?.[optIdx] || "")} className="accent-[#007f70]" />
                <input
                  type="text"
                  placeholder={`Option ${optIdx + 1}`}
                  required
                  value={q.options?.[optIdx] || ""}
                  onChange={(e) => {
                    handleOptionChange(idx, optIdx, e.target.value);
                    if (q.options?.[optIdx] === q.correctAnswer) handleQuestionChange(idx, "correctAnswer", e.target.value);
                  }}
                  className="w-full text-xs font-medium text-[#071633] outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white border border-[#dceae6] rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#071633] flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#007f70]" /> Assessments Management
          </h1>
          <p className="text-xs text-[#71818d] mt-1">Design academic evaluations, auto-evaluate multiple choice tests, and grade student submissions.</p>
        </div>
        {!isCreating && (
          <button
            onClick={handleNewClick}
            className="flex items-center justify-center gap-2 bg-[#007f70] hover:bg-[#00665a] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Create Assessment Template
          </button>
        )}
      </div>

      {isCreating ? (
        /* Template Creator / Editor View */
        <div className="bg-[#f8fbfa] border border-[#d7e8e3] rounded-3xl shadow-[0_16px_50px_-30px_rgba(7,22,51,0.35)] overflow-hidden">
          <div className="px-5 py-4 sm:px-7 bg-white border-b border-[#dceae6] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button 
              onClick={() => setIsCreating(false)}
              className="flex w-fit items-center gap-2 text-xs text-[#607080] hover:text-[#007f70] font-bold transition-colors"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#dceae6] bg-[#f8fbf9]">
                <ArrowLeft className="h-4 w-4" />
              </span>
              Back to assessments
            </button>
            <div className="sm:text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#008b7a]">Template builder</p>
              <h3 className="mt-0.5 text-sm font-extrabold text-[#071633]">
                {editingTemplateId ? "Edit assessment template" : "Create a new assessment"}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSaveTemplate} className="flex flex-col gap-6 p-4 sm:p-7">
            <section className="order-first rounded-2xl border border-[#dceae6] bg-white p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-[#e8f0ed] pb-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7f7f3] text-[#007f70]">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-[#071633]">Assessment overview</h4>
                  <p className="text-[10px] text-[#71818d]">Identify the assessment and set its overall candidate time limit.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Grade 1 Mathematics Entrance Assessment"
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70] focus:ring-2 focus:ring-[#007f70]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Class / Grade *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => {
                      const grade = e.target.value;
                      const availableSubjects = SUBJECTS_BY_GRADE[grade];
                      setFormData(prev => ({
                        ...prev,
                        grade,
                        subject: prev.subject === "All" || availableSubjects.includes(prev.subject)
                          ? prev.subject
                          : "All",
                      }));
                      setQuestions([]);
                    }}
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  >
                    {["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Duration (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={180}
                    value={formData.timeLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: Number(e.target.value) }))}
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  />
                  <p className="mt-1.5 text-[9px] text-[#71818d]">Overall reverse countdown.</p>
                </div>
              </div>

              <div className="mt-5 border-t border-[#e8f0ed] pt-5">
                <label className="block text-xs font-bold text-[#344054] mb-3">Assessment Mode *</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    { value: "HOME", label: "Home Assessment", desc: "Visible only inside Parent Portal" },
                    { value: "SCHOOL", label: "At School Assessment", desc: "Visible only inside Student Assessment Login" },
                    { value: "BOTH", label: "Both Home & At School", desc: "Visible in both portals" },
                  ].map((mode) => (
                    <label
                      key={mode.value}
                      className={`flex min-h-[68px] cursor-pointer select-none items-start gap-3 rounded-xl border p-3 transition-colors ${
                        formData.assessmentMode === mode.value
                          ? "border-[#8fd1c5] bg-[#f1faf8]"
                          : "border-[#e1edea] bg-white hover:bg-[#fafdfc]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="assessmentMode"
                        value={mode.value}
                        checked={formData.assessmentMode === mode.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, assessmentMode: e.target.value }))}
                        className="mt-0.5 h-4 w-4 shrink-0 border-[#b9d5cf] text-[#007f70] focus:ring-[#007f70]"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold leading-4 text-[#071633]">{mode.label}</span>
                        <p className="mt-1 text-[10px] leading-4 text-[#71818d]">{mode.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {(formData.assessmentMode === "SCHOOL" || formData.assessmentMode === "BOTH") && (
                  <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#cde7e1] bg-[#f3fbf9] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-[#007f70]" />
                        <span className="text-xs font-extrabold text-[#071633]">Camera and microphone monitoring</span>
                      </div>
                      <p className="mt-1.5 max-w-xl text-[10px] leading-relaxed text-[#607080]">
                        When enabled, students must verify their real camera and microphone before entering. A live preview remains visible during the exam.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.proctoringEnabled}
                      onClick={() => setFormData(prev => ({ ...prev, proctoringEnabled: !prev.proctoringEnabled }))}
                    className={`relative h-9 w-20 shrink-0 rounded-full border text-[10px] font-extrabold transition ${
                      formData.proctoringEnabled
                        ? "border-[#007f70] bg-[#007f70] text-white"
                        : "border-[#b9d5cf] bg-white text-[#526474]"
                    }`}
                  >
                      <span className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full shadow-sm transition-all ${
                        formData.proctoringEnabled ? "left-[50px] bg-white" : "left-1.5 bg-[#b9c8c4]"
                      }`} />
                      <span className={`absolute top-1/2 -translate-y-1/2 ${
                        formData.proctoringEnabled ? "left-4" : "right-4"
                      }`}>
                        {formData.proctoringEnabled ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Assessment Components Section */}
            <section className="order-first space-y-4 rounded-2xl border border-[#dceae6] bg-white p-4 sm:p-6">
              <div>
                <h4 className="text-sm font-extrabold text-[#071633]">Assessment components</h4>
                <p className="mt-1 text-[10px] text-[#71818d]">Choose one or more sections. Each selected section reveals its own settings below.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Written Card */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, hasWritten: !prev.hasWritten }))}
                  className={`group min-h-[116px] p-4 border rounded-2xl cursor-pointer transition-all flex flex-col items-start justify-between select-none ${
                    formData.hasWritten 
                      ? "border-[#007f70] bg-[#eefaf7] shadow-[0_8px_24px_-18px_#007f70] ring-1 ring-[#007f70]/10" 
                      : "border-[#dceae6] bg-white hover:-translate-y-0.5 hover:border-[#8fcfc2] hover:shadow-sm"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <FileText className={`h-5 w-5 ${formData.hasWritten ? "text-[#007f70]" : "text-[#71818d]"}`} />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shadow-sm ${
                      formData.hasWritten ? "bg-[#007f70] border-[#007f70] text-white" : "border-[#9aaca7] bg-white"
                    }`}>
                      {formData.hasWritten && <Check className="h-4 w-4 stroke-[3.5] !text-white" color="#ffffff" stroke="#ffffff" />}
                    </div>
                  </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#071633]">Written Assessment</p>
                      <p className="text-[10px] text-[#607080]">Multiple-choice, short-answer, and long-answer questions</p>
                    </div>
                </div>

                {/* Listening Card */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, hasListening: !prev.hasListening }))}
                  className={`group min-h-[116px] p-4 border rounded-2xl cursor-pointer transition-all flex flex-col items-start justify-between select-none ${
                    formData.hasListening 
                      ? "border-[#007f70] bg-[#eefaf7] shadow-[0_8px_24px_-18px_#007f70] ring-1 ring-[#007f70]/10" 
                      : "border-[#dceae6] bg-white hover:-translate-y-0.5 hover:border-[#8fcfc2] hover:shadow-sm"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Headphones className={`h-5 w-5 ${formData.hasListening ? "text-[#007f70]" : "text-[#71818d]"}`} />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shadow-sm ${
                      formData.hasListening ? "bg-[#007f70] border-[#007f70] text-white" : "border-[#9aaca7] bg-white"
                    }`}>
                      {formData.hasListening && <Check className="h-4 w-4 stroke-[3.5] !text-white" color="#ffffff" stroke="#ffffff" />}
                    </div>
                  </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#071633]">Listening Assessment</p>
                      <p className="text-[10px] text-[#607080]">Audio or video comprehension questions</p>
                    </div>
                </div>

                {/* Reading Card */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, hasReading: !prev.hasReading }))}
                  className={`group min-h-[116px] p-4 border rounded-2xl cursor-pointer transition-all flex flex-col items-start justify-between select-none ${
                    formData.hasReading 
                      ? "border-[#007f70] bg-[#eefaf7] shadow-[0_8px_24px_-18px_#007f70] ring-1 ring-[#007f70]/10" 
                      : "border-[#dceae6] bg-white hover:-translate-y-0.5 hover:border-[#8fcfc2] hover:shadow-sm"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <BookOpen className={`h-5 w-5 ${formData.hasReading ? "text-[#007f70]" : "text-[#71818d]"}`} />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shadow-sm ${
                      formData.hasReading ? "bg-[#007f70] border-[#007f70] text-white" : "border-[#9aaca7] bg-white"
                    }`}>
                      {formData.hasReading && <Check className="h-4 w-4 stroke-[3.5] !text-white" color="#ffffff" stroke="#ffffff" />}
                    </div>
                  </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#071633]">Reading Assessment</p>
                      <p className="text-[10px] text-[#607080]">Reading passage with a recorded response</p>
                    </div>
                </div>

                {/* Speaking Card */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, hasSpeaking: !prev.hasSpeaking }))}
                  className={`group min-h-[116px] p-4 border rounded-2xl cursor-pointer transition-all flex flex-col items-start justify-between select-none ${
                    formData.hasSpeaking 
                      ? "border-[#007f70] bg-[#eefaf7] shadow-[0_8px_24px_-18px_#007f70] ring-1 ring-[#007f70]/10" 
                      : "border-[#dceae6] bg-white hover:-translate-y-0.5 hover:border-[#8fcfc2] hover:shadow-sm"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Mic2 className={`h-5 w-5 ${formData.hasSpeaking ? "text-[#007f70]" : "text-[#71818d]"}`} />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shadow-sm ${
                      formData.hasSpeaking ? "bg-[#007f70] border-[#007f70] text-white" : "border-[#9aaca7] bg-white"
                    }`}>
                      {formData.hasSpeaking && <Check className="h-4 w-4 stroke-[3.5] !text-white" color="#ffffff" stroke="#ffffff" />}
                    </div>
                  </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#071633]">Speaking Assessment</p>
                      <p className="text-[10px] text-[#607080]">Speaking prompt with a recorded video response</p>
                    </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-6">
            {/* Reading Skills Assessment Settings */}
            {formData.hasReading && (
              <div className="order-3 p-5 border border-[#dceae6] rounded-2xl bg-white space-y-4">
                <div className="border-b border-[#dceae6] pb-2">
                  <h4 className="text-xs font-bold text-[#007f70] uppercase tracking-wider">Reading Assessment</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Material Type *</label>
                    <select
                      value={formData.readingMaterialType}
                      onChange={(e) => setFormData(prev => ({ ...prev, readingMaterialType: e.target.value }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                    >
                      <option value="PASSAGE">Reading Passage</option>
                      <option value="STORY">Story</option>
                      <option value="POEM">Poem</option>
                    </select>
                  </div>
                </div>

                {/* Collapsible Advanced Configuration for Reading */}
                <div className="border border-[#eef5f3] rounded-xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedReading(!showAdvancedReading)}
                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-[#344054] hover:bg-[#dceae6]/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#007f70]" />
                      <span>Advanced Settings (Optional)</span>
                    </div>
                    {showAdvancedReading ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </button>

                  {showAdvancedReading && (
                    <div className="p-4 border-t border-[#eef5f3] grid grid-cols-1 md:grid-cols-2 gap-4 bg-white animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Reading Time Limit *</label>
                        <select
                          value={formData.readingTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, readingTime: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                        >
                          <option value={30}>30 Seconds</option>
                          <option value={60}>1 Minute</option>
                          <option value={120}>2 Minutes</option>
                          <option value={300}>5 Minutes</option>
                          <option value={600}>10 Minutes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Recording Duration *</label>
                        <select
                          value={formData.readingRecordDuration}
                          onChange={(e) => setFormData(prev => ({ ...prev, readingRecordDuration: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                        >
                          <option value={30}>30 Seconds</option>
                          <option value={60}>1 Minute</option>
                          <option value={120}>2 Minutes</option>
                          <option value={180}>3 Minutes</option>
                          <option value={300}>5 Minutes</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Reading Total Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.readingTotalMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, readingTotalMarks: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Reading Passing Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.readingPassingMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, readingPassingMarks: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#344054]">Reading Text Passage *</label>
                    <button
                      type="button"
                      disabled={generatingMaterial}
                      onClick={handleGenerateReadingPassage}
                      className="flex items-center gap-1 text-[11px] text-[#007f70] hover:text-[#00665a] font-bold"
                    >
                      {generatingMaterial ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Generate Passage with AI
                    </button>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={formData.readingText}
                    onChange={(e) => setFormData(prev => ({ ...prev, readingText: e.target.value }))}
                    placeholder="Type the reading passage or click Generate with AI..."
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#344054]">Instructions for Students (Reading)</label>
                  <textarea
                    rows={2}
                    value={formData.readingInstructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, readingInstructions: e.target.value }))}
                    placeholder="e.g. Read the passage silently first, then click start to record yourself reading it aloud."
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  />
                </div>
              </div>
            )}

            {/* English Speaking Assessment Settings */}
            {formData.hasSpeaking && (
              <div className="order-4 p-5 border border-[#dceae6] rounded-2xl bg-white space-y-4">
                <div className="border-b border-[#dceae6] pb-2">
                  <h4 className="text-xs font-bold text-[#007f70] uppercase tracking-wider">Speaking Assessment</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Activity Type *</label>
                    <select
                      value={formData.speakingActivityType}
                      onChange={(e) => setFormData(prev => ({ ...prev, speakingActivityType: e.target.value }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                    >
                      {["Introduce Yourself", "Picture Description", "Story Telling", "Describe Your School", "Favorite Animal", "Favorite Festival", "My Family", "My Hobby", "Conversation Practice", "Role Play", "Explain a Situation", "Interview Questions", "Extempore Speech"].map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Collapsible Advanced Configuration for Speaking */}
                <div className="border border-[#eef5f3] rounded-xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSpeaking(!showAdvancedSpeaking)}
                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-[#344054] hover:bg-[#dceae6]/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#007f70]" />
                      <span>Advanced Settings (Optional)</span>
                    </div>
                    {showAdvancedSpeaking ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </button>

                  {showAdvancedSpeaking && (
                    <div className="p-4 border-t border-[#eef5f3] grid grid-cols-1 md:grid-cols-2 gap-4 bg-white animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Preparation Time *</label>
                        <select
                          value={formData.speakingPrepTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, speakingPrepTime: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                        >
                          <option value={30}>30 Seconds</option>
                          <option value={60}>1 Minute</option>
                          <option value={120}>2 Minutes</option>
                          <option value={300}>5 Minutes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Speaking Time Limit *</label>
                        <select
                          value={formData.speakingTimeLimit}
                          onChange={(e) => setFormData(prev => ({ ...prev, speakingTimeLimit: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                        >
                          <option value={60}>1 Minute</option>
                          <option value={120}>2 Minutes</option>
                          <option value={180}>3 Minutes</option>
                          <option value={300}>5 Minutes</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Speaking Total Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.speakingTotalMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, speakingTotalMarks: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Speaking Passing Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.speakingPassingMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, speakingPassingMarks: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none focus:border-[#007f70]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#344054]">Instructions / Prompt for Student *</label>
                    <button
                      type="button"
                      disabled={generatingMaterial}
                      onClick={handleGenerateSpeakingTopic}
                      className="flex items-center gap-1 text-[11px] text-[#007f70] hover:text-[#00665a] font-bold"
                    >
                      {generatingMaterial ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Generate Prompt with AI
                    </button>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={formData.speakingPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, speakingPrompt: e.target.value }))}
                    placeholder="Type the speaking prompt (e.g. Introduce yourself and describe your hobbies)..."
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  />
                </div>
              </div>
            )}

            {/* Listening Skills Assessment Settings */}
            {formData.hasListening && (
              <div className="order-2 p-5 border border-[#dceae6] rounded-2xl bg-white space-y-4">
                <div className="border-b border-[#dceae6] pb-2">
                  <h4 className="text-xs font-bold text-[#007f70] uppercase tracking-wider">Listening Assessment</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Listening Material Type *</label>
                    <select
                      value={formData.listeningMaterialType}
                      onChange={(e) => setFormData(prev => ({ ...prev, listeningMaterialType: e.target.value }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    >
                      <option value="AUDIO">Upload Audio File (MP3, WAV, AAC)</option>
                      <option value="VIDEO">Upload Video File (MP4)</option>
                      <option value="AI_GEN">Generate Listening Exercise using AI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Listening Activity Type *</label>
                    <select
                      value={formData.listeningActivityType}
                      onChange={(e) => {
                        const listeningActivityType = e.target.value;
                        setFormData(prev => ({ ...prev, listeningActivityType }));
                        setQuestions(prev => prev.filter(question => !question.isListening));
                      }}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    >
                      <option value="Listen and Answer Questions">Listen and Answer Questions</option>
                      <option value="Listen and Fill in the Blanks">Listen and Fill in the Blanks</option>
                      <option value="Listen and Choose the Correct Answer">Listen and Choose the Correct Answer</option>
                      <option value="Listen and Match the Following">Listen and Match the Following</option>
                      <option value="Listen and Sequence Events">Listen and Sequence Events</option>
                      <option value="Listen and Complete Sentences">Listen and Complete Sentences</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Answering Time Limit (mins) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.listeningTimeLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, listeningTimeLimit: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    />
                  </div>
                </div>

                {/* Collapsible Advanced Configuration */}
                <div className="border border-[#eef5f3] rounded-xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedListening(!showAdvancedListening)}
                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-[#344054] hover:bg-[#dceae6]/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#007f70]" />
                      <span>Advanced Settings (Optional)</span>
                    </div>
                    {showAdvancedListening ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </button>

                  {showAdvancedListening && (
                    <div className="p-4 border-t border-[#eef5f3] grid grid-cols-1 md:grid-cols-3 gap-4 bg-white">
                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Plays Allowed *</label>
                        <select
                          value={formData.listeningPlaysAllowed}
                          onChange={(e) => setFormData(prev => ({ ...prev, listeningPlaysAllowed: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                        >
                          <option value={1}>Play Once</option>
                          <option value={2}>Play Twice</option>
                          <option value={0}>Unlimited</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Audio Speed *</label>
                        <select
                          value={formData.listeningAudioSpeed}
                          onChange={(e) => setFormData(prev => ({ ...prev, listeningAudioSpeed: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                        >
                          <option value={0.75}>0.75x</option>
                          <option value={1.0}>1x</option>
                          <option value={1.25}>1.25x</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-1.5">Preparation Time *</label>
                        <select
                          value={formData.listeningPrepTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, listeningPrepTime: Number(e.target.value) }))}
                          className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                        >
                          <option value={30}>30 Seconds</option>
                          <option value={60}>1 Minute</option>
                          <option value={120}>2 Minutes</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Listening Total Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.listeningTotalMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, listeningTotalMarks: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Listening Passing Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.listeningPassingMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, listeningPassingMarks: Number(e.target.value) }))}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                    />
                  </div>
                </div>

                {formData.listeningMaterialType !== "AI_GEN" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#344054]">Media Source File URL *</label>
                    <input
                      type="text"
                      required
                      value={formData.listeningMaterialUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, listeningMaterialUrl: e.target.value }))}
                      placeholder={formData.listeningMaterialType === "VIDEO" ? "Enter MP4 video file URL..." : "Enter MP3/WAV/AAC audio file URL..."}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#344054]">Transcript (Optional)</label>
                    {formData.listeningMaterialType === "AI_GEN" && (
                      <button
                        type="button"
                        disabled={generatingMaterial}
                        onClick={handleGenerateListeningTranscript}
                        className="flex items-center gap-1 text-[11px] text-[#007f70] hover:text-[#00665a] font-bold"
                      >
                        {generatingMaterial ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Generate Exercise with AI
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={formData.listeningTranscript}
                    onChange={(e) => setFormData(prev => ({ ...prev, listeningTranscript: e.target.value }))}
                    placeholder="Provide the listening transcript text here to help evaluate responses..."
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#344054]">Listening Instructions</label>
                  <textarea
                    rows={2}
                    value={formData.listeningInstructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, listeningInstructions: e.target.value }))}
                    placeholder="Add listening instructions (e.g. Listen carefully to the conversation and answer the questions that follow)..."
                    className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                  />
                </div>

                {/* Question Generation specifically for Listening */}
                <div className="p-4 bg-[#f0faf7] border border-[#b2e2d5] rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-[#00665a]">Generate questions automatically using AI</h5>
                    <p className="text-[10px] text-[#4a635d]">Creates curriculum-aligned questions based on the uploaded transcript/exercise.</p>
                  </div>
                  <button
                    type="button"
                    disabled={generatingMaterial}
                    onClick={handleGenerateListeningQuestions}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-bold rounded-xl shadow-sm transition-all animate-fade-in"
                  >
                    {generatingMaterial ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate with AI
                  </button>
                </div>

                <div className="space-y-4 border-t border-[#dceae6] pt-4">
                  <div>
                    <h5 className="text-xs font-extrabold text-[#071633]">
                      Listening Questions ({questions.filter(q => q.isListening).length})
                    </h5>
                    <p className="mt-1 text-[10px] text-[#71818d]">
                      These questions belong only to the listening assignment.
                    </p>
                  </div>
                  {questions.filter(q => q.isListening).length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-[#b2e2d5] py-8 text-center text-xs font-medium text-[#71818d]">
                      No listening questions yet. Generate them using the listening transcript or exercise.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((q, idx) =>
                        q.isListening
                          ? renderQuestionEditor(q, idx, questions.slice(0, idx + 1).filter(item => item.isListening).length)
                          : null
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.hasWritten && (
              <div className="order-1 space-y-6">
            {/* Questions Bank Section */}
            <div className="space-y-4 rounded-2xl border border-[#dceae6] bg-white p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dceae6] pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#071633]">Written Questions ({questions.filter(q => !q.isListening).length})</h3>
                  <p className="mt-1 text-[10px] text-[#71818d]">Generate or add questions for the written assessment only.</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="text-xs text-[#007f70] hover:text-[#00665a] font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Question Manually
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-4">
                <div className="mb-3">
                  <h4 className="text-xs font-extrabold text-[#071633]">Written question settings</h4>
                  <p className="mt-0.5 text-[9px] text-[#71818d]">These settings apply only to written questions and AI generation.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#344054]">Subject *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, subject: e.target.value }));
                        setQuestions(prev => prev.filter(q => q.isListening));
                      }}
                      className="w-full rounded-xl border border-[#dceae6] bg-white p-2.5 text-xs font-medium text-[#071633] outline-none focus:border-[#007f70]"
                    >
                      <option value="All">All Subjects</option>
                      {SUBJECTS_BY_GRADE[formData.grade].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#344054]">Difficulty *</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full rounded-xl border border-[#dceae6] bg-white p-2.5 text-xs font-medium text-[#071633] outline-none focus:border-[#007f70]"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#344054]">Chapter / Unit</label>
                    <input
                      value={formData.chapter}
                      onChange={(e) => setFormData(prev => ({ ...prev, chapter: e.target.value }))}
                      placeholder="Example: Chapter 5"
                      className="w-full rounded-xl border border-[#dceae6] bg-white p-2.5 text-xs font-medium text-[#071633] outline-none focus:border-[#007f70]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#344054]">Written Total Marks</label>
                    <div className="w-full rounded-xl border border-[#dceae6] bg-slate-100 p-2.5 text-xs font-bold text-[#071633]">
                      {questions
                        .filter(q => !q.isListening)
                        .reduce((total, q) => total + (Number(q.marks) || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#344054]">Written Passing Marks *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.writtenPassingMarks || 25}
                      onChange={(e) => setFormData(prev => ({ ...prev, writtenPassingMarks: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-[#dceae6] bg-white p-2.5 text-xs font-semibold text-[#071633] outline-none focus:border-[#007f70]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#b2e2d5] bg-white p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-[#071633]">
                      <BookOpen className="h-4 w-4 text-[#009b87]" /> School source documents
                      {sourceMode === "DEMO_LOCAL" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">
                          Demo Mode
                        </span>
                      )}
                    </h4>
                    <p className="mt-1 text-[10px] text-[#607080]">
                      {sourceMode === "DEMO_LOCAL"
                        ? "Upload the provided fractions demo PDF to test the complete source-only workflow locally. This is not Google NotebookLM."
                        : "Upload the school textbook PDF. AI questions will be generated only from matching ready documents."}
                    </p>
                  </div>
                  <label className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#00665a] bg-[#007f70] px-3 py-2 text-[10px] font-bold !text-white shadow-sm transition-colors ${sourceUploading ? "pointer-events-none opacity-50" : "hover:bg-[#00665a]"}`}>
                    {sourceUploading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin !text-white" /> <span className="!text-white">Processing document...</span></>
                    ) : (
                      <><FileText className="h-3.5 w-3.5 !text-white" strokeWidth={2.5} /> <span className="!text-white">Upload textbook PDF</span></>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={sourceUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void handleSourceUpload(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sourceDocuments.length === 0 ? (
                    <span className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
                      No source PDF uploaded yet.
                    </span>
                  ) : (
                    sourceDocuments.map((document) => (
                      <span
                        key={document.id}
                        className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${
                          document.status === "READY"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : document.status === "FAILED"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                        title={document.errorMessage || document.originalName}
                      >
                        {document.sourceName} · {document.status === "READY" ? "Ready" : document.status === "FAILED" ? "Failed" : "Processing"}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* AI Generator belongs to the written question list */}
              <div className="p-4 bg-gradient-to-r from-[#eefaf7] to-[#e8f6f2] border border-[#b2e2d5] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#00665a] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#009b87]" /> Generate questions for this list
                  </h4>
                  <p className="text-[10px] text-[#4a635d]">
                    AI-generated questions will appear directly below and remain fully editable.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 bg-white border border-[#cceae3] px-3 py-2 rounded-xl text-xs">
                    <span className="text-[10px] text-[#71818d] font-bold">Question count</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={formData.questionCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                      className="w-9 text-center font-bold text-[#007f70] outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleGenerateAIQuestions}
                    className="flex items-center gap-1.5 bg-[#007f70] hover:bg-[#00665a] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>

              {questions.filter(q => !q.isListening).length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-[#dceae6] rounded-2xl space-y-2">
                  <BookOpen className="h-8 w-8 text-[#71818d] mx-auto opacity-40" />
                  <p className="text-xs text-[#71818d] font-medium">No written questions yet. Generate with AI or add one manually.</p>
                </div>
              )}

              <div className="space-y-4">
                {questions.map((q, idx) =>
                  q.isListening
                    ? null
                    : renderQuestionEditor(q, idx, questions.slice(0, idx + 1).filter(item => !item.isListening).length)
                )}
              </div>
            </div>
              </div>
        )}
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-[#dceae6] bg-white/95 p-3 shadow-[0_12px_35px_-20px_rgba(7,22,51,0.5)] backdrop-blur">
              <p className="hidden text-[10px] font-semibold text-[#71818d] sm:block">Review all required fields before saving.</p>
              <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 border border-[#dceae6] hover:bg-slate-50 text-[#607080] rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center justify-center gap-1.5 bg-[#007f70] hover:bg-[#00665a] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingTemplateId ? "Save Changes" : "Save & Create Template"}
              </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* List views */
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-[#dceae6]">
            <button
              onClick={() => setActiveTab("templates")}
              className={`pb-3 px-6 text-xs font-bold transition-all relative ${activeTab === "templates" ? "text-[#007f70]" : "text-[#607080] hover:text-[#007f70]"}`}
            >
              Assessment Templates ({templates.length})
              {activeTab === "templates" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007f70] rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`pb-3 px-6 text-xs font-bold transition-all relative ${activeTab === "submissions" ? "text-[#007f70]" : "text-[#607080] hover:text-[#007f70]"}`}
            >
              Student Submissions ({submissions.length})
              {activeTab === "submissions" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007f70] rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`pb-3 px-6 text-xs font-bold transition-all relative ${activeTab === "requests" ? "text-[#007f70]" : "text-[#607080] hover:text-[#007f70]"}`}
            >
              Assessment Re-Requests ({reassignmentRequests.length})
              {activeTab === "requests" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007f70] rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`pb-3 px-6 text-xs font-bold transition-all relative ${activeTab === "bookings" ? "text-[#007f70]" : "text-[#607080] hover:text-[#007f70]"}`}
            >
              Slot Bookings
              {activeTab === "bookings" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007f70] rounded-t-full" />}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-20 bg-white border border-[#dceae6] rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#007f70] mx-auto" />
              <p className="text-xs text-[#71818d] mt-2">Loading assessments dashboard data...</p>
            </div>
          ) : activeTab === "templates" ? (
            /* Templates List */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-white border border-[#dceae6] rounded-2xl space-y-2">
                  <ClipboardList className="h-10 w-10 text-[#71818d] mx-auto opacity-40" />
                  <p className="text-xs text-[#71818d] font-bold">No assessment templates found.</p>
                  <p className="text-[11px] text-[#71818d]">Create your first template to publish assigned exams to applicant students.</p>
                </div>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="bg-white border border-[#dceae6] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex h-7 items-center whitespace-nowrap bg-[#e6f7f2] text-[#007f70] text-[10px] font-bold px-3 rounded-full uppercase">
                          {t.subject}
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className={`inline-flex h-7 items-center whitespace-nowrap text-[9px] font-extrabold px-2.5 rounded-full border uppercase tracking-wider ${
                            t.assessmentMode === 'SCHOOL' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                            t.assessmentMode === 'BOTH' ? 'border-indigo-200 text-indigo-600 bg-indigo-50' :
                            'border-[#dceae6] text-[#007f70] bg-[#fafdfc]'
                          }`}>
                            {t.assessmentMode === 'SCHOOL' ? 'At School' : t.assessmentMode === 'BOTH' ? 'Both' : 'Home'}
                          </span>
                          {(t.assessmentMode === "SCHOOL" || t.assessmentMode === "BOTH") && t.proctoringEnabled && (
                            <span
                              role="img"
                              aria-label="Camera and microphone monitoring on"
                              title="Camera and microphone monitoring: On"
                              className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border border-[#9bd9cc] bg-[#e9f8f4] px-2 text-[#006f62]"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              <Mic className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 text-[9px] font-bold uppercase tracking-wider text-[#71818d]">
                            {t.difficulty}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-[#071633] mt-3 line-clamp-1">{t.title}</h3>
                      <p className="text-xs text-[#71818d] mt-1.5">Class/Grade: <span className="font-bold text-[#071633]">{t.grade}</span></p>

                      <div className="grid grid-cols-2 gap-3 mt-4 bg-[#fafdfc] border border-[#e1edea] p-3 rounded-xl">
                        <div className="text-[11px]">
                          <span className="text-[#71818d] block">Questions:</span>
                          <span className="font-bold text-[#071633]">{t.questionCount}</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-[#71818d] block">Time Limit:</span>
                          <span className="font-bold text-[#071633]">{t.timeLimit} mins</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-[#71818d] block">Total Marks:</span>
                          <span className="font-bold text-[#071633]">{t.totalMarks} pts</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-[#71818d] block">Passing Marks:</span>
                          <span className="font-bold text-[#071633]">{t.passingMarks} pts</span>
                        </div>
                      </div>

                      {/* Phase 2 Student Counts */}
                      {t.assessmentMode === 'SCHOOL' ? (
                        <div className="grid grid-cols-4 gap-1.5 mt-3 bg-[#f5f9f8] border border-[#e1edea] p-3 rounded-xl text-center">
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block font-bold leading-3">Assigned</span>
                            <span className="font-extrabold text-[#071633] text-[11px]">{t.assignedCount || 0}</span>
                          </div>
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block font-bold leading-3">Slot Selected</span>
                            <span className="font-extrabold text-[#007f70] text-[11px]">{t.slotSelectedCount || 0}</span>
                          </div>
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block font-bold leading-3">Pending Slot</span>
                            <span className="font-extrabold text-amber-600 text-[11px]">{t.pendingSlotSelectionCount || 0}</span>
                          </div>
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block font-bold leading-3">Completed</span>
                            <span className="font-extrabold text-emerald-600 text-[11px]">{t.completedCount || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 mt-3 bg-[#f5f9f8] border border-[#e1edea] p-3 rounded-xl text-center">
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block">Assigned</span>
                            <span className="font-extrabold text-[#071633] text-xs">{t.assignedCount || 0}</span>
                          </div>
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block">Pending</span>
                            <span className="font-extrabold text-amber-600 text-xs">{t.pendingCount || 0}</span>
                          </div>
                          <div className="text-[10px]">
                            <span className="text-[#71818d] block">Completed</span>
                            <span className="font-extrabold text-emerald-600 text-xs">{t.completedCount || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t border-[#dceae6] pt-3">
                      <button
                        onClick={() => handlePublishClick(t)}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#007f70] hover:bg-[#00665a] text-white py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" /> Publish / Assign
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleEditClick(t);
                        }}
                        className="p-2 border border-[#dceae6] hover:bg-slate-50 text-[#607080] rounded-xl text-xs transition-colors"
                        title="Edit Template"
                        aria-label={`Edit ${t.title}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-2 border border-[#dceae6] hover:bg-red-50 text-red-500 rounded-xl text-xs transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "submissions" ? (
            /* Submissions Table */
            <div className="bg-white border border-[#dceae6] rounded-2xl shadow-sm overflow-hidden">
              {displayedSubmissions.length === 0 ? (
                <div className="text-center py-20 space-y-2">
                  <Users className="h-10 w-10 text-[#71818d] mx-auto opacity-40" />
                  <p className="text-xs text-[#71818d] font-bold">No submissions received yet.</p>
                  <p className="text-[11px] text-[#71818d]">Assessments assigned to candidates will appear here once submitted.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f8fbf9] border-b border-[#dceae6] text-[#607080] font-bold">
                        <th className="p-4">Student Candidate</th>
                        <th className="p-4">Class/Grade</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">AI Monitoring Status</th>
                        <th className="p-4">Time Taken</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dceae6] text-[#071633] font-medium">
                      {displayedSubmissions.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <span className="font-bold">{s.application?.studentFirstName} {s.application?.studentLastName}</span>
                          </td>
                          <td className="p-4">{s.application?.grade}</td>
                          <td className="p-4">{s.assessment?.subject}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              s.status === 'PUBLISHED' || s.status === 'EVALUATED' ? 'bg-emerald-100 text-emerald-800' :
                              s.status === 'REVIEWED' ? 'bg-sky-100 text-sky-800' :
                              s.status === 'INTERRUPTED' ? 'bg-amber-100 text-amber-800' :
                              s.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                              s.status === 'SUBMITTED' || s.status === 'RESUBMITTED' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {s.status === 'PUBLISHED' || s.status === 'EVALUATED' ? <CheckCircle2 className="h-3 w-3" /> :
                               s.status === 'REVIEWED' ? <CheckCircle2 className="h-3 w-3 text-sky-500" /> :
                               s.status === 'INTERRUPTED' ? <AlertTriangle className="h-3 w-3 text-amber-600" /> :
                               s.status === 'UNDER_REVIEW' ? <Clock className="h-3 w-3 text-amber-500" /> :
                               s.status === 'SUBMITTED' || s.status === 'RESUBMITTED' ? <Clock className="h-3 w-3" /> :
                               null}
                              {s.status === "INTERRUPTED" ? "Recording interrupted" : s.status === "RESUBMITTED" ? "Reassessment submitted" : String(s.status).replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="p-4">
                            {s.status === "INTERRUPTED" && <div className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-amber-700">Recording stopped</span><span className="text-[9px] text-[#71818d]">Student must resume the assessment</span></div>}
                            {['IN_PROGRESS', 'SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'PUBLISHED', 'EVALUATED'].includes(s.status) && (
                              <div className="flex flex-col gap-0.5">
                                {s.status === "IN_PROGRESS" && <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-blue-700"><i className="h-2 w-2 animate-pulse rounded-full bg-blue-500" /> Monitoring live</span>}
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  s.totalWarnings > 0 ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {s.totalWarnings || 0} warning{(s.totalWarnings || 0) !== 1 ? 's' : ''}
                                </span>
                                <span className="text-[9px] text-[#71818d]">
                                  Tab switches: {s.tabSwitchCount || 0} · FS exits: {s.fullscreenExitCount || 0}
                                </span>
                                {s.submissionReason && s.submissionReason !== "NORMAL" && (
                                  <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded self-start font-black mt-0.5">
                                    {s.submissionReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {s.status === "INTERRUPTED" ? "Not completed" : s.timeTaken ? `${Math.floor(s.timeTaken / 60)}m ${s.timeTaken % 60}s` : "In Progress"}
                          </td>
                          <td className="p-4 text-right">
                            {s.submissionType === "GAME" ? (
                              s.gameResult?.status === "COMPLETED" ? <button
                                onClick={() => void openGameScore(s)}
                                className="bg-[#007f70] hover:bg-[#00665a] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                              >View Game Score</button> : <span className="text-[10px] font-bold text-[#71818d]">Waiting for submission</span>
                            ) : ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'PUBLISHED', 'EVALUATED'].includes(s.status) ? (
                              <button
                                onClick={() => handleGradingClick(s)}
                                className="bg-[#007f70] hover:bg-[#00665a] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                              >
                                {s.status === "PUBLISHED" || s.status === "EVALUATED" ? "View Grades" : s.status === "RESUBMITTED" ? "Review reassessment" :
                                 s.status === "REVIEWED" ? "Edit / Publish" : "Grade Submission"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#71818d]">Pending submission</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === "requests" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {["PENDING", "APPROVED", "REJECTED", "ALL"].map(status => (
                  <button key={status} onClick={() => setRequestFilter(status)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${requestFilter === status ? "bg-[#007f70] text-white" : "bg-white border border-[#dceae6] text-[#607080]"}`}>
                    {status}
                  </button>
                ))}
              </div>
              {reassignmentRequests.length > 0 && <div className="bg-white border border-[#dceae6] rounded-2xl shadow-sm overflow-hidden">
                {reassignmentRequests.length === 0 ? (
                  <div className="text-center py-20">
                    <RotateCcw className="h-10 w-10 text-[#71818d] mx-auto opacity-40" />
                    <p className="text-xs text-[#71818d] font-bold mt-2">No {requestFilter.toLowerCase()} re-assessment requests.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                      <thead><tr className="bg-[#f8fbf9] border-b border-[#dceae6] text-[#607080] font-bold">
                        <th className="p-3">Student Name</th><th className="p-3">Parent Name</th><th className="p-3">Grade</th><th className="p-3">Assessment</th><th className="p-3">Subject</th><th className="p-3">Previous Score</th><th className="p-3">Attempt Date</th><th className="p-3">Request Date</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[#dceae6]">
                        {reassignmentRequests.map(request => {
                          const result = request.assessment?.results?.[0];
                          return <tr key={request.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold">{request.application?.studentFirstName} {request.application?.studentLastName}</td>
                            <td className="p-3">{request.application?.parent?.firstName} {request.application?.parent?.lastName}</td>
                            <td className="p-3">{request.application?.grade}</td>
                            <td className="p-3">{request.assessment?.title}</td>
                            <td className="p-3">{request.assessment?.subject}</td>
                            <td className="p-3 font-bold">{result ? `${result.score}/${request.assessment.totalMarks}` : "—"}</td>
                            <td className="p-3">{request.previousAttempt?.submittedAt ? new Date(request.previousAttempt.submittedAt).toLocaleDateString() : "—"}</td>
                            <td className="p-3">{new Date(request.createdAt).toLocaleDateString()}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${request.status === "PENDING" ? "bg-amber-100 text-amber-800" : request.status === "APPROVED" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>{request.status}</span></td>
                            <td className="p-3"><div className="flex justify-end gap-2">
                              <button onClick={() => handleGradingClick({ id: request.previousAttemptId })} className="px-2.5 py-1.5 border border-[#dceae6] rounded-lg text-[10px] font-bold">View Previous</button>
                              {request.status === "PENDING" && <>
                                <button onClick={() => openApprovalDialog(request)} className="px-2.5 py-1.5 bg-[#007f70] text-white rounded-lg text-[10px] font-bold">Approve</button>
                                <button onClick={() => handleRejectReassignment(request)} className="px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold">Reject</button>
                              </>}
                            </div></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>}
              {reassignmentRequests.length === 0 && <div className="rounded-2xl border border-[#dceae6] bg-white py-20 text-center shadow-sm"><RotateCcw className="mx-auto h-10 w-10 text-[#71818d] opacity-40" /><p className="mt-2 text-xs font-bold text-[#71818d]">No {requestFilter.toLowerCase()} re-assessment requests.</p></div>}
            </div>
          ) : (
             <div className="space-y-6">
               <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                 <div>
                   <h2 className="text-base font-extrabold text-[#071633]">At-School Slot Bookings</h2>
                   <p className="text-xs text-[#71818d] mt-1">Monitor real-time slot capacities, attendance, and reschedule bookings.</p>
                 </div>
                 <select
                   value={selectedBookingAssessmentId || ""}
                   onChange={(e) => setSelectedBookingAssessmentId(e.target.value || null)}
                   className="w-full sm:w-72 text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none shadow-sm"
                 >
                   <option value="">-- Select Assessment Template --</option>
                   {templates.filter(t => ['SCHOOL', 'BOTH'].includes(t.assessmentMode)).map(t => (
                     <option key={t.id} value={t.id}>{t.title} ({t.grade})</option>
                   ))}
                 </select>
               </div>

               {selectedBookingAssessmentId && bookingSchedule && bookingSchedule.slots && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-[#dceae6] p-5 rounded-2xl shadow-sm">
                   {bookingSchedule.slots.map((slot: any) => {
                     const visibleSlot = displaySlot(slot);
                     const percent = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
                     return (
                       <div key={slot.id} className="bg-[#f8fbf9] border border-[#cfe6e0] p-4 rounded-xl shadow-xs">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold text-xs text-[#071633]">{visibleSlot.slotName}</h4>
                             <p className="text-[10px] text-[#71818d] mt-0.5">{visibleSlot.startTime} - {visibleSlot.endTime}</p>
                           </div>
                           <span className={`px-2 py-0.5 rounded text-[9px] font-black ${percent >= 100 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                             {percent >= 100 ? "FULL" : `${slot.bookedCount} / ${slot.capacity}`}
                           </span>
                         </div>
                         <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                           <div
                             className={`h-full transition-all duration-300 ${percent >= 100 ? "bg-red-500" : "bg-[#007f70]"}`}
                             style={{ width: `${percent}%` }}
                           />
                         </div>
                         <div className="mt-3 border-t border-[#dceae6] pt-3">
                           <div className="mb-2 flex items-center justify-between">
                             <label htmlFor={`slot-capacity-${slot.id}`} className="text-[10px] font-extrabold text-[#344054]">
                               Maximum capacity
                             </label>
                             <span className="text-[10px] font-extrabold text-[#007f70]">
                               {Math.max(0, slot.capacity - slot.bookedCount)} spots left
                             </span>
                           </div>
                           <div className="flex gap-2">
                             <input
                               id={`slot-capacity-${slot.id}`}
                               type="number"
                               min={Math.max(1, slot.bookedCount)}
                               step="1"
                               value={slotCapacityDrafts[slot.id] ?? slot.capacity}
                               onChange={(event) => setSlotCapacityDrafts(current => ({
                                 ...current,
                                 [slot.id]: Number(event.target.value),
                               }))}
                               className="min-w-0 flex-1 rounded-lg border border-[#cfe6e0] bg-white px-2.5 py-2 text-xs font-bold text-[#071633] outline-none focus:border-[#007f70]"
                             />
                             <button
                               type="button"
                               disabled={savingSlotCapacityId === slot.id || Number(slotCapacityDrafts[slot.id] ?? slot.capacity) === Number(slot.capacity)}
                               onClick={() => saveSlotCapacity(slot)}
                               className="rounded-lg bg-[#007f70] px-3 py-2 text-[10px] font-extrabold text-white hover:bg-[#00665a] disabled:cursor-not-allowed disabled:opacity-45"
                             >
                               {savingSlotCapacityId === slot.id ? "Saving..." : "Save"}
                             </button>
                           </div>
                           <p className="mt-1.5 text-[9px] text-[#71818d]">Booked: {slot.bookedCount} · Available: {Math.max(0, slot.capacity - slot.bookedCount)}</p>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}

               <div className="bg-white border border-[#dceae6] rounded-2xl shadow-sm overflow-hidden">
                 {!selectedBookingAssessmentId ? (
                   <div className="text-center py-20">
                     <Calendar className="h-10 w-10 text-[#71818d] mx-auto opacity-40" />
                     <p className="text-xs text-[#71818d] font-bold mt-2">Select an assessment template to view bookings.</p>
                   </div>
                 ) : bookings.length === 0 ? (
                   <div className="text-center py-20">
                     <Calendar className="h-10 w-10 text-[#71818d] mx-auto opacity-40" />
                     <p className="text-xs text-[#71818d] font-bold mt-2">No bookings found for this assessment.</p>
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
                       <thead>
                         <tr className="bg-[#f8fbf9] border-b border-[#dceae6] text-[#607080] font-bold">
                           <th className="p-4">Student Name</th>
                           <th className="p-4">Application ID</th>
                           <th className="p-4">Grade</th>
                           <th className="p-4">Section</th>
                           <th className="p-4">Parent Name</th>
                           <th className="p-4">Assessment Date</th>
                           <th className="p-4">Selected Slot</th>
                           <th className="p-4">Room Number</th>
                           <th className="p-4">Booking Time</th>
                           <th className="p-4">Attendance Status</th>
                           <th className="p-4">Booking Status</th>
                           <th className="p-4 text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[#dceae6] text-[#071633] font-medium">
                         {bookings.map((booking: any) => (
                           <tr key={booking.id} className="hover:bg-slate-50">
                             <td className="p-4 font-bold">{booking.application?.studentFirstName} {booking.application?.studentLastName}</td>
                             <td className="p-4">{booking.studentId.substring(0, 8)}</td>
                             <td className="p-4">{booking.application?.grade}</td>
                             <td className="p-4">{booking.application?.section || "A"}</td>
                             <td className="p-4">{booking.application?.parent?.firstName} {booking.application?.parent?.lastName}</td>
                             <td className="p-4">{bookingSchedule ? new Date(bookingSchedule.assessmentDate).toLocaleDateString() : "—"}</td>
                             <td className="p-4 font-semibold text-[#007f70]">{displaySlot(booking.slot || {}).slotName} ({displaySlot(booking.slot || {}).startTime} - {displaySlot(booking.slot || {}).endTime})</td>
                             <td className="p-4">{bookingSchedule?.roomNumber || "—"}</td>
                             <td className="p-4">{new Date(booking.bookedAt).toLocaleString()}</td>
                             <td className="p-4">
                               <select
                                 value={booking.attendanceStatus}
                                 onChange={async (e) => {
                                   const status = e.target.value;
                                   const res = await fetch(`http://localhost:5001/assessments/bookings/${booking.id}/attendance`, {
                                     method: "PATCH",
                                     headers: {
                                       "Content-Type": "application/json",
                                       "x-tenant-id": schoolId,
                                       "Authorization": `Bearer ${token}`
                                     },
                                     body: JSON.stringify({ attendanceStatus: status })
                                   });
                                   if (res.ok) {
                                     fetchBookings(selectedBookingAssessmentId);
                                     fetchBookingSchedule(selectedBookingAssessmentId);
                                   }
                                 }}
                                 className="px-2 py-1 rounded border border-[#dceae6] bg-transparent text-[10px] font-bold outline-none"
                               >
                                 <option value="PENDING">Pending</option>
                                 <option value="PRESENT">Present</option>
                                 <option value="ABSENT">Absent</option>
                                 <option value="LATE">Late</option>
                                 <option value="COMPLETED">Completed</option>
                               </select>
                             </td>
                             <td className="p-4">
                               <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                 booking.bookingStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                 booking.bookingStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                 booking.bookingStatus === 'RESCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                 'bg-amber-100 text-amber-800'
                               }`}>
                                 {booking.bookingStatus}
                               </span>
                             </td>
                             <td className="p-4"><div className="flex justify-end gap-2">
                               <button
                                 onClick={() => setReschedulingBooking(booking)}
                                 className="px-2.5 py-1.5 bg-white border border-[#007f70] text-[#007f70] rounded-lg text-[10px] font-bold"
                               >
                                 Reschedule
                               </button>
                               <button
                                 onClick={async () => {
                                   if (!confirm("Are you sure you want to cancel this slot booking?")) return;
                                   const res = await fetch(`http://localhost:5001/assessments/parent/cancel-booking/${booking.id}`, {
                                     method: "POST",
                                     headers: {
                                       "x-tenant-id": schoolId,
                                       "Authorization": `Bearer ${token}`
                                     }
                                   });
                                   if (res.ok) {
                                     fetchBookings(selectedBookingAssessmentId);
                                     fetchBookingSchedule(selectedBookingAssessmentId);
                                     alert("Booking cancelled successfully.");
                                   } else {
                                     alert("Cancel failed.");
                                   }
                                 }}
                                 className="px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold"
                               >
                                 Cancel
                               </button>
                             </div></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </div>
          )}
        </div>
      )}

      {approvingRequest && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9]">
              <h3 className="text-sm font-bold text-[#071633]">Approve Re-Assessment</h3>
              <p className="text-[10px] text-[#71818d] mt-1">Generate Completely New Assessment</p>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#344054]">Assessment Components *</label>
                <p className="mt-1 text-[10px] text-[#71818d]">Choose one or more components for this re-assessment.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["hasWritten", "Written", FileText],
                    ["hasListening", "Listening", Headphones],
                    ["hasReading", "Reading", BookOpen],
                    ["hasSpeaking", "Speaking", Mic2],
                  ].map(([key, label, Icon]: any) => {
                    const selected = (approvalForm as any)[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setApprovalForm(prev => {
                            const next = { ...prev, [key]: !selected };
                            if (next.hasWritten && next.hasListening && next.questionCount < 2) {
                              next.questionCount = 2;
                            }
                            return next;
                          });
                          setReassignmentQuestionPreview([]);
                        }}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                          selected ? "border-[#007f70] bg-[#eefaf7] text-[#00665a]" : "border-[#dceae6] bg-white text-[#607080]"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-xs font-bold"><Icon className="h-4 w-4" />{label}</span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-[#00665a] bg-[#007f70] text-white shadow-sm ring-2 ring-white" : "border-[#9aaca7]"}`}>
                          {selected && <Check className="h-4 w-4 text-white" color="#ffffff" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {[
                ["Number of Questions", "questionCount", "number"], ["Total Marks", "totalMarks", "number"],
                ["Duration (Minutes)", "timeLimit", "number"], ["Passing Marks", "passingMarks", "number"],
              ].map(([label, key, type]) => <label key={key} className="text-[10px] font-bold text-[#344054]">{label}
                <input type={type} min={key === "questionCount" && approvalForm.hasWritten && approvalForm.hasListening ? "2" : "1"} value={(approvalForm as any)[key]} onChange={e => { const minimum = key === "questionCount" && approvalForm.hasWritten && approvalForm.hasListening ? 2 : 1; const value = Math.max(minimum, Number(e.target.value)); setApprovalForm(prev => ({ ...prev, [key]: value })); if (key === "questionCount") { setReassignmentQuestionPreview([]); if (writtenQuestionCount > value) setWrittenQuestionCount(0); } }} className="mt-1 w-full text-xs rounded-xl border border-[#dceae6] p-3" />
              </label>)}
              <label className="text-[10px] font-bold text-[#344054]">Difficulty
                <select value={approvalForm.difficulty} onChange={e => { setApprovalForm(prev => ({ ...prev, difficulty: e.target.value })); setReassignmentQuestionPreview([]); }} className="mt-1 w-full text-xs rounded-xl border border-[#dceae6] p-3 bg-white">
                  <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-[#344054]">Due Date
                <input type="date" value={approvalForm.dueDate} onChange={e => setApprovalForm(prev => ({ ...prev, dueDate: e.target.value }))} className="mt-1 w-full text-xs rounded-xl border border-[#dceae6] p-3" />
              </label>

              {["SCHOOL", "BOTH"].includes(approvingRequest.assessment?.assessmentMode) && (
                <div className="col-span-2 flex items-center justify-between gap-5 rounded-2xl border border-[#b8e0d6] bg-[#f2faf8] p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Camera className="mt-0.5 h-5 w-5 shrink-0 text-[#008f80]" />
                    <div>
                      <h4 className="text-xs font-extrabold text-[#071633]">Camera and microphone monitoring</h4>
                      <p className="mt-1 text-[10px] leading-relaxed text-[#607080]">
                        Require the student to verify a real camera and microphone before entering this at-school re-assessment.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={approvalForm.proctoringEnabled}
                    onClick={() => setApprovalForm(prev => ({ ...prev, proctoringEnabled: !prev.proctoringEnabled }))}
                    className="reassessment-monitor-toggle shrink-0"
                  >
                    <span className="reassessment-monitor-toggle__knob" />
                    <span className="reassessment-monitor-toggle__label">
                      {approvalForm.proctoringEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
              )}

              {approvalForm.hasReading && (
                <div className="col-span-2 rounded-xl border border-[#b2e2d5] bg-[#f8fdfb] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><h4 className="text-xs font-bold text-[#071633]">Reading Passage</h4><p className="text-[10px] text-[#71818d]">Generate and review the passage for this re-assessment.</p></div>
                    <button type="button" onClick={() => handleGenerateReassessmentMaterial("reading")} disabled={generatingMaterial} className="flex items-center gap-1.5 rounded-lg bg-[#007f70] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                      {generatingMaterial ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate Reading
                    </button>
                  </div>
                  <textarea rows={5} value={approvalForm.readingText} onChange={e => setApprovalForm(prev => ({ ...prev, readingText: e.target.value }))} placeholder="Generate or enter the reading passage..." className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]" />
                  <textarea rows={2} value={approvalForm.readingInstructions} onChange={e => setApprovalForm(prev => ({ ...prev, readingInstructions: e.target.value }))} placeholder="Reading instructions..." className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]" />
                </div>
              )}

              {approvalForm.hasListening && (
                <div className="col-span-2 rounded-xl border border-[#b2e2d5] bg-[#f8fdfb] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><h4 className="text-xs font-bold text-[#071633]">Listening Exercise</h4><p className="text-[10px] text-[#71818d]">Generate the transcript before generating its questions.</p></div>
                    <button type="button" onClick={() => handleGenerateReassessmentMaterial("listening")} disabled={generatingMaterial} className="flex items-center gap-1.5 rounded-lg bg-[#007f70] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                      {generatingMaterial ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate Listening
                    </button>
                  </div>
                  <select value={approvalForm.listeningActivityType} onChange={e => { setApprovalForm(prev => ({ ...prev, listeningActivityType: e.target.value })); setReassignmentQuestionPreview([]); }} className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]">
                    <option value="Listen and Answer Questions">Listen and Answer Questions</option>
                    <option value="Listen and Fill in the Blanks">Listen and Fill in the Blanks</option>
                    <option value="Listen and Choose the Correct Answer">Listen and Choose the Correct Answer</option>
                    <option value="Listen and Match the Following">Listen and Match the Following</option>
                    <option value="Listen and Sequence Events">Listen and Sequence Events</option>
                    <option value="Listen and Complete Sentences">Listen and Complete Sentences</option>
                  </select>
                  <textarea rows={4} value={approvalForm.listeningTranscript} onChange={e => { setApprovalForm(prev => ({ ...prev, listeningTranscript: e.target.value })); setReassignmentQuestionPreview([]); }} placeholder="Generate or enter the listening transcript..." className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]" />
                  <textarea rows={2} value={approvalForm.listeningInstructions} onChange={e => setApprovalForm(prev => ({ ...prev, listeningInstructions: e.target.value }))} placeholder="Listening instructions..." className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]" />
                </div>
              )}

              {approvalForm.hasSpeaking && (
                <div className="col-span-2 rounded-xl border border-[#b2e2d5] bg-[#f8fdfb] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><h4 className="text-xs font-bold text-[#071633]">Speaking Prompt</h4><p className="text-[10px] text-[#71818d]">Generate and review the speaking task.</p></div>
                    <button type="button" onClick={() => handleGenerateReassessmentMaterial("speaking")} disabled={generatingMaterial} className="flex items-center gap-1.5 rounded-lg bg-[#007f70] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                      {generatingMaterial ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate Speaking
                    </button>
                  </div>
                  <input value={approvalForm.speakingActivityType} onChange={e => setApprovalForm(prev => ({ ...prev, speakingActivityType: e.target.value }))} placeholder="Speaking activity type" className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]" />
                  <textarea rows={4} value={approvalForm.speakingPrompt} onChange={e => setApprovalForm(prev => ({ ...prev, speakingPrompt: e.target.value }))} placeholder="Generate or enter the speaking prompt..." className="w-full rounded-xl border border-[#dceae6] bg-white p-3 text-xs text-[#071633]" />
                </div>
              )}

              {approvalForm.hasWritten && <label className="col-span-2 text-[10px] font-bold text-[#344054]">Written Question Format
                <select value={writtenQuestionCount} onChange={e => { setWrittenQuestionCount(Number(e.target.value)); setReassignmentQuestionPreview([]); }} className="mt-1 w-full text-xs rounded-xl border border-[#dceae6] p-3 bg-white">
                  <option value={0}>All MCQs</option>
                  <option value={2} disabled={approvalForm.questionCount < 2}>2 Detailed Answers</option>
                  <option value={3} disabled={approvalForm.questionCount < 3}>3 Detailed Answers</option>
                </select>
              </label>}
              <div className="col-span-2 border-t border-[#dceae6] pt-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div><h4 className="text-xs font-bold text-[#071633]">AI-Generated Questions</h4><p className="text-[10px] text-[#71818d] mt-0.5">Review the exact questions before assigning.</p></div>
                  {(approvalForm.hasWritten || approvalForm.hasListening) && <button type="button" onClick={handleGenerateReassignmentPreview} disabled={aiLoading} className="flex items-center gap-1.5 px-4 py-2 bg-[#007f70] text-white rounded-xl text-xs font-semibold disabled:opacity-50">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {reassignmentQuestionPreview.length ? "Regenerate Questions" : "Generate Questions"}
                  </button>}
                </div>
                {!approvalForm.hasWritten && !approvalForm.hasListening ? (
                  <div className="rounded-xl border border-[#cddfda] bg-[#f0faf7] p-5 text-center text-[11px] font-semibold text-[#007f70]">Reading and speaking components use their configured passage or prompt; question generation is not required.</div>
                ) : reassignmentQuestionPreview.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#cddfda] bg-[#fafdfc] p-8 text-center text-[11px] text-[#71818d]">Generate questions to preview them here.</div>
                ) : (
                  <div className="space-y-3">
                    {reassignmentQuestionPreview.map((question, index) => (
                      <div key={question.previewId || index} className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-4">
                        <div className="flex justify-between gap-3"><p className="text-xs font-bold text-[#071633]">{index + 1}. {question.questionText.replace(/^Re-assessment version \d+:\s*/i, "")}</p><span className="text-[9px] font-bold text-[#007f70]">{question.isListening ? "LISTENING" : question.type === "WRITTEN" ? "DETAILED ANSWER" : question.type}</span></div>
                        {question.options?.length > 0 && <div className="grid grid-cols-2 gap-2 mt-3">{question.options.map((option: string, optionIndex: number) => <div key={optionIndex} className={`rounded-lg border px-3 py-2 text-[10px] ${option === question.correctAnswer ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold" : "border-[#dceae6] bg-white text-[#607080]"}`}>{option}</div>)}</div>}
                        {question.type !== "MCQ" && <p className="mt-2 text-[10px] text-emerald-700"><span className="font-bold">Expected answer:</span> {question.correctAnswer}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-[#dceae6] bg-[#f8fbf9] flex justify-end gap-3">
              <button onClick={() => setApprovingRequest(null)} disabled={actionLoading} className="px-4 py-2 border border-[#dceae6] rounded-xl text-xs font-semibold">Cancel</button>
              <button
                onClick={handleApproveReassignment}
                disabled={
                  actionLoading ||
                  ![approvalForm.hasWritten, approvalForm.hasListening, approvalForm.hasReading, approvalForm.hasSpeaking].some(Boolean) ||
                  ((approvalForm.hasWritten || approvalForm.hasListening) && reassignmentQuestionPreview.length !== approvalForm.questionCount)
                }
                className="px-4 py-2 bg-[#007f70] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {actionLoading ? "Assigning..." : "Generate & Assign"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Reschedule assessment slot modal */}
      {reschedulingBooking && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#dceae6] shadow-xl p-6">
            <h3 className="text-sm font-bold text-[#071633]">Reschedule Assessment Slot</h3>
            <p className="text-[10px] text-[#71818d] mt-1">Select a new slot for {reschedulingBooking.application?.studentFirstName} {reschedulingBooking.application?.studentLastName}</p>
            
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {bookingSchedule?.slots?.map((slot: any) => {
                const isFull = slot.bookedCount >= slot.capacity;
                const isCurrent = slot.id === reschedulingBooking.slotId;
                return (
                  <button
                    key={slot.id}
                    disabled={isFull && !isCurrent}
                    onClick={async () => {
                      const res = await fetch(`http://localhost:5001/assessments/bookings/${reschedulingBooking.id}/reschedule`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-tenant-id": schoolId,
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ slotId: slot.id })
                      });
                      if (res.ok) {
                        setReschedulingBooking(null);
                        fetchBookings(selectedBookingAssessmentId!);
                        fetchBookingSchedule(selectedBookingAssessmentId!);
                        alert("Slot rescheduled successfully.");
                      } else {
                        alert("Failed to reschedule.");
                      }
                    }}
                    className={`w-full flex justify-between items-center p-3 rounded-xl border text-xs font-bold transition-all ${isCurrent ? "border-[#007f70] bg-[#eaf8f4] text-[#006f63]" : isFull ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" : "border-[#dceae6] hover:bg-slate-50 text-[#071633]"}`}
                  >
                    <span>{displaySlot(slot).slotName} ({displaySlot(slot).startTime} - {displaySlot(slot).endTime})</span>
                    <span className="text-[10px]">{isCurrent ? "Current" : isFull ? "Full" : `${slot.bookedCount}/${slot.capacity}`}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setReschedulingBooking(null)} className="px-4 py-2 border border-[#dceae6] rounded-xl text-xs font-bold text-[#607080]">Cancel</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Publish assessment modal */}
      {isPublishing && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4">
          <div className={`w-full ${['SCHOOL', 'BOTH'].includes(isPublishing.assessmentMode) ? 'max-w-3xl' : 'max-w-lg'} bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden flex flex-col max-h-[85vh]`}>
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#071633]">Assign Assessment: {isPublishing.title}</h3>
              <button 
                onClick={() => setIsPublishing(null)}
                className="text-[#607080] hover:text-[#071633] font-bold text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {['SCHOOL', 'BOTH'].includes(isPublishing.assessmentMode) && (
                <div className="bg-[#f8fbf9] border border-[#cfe6e0] p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs text-[#007f70] border-b border-[#cfe6e0] pb-2">At-School Scheduling Details</h4>
                  
                  {/* Read-Only Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-[#dceae6] text-[10px]">
                    <div>
                      <span className="text-[#71818d] block">Assessment Name:</span>
                      <span className="font-bold text-[#071633]">{isPublishing.title}</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block">Subject:</span>
                      <span className="font-bold text-[#071633]">{isPublishing.subject}</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block">Grade:</span>
                      <span className="font-bold text-[#071633]">{isPublishing.grade}</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block">Duration:</span>
                      <span className="font-bold text-[#071633]">{isPublishing.timeLimit} mins</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block">Total Marks:</span>
                      <span className="font-bold text-[#071633]">{isPublishing.totalMarks} pts</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block">Assessment Type:</span>
                      <span className="font-bold text-[#007f70]">At School</span>
                    </div>
                  </div>

                  {/* Scheduling Mode Selection */}
                  <div className="bg-[#f8fbf9] p-4 rounded-xl border border-[#dceae6] space-y-2">
                    <label className="block text-[10px] font-black text-[#007f70] uppercase tracking-wider">Scheduling & Booking Mode</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#071633] font-semibold">
                        <input
                          type="radio"
                          name="schedulingMode"
                          checked={!autoBook}
                          onChange={() => setAutoBook(false)}
                          className="accent-[#007f70]"
                        />
                        <span>Parent/Student chooses slot (multiple slots)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#071633] font-semibold">
                        <input
                          type="radio"
                          name="schedulingMode"
                          checked={autoBook}
                          onChange={() => {
                            setAutoBook(true);
                            if (slots.length === 0) {
                              setSlots([{ id: "1", slotName: "Fixed Slot", startTime: "09:00 AM", endTime: "10:00 AM", capacity: 50 }]);
                            } else {
                              setSlots([slots[0]]);
                            }
                          }}
                          className="accent-[#007f70]"
                        />
                        <span>Fix one date & slot (automatically booked for all)</span>
                      </label>
                    </div>
                    <label className="mt-3 flex items-start gap-2 border-t border-[#dceae6] pt-3 text-xs text-[#071633] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowStudentRescheduling}
                        onChange={(event) => setAllowStudentRescheduling(event.target.checked)}
                        className="mt-0.5 rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                      />
                      <span>
                        <span className="block font-bold">Allow students to reschedule booked slots</span>
                        <span className="mt-0.5 block text-[9px] leading-4 text-[#71818d]">
                          Leave this off when rooms, desks, and seating have already been fixed. School staff can still reschedule bookings.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Assessment Date *</label>
                      <input
                        type="date"
                        required
                        value={assessmentDate}
                        onChange={(e) => setAssessmentDate(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Campus *</label>
                      <select
                        value={campus}
                        onChange={(e) => setCampus(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      >
                        <option value="Main Campus">Main Campus</option>
                        <option value="North Campus">North Campus</option>
                        <option value="West Campus">West Campus</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Building *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Block A"
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Floor *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2nd Floor"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Room Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Room 204"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#344054] mb-1">Venue Description</label>
                    <textarea
                      placeholder="e.g. Near the main library building..."
                      value={venueDescription}
                      onChange={(e) => setVenueDescription(e.target.value)}
                      className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none min-h-16 text-[#071633] font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Contact Person Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Designation</label>
                      <input
                        type="text"
                        value={contactDesignation}
                        onChange={(e) => setContactDesignation(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Contact Phone *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +1 234 5678"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Contact Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. coordinator@school.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none text-[#071633] font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#344054] mb-1">Instructions (Markdown / Text)</label>
                    <textarea
                      placeholder="e.g. Please arrive 15 minutes before the slot time..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full text-xs rounded-lg border border-[#dceae6] bg-white p-2.5 outline-none min-h-24 text-[#071633] font-semibold"
                    />
                  </div>

                  {/* Required Documents */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#344054] mb-2">Required Documents</label>
                    <div className="flex flex-wrap gap-3">
                      {["Admission Receipt", "Hall Ticket", "Passport Size Photograph"].map(doc => {
                        const checked = requiredDocs.includes(doc);
                        return (
                          <label key={doc} className="flex items-center gap-1.5 text-xs text-[#071633] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setRequiredDocs(requiredDocs.filter(d => d !== doc));
                                } else {
                                  setRequiredDocs([...requiredDocs, doc]);
                                }
                              }}
                              className="rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                            />
                            {doc}
                          </label>
                        );
                      })}
                    </div>
                  </div>


                  {/* Slots Management */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-[#344054]">
                        {autoBook ? "Fixed Time Slot" : "Manage Time Slots"}
                      </label>
                      {!autoBook && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlots([...slots, { id: Date.now().toString(), slotName: `Afternoon Slot ${slots.length}`, startTime: "03:00 PM", endTime: "03:30 PM", capacity: 20 }]);
                          }}
                          className="text-[10px] bg-[#007f70] text-white px-2.5 py-1 rounded font-bold hover:bg-[#00665a]"
                        >
                          + Add Slot
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {slots.map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-[#dceae6]">
                          <input
                            type="text"
                            placeholder="Slot Name"
                            value={s.slotName}
                            onChange={(e) => {
                              const newSlots = [...slots];
                              newSlots[idx].slotName = e.target.value;
                              setSlots(newSlots);
                            }}
                            className="w-1/4 text-xs p-1.5 border border-[#dceae6] rounded outline-none text-[#071633] font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Start Time"
                            value={s.startTime}
                            onChange={(e) => {
                              const newSlots = [...slots];
                              newSlots[idx].startTime = e.target.value;
                              setSlots(newSlots);
                            }}
                            className="w-1/4 text-xs p-1.5 border border-[#dceae6] rounded outline-none text-[#071633] font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="End Time"
                            value={s.endTime}
                            onChange={(e) => {
                              const newSlots = [...slots];
                              newSlots[idx].endTime = e.target.value;
                              setSlots(newSlots);
                            }}
                            className="w-1/4 text-xs p-1.5 border border-[#dceae6] rounded outline-none text-[#071633] font-semibold"
                          />
                          <input
                            type="number"
                            placeholder="Capacity"
                            value={s.capacity}
                            onChange={(e) => {
                              const newSlots = [...slots];
                              newSlots[idx].capacity = Number(e.target.value);
                              setSlots(newSlots);
                            }}
                            className="w-[15%] text-xs p-1.5 border border-[#dceae6] rounded outline-none text-[#071633] font-semibold"
                          />
                          {!autoBook && (
                            <button
                              type="button"
                              onClick={() => {
                                setSlots(slots.filter(item => item.id !== s.id));
                              }}
                              className="text-red-500 font-extrabold px-1.5 text-xs hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification Channels */}
                  <div className="border-t border-[#cfe6e0] pt-3 space-y-2">
                    <label className="block text-[10px] font-bold text-[#344054]">Notification Preferences</label>
                    <div className="flex flex-wrap gap-4 text-xs text-[#071633] font-semibold">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyPrefs.parent}
                          onChange={() => setNotifyPrefs({ ...notifyPrefs, parent: !notifyPrefs.parent })}
                          className="rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                        />
                        Notify Parent
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyPrefs.student}
                          onChange={() => setNotifyPrefs({ ...notifyPrefs, student: !notifyPrefs.student })}
                          className="rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                        />
                        Notify Student
                      </label>
                      <span className="text-slate-300">|</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyPrefs.email}
                          onChange={() => setNotifyPrefs({ ...notifyPrefs, email: !notifyPrefs.email })}
                          className="rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                        />
                        Email
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyPrefs.sms}
                          onChange={() => setNotifyPrefs({ ...notifyPrefs, sms: !notifyPrefs.sms })}
                          className="rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                        />
                        SMS
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyPrefs.inApp}
                          onChange={() => setNotifyPrefs({ ...notifyPrefs, inApp: !notifyPrefs.inApp })}
                          className="rounded border-[#dceae6] text-[#007f70] focus:ring-[#007f70]"
                        />
                        In-App Notification
                      </label>
                    </div>
                    {requiredDocs.includes("Hall Ticket") && (
                      <p className="text-[9px] font-medium leading-4 text-[#71818d]">
                        <span className="font-bold">*</span> In the <span className="font-bold">Parent Portal</span>, after booking a slot, open <span className="font-bold">At-School Assessment Scheduling</span> and select <span className="font-bold">Print Hall Ticket</span> under Slot Assignment.
                      </p>
                    )}
                  </div>

                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#344054] mb-1.5">Set Assessment Due Date *</label>
                <input
                  type="date"
                  required
                  value={publishDueDate}
                  onChange={(e) => setPublishDueDate(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none"
                />
              </div>

              {/* Assignment Options */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#344054]">Assign To *</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "ALL", label: "Entire Class" },
                    { value: "SECTION", label: "Section" },
                    { value: "GROUP", label: "Group" },
                    { value: "SELECTED", label: "Selected Students" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleAssignmentTypeChange(opt.value)}
                      className={`flex min-h-12 items-center justify-center px-2.5 py-2 text-center text-xs font-bold leading-4 border rounded-xl transition-all ${
                        assignmentType === opt.value
                          ? "border-[#007f70] bg-[#eefaf7] text-[#007f70] shadow-sm"
                          : "border-[#dceae6] bg-white text-[#607080] hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {assignmentType === "SECTION" && (
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Select Section *</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none"
                  >
                    <option value="" disabled>-- Choose Section --</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              )}

              {assignmentType === "GROUP" && (
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1.5">Select Group *</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none"
                  >
                    <option value="" disabled>-- Choose Group --</option>
                    <option value="Group X">Group X (Deterministic half)</option>
                    <option value="Group Y">Group Y (Deterministic other half)</option>
                    <option value="Group Z">Group Z (Scholarship All)</option>
                  </select>
                </div>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#344054]">
                    Candidates List (Grade: <span className="font-extrabold text-[#007f70]">{isPublishing.grade}</span>)
                  </label>
                  <span className="text-[10px] text-[#71818d] font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                    {publishTargetAppIds.length} Selected
                  </span>
                </div>
                
                <div className="border border-[#dceae6] rounded-xl max-h-56 overflow-y-auto divide-y divide-[#dceae6]">
                  {(() => {
                    const gradeApps = applications.filter(app => app.grade === isPublishing.grade && app.assessmentRequired !== false);
                    let filteredApps = gradeApps;
                    
                    if (assignmentType === "SECTION" && selectedSection) {
                      filteredApps = gradeApps.filter(app => (app.section || "A").toUpperCase() === selectedSection.toUpperCase());
                    } else if (assignmentType === "GROUP" && selectedGroup) {
                      if (selectedGroup === "Group X") {
                        const eligible = gradeApps.filter(app => !hasExistingAssignment(app, isPublishing));
                        const groupXIds = new Set(eligible.filter((_, idx) => idx % 2 === 0).map(app => app.id));
                        filteredApps = gradeApps.filter(app => groupXIds.has(app.id) || hasExistingAssignment(app, isPublishing));
                      } else if (selectedGroup === "Group Y") {
                        const eligible = gradeApps.filter(app => !hasExistingAssignment(app, isPublishing));
                        const groupYIds = new Set(eligible.filter((_, idx) => idx % 2 !== 0).map(app => app.id));
                        filteredApps = gradeApps.filter(app => groupYIds.has(app.id) || hasExistingAssignment(app, isPublishing));
                      } else if (selectedGroup === "Group Z") {
                        filteredApps = gradeApps;
                      }
                    }

                    if (filteredApps.length === 0) {
                      return (
                        <div className="p-4 text-center text-xs text-[#71818d]">
                          No active student applications matching this selection criteria found.
                        </div>
                      );
                    }

                    return filteredApps.map((app) => {
                      const alreadyAssigned = hasExistingAssignment(app, isPublishing);
                      return (
                        <div
                          key={app.id}
                          onClick={() => {
                            if (!alreadyAssigned && assignmentType === "SELECTED") {
                              handleToggleTargetApp(app.id);
                            }
                          }}
                          aria-disabled={alreadyAssigned || assignmentType !== "SELECTED"}
                          className={`p-3 flex items-center justify-between transition-colors ${
                            alreadyAssigned
                              ? "cursor-not-allowed bg-slate-100 opacity-60"
                              : assignmentType !== "SELECTED"
                                ? "cursor-default bg-slate-50/50"
                                : `cursor-pointer hover:bg-slate-50 ${publishTargetAppIds.includes(app.id) ? "bg-[#f0faf7]" : ""}`
                          }`}
                        >
                          <div className="space-y-0.5 text-left">
                            <p className="text-xs font-bold text-[#071633]">{app.studentFirstName} {app.studentLastName}</p>
                            <p className="text-[10px] text-[#71818d]">
                              App ID: {app.id.substring(0, 8)} · Section: {app.section || "A"} · Status: {app.status}
                            </p>
                            {alreadyAssigned && (
                              <p className="text-[9px] font-extrabold text-amber-700">Already assigned</p>
                            )}
                          </div>
                          <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all ${
                            alreadyAssigned
                              ? "border-slate-300 bg-slate-200"
                              : publishTargetAppIds.includes(app.id)
                                ? "assessment-student-check bg-[#007f70] border-[#007f70]"
                                : "border-[#dceae6] bg-white"
                          }`}>
                            {publishTargetAppIds.includes(app.id) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#dceae6] bg-[#f8fbf9] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPublishing(null)}
                className="px-4 py-2 border border-[#dceae6] bg-white hover:bg-slate-50 text-[#607080] rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishSubmit}
                disabled={actionLoading || publishTargetAppIds.length === 0}
                className="flex items-center gap-1.5 bg-[#007f70] hover:bg-[#00665a] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Assign & Publish
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {gameResultSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071633]/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#dceae6] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#dceae6] bg-[#f8fbf9] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#007f70]">Game assessment result</p>
                <h3 className="mt-1 text-sm font-bold text-[#071633]">
                  {gameResultSubmission.application?.studentFirstName} {gameResultSubmission.application?.studentLastName}
                </h3>
                {libraryGamesBundleOpen && <div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${Number(gameResultSubmission.gameResult?.submissionCount || 0) > 1 ? "bg-indigo-100 text-indigo-700" : "bg-[#e6f7f2] text-[#007f70]"}`}>{Number(gameResultSubmission.gameResult?.submissionCount || 0) > 1 ? "Reassessment submission" : "Initial submission"}</span><span className="text-[9px] font-bold text-[#71818d]">Submission cycle {Math.max(1, Number(gameResultSubmission.gameResult?.submissionCount || 0))}</span></div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setGameResponseReviewOpen(false); setGamePerformanceDetail(null); setStudentGamesPerformance(null); setGameResultSubmission(null); }} className="rounded-lg border border-[#dceae6] p-2 text-[#607080] hover:bg-white" aria-label="Close game result">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              {!libraryGamesBundleOpen && <>
              <div>
                <p className="text-[10px] font-bold text-[#71818d]">GAME</p>
                <p className="mt-1 text-sm font-black text-[#071633]">{gameResultSubmission.gameResult?.gameName}</p>
                <p className="mt-1 text-xs text-[#607080]">{gameResultSubmission.assessment?.subject} · {gameResultSubmission.application?.grade}</p>
              </div>
              <div className={`grid grid-cols-2 gap-3 ${gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? "sm:grid-cols-4" : "sm:grid-cols-5"}`}>
                <div className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3"><span className="text-[9px] font-bold text-[#71818d]">OVERALL SCORE</span><strong className="mt-1 block text-lg text-[#071633]">{gameResultSubmission.gameResult?.score ?? "Not available"}{gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? "%" : ""}</strong></div>
                {gameResultSubmission.gameResult?.engineKey !== "BALL_STACK" && <div className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3"><span className="text-[9px] font-bold text-[#71818d]">PERCENT</span><strong className="mt-1 block text-lg text-[#071633]">{Math.round(gameResultSubmission.gameResult?.percentage || 0)}%</strong></div>}
                <div className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3"><span className="text-[9px] font-bold text-[#71818d]">{gameResultSubmission.gameResult?.engineKey === "MAGIC_PAINT" ? "OBJECTS COMPLETED" : gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? "SUCCESSFUL PLACEMENTS" : "CORRECT"}</span><strong className="mt-1 block text-lg text-[#071633]">{gameResultSubmission.gameResult?.engineKey === "MAGIC_PAINT" ? (gameResultSubmission.gameResult?.performanceMetrics?.objectsCompleted ?? "Not available") : gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? (gameResultSubmission.gameResult?.performanceMetrics?.successfulPlacements ?? "Not available") : (gameResultSubmission.gameResult?.correct || 0)}</strong></div>
                <div className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3"><span className="text-[9px] font-bold text-[#71818d]">{gameResultSubmission.gameResult?.engineKey === "MAGIC_PAINT" ? "COLORS EXPLORED" : gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? "FAILED PLACEMENTS" : "INCORRECT"}</span><strong className="mt-1 block text-lg text-[#071633]">{gameResultSubmission.gameResult?.engineKey === "MAGIC_PAINT" ? (Array.isArray(gameResultSubmission.gameResult?.performanceMetrics?.colorsUsed) ? gameResultSubmission.gameResult.performanceMetrics.colorsUsed.length : "Not available") : gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? (gameResultSubmission.gameResult?.performanceMetrics?.failedPlacements ?? "Not available") : (gameResultSubmission.gameResult?.incorrect || 0)}</strong></div>
                <div className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3"><span className="text-[9px] font-bold text-[#71818d]">TIME</span><strong className="mt-1 block text-sm text-[#071633]">{Math.floor((gameResultSubmission.timeTaken || 0) / 60)}m {(gameResultSubmission.timeTaken || 0) % 60}s</strong></div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#dceae6] p-3 text-xs">
                <span className="font-bold text-[#607080]">Result</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${gameResultSubmission.gameResult?.status !== "COMPLETED" ? "bg-blue-100 text-blue-800" : gameResultSubmission.gameResult?.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {gameResultSubmission.gameResult?.status !== "COMPLETED" ? "In progress" : gameResultSubmission.gameResult?.passed ? "Passed" : "Below target"}
                </span>
              </div>
              <div className="text-[10px] text-[#71818d]">
                Monitoring: {gameResultSubmission.totalWarnings || 0} warnings · {gameResultSubmission.tabSwitchCount || 0} tab switches · {gameResultSubmission.fullscreenExitCount || 0} fullscreen exits
              </div>
              {gameResultSubmission.gameResult?.review?.length > 0 && <button
                type="button"
                onClick={() => { setGameResponseReviewIndex(0); setGameResponseReviewOpen(true); }}
                className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#9bd9cc] bg-[#f0faf7] px-4 py-3 text-left transition hover:border-[#55b9a7] hover:bg-[#e8f7f3]"
              >
                <span><span className="block text-xs font-black text-[#006f62]">View Student Responses</span><span className="mt-1 block text-[9px] text-[#607080]">Review each saved round one at a time.</span></span>
                <ArrowRight className="h-4 w-4 text-[#007f70]" />
              </button>}
              {Object.keys(gameResultSubmission.gameResult?.performanceMetrics || {}).length > 0 && (
                <section className="rounded-xl border border-[#9bd9cc] bg-[#f5fbf9] p-4">
                  <div className="flex items-center justify-between gap-3"><div><h4 className="text-xs font-black text-[#006f62]">Real-time game performance</h4><p className="mt-1 text-[9px] text-[#607080]">Automatically synchronized from the saved game session.</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-700">SAVED SESSION</span></div>
                  {gameResultSubmission.gameResult?.engineKey === "MAGIC_PAINT" ? <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-[#cde8e1] bg-white p-4"><p className="text-xs font-black text-[#071633]">What this result means</p><p className="mt-1 text-[10px] leading-5 text-[#526474]">The student completed a creative painting activity. There were no right or wrong answers. Review how fully, quickly, and consistently the student interacted with the objects.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#dceae6] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">Task completion</p><b className="text-sm text-[#007f70]">{formatGameMetricValue("completionPercentage", gameResultSubmission.gameResult.performanceMetrics.completionPercentage)}</b></div><p className="mt-2 text-xs font-bold text-[#071633]">Completed {gameResultSubmission.gameResult.performanceMetrics.objectsCompleted ?? "Not available"} painting objects.</p></div>
                      <div className="rounded-xl border border-[#dceae6] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">Creative exploration</p><b className="text-sm text-[#007f70]">{formatGameMetricValue("creativityScore", gameResultSubmission.gameResult.performanceMetrics.creativityScore)}</b></div><p className="mt-2 text-xs text-[#526474]">Based on completed objects, variety of colors, and interaction consistency.</p></div>
                      <div className="rounded-xl border border-[#dceae6] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">Cause and effect</p><b className="text-sm text-[#007f70]">{formatGameMetricValue("causeEffectScore", gameResultSubmission.gameResult.performanceMetrics.causeEffectScore)}</b></div><p className="mt-2 text-xs text-[#526474]">Shows how successfully the student&apos;s painting actions completed each object.</p></div>
                      <div className="rounded-xl border border-[#dceae6] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">Work pattern</p><b className="text-sm text-[#007f70]">{formatGameMetricValue("interactionConsistency", gameResultSubmission.gameResult.performanceMetrics.interactionConsistency)}</b></div><p className="mt-2 text-xs text-[#526474]">Average object time: {formatGameMetricValue("averageCompletionTime", gameResultSubmission.gameResult.performanceMetrics.averageCompletionTime)}.</p></div>
                    </div>
                    <div className="rounded-xl border border-[#dceae6] bg-white p-4"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">Colors the student explored</p><div className="mt-3 flex flex-wrap gap-2">{Array.isArray(gameResultSubmission.gameResult.performanceMetrics.colorsUsed) && gameResultSubmission.gameResult.performanceMetrics.colorsUsed.length ? gameResultSubmission.gameResult.performanceMetrics.colorsUsed.map((color: string) => <span key={color} className="inline-flex items-center gap-2 rounded-full border border-[#dceae6] bg-[#fafdfc] px-3 py-1.5 text-[9px] font-bold text-[#34475a]"><i className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color }} />{paintColorName(color)}</span>) : <span className="text-[10px] text-[#71818d]">Not available</span>}</div></div>
                  </div> : <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {Object.entries(gameResultSubmission.gameResult.performanceMetrics).filter(([key, value]) => value !== null && value !== undefined && (gameResultSubmission.gameResult?.engineKey === "BALL_STACK" ? [
                      "fineMotorScore",
                      "precisionScore",
                      "consistencyScore",
                      "averageReactionTime",
                      "towerStabilityScore",
                    ].includes(key) : ![
                      "overallScore",
                      "completionStatus",
                      "correctSelections",
                      "incorrectSelections",
                      "completionPercentage",
                      "observationScore",
                    ].includes(key))).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-[#dceae6] bg-white p-3"><p className="text-[8px] font-black uppercase tracking-wide text-[#71818d]">{formatGameMetricLabel(key)}</p><p className="mt-1 text-sm font-black text-[#071633]">{formatGameMetricValue(key, value)}</p></div>
                    ))}
                  </div>}
                </section>
              )}
              </>}
              {gamePerformanceLoading && <section className="grid min-h-28 place-items-center rounded-xl border border-[#dceae6] bg-[#fafdfc]"><div className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#007f70]" /><p className="mt-2 text-[9px] font-bold text-[#71818d]">Loading performance analytics…</p></div></section>}
              {gamePdfError && <div role="alert" className="games-error-alert rounded-xl p-3 text-xs font-bold leading-5">{gamePdfError}</div>}
              {studentGamesPerformance?.games?.length > 0 && <section className="space-y-4 rounded-xl border border-[#7ed5c5] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#007f70]">1 · Overall result</p><h4 className="mt-1 text-sm font-black text-[#071633]">{studentGamesPerformance.student?.name}&apos;s assessment performance</h4><p className="mt-1 text-[9px] text-[#71818d]">A consolidated summary of all completed interactive assessments.</p></div><button type="button" onClick={downloadAllGamesPdf} className="rounded-xl bg-[#007f70] px-4 py-2.5 text-[10px] font-black text-white hover:bg-[#00665a]">Send to Parent</button></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-[#f5faf8] p-3"><p className="text-[8px] font-black uppercase text-[#71818d]">Assessments completed</p><b className="mt-1 block text-lg text-[#071633]">{studentGamesPerformance.gamesCompleted}</b></div><div className="rounded-xl bg-[#f5faf8] p-3"><p className="text-[8px] font-black uppercase text-[#71818d]">Highest performance</p><b className="mt-1 block text-lg text-[#071633]">{Math.round(Math.max(...studentGamesPerformance.games.map((game: any) => Number(game.score || 0))))}%</b></div>{studentGamesPerformance.games.some((game: any) => Number(game.score) > 0) ? <><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[8px] font-black uppercase text-emerald-700">Best assessment</p><b className="mt-1 block truncate text-xs text-[#071633]">{studentGamesPerformance.games[0]?.game?.name}</b><span className="text-[9px] font-black text-emerald-700">{Math.round(studentGamesPerformance.games[0]?.score || 0)}%</span></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[8px] font-black uppercase text-amber-700">Area to develop</p><b className="mt-1 block truncate text-xs text-[#071633]">{studentGamesPerformance.games[studentGamesPerformance.games.length - 1]?.game?.name}</b><span className="text-[9px] font-black text-amber-700">{Math.round(studentGamesPerformance.games[studentGamesPerformance.games.length - 1]?.score || 0)}%</span></div></> : <div className="col-span-2 rounded-xl bg-amber-50 p-3"><p className="text-[8px] font-black uppercase text-amber-700">Performance ranking</p><b className="mt-1 block text-xs text-[#071633]">Not available - no assessment score was captured</b></div>}</div>
                <div><div className="mb-3"><p className="text-[9px] font-black uppercase tracking-wide text-[#607080]">2 · Compare assessments</p><p className="mt-1 text-[9px] text-[#71818d]">Higher points indicate stronger performance. Select any assessment point for details.</p></div><GamePerformanceChart games={studentGamesPerformance.games} onSelect={(id) => void viewCompletedGameDetail(id)} /></div>
                <div><div className="mb-3"><p className="text-[9px] font-black uppercase tracking-wide text-[#607080]">3 · Assessment and reassessment performance</p><p className="mt-1 text-[9px] text-[#71818d]">Every completed attempt is shown below. The strongest attempt is used as the game&apos;s highest performance.</p></div><div className="grid gap-3 md:grid-cols-2">{studentGamesPerformance.games.map((game: any) => { const attempts = (game.attemptHistory || []).filter((attempt: any) => attempt.status === "COMPLETED" && attempt.percentage !== null); const highest = attempts.length ? Math.max(...attempts.map((attempt: any) => Number(attempt.percentage || 0))) : Number(game.score || 0); return <article key={game.id} className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-4"><div className="flex items-start justify-between gap-3"><div><h5 className="text-xs font-black text-[#071633]">{game.game?.name || "Assessment"}</h5><p className="mt-1 text-[9px] font-semibold text-[#71818d]">{attempts.length} completed attempt{attempts.length === 1 ? "" : "s"}</p></div><span className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[9px] font-black text-emerald-700">Highest {Math.round(highest)}%</span></div><div className="mt-3 grid gap-2">{attempts.length ? attempts.map((attempt: any) => <div key={attempt.id} className="flex items-center gap-3 rounded-lg border border-[#e0ece9] bg-white px-3 py-2.5"><span className="min-w-16 text-[9px] font-black text-[#526474]">Attempt {attempt.attemptNumber}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7efed]"><div className={`h-full rounded-full ${Number(attempt.percentage) === highest ? "bg-[#008f7d]" : "bg-[#e49a18]"}`} style={{ width: `${Math.max(2, Math.min(100, Number(attempt.percentage || 0)))}%` }} /></div><strong className="w-10 text-right text-[10px] text-[#071633]">{Math.round(Number(attempt.percentage || 0))}%</strong></div>) : <p className="rounded-lg bg-white p-3 text-[9px] font-semibold text-[#71818d]">No completed attempt scores are available.</p>}</div></article>; })}</div></div>
              </section>}
              {gamePerformanceDetail && showSelectedGameDetails && <section className="space-y-4 rounded-xl border border-[#9bd9cc] bg-[#f5fbf9] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#007f70]">3 · Game details</p><h4 className="mt-1 text-xs font-black text-[#071633]">{gamePerformanceDetail.game?.name}</h4><p className="mt-1 text-[9px] text-[#71818d]">Skills measured in this game and comparison with similar students.</p></div><button type="button" onClick={() => setShowSelectedGameDetails(false)} className="rounded-xl border border-[#b9dcd4] bg-white px-3 py-2.5 text-[10px] font-black text-[#526474]">Hide details</button></div>
                {gamePerformanceDetail.recordingSessionId && <section className="rounded-xl border border-[#c7ddd8] bg-white p-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#007f70]">Gameplay evidence</p><h5 className="mt-1 text-xs font-black text-[#071633]">{gamePerformanceDetail.game?.name} screen recording</h5><p className="mt-1 text-[9px] text-[#71818d]">Recording for this selected game · game screen only</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-700">SAVED VIDEO</span></div>
                  {gameplayVideoUrl ? <video controls preload="metadata" src={gameplayVideoUrl} className="mt-4 aspect-video w-full rounded-xl border border-[#dceae6] bg-slate-950" aria-label={`${gamePerformanceDetail.game?.name || "Selected game"} gameplay recording`} /> : <div className="mt-4 grid aspect-video place-items-center rounded-xl border border-dashed border-[#cbded9] bg-[#fafdfc] text-[10px] font-bold text-[#71818d]"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#007f70]" />Preparing gameplay video…</div>}
                </section>}
                {gamePerformanceDetail.skills?.length ? <SkillColumnChart skills={gamePerformanceDetail.skills} /> : <div className="rounded-xl border border-dashed border-[#cbded9] bg-white p-4 text-center text-[10px] font-bold text-[#71818d]">Skill performance data is not available for this game.</div>}
                <div>{(() => { const comparison = gamePerformanceDetail.comparison || { averageScore: 72, sampleSize: 4, group: `${gamePerformanceDetail.game?.ageGroup || "Same age group"} · Demo data` }; const isDemo = !gamePerformanceDetail.comparison; const studentScore = Math.round(Number(gamePerformanceDetail.score || 0)); const averageScore = Math.round(Number(comparison.averageScore || 0)); const difference = studentScore - averageScore; const differenceText = difference === 0 ? "matches the age-group average" : `${Math.abs(difference)} percentage points ${difference > 0 ? "above" : "below"} the age-group average`; const guidance = difference >= 10 ? "Strong performance — continue with more challenging activities." : difference >= 0 ? "Performing at the expected level — continue regular practice." : difference >= -9 ? "Slightly below average — focused practice may help." : "Additional practice and school support are recommended."; return <><div className="mb-3 flex flex-wrap items-center gap-2"><p className="text-[9px] font-black uppercase tracking-wide text-[#607080]">Age-group comparison</p>{isDemo && <span className="rounded-full bg-violet-100 px-2 py-1 text-[8px] font-black uppercase text-violet-700">Demo data</span>}</div><div className="rounded-xl border border-[#dceae6] bg-white p-4"><div className="grid gap-4 sm:grid-cols-2">{[[gamePerformanceDetail.student?.name || "Student", studentScore], [`Age-group average`, averageScore]].map(([label, score], index) => <div key={String(label)} className={`rounded-xl p-4 ${index === 0 ? "bg-[#effaf7]" : "bg-[#f3f1ff]"}`}><div className="mb-3 flex items-center justify-between gap-2"><span className="text-[10px] font-black text-[#34475a]">{label}</span><b className="text-lg text-[#071633]">{Math.round(Number(score))}%</b></div><div className="h-3 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${index === 0 ? "bg-[#008f7d]" : "bg-[#7a68c7]"}`} style={{ width: `${Math.max(2, Math.min(100, Number(score)))}%` }} /></div>{index === 1 && <p className="mt-2 text-[8px] font-bold text-[#71818d]">Based on {comparison.sampleSize} completed students</p>}</div>)}</div><div className={`mt-4 rounded-xl border p-4 ${difference < -9 ? "border-amber-200 bg-amber-50" : difference < 0 ? "border-sky-200 bg-sky-50" : "border-emerald-200 bg-emerald-50"}`}><p className="text-[9px] font-black uppercase tracking-wide text-[#607080]">What this means</p><p className="mt-1 text-xs font-black text-[#071633]">{gamePerformanceDetail.student?.name || "The student"} {differenceText}.</p><p className="mt-1 text-[10px] font-bold leading-5 text-[#526474]">{guidance}</p></div>{isDemo ? <p className="mt-3 text-[8px] font-bold text-violet-700">Example values are shown for demonstration. Real completed submissions will replace them automatically.</p> : <p className="mt-3 text-[8px] font-bold text-[#71818d]">{comparison.group}. Completed submissions only.</p>}</div></>; })()}</div>
              </section>}
              {libraryGamesBundleOpen && studentGamesPerformance?.games?.length > 0 && <section className="rounded-xl border border-[#c7ddd8] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#007f70]">4 · School review</p><h4 className="mt-1 text-xs font-black text-[#071633]">Record the school&apos;s overall review</h4><p className="mt-1 text-[9px] leading-4 text-[#71818d]">This note applies to the student&apos;s complete Games Library submission.</p></div><span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase ${gameResultSubmission.gameResult?.reviewStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-700" : gameResultSubmission.gameResult?.reviewStatus === "NEEDS_FOLLOW_UP" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{(gameResultSubmission.gameResult?.reviewStatus || "PENDING").replaceAll("_", " ")}</span></div><label className="mt-4 block"><span className="text-[9px] font-black uppercase tracking-wide text-[#607080]">School&apos;s performance note</span><textarea value={gameSchoolReview} onChange={(event) => setGameSchoolReview(event.target.value)} rows={4} placeholder="Example: The student performed strongly in creative tasks and would benefit from more practice in memory and listening games." className="mt-2 w-full resize-none rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3 text-xs leading-5 text-[#071633] outline-none transition focus:border-[#55b9a7] focus:ring-2 focus:ring-[#55b9a7]/15" /></label><div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={!gameSchoolReview.trim() || gameReviewSaving} onClick={() => void saveGameSchoolReview("REVIEWED")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#007f70] px-4 text-[10px] font-black text-white disabled:opacity-45">{gameReviewSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark Complete Submission as Reviewed</button></div></section>}
              {!libraryGamesBundleOpen && gameResultSubmission.gameResult?.recordingSessionId && gameResultSubmission.gameResult?.status === "COMPLETED" && <section className="rounded-xl border border-[#c7ddd8] bg-white p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#007f70]">Gameplay evidence</p><h4 className="mt-1 text-xs font-black text-[#071633]">Student gameplay recording</h4><p className="mt-1 text-[9px] text-[#71818d]">Game screen only · no webcam or microphone</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-700">SAVED VIDEO</span></div>
                {gameplayVideoUrl ? <video controls preload="metadata" src={gameplayVideoUrl} className="mt-4 aspect-video w-full rounded-xl border border-[#dceae6] bg-slate-950" aria-label="Student gameplay recording" /> : <div className="mt-4 grid aspect-video place-items-center rounded-xl border border-dashed border-[#cbded9] bg-[#fafdfc] text-[10px] font-bold text-[#71818d]"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#007f70]" />Preparing gameplay video…</div>}
              </section>}
              {!libraryGamesBundleOpen && gameResultSubmission.gameResult?.status === "COMPLETED" && <section className="rounded-xl border border-[#c7ddd8] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#007f70]">Final step</p><h4 className="mt-1 text-xs font-black text-[#071633]">School review</h4><p className="mt-1 text-[9px] leading-4 text-[#71818d]">Review the saved responses, add a short note, and record the school&apos;s decision.</p></div>
                  <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase ${gameResultSubmission.gameResult?.reviewStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-700" : gameResultSubmission.gameResult?.reviewStatus === "NEEDS_FOLLOW_UP" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{(gameResultSubmission.gameResult?.reviewStatus || "PENDING").replaceAll("_", " ")}</span>
                </div>
                <label className="mt-4 block"><span className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wide text-[#607080]"><span>School note</span><span className={gameNoteSaveState === "error" ? "text-rose-600" : "text-[#007f70]"}>{gameNoteSaveState === "saving" ? "Saving…" : gameNoteSaveState === "saved" ? "Saved" : gameNoteSaveState === "error" ? "Not saved" : "Auto-save on"}</span></span><textarea value={gameSchoolReview} onChange={(event) => setGameSchoolReview(event.target.value)} rows={3} placeholder="Add a brief observation about the student's performance…" className="mt-2 w-full resize-none rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3 text-xs leading-5 text-[#071633] outline-none transition focus:border-[#55b9a7] focus:ring-2 focus:ring-[#55b9a7]/15" /></label>
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" disabled={!gameSchoolReview.trim() || gameReviewSaving} onClick={() => void saveGameSchoolReview("NEEDS_FOLLOW_UP")} className="min-h-10 rounded-xl border border-amber-300 bg-amber-50 px-4 text-[10px] font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45">Needs Follow-up</button>
                  <button type="button" disabled={!gameSchoolReview.trim() || gameReviewSaving} onClick={() => void saveGameSchoolReview("REVIEWED")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#007f70] px-4 text-[10px] font-black text-white transition hover:bg-[#00665a] disabled:cursor-not-allowed disabled:opacity-45">{gameReviewSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark as Reviewed</button>
                </div>
              </section>}
            </div>
            <div className="flex justify-end border-t border-[#dceae6] bg-[#f8fbf9] p-4">
              <button onClick={() => { setGameResponseReviewOpen(false); setGamePerformanceDetail(null); setStudentGamesPerformance(null); setGameResultSubmission(null); }} className="rounded-xl bg-[#007f70] px-4 py-2 text-xs font-bold text-white hover:bg-[#00665a]">Close</button>
            </div>
          </div>
        </div>
      )}

      {gamePdfPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071633]/75 p-3 backdrop-blur-md sm:p-5">
          <section className="flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_30px_100px_rgba(7,22,51,.45)]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dceae6] bg-[#f8fbf9] p-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f5f1] text-[#007f70]"><FileText className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#007f70]">Assessment report</p><h3 className="mt-1 text-sm font-black text-[#071633]">Preview and share</h3></div></div>
              <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void shareGameReportWithParent("gmail")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7e7e3] bg-white px-4 text-[10px] font-black text-[#34475a] hover:bg-[#f5faf8]"><Mail className="h-3.5 w-3.5" /> Gmail</button><button type="button" onClick={() => void shareGameReportWithParent("whatsapp")} className="keep-white inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#20a969] px-4 text-[10px] font-black text-white hover:bg-[#188653]"><MessageCircle className="keep-white h-3.5 w-3.5" /> WhatsApp</button><a href={gamePdfPreview.url} download={gamePdfPreview.fileName} className="keep-white inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#007f70] px-4 text-[10px] font-black text-white hover:bg-[#00665a]"><Download className="keep-white h-3.5 w-3.5" /> Download</a><button type="button" onClick={() => { URL.revokeObjectURL(gamePdfPreview.url); setGamePdfPreview(null); }} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dceae6] bg-white text-[#607080] hover:bg-[#edf5f3]" aria-label="Close PDF preview"><XCircle className="h-4 w-4" /></button></div>
            </header>
            <iframe src={`${gamePdfPreview.url}#toolbar=1&navpanes=0`} title="Assessment performance PDF preview" className="min-h-0 flex-1 bg-[#e8efed]" />
          </section>
        </div>
      )}

      {gameResultSubmission && gameResponseReviewOpen && (() => {
        const responses = Array.isArray(gameResultSubmission.gameResult?.review) ? gameResultSubmission.gameResult.review : [];
        const safeIndex = Math.min(gameResponseReviewIndex, Math.max(0, responses.length - 1));
        const response = responses[safeIndex];
        const correctCount = responses.filter((item: { correct?: boolean | null }) => item.correct === true).length;
        const incorrectCount = responses.filter((item: { correct?: boolean | null }) => item.correct === false).length;
        const accuracy = responses.length ? Math.round((correctCount / responses.length) * 100) : 0;
        const imageUrl = response ? findSavedMedia(response, "image") : null;
        const audioUrl = response ? findSavedMedia(response, "audio") : null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071633]/65 p-3 backdrop-blur-md sm:p-5">
            <section className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_30px_90px_rgba(7,22,51,.35)]">
              <header className="flex items-center justify-between border-b border-[#dceae6] bg-[#f8fbf9] p-5">
                <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#007f70]">Student responses</p><h3 className="mt-1 text-sm font-black text-[#071633]">{gameResultSubmission.gameResult?.gameName || "Game assessment"}</h3><p className="mt-1 text-[9px] text-[#71818d]">Saved session · synchronized with the live result</p></div>
                <button onClick={() => setGameResponseReviewOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#dceae6] bg-white text-[#607080] hover:bg-[#edf5f3]" aria-label="Close student responses"><XCircle className="h-4 w-4" /></button>
              </header>
              <div className="overflow-y-auto p-5 sm:p-6">
                {response ? (
                  <article>
                    <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#007f70]">Round {response.number || safeIndex + 1}</p><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black ${response.correct === true ? "bg-emerald-100 text-emerald-700" : response.correct === false ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{response.correct === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : response.correct === false ? <XCircle className="h-3.5 w-3.5" /> : null}{response.correct === true ? "Correct" : response.correct === false ? "Incorrect" : "Not available"}</span></div>
                    <div className="mt-4 rounded-xl border border-[#dceae6] bg-[#fafdfc] p-4"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">What the student was asked</p><p className="mt-2 text-sm font-bold leading-6 text-[#071633]">{response.questionText || "Not available"}</p>{imageUrl && <img src={imageUrl} alt="Saved visual stimulus" className="mt-3 max-h-48 w-full rounded-xl border border-[#dceae6] bg-white object-contain p-2" />}{audioUrl && <audio controls preload="metadata" src={audioUrl} className="mt-3 w-full" />}</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#bfe4db] bg-[#f2fbf8] p-4"><p className="text-[9px] font-black uppercase tracking-wide text-[#007f70]">Student&apos;s answer</p><p className="mt-2 break-words text-xs font-bold leading-5 text-[#071633]">{formatSavedResponse(response.studentAnswer)}</p></div>
                      <div className="rounded-xl border border-[#dceae6] bg-white p-4"><p className="text-[9px] font-black uppercase tracking-wide text-[#71818d]">Correct answer</p><p className="mt-2 break-words text-xs font-bold leading-5 text-[#071633]">{formatSavedResponse(response.correctAnswer)}</p></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#dceae6] p-3"><p className="text-[9px] font-bold uppercase text-[#71818d]">Response time</p><p className="mt-1 text-sm font-black text-[#071633]">{response.timeTaken !== null && response.timeTaken !== undefined && Number.isFinite(Number(response.timeTaken)) ? `${Number(response.timeTaken)}s` : "Not available"}</p></div>
                      <div className="rounded-xl border border-[#dceae6] p-3"><p className="text-[9px] font-bold uppercase text-[#71818d]">Score</p><p className="mt-1 text-sm font-black text-[#071633]">{response.points !== null && response.points !== undefined && response.maxPoints !== null && response.maxPoints !== undefined ? `${response.points}/${response.maxPoints}` : "Not available"}</p></div>
                    </div>
                  </article>
                ) : <div className="rounded-xl border border-dashed border-[#cbded9] bg-[#fafdfc] p-8 text-center"><p className="text-xs font-black text-[#34475a]">Responses not available</p><p className="mt-2 text-[10px] leading-5 text-[#71818d]">{gameResultSubmission.gameResult?.reviewCaptureStatus === "LEGACY_NOT_CAPTURED" ? "This session was saved before round-level response capture was available. Exact answers cannot be reconstructed." : "No saved response data is available for this session."}</p></div>}
              </div>
              <footer className="border-t border-[#dceae6] bg-[#f8fbf9] p-4">
                {responses.length ? <><div className="mb-3 grid grid-cols-4 gap-2 rounded-xl border border-[#dceae6] bg-white p-3 text-center"><div><b className="block text-xs text-[#071633]">{responses.length}</b><span className="text-[8px] font-bold uppercase text-[#71818d]">Rounds</span></div><div><b className="block text-xs text-emerald-700">{correctCount}</b><span className="text-[8px] font-bold uppercase text-[#71818d]">Correct</span></div><div><b className="block text-xs text-rose-700">{incorrectCount}</b><span className="text-[8px] font-bold uppercase text-[#71818d]">Incorrect</span></div><div><b className="block text-xs text-[#007f70]">{accuracy}%</b><span className="text-[8px] font-bold uppercase text-[#71818d]">Accuracy</span></div></div>
                <div className="flex items-center justify-between gap-3"><button disabled={safeIndex === 0} onClick={() => setGameResponseReviewIndex((index) => Math.max(0, index - 1))} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#dceae6] bg-white px-3 text-[10px] font-black text-[#526474] disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5" /> Previous</button><span className="text-[10px] font-black text-[#607080]">{safeIndex + 1} of {responses.length}</span>{safeIndex === responses.length - 1 ? <button onClick={() => setGameResponseReviewOpen(false)} className="min-h-10 rounded-xl bg-[#007f70] px-4 text-[10px] font-black text-white hover:bg-[#00665a]">Finish</button> : <button onClick={() => setGameResponseReviewIndex((index) => Math.min(responses.length - 1, index + 1))} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#007f70] px-3 text-[10px] font-black text-white">Next <ArrowRight className="h-3.5 w-3.5" /></button>}</div></> : <div className="flex justify-end"><button onClick={() => setGameResponseReviewOpen(false)} className="min-h-10 rounded-xl bg-[#007f70] px-5 text-[10px] font-black text-white hover:bg-[#00665a]">Close</button></div>}
              </footer>
            </section>
          </div>
        );
      })()}

      {/* Grading evaluation modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#071633]">
                  Grade: {gradingSubmission.application?.studentFirstName} {gradingSubmission.application?.studentLastName}
                </h3>
                <p className="text-[10px] text-[#71818d] mt-0.5">
                  Assessment: {gradingSubmission.assessment?.title} ({gradingSubmission.assessment?.subject})
                </p>
              </div>
              <button 
                onClick={() => setGradingSubmission(null)}
                className="text-[#607080] hover:text-[#071633] font-bold text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#fcfdfd]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-[#dceae6] p-4 rounded-xl shadow-sm text-xs items-center">
                <div>
                  <span className="text-[#71818d] block font-bold mb-0.5">Time Taken:</span>
                  <span className="font-bold text-[#071633]">
                    {gradingSubmission.timeTaken ? `${Math.floor(gradingSubmission.timeTaken / 60)}m ${gradingSubmission.timeTaken % 60}s` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[#71818d] block font-bold mb-0.5">Objective Correct:</span>
                  <span className="font-bold text-[#071633]">
                    {gradingAnswers.filter(a => a.type === 'MCQ' && a.isCorrect).length} / {gradingAnswers.filter(a => a.type === 'MCQ').length}
                  </span>
                </div>
                <div>
                  <span className="text-[#71818d] block font-bold mb-0.5">Submission Score:</span>
                  <span className="font-bold text-[#007f70]">
                    {(gradingSubmission.assessment?.hasWritten ? gradingAnswers.filter(a => !a.isListening).reduce((acc, curr) => acc + (Number(curr.marksObtained) || 0), 0) : 0) +
                     (gradingSubmission.assessment?.hasReading ? Number(readingScoreOverride || 0) : 0) +
                     (gradingSubmission.assessment?.hasSpeaking ? Number(speakingScoreOverride || 0) : 0) +
                     (gradingSubmission.assessment?.hasListening ? Number(listeningScoreOverride || 0) : 0)} / {gradingSubmission.assessment?.totalMarks} pts
                  </span>
                </div>
                <div className="md:text-right">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleAIGradeClick}
                    className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-[#e6f7f2] hover:bg-[#cceae3] text-[#007f70] border border-[#b2e2d5] px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" /> Auto-Grade with AI
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Proctoring & Security Metrics Summary */}
              <div className="bg-slate-50 border border-[#dceae6] p-5 rounded-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#dceae6] pb-3">
                  <h4 className="font-extrabold text-[#071633] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#007f70]" /> AI Proctoring & Security Report
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    gradingSubmission.submissionReason === 'SECURITY_VIOLATION' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Status: {gradingSubmission.submissionReason === 'SECURITY_VIOLATION' ? 'Attempt Terminated' : 'Completed Securely'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium">
                  <div className="bg-white p-3 border border-[#dceae6] rounded-xl text-center">
                    <span className="text-[#71818d] block font-bold mb-0.5">Total Warnings:</span>
                    <span className={`font-black text-sm ${
                      gradingSubmission.totalWarnings >= 3 ? 'text-red-600' :
                      gradingSubmission.totalWarnings > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {gradingSubmission.totalWarnings || 0} / 3
                    </span>
                  </div>
                  <div className="bg-white p-3 border border-[#dceae6] rounded-xl text-center">
                    <span className="text-[#71818d] block font-bold mb-0.5">Tab Switch Attempts:</span>
                    <span className="font-extrabold text-sm text-[#071633]">
                      {gradingSubmission.tabSwitchCount || 0}
                    </span>
                  </div>
                  <div className="bg-white p-3 border border-[#dceae6] rounded-xl text-center">
                    <span className="text-[#71818d] block font-bold mb-0.5">Fullscreen Exits:</span>
                    <span className="font-extrabold text-sm text-[#071633]">
                      {gradingSubmission.fullscreenExitCount || 0}
                    </span>
                  </div>
                  <div className="bg-white p-3 border border-[#dceae6] rounded-xl text-center">
                    <span className="text-[#71818d] block font-bold mb-0.5">Submission Reason:</span>
                    <span className={`font-extrabold text-xs uppercase ${
                      gradingSubmission.submissionReason === 'SECURITY_VIOLATION' ? 'text-red-600 font-black' :
                      gradingSubmission.submissionReason === 'TIMEOUT' ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'
                    }`}>
                      {gradingSubmission.submissionReason || 'NORMAL'}
                    </span>
                  </div>
                </div>

                {/* Vertical Event Timeline */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Security Event Timeline</h5>
                  {gradingSubmission.securityLogs && gradingSubmission.securityLogs.length > 0 ? (
                    <div className="relative border-l border-slate-200 pl-4 space-y-3.5 max-h-48 overflow-y-auto">
                      {gradingSubmission.securityLogs.map((log: any) => {
                        const dateStr = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        
                        return (
                          <div key={log.id} className="relative text-[11px] leading-relaxed">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                              log.eventType === 'TERMINATED' ? 'bg-red-600' :
                              log.eventType === 'WARNING' || log.eventType === 'FULLSCREEN_EXIT' || log.eventType === 'TAB_CHANGED' ? 'bg-amber-500' :
                              'bg-slate-400'
                            }`} />
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-400 font-mono text-[10px]">{dateStr}</span>
                              <span className={`font-extrabold uppercase text-[9px] ${
                                log.eventType === 'TERMINATED' ? 'text-red-600' :
                                log.eventType === 'WARNING' || log.eventType === 'FULLSCREEN_EXIT' || log.eventType === 'TAB_CHANGED' ? 'text-amber-600' :
                                'text-slate-500'
                              }`}>
                                [{log.eventType}]
                              </span>
                            </div>
                            <p className="text-[#071633] mt-0.5">{log.details}</p>
                            {log.browser && (
                              <p className="text-[9px] text-[#71818d] mt-0.5">
                                Device: {log.device || "Unknown"} | Browser: {log.browser.split(" ").slice(-2).join(" ")} | IP: {log.ipAddress || "127.0.0.1"}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#71818d] italic">No security incidents or event logs recorded for this attempt.</p>
                  )}
                </div>
              </div>

              {/* AI & Manual Scorecard Overview Grid */}
              <div className="bg-slate-50 border border-[#dceae6] p-5 rounded-2xl space-y-3.5 text-xs">
                <h4 className="font-extrabold text-[#071633] flex items-center gap-1.5 border-b border-[#dceae6] pb-3">
                  <Sparkles className="h-4 w-4 text-[#007f70]" /> Component Scorecard Summary
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#dceae6] text-[#71818d] font-bold">
                        <th className="pb-2">Component</th>
                        <th className="pb-2 text-center">AI Score</th>
                        <th className="pb-2 text-center">Manual Score (Override)</th>
                        <th className="pb-2 text-right">Max Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dceae6] text-[#071633] font-semibold">
                      {/* Written Component */}
                      {gradingSubmission.assessment?.hasWritten && (
                        <tr>
                          <td className="py-2.5">Written Assessment</td>
                          <td className="py-2.5 text-center text-slate-400">N/A (Auto)</td>
                          <td className="py-2.5 text-center">
                            {gradingAnswers.filter((a: any) => !a.isListening).reduce((acc, curr) => acc + (Number(curr.marksObtained) || 0), 0)}
                          </td>
                          <td className="py-2.5 text-right">{formatMarks(gradingSubmission.assessment?.hasWritten ? (gradingSubmission.assessment.totalMarks - (gradingSubmission.assessment.readingTotalMarks || 0) - (gradingSubmission.assessment.speakingTotalMarks || 0) - (gradingSubmission.assessment.listeningTotalMarks || 0)) : 0)}</td>
                        </tr>
                      )}

                      {/* Reading Component */}
                      {gradingSubmission.assessment?.hasReading && (
                        <tr>
                          <td className="py-2.5">Reading Skills</td>
                          <td className="py-2.5 text-center">
                            {gradingSubmission.readingAiScore !== null ? `${Math.round((gradingSubmission.readingAiScore / 100) * (gradingSubmission.assessment?.readingTotalMarks || 0))} pts` : "Pending"}
                          </td>
                          <td className="py-2.5 text-center">
                            <input 
                              type="number"
                              value={readingScoreOverride}
                              min={0}
                              max={gradingSubmission.assessment?.readingTotalMarks}
                              onChange={(e) => setReadingScoreOverride(Number(e.target.value))}
                              className="w-20 text-center rounded border border-[#dceae6] px-1.5 py-0.5 text-xs font-bold"
                            />
                          </td>
                          <td className="py-2.5 text-right">{formatMarks(gradingSubmission.assessment?.readingTotalMarks)}</td>
                        </tr>
                      )}

                      {/* Listening Component */}
                      {gradingSubmission.assessment?.hasListening && (
                        <tr>
                          <td className="py-2.5">Listening Skills</td>
                          <td className="py-2.5 text-center">
                            {gradingSubmission.listeningAiScore !== null ? `${Math.round((gradingSubmission.listeningAiScore / 100) * (gradingSubmission.assessment?.listeningTotalMarks || 0))} pts` : "Pending"}
                          </td>
                          <td className="py-2.5 text-center">
                            <input 
                              type="number"
                              value={listeningScoreOverride}
                              min={0}
                              max={gradingSubmission.assessment?.listeningTotalMarks}
                              onChange={(e) => setListeningScoreOverride(Number(e.target.value))}
                              className="w-20 text-center rounded border border-[#dceae6] px-1.5 py-0.5 text-xs font-bold"
                            />
                          </td>
                          <td className="py-2.5 text-right">{formatMarks(gradingSubmission.assessment?.listeningTotalMarks)}</td>
                        </tr>
                      )}

                      {/* Speaking Component */}
                      {gradingSubmission.assessment?.hasSpeaking && (
                        <tr>
                          <td className="py-2.5">Speaking Skills</td>
                          <td className="py-2.5 text-center">
                            {gradingSubmission.speakingAiScore !== null ? `${Math.round((gradingSubmission.speakingAiScore / 100) * (gradingSubmission.assessment?.speakingTotalMarks || 0))} pts` : "Pending"}
                          </td>
                          <td className="py-2.5 text-center">
                            <input 
                              type="number"
                              value={speakingScoreOverride}
                              min={0}
                              max={gradingSubmission.assessment?.speakingTotalMarks}
                              onChange={(e) => setSpeakingScoreOverride(Number(e.target.value))}
                              className="w-20 text-center rounded border border-[#dceae6] px-1.5 py-0.5 text-xs font-bold"
                            />
                          </td>
                          <td className="py-2.5 text-right">{formatMarks(gradingSubmission.assessment?.speakingTotalMarks)}</td>
                        </tr>
                      )}

                      {/* Overall Sum */}
                      <tr className="border-t border-[#071633]/20 font-black bg-slate-100/50">
                        <td className="py-2.5">Overall Total</td>
                        <td className="py-2.5 text-center">
                          {((gradingSubmission.readingAiScore !== null ? (gradingSubmission.readingAiScore / 100) * (gradingSubmission.assessment?.readingTotalMarks || 0) : 0) +
                            (gradingSubmission.speakingAiScore !== null ? (gradingSubmission.speakingAiScore / 100) * (gradingSubmission.assessment?.speakingTotalMarks || 0) : 0) +
                            (gradingSubmission.listeningAiScore !== null ? (gradingSubmission.listeningAiScore / 100) * (gradingSubmission.assessment?.listeningTotalMarks || 0) : 0)).toFixed(0)} pts
                        </td>
                        <td className="py-2.5 text-center text-[#007f70]">
                          {((gradingSubmission.assessment?.hasWritten ? gradingAnswers.filter((a: any) => !a.isListening).reduce((acc, curr) => acc + (Number(curr.marksObtained) || 0), 0) : 0) +
                           (gradingSubmission.assessment?.hasReading ? Number(readingScoreOverride || 0) : 0) +
                           (gradingSubmission.assessment?.hasSpeaking ? Number(speakingScoreOverride || 0) : 0) +
                           (gradingSubmission.assessment?.hasListening ? Number(listeningScoreOverride || 0) : 0))} pts
                        </td>
                        <td className="py-2.5 text-right text-[#071633]">{gradingSubmission.assessment?.totalMarks}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Written Answers details (if hasWritten is true) */}
              {gradingSubmission.assessment?.hasWritten && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#607080] uppercase tracking-wider">Candidate Written Answers</h3>
                  
                  {gradingSubmission.answers.map((ans: any, idx: number) => {
                    const gradingState = gradingAnswers.find(ga => ga.answerId === ans.id);
                    if (!gradingState) return null;

                    return (
                      <div key={ans.id} className="p-5 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-[#071633]">
                              Q{idx + 1}. {ans.question?.questionText?.replace(/^Re-assessment version \d+:\s*/i, "")}
                            </h4>
                            <span className="inline-block text-[9px] bg-slate-100 text-[#71818d] font-bold px-1.5 py-0.5 rounded">
                              Type: {ans.question?.type} · Max Marks: {ans.question?.marks}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-[#007f70]">
                            Marks: {gradingState.marksObtained}/{ans.question?.marks}
                          </span>
                        </div>

                        {/* Display MCQs choice comparison */}
                        {ans.question?.type === 'MCQ' ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/30 text-[11px]">
                              <span className="text-emerald-800 font-bold block mb-0.5">Correct Option:</span>
                              <span className="text-emerald-950 font-semibold">{ans.question?.correctAnswer}</span>
                            </div>
                            <div className={`p-2.5 rounded-xl border text-[11px] ${ans.isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}>
                              <span className={`font-bold block mb-0.5 ${ans.isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                                Candidate Option:
                              </span>
                              <span className="text-slate-950 font-semibold">{ans.selectedOption || "(Skipped)"}</span>
                            </div>
                          </div>
                        ) : (
                          /* Subjective candidate response */
                          <div className="space-y-3">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                              <span className="text-[#71818d] font-bold text-[10px] block mb-1">CANDIDATE WRITTEN RESPONSE:</span>
                              <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">
                                {ans.writtenAnswer || "(Skipped/No answer submitted)"}
                              </p>
                            </div>

                            {/* Evaluator inputs */}
                            <div className="pt-2 border-t border-[#dceae6]">
                              <div className="max-w-xs">
                                <label className="block text-[10px] font-bold text-[#344054] mb-1">Marks Awarded *</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={ans.question?.marks}
                                  value={gradingState.marksObtained}
                                  onChange={(e) => handleGradingAnswerChange(ans.id, "marksObtained", e.target.value)}
                                  className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reading Skills Assessment Review */}
              {gradingSubmission.assessment?.hasReading && (
                <div className="p-5 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-4">
                  <div className="border-b border-[#dceae6] pb-2">
                    <h3 className="text-xs font-bold text-[#607080] uppercase tracking-wider">Reading Skills Assessment Review</h3>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-[#71818d]">STUDENT RECORDING AUDIO:</label>
                    {gradingSubmission.readingAudioUrl ? (
                      <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-3">
                        <audio
                          controls
                          className="w-full"
                          src={gradingSubmission.readingAudioUrl}
                          onCanPlay={() => setReadingPlaybackError(false)}
                          onError={() => setReadingPlaybackError(true)}
                        />
                      </div>
                    ) : (
                      <div className="p-3 border-2 border-dashed rounded-xl text-center text-xs text-slate-400">
                        No audio recording submitted by student.
                      </div>
                    )}
                    {readingPlaybackError && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                        This older submission does not contain a valid audio recording. Please use a newly recorded submission.
                      </div>
                    )}
                  </div>

                  {gradingSubmission.readingAudioUrl && readingAiData && (
                    <div className="bg-[#eefaf7] border border-[#b2e2d5] p-5 rounded-xl space-y-4 text-xs">
                      <h4 className="font-extrabold text-[#00665a] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#009b87]" /> AI Reading Report (Overall: {readingAiData.overallScore}%)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          ["Pronunciation", readingAiData.pronunciation],
                          ["Accuracy", readingAiData.accuracy],
                          ["Fluency", readingAiData.fluency],
                          ["Speed", readingAiData.speed],
                          ["Voice Clarity", readingAiData.voiceClarity],
                          ["Confidence", readingAiData.confidence],
                          ["Word Recognition", readingAiData.wordRecognition],
                          ["Completeness", readingAiData.completeness]
                        ].map(([label, score]) => (
                          <div key={label} className="bg-white p-2.5 border rounded-xl">
                            <span className="text-[10px] text-[#71818d] block font-bold mb-0.5">{label}:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-[#071633]">{score}%</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#007f70]" style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#cceae3] text-[11px]">
                        <div>
                          <span className="font-bold text-[#00665a] block mb-1">Strengths:</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {readingAiData.feedback?.strengths?.map((str: string, i: number) => (
                              <li key={i}>{str}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-[#00665a] block mb-1">Areas for Improvement:</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {readingAiData.feedback?.improvements?.map((imp: string, i: number) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#cceae3] text-[10px] font-medium text-slate-600">
                        <div>
                          <span className="font-bold block text-slate-500">Missed Words:</span>
                          <span>{readingAiData.missedWords?.join(", ") || "None"}</span>
                        </div>
                        <div>
                          <span className="font-bold block text-slate-500">Mispronounced Words:</span>
                          <span>{readingAiData.mispronouncedWords?.join(", ") || "None"}</span>
                        </div>
                        <div>
                          <span className="font-bold block text-slate-500">Pause Detection:</span>
                          <span>{readingAiData.pauseDetection || "No unusual pauses."}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Reading Marks (Max: {formatMarks(gradingSubmission.assessment?.readingTotalMarks)}) *</label>
                      <input
                        type="number"
                        min={0}
                        max={gradingSubmission.assessment?.readingTotalMarks}
                        value={readingScoreOverride}
                        onChange={(e) => setReadingScoreOverride(Number(e.target.value))}
                        className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Reading Remarks / Comments</label>
                      <input
                        type="text"
                        placeholder="Add specific comments on reading execution..."
                        value={readingRemarksOverride}
                        onChange={(e) => setReadingRemarksOverride(e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* English Speaking Assessment Review */}
              {gradingSubmission.assessment?.hasSpeaking && (
                <div className="p-5 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-4">
                  <div className="border-b border-[#dceae6] pb-2">
                    <h3 className="text-xs font-bold text-[#607080] uppercase tracking-wider">English Speaking Assessment Review</h3>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-[#71818d]">STUDENT VIDEO RECORDING:</label>
                    {gradingSubmission.speakingVideoUrl ? (
                      <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-center">
                        <video
                          controls
                          className="w-full max-w-lg rounded-lg shadow-inner"
                          src={gradingSubmission.speakingVideoUrl}
                          onCanPlay={() => setSpeakingPlaybackError(false)}
                          onError={() => setSpeakingPlaybackError(true)}
                        />
                      </div>
                    ) : (
                      <div className="p-3 border-2 border-dashed rounded-xl text-center text-xs text-slate-400">
                        No video recording submitted by student.
                      </div>
                    )}
                    {speakingPlaybackError && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                        This older submission does not contain a valid video recording. Please use a newly recorded submission.
                      </div>
                    )}
                  </div>

                  {gradingSubmission.speakingVideoUrl && speakingAiData && (
                    <div className="bg-[#eefaf7] border border-[#b2e2d5] p-5 rounded-xl space-y-4 text-xs">
                      <h4 className="font-extrabold text-[#00665a] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#009b87]" /> AI Speaking Report (Overall: {speakingAiData.overallScore}%)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          ["Pronunciation", speakingAiData.pronunciation],
                          ["Grammar", speakingAiData.grammar],
                          ["Vocabulary", speakingAiData.vocabulary],
                          ["Sentence Formation", speakingAiData.sentenceFormation],
                          ["Confidence", speakingAiData.confidence],
                          ["Voice Clarity", speakingAiData.voiceClarity],
                          ["Fluency", speakingAiData.fluency],
                          ["Communication", speakingAiData.communicationSkills],
                          ["Speed", speakingAiData.speed],
                          ["Eye Contact", speakingAiData.eyeContact],
                          ["Facial Engagement", speakingAiData.facialEngagement]
                        ].map(([label, score]) => (
                          <div key={label} className="bg-white p-2.5 border rounded-xl">
                            <span className="text-[10px] text-[#71818d] block font-bold mb-0.5">{label}:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-[#071633]">{score}%</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#007f70]" style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#cceae3] text-[11px]">
                        <div>
                          <span className="font-bold text-[#00665a] block mb-1">Strengths:</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {speakingAiData.feedback?.strengths?.map((str: string, i: number) => (
                              <li key={i}>{str}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-[#00665a] block mb-1">Areas for Improvement:</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {speakingAiData.feedback?.improvements?.map((imp: string, i: number) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Speaking Marks (Max: {formatMarks(gradingSubmission.assessment?.speakingTotalMarks)}) *</label>
                      <input
                        type="number"
                        min={0}
                        max={gradingSubmission.assessment?.speakingTotalMarks}
                        value={speakingScoreOverride}
                        onChange={(e) => setSpeakingScoreOverride(Number(e.target.value))}
                        className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Speaking Remarks / Comments</label>
                      <input
                        type="text"
                        placeholder="Add specific comments on speaking execution..."
                        value={speakingRemarksOverride}
                        onChange={(e) => setSpeakingRemarksOverride(e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Listening Skills Assessment Review */}
              {gradingSubmission.assessment?.hasListening && (
                <div className="p-5 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-4">
                  <div className="border-b border-[#dceae6] pb-2">
                    <h3 className="text-xs font-bold text-[#607080] uppercase tracking-wider">Listening Skills Assessment Review</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Plays Used:</span>
                      <span className="font-bold text-[#071633]">{gradingSubmission.listeningPlaysUsed || 0} plays</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Max Plays Allowed:</span>
                      <span className="font-bold text-[#071633]">
                        {gradingSubmission.assessment?.listeningPlaysAllowed === 0 ? "Unlimited" : `${gradingSubmission.assessment?.listeningPlaysAllowed || 1} plays`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Audio Speed:</span>
                      <span className="font-bold text-[#071633]">{gradingSubmission.assessment?.listeningAudioSpeed || 1}x</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Time Taken:</span>
                      <span className="font-bold text-[#071633]">
                        {gradingSubmission.listeningTimeTaken ? `${Math.floor(gradingSubmission.listeningTimeTaken / 60)}m ${gradingSubmission.listeningTimeTaken % 60}s` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {gradingSubmission.listeningPlaysUsed > 0 && listeningAiData && (
                    <div className="bg-[#eefaf7] border border-[#b2e2d5] p-5 rounded-xl space-y-4 text-xs">
                      <h4 className="font-extrabold text-[#00665a] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#009b87]" /> AI Listening Report (Overall: {listeningAiData.overallScore}%)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          ["Listening Accuracy", listeningAiData.listeningAccuracy],
                          ["Comprehension", listeningAiData.comprehensionScore],
                          ["Attention", listeningAiData.attentionScore],
                          ["Response Accuracy", listeningAiData.responseAccuracy],
                          ["Overall Listening Score", listeningAiData.overallScore]
                        ].map(([label, score]) => (
                          <div key={label} className="bg-white p-2.5 border rounded-xl">
                            <span className="text-[10px] text-[#71818d] block font-bold mb-0.5">{label}:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-[#071633]">{score}%</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#007f70]" style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#cceae3] text-[11px]">
                        <div>
                          <span className="font-bold text-[#00665a] block mb-1">Strengths:</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {listeningAiData.feedback?.strengths?.map((str: string, i: number) => (
                              <li key={i}>{str}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-[#00665a] block mb-1">Areas for Improvement:</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {listeningAiData.feedback?.improvements?.map((imp: string, i: number) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Listening Marks (Max: {formatMarks(gradingSubmission.assessment?.listeningTotalMarks)}) *</label>
                      <input
                        type="number"
                        min={0}
                        max={gradingSubmission.assessment?.listeningTotalMarks}
                        value={listeningScoreOverride}
                        onChange={(e) => setListeningScoreOverride(Number(e.target.value))}
                        className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-[#344054] mb-1">Listening Remarks / Comments</label>
                      <input
                        type="text"
                        placeholder="Add specific comments on listening execution..."
                        value={listeningRemarksOverride}
                        onChange={(e) => setListeningRemarksOverride(e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-2.5 text-[#071633] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Overall evaluation input */}
              <div className="p-5 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-[#607080] uppercase tracking-wider">Overall Evaluation Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Decision Status *</label>
                    <select
                      value={gradingStatus}
                      onChange={(e) => setGradingStatus(e.target.value)}
                      className="w-full text-xs font-semibold rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70]"
                    >
                      <option value="PASS">PASS (Proceed to Interview)</option>
                      <option value="FAIL">FAIL</option>
                      <option value="NEEDS_IMPROVEMENT">NEEDS IMPROVEMENT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1.5">Teacher General Feedback / Remarks</label>
                    <textarea
                      rows={2}
                      placeholder="Summary remarks on student capability..."
                      value={gradingRemarks}
                      onChange={(e) => setGradingRemarks(e.target.value)}
                      className="w-full text-xs font-medium rounded-xl border border-[#dceae6] bg-white p-3 text-[#071633] outline-none focus:border-[#007f70] resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#dceae6] bg-[#f8fbf9] flex items-center justify-end gap-3">
              <button
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 border border-[#dceae6] bg-white hover:bg-slate-50 text-[#607080] rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGradingSubmit(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-[#007f70] hover:bg-[#00665a] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Publish Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
