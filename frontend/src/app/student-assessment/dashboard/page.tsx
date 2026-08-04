"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Calendar,
  Clock,
  User,
  BookOpen,
  Award,
  PenTool,
  Volume2,
  Mic,
  BookOpenCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap,
  ArrowRight,
  Gamepad2,
  Play
} from "lucide-react";
import { GameRuntimePlayer } from "@/components/game-runtime-player";

type SlotAvailability = "BEFORE" | "ACTIVE" | "AFTER" | "INVALID";

function formatSlotDate(dateStr?: string): string {
  const dateMatch = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return "Date unavailable";

  const date = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
  );

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSlotDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr || !timeStr) return null;

  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!dateMatch || !timeMatch) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = timeMatch[3]?.toUpperCase();

  if (minutes > 59 || (meridiem && (hours < 1 || hours > 12)) || (!meridiem && hours > 23)) {
    return null;
  }
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const date = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    hours,
    minutes,
    0,
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function getSlotAvailability(
  dateStr?: string,
  startTimeStr?: string,
  endTimeStr?: string,
): SlotAvailability {
  const start = getSlotDateTime(dateStr, startTimeStr);
  const end = getSlotDateTime(dateStr, endTimeStr);
  if (!start || !end || end <= start) return "INVALID";

  const now = new Date();
  if (now < start) return "BEFORE";
  if (now >= end) return "AFTER";
  return "ACTIVE";
}

export default function StudentDashboard() {
  const router = useRouter();

  // Auth & API states
  const [profile, setProfile] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [assignedGames, setAssignedGames] = useState<any[]>([]);
  const [gameRuntime, setGameRuntime] = useState<any | null>(null);
  const [runtimeTutorial, setRuntimeTutorial] = useState<any | null>(null);
  const [activeGameAssignment, setActiveGameAssignment] = useState<any | null>(null);
  const [gameBusy, setGameBusy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"PENDING" | "SUBMITTED">("PENDING");
  
  // Loading & error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [dialogInfo, setDialogInfo] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);

  // At-School Slot Booking States
  const [bookingAssessment, setBookingAssessment] = useState<any | null>(null);
  const [bookingData, setBookingData] = useState<{ schedule: any; slots: any[]; currentBooking: any } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const studentGameRequest = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`http://localhost:5001/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("studentToken") || ""}`,
        "x-tenant-id": localStorage.getItem("studentSchoolId") || localStorage.getItem("schoolId") || "",
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Game request failed.");
    return payload;
  };

  const openGameTutorial = async (assignment: any) => {
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        };
        if (root.requestFullscreen) {
          await root.requestFullscreen({ navigationUI: "hide" });
        } else if (root.webkitRequestFullscreen) {
          await Promise.resolve(root.webkitRequestFullscreen());
        }
        if (!document.fullscreenElement && !(document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
          throw new Error("Chrome did not enter fullscreen. Allow fullscreen for localhost, then try again.");
        }
      }
      setGameBusy(assignment.id);
      setError(null);
      const tutorial = await studentGameRequest(`game-assessments/student/games/${assignment.id}/tutorial`);
      await studentGameRequest(`game-assessments/student/games/${assignment.id}/tutorial/progress`, {
        method: "POST",
        body: JSON.stringify({ tutorialViewed: true }),
      });
      const session = await studentGameRequest(`game-assessments/student/games/${assignment.id}/start`, {
        method: "POST",
        body: "{}",
      });
      setActiveGameAssignment(assignment);
      setRuntimeTutorial(tutorial);
      setGameRuntime({ ...session, status: "READY" });
    } catch (gameRequestError) {
      setError(gameRequestError instanceof Error ? gameRequestError.message : "The tutorial could not be opened.");
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } finally {
      setGameBusy(null);
    }
  };

  const completeAssignedGame = async (session: any) => {
    if (!activeGameAssignment) return;
    try {
      const result = await studentGameRequest(`game-assessments/student/games/${activeGameAssignment.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ sessionId: session.id }),
      });
      setGameRuntime(null);
      setRuntimeTutorial(null);
      setActiveGameAssignment(null);
      setAssignedGames(await studentGameRequest("game-assessments/student/games"));
      window.alert(`Game complete! Score ${result.score}. ${result.rewards?.xpEarned || 0} XP earned.`);
    } catch (gameRequestError) {
      setError(gameRequestError instanceof Error ? gameRequestError.message : "The game result could not be submitted.");
    }
  };

  const fetchBookingInfo = async (assessmentId: string) => {
    const token = localStorage.getItem("studentToken");
    setBookingLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/student/slots/${assessmentId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setBookingData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    if (!bookingAssessment) return;
    const token = localStorage.getItem("studentToken");
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/student/book-slot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          assessmentId: bookingAssessment.id,
          slotId,
        })
      });
      if (res.ok) {
        alert("Slot booked successfully!");
        fetchBookingInfo(bookingAssessment.id);
        const listRes = await fetch("http://localhost:5001/assessments/student/list", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (listRes.ok) setAssessments(await listRes.json());
      } else {
        const data = await res.json();
        alert(data.message || "Failed to book slot.");
      }
    } catch (e) {
      console.error(e);
      alert("Error booking slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this slot booking?")) return;
    const token = localStorage.getItem("studentToken");
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/student/cancel-booking/${bookingId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert("Booking cancelled successfully.");
        if (bookingAssessment) {
          fetchBookingInfo(bookingAssessment.id);
        }
        const listRes = await fetch("http://localhost:5001/assessments/student/list", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (listRes.ok) setAssessments(await listRes.json());
      } else {
        alert("Failed to cancel booking.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintHallTicket = () => {
    if (!bookingAssessment || !bookingData || !bookingData.currentBooking) return;
    const booking = bookingData.currentBooking;
    const schedule = bookingData.schedule;
    const slot = booking.slot;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Assessment Hall Ticket</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #071633; padding: 40px; }
            .ticket { border: 2px solid #cfe6e0; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; background: #fafdfc; }
            .header { text-align: center; border-bottom: 2px dashed #cfe6e0; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; color: #007f70; }
            .header p { margin: 5px 0 0 0; font-size: 12px; color: #71818d; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; font-size: 13px; margin-bottom: 20px; }
            .grid div span { display: block; font-size: 10px; color: #71818d; text-transform: uppercase; margin-bottom: 3px; font-weight: bold; }
            .grid div strong { font-size: 13px; color: #071633; }
            .instructions { font-size: 11px; color: #607080; border-top: 1px solid #dceae6; padding-top: 15px; margin-top: 20px; }
            .instructions h3 { margin: 0 0 8px 0; font-size: 12px; color: #071633; }
            .footer { text-align: center; font-size: 10px; color: #71818d; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>ADMISSIONS ASSESSMENT HALL TICKET</h1>
              <p>Please present this document at the campus venue</p>
            </div>
            <div class="grid">
              <div>
                <span>Candidate Name</span>
                <strong>${profile?.studentName || "Candidate"}</strong>
              </div>
              <div>
                <span>Application ID</span>
                <strong>${bookingAssessment.applicationId.substring(0, 8)}</strong>
              </div>
              <div>
                <span>Assessment</span>
                <strong>${bookingAssessment.assessmentName}</strong>
              </div>
              <div>
                <span>Subject & Grade</span>
                <strong>${bookingAssessment.subject} (${bookingAssessment.class || bookingAssessment.grade || ""})</strong>
              </div>
              <div>
                <span>Assessment Date</span>
                <strong>${new Date(schedule.assessmentDate).toLocaleDateString()}</strong>
              </div>
              <div>
                <span>Booked Time Slot</span>
                <strong>${slot.slotName} (${slot.startTime} - ${slot.endTime})</strong>
              </div>
              <div>
                <span>Campus & Venue</span>
                <strong>${schedule.campus} - Room ${schedule.roomNumber}</strong>
              </div>
              <div>
                <span>Building & Floor</span>
                <strong>${schedule.building}, ${schedule.floor}</strong>
              </div>
            </div>
            
            ${schedule.documentsRequired && schedule.documentsRequired.length > 0 ? (
              '<div style="font-size: 12px; margin-bottom: 15px;">' +
                '<span style="display: block; font-size: 10px; color: #71818d; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Required Documents</span>' +
                '<ul style="margin: 0; padding-left: 20px; color: #071633;">' +
                  schedule.documentsRequired.map((doc: string) => '<li>' + doc + '</li>').join("") +
                '</ul>' +
              '</div>'
            ) : ""}

            <div class="instructions">
              <h3>Important Instructions</h3>
              <p>${schedule.instructions || "Please report to the coordinator upon arrival."}</p>
            </div>

            <div class="footer">
              For queries, contact: ${schedule.contactPerson} · ${schedule.contactPhone} · ${schedule.contactEmail}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    const token = localStorage.getItem("studentToken");
    if (!token) {
      router.push("/student-assessment");
      return;
    }

    async function loadDashboardData() {
      setIsLoading(true);
      setError(null);
      try {
        const headers = { 
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": localStorage.getItem("studentSchoolId") || localStorage.getItem("schoolId") || "",
          "Content-Type": "application/json"
        };

        const [profileRes, listRes, gamesRes] = await Promise.all([
          fetch("http://localhost:5001/assessments/student/profile", { headers }),
          fetch("http://localhost:5001/assessments/student/list", { headers }),
          fetch("http://localhost:5001/game-assessments/student/games", { headers })
        ]);

        if (profileRes.status === 401 || listRes.status === 401) {
          localStorage.removeItem("studentToken");
          router.push("/student-assessment");
          return;
        }

        if (!profileRes.ok || !listRes.ok) {
          throw new Error("Could not load dashboard information. Please try again.");
        }

        const profileData = await profileRes.json();
        const listData = await listRes.json();
        const gamesData = gamesRes.ok ? await gamesRes.json() : [];

        setProfile(profileData);
        setAssessments(listData);
        setAssignedGames(Array.isArray(gamesData) ? gamesData : []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to sync dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();

    // Keep assessment state current after a submission or reassignment without
    // putting the whole dashboard back into its loading state.
    async function refreshAssessments() {
      if (document.visibilityState !== "visible") return;
      try {
        const currentToken = localStorage.getItem("studentToken");
        if (!currentToken) return;
        const headers = {
          "Authorization": `Bearer ${currentToken}`,
          "x-tenant-id": localStorage.getItem("studentSchoolId") || localStorage.getItem("schoolId") || "",
          "Content-Type": "application/json",
        };
        const [response, gamesResponse] = await Promise.all([
          fetch("http://localhost:5001/assessments/student/list", {
            headers,
            cache: "no-store",
          }),
          fetch("http://localhost:5001/game-assessments/student/games", {
            headers,
            cache: "no-store",
          }),
        ]);
        if (response.ok) setAssessments(await response.json());
        if (gamesResponse.ok) setAssignedGames(await gamesResponse.json());
      } catch {
        // Preserve the last successfully loaded state during a transient outage.
      }
    }

    const refreshTimer = window.setInterval(refreshAssessments, 5000);
    window.addEventListener("focus", refreshAssessments);
    document.addEventListener("visibilitychange", refreshAssessments);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshAssessments);
      document.removeEventListener("visibilitychange", refreshAssessments);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentAppId");
    router.push("/student-assessment");
  };

  const handleActionClick = (assessment: any, actionType: string) => {
    if (actionType === "Start") {
      router.push(`/student-assessment/take/${assessment.id}`);
      return;
    }
    setDialogInfo({
      isOpen: true,
      title: `${actionType} - ${assessment.assessmentName}`,
      message: `Assessment Results are currently under teacher review. Once graded, your final score sheet will appear here.`
    });
  };

  // Filter assessments based on the active tab
  const filteredAssessments = assessments.filter(
    (ass) => ass.tab.toUpperCase() === activeTab
  );
  const filteredGames = assignedGames.filter((game) => {
    const isComplete = game.result?.status === "COMPLETED";
    return activeTab === "SUBMITTED" ? isComplete : !isComplete;
  });

  const getSubjectColor = (sub: string) => {
    const s = sub.toLowerCase();
    if (s.includes("math")) return "!border-[#b9dff6] !text-[#176b9a] !bg-[#eef8fe]";
    if (s.includes("sci") || s.includes("physics") || s.includes("chem")) return "!border-[#b9e8dc] !text-[#087466] !bg-[#effaf7]";
    if (s.includes("english") || s.includes("lang")) return "!border-[#f2d8a5] !text-[#8a5b0b] !bg-[#fff8e9]";
    if (s.includes("hist") || s.includes("social") || s.includes("geo")) return "!border-[#cbd8f8] !text-[#435da8] !bg-[#f2f5ff]";
    return "!border-[#d8e3e0] !text-[#506877] !bg-[#f5f8f7]";
  };

  const getComponentIcon = (comp: string) => {
    switch (comp.toLowerCase()) {
      case "written": return <PenTool className="h-3 w-3" />;
      case "reading": return <BookOpen className="h-3 w-3" />;
      case "listening": return <Volume2 className="h-3 w-3" />;
      case "speaking": return <Mic className="h-3 w-3" />;
      default: return <BookOpenCheck className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f8f7] font-sans text-[#173349]">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#008f80]" />
          <p className="text-xs font-semibold text-[#6b7e89]">Preparing your assessments…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f8f7] p-6 font-sans text-[#173349]">
        <div className="max-w-md space-y-4 rounded-3xl border border-[#dce8e5] bg-white p-8 text-center shadow-xl">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-extrabold text-[#0b1f33]">Dashboard unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-block rounded-xl bg-[#008f80] px-5 py-2.5 text-xs font-bold !text-white transition-colors hover:bg-[#007d70]"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-[#f4f8f7] font-sans text-[#173349]">
      <div className="absolute inset-x-0 top-0 h-[250px] bg-[#dff2ed]" />
      <main className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        
        {/* Top Navbar */}
        <nav className="flex items-center justify-between border-b border-[#bddbd4] pb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#008f80] !text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-black tracking-tight text-[#0b1f33]">Student Assessment</span>
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#008f80]">Secure school assessment portal</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-[#bfd8d2] bg-white px-4 py-2.5 text-xs font-bold text-[#506877] shadow-sm transition hover:border-[#7fc9be] hover:text-[#008f80]"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </nav>

        {/* Student Profile Card */}
        {profile && (
          <section className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border border-[#d5e5e1] bg-white p-5 shadow-[0_16px_50px_rgba(25,69,61,0.09)] md:flex-row md:items-center sm:p-6">
            {/* Profile Fields */}
            <div className="w-full flex-1 space-y-4 text-center md:text-left">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#008f80]">Welcome back</p>
                <h1 className="mt-1 text-xl font-black leading-normal text-[#0b1f33] md:text-2xl">
                  {profile.studentName}
                </h1>
                </div>
                <span className="inline-block self-center rounded-lg border border-[#d6e5e1] bg-[#f5f9f8] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#5c7380] md:self-start">
                  ADMISSION NO: {profile.admissionNumber}
                </span>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3 border-t border-[#e4ecea] pt-4 text-xs md:grid-cols-4">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a8b92]">Class / Grade</span>
                  <div className="mt-1 font-extrabold text-[#173349]">{profile.class}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a8b92]">Section</span>
                  <div className="mt-1 font-extrabold text-[#173349]">{profile.section}</div>
                </div>
                <div className="space-y-0.5 col-span-2 md:col-span-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a8b92]">Academic Year</span>
                  <div className="mt-1 font-extrabold text-[#173349]">{profile.academicYear}</div>
                </div>
                <div className="space-y-0.5 col-span-2 md:col-span-1">
                  <span className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#7a8b92] md:justify-start">
                    <Building className="h-3 w-3" /> School Campus
                  </span>
                  <div className="mt-1 max-w-xs truncate font-extrabold text-[#008f80]">{profile.schoolName}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab Selection */}
        <section className="flex flex-col gap-6 flex-1">
          <div className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-[#d8e6e3] bg-white p-1.5 shadow-sm sm:w-[520px]">
            {(["PENDING", "SUBMITTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-[11px] font-extrabold transition-all sm:flex-none sm:px-5 ${
                  activeTab === tab
                    ? "bg-[#008f80] !text-white shadow-[0_6px_16px_rgba(0,143,128,0.2)]"
                    : "text-[#607580] hover:bg-[#f0f7f5] hover:text-[#173349]"
                }`}
              >
                {tab === "PENDING" && "Pending Assessments"}
                {tab === "SUBMITTED" && "Submitted Assessments"}
                <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${activeTab === tab ? "bg-white/20 !text-white" : "bg-[#e8f0ee] text-[#647a81]"}`}>
                  {assessments.filter((a) => a.tab.toUpperCase() === tab).length + assignedGames.filter((game) => tab === "SUBMITTED" ? game.result?.status === "COMPLETED" : game.result?.status !== "COMPLETED").length}
                </span>
              </button>
            ))}
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Assessment List Grid */}
          {filteredAssessments.length === 0 && filteredGames.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-4 rounded-3xl border border-dashed border-[#c9dcd7] bg-white/60 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d8e6e3] bg-[#f1f7f5] text-[#7a918d]">
                <BookOpenCheck className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-sm font-bold text-[#294257]">All caught up!</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  No assessments found under {activeTab.toLowerCase()} list.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredAssessments.map((ass) => (
                <div
                  key={ass.id}
                  className="group relative flex h-full min-h-[315px] flex-col overflow-hidden rounded-2xl border border-[#d8e6e3] bg-white p-5 shadow-[0_8px_24px_rgba(25,69,61,0.06)] transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[#008f80] hover:-translate-y-0.5 hover:border-[#9bcfc6] hover:shadow-[0_14px_32px_rgba(25,69,61,0.1)]"
                >
                  <div className="flex-1 space-y-3">
                    {/* Header: Subject badge & status */}
                    <div className="flex items-center justify-between">
                      <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getSubjectColor(ass.subject)}`}>
                        {ass.subject}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        ass.status === "COMPLETED" || ass.status === "SUBMITTED"
                          ? "!border-[#b9e8dc] !bg-[#effaf7] !text-[#087466]"
                          : ass.status === "IN_PROGRESS"
                          ? "!border-[#f2d8a5] !bg-[#fff8e9] !text-[#8a5b0b]"
                          : "!border-[#cbd8f8] !bg-[#f2f5ff] !text-[#435da8]"
                      }`}>
                        {ass.attemptNumber > 1 &&
                        (ass.status === "ASSIGNED" || ass.status === "IN_PROGRESS")
                          ? "RE-ASSIGNED"
                          : ass.status}
                      </span>
                    </div>

                    {/* Title & Teacher */}
                    <div className="space-y-1">
                      <h3 className="text-base font-black leading-snug text-[#0b1f33] transition-colors group-hover:text-[#008f80]">
                        {ass.assessmentName}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Assigned by: <span className="text-slate-400">{ass.teacherName}</span>
                      </p>
                    </div>

                    {/* Metadata items */}
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#e5edeb] bg-[#f8fbfa] p-3 text-[11px] text-[#657985]">
                      <div className="flex items-center gap-2 border-r border-[#dfe9e6]">
                        <Clock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                        <span>{ass.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                        <span className="truncate" title={`Due by ${ass.dueDate}`}>Due: {ass.dueDate}</span>
                      </div>
                    </div>

                    {/* Component list */}
                    <div className="space-y-1.5 rounded-xl bg-[#fbfdfc] px-3 py-2.5">
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Components</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ass.components.map((comp: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 rounded-lg border border-[#d8e6e3] bg-[#f7faf9] px-2 py-1 text-[10px] font-bold text-[#526a77]"
                          >
                            {getComponentIcon(comp)}
                            <span>{comp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-4">
                    {activeTab === "PENDING" && (
                      (ass.assessmentMode === 'SCHOOL' || (ass.assessmentMode === 'BOTH' && ass.venueChoice === 'SCHOOL')) ? (
                        <div className="space-y-2.5">
                          {ass.slotBookings && ass.slotBookings.length > 0 && ass.slotBookings[0].bookingStatus !== 'CANCELLED' ? (
                            <>
                              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-[#f4fbf9] px-3 py-2.5 text-emerald-900">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#008f80] shadow-sm ring-1 ring-emerald-100">
                                  <Calendar className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[10px] font-extrabold">
                                    {ass.slotBookings[0].slot?.slotName}
                                  </p>
                                  <p className="mt-0.5 text-[9px] font-semibold text-emerald-700">
                                    {formatSlotDate(ass.slotBookings[0].slot?.schedule?.assessmentDate)}
                                    <span className="mx-1.5 text-emerald-300">•</span>
                                    {ass.slotBookings[0].slot?.startTime} – {ass.slotBookings[0].slot?.endTime}
                                  </p>
                                </div>
                                {ass.slotBookings[0].attendanceStatus === 'PRESENT' && (
                                  <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider text-white">Checked In</span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                {getSlotAvailability(
                                  ass.slotBookings[0].slot?.schedule?.assessmentDate,
                                  ass.slotBookings[0].slot?.startTime,
                                  ass.slotBookings[0].slot?.endTime,
                                ) !== "ACTIVE" ? (
                                  <>
                                    <button
                                      disabled
                                      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-slate-400 shadow-none"
                                    >
                                      Start Assessment <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <p className="text-center text-[9px] font-semibold text-amber-700">
                                      {getSlotAvailability(
                                        ass.slotBookings[0].slot?.schedule?.assessmentDate,
                                        ass.slotBookings[0].slot?.startTime,
                                        ass.slotBookings[0].slot?.endTime,
                                      ) === "BEFORE"
                                        ? '* The "Start Assessment" button will become active when your scheduled slot begins.'
                                        : '* The "Start Assessment" button is only active during your scheduled slot.'}
                                    </p>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleActionClick(ass, "Start")}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#008f80] px-4 py-3 text-xs font-extrabold !text-white shadow-[0_10px_22px_rgba(0,143,128,0.18)] transition hover:bg-[#007d70]"
                                  >
                                    Start Assessment <ArrowRight className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setBookingAssessment(ass);
                                    fetchBookingInfo(ass.id);
                                  }}
                                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black px-4 py-3 text-xs font-extrabold !text-white transition"
                                >
                                  <Calendar className="h-4 w-4" /> Manage Slot Booking
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-[10px] font-bold text-amber-800">
                                Please book a slot to schedule the test.
                              </div>
                              <button
                                onClick={() => {
                                  setBookingAssessment(ass);
                                  fetchBookingInfo(ass.id);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black px-4 py-3 text-xs font-extrabold !text-white transition"
                              >
                                <Calendar className="h-4 w-4" /> Manage Slot Booking
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleActionClick(ass, "Start")}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#008f80] px-4 py-3 text-xs font-extrabold !text-white shadow-[0_10px_22px_rgba(0,143,128,0.18)] transition hover:bg-[#007d70]"
                        >
                          Start Assessment <ArrowRight className="h-4 w-4" />
                        </button>
                      )
                    )}
                    {activeTab === "SUBMITTED" && (
                      <button
                        onClick={() => handleActionClick(ass, "View Result")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c9dcd7] bg-[#f5f9f8] px-4 py-3 text-xs font-extrabold text-[#294257] transition hover:border-[#80c9be] hover:bg-[#eef7f5]"
                      >
                        View Result <Award className="h-4 w-4 text-emerald-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredGames.map((game) => (
                <div
                  key={`game-${game.id}`}
                  className="group relative flex h-full min-h-[315px] flex-col overflow-hidden rounded-2xl border border-[#d8e6e3] bg-white p-5 shadow-[0_8px_24px_rgba(25,69,61,0.06)] transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[#008f80] hover:-translate-y-0.5 hover:border-[#9bcfc6] hover:shadow-[0_14px_32px_rgba(25,69,61,0.1)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9e8dc] bg-[#effaf7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#087466]">
                      <Gamepad2 className="h-3.5 w-3.5" /> Game Assessment
                    </span>
                    <span className="rounded-md border border-[#cbd8f8] bg-[#f2f5ff] px-2 py-0.5 text-[10px] font-bold text-[#435da8]">
                      {game.result?.status === "COMPLETED" ? "COMPLETED" : game.result?.status === "IN_PROGRESS" ? "IN PROGRESS" : "ASSIGNED"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="mt-4 text-base font-black leading-snug text-[#0b1f33] group-hover:text-[#008f80]">
                      {game.generatedGame?.title || game.gameAssessment?.name || "Assigned Game"}
                    </h3>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      {game.gameAssessment?.name || "Game-based assessment"} · {game.gameAssessment?.grade || profile?.class}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#e5edeb] bg-[#f8fbfa] p-3 text-[11px] text-[#657985]">
                    <div className="flex items-center gap-2 border-r border-[#dfe9e6]">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{game.timeLimitMinutes || game.gameAssessment?.timeLimit || "—"} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{game.generatedGame?.engineKey?.replaceAll("_", " ") || "Interactive game"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!game.availability?.available}
                    onClick={() => void openGameTutorial(game)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#008f80] px-4 py-3 text-xs font-extrabold !text-white shadow-[0_10px_22px_rgba(0,143,128,0.18)] transition hover:bg-[#007d70] disabled:cursor-not-allowed disabled:bg-[#91c2bb] disabled:shadow-none"
                  >
                    {gameBusy === game.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    View tutorial
                  </button>
                </div>
              ))}
            </div>
          )}

          <aside className="rounded-3xl border border-[#d8e6e3] bg-[#073f3b] p-5 text-white shadow-[0_12px_32px_rgba(25,69,61,0.09)] sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 !text-white ring-1 ring-white/15">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-lg font-extrabold !text-white">Before you begin</h2>
            <p className="mt-2 text-xs leading-5 !text-[#b8d7d2]">
              Set yourself up for a smooth, uninterrupted assessment.
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Use a stable internet connection",
                "Keep your access code private",
                "Stay in fullscreen during the exam",
                "Submit before the timer ends",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2.5 text-[11px] font-semibold leading-5 !text-[#e7f4f1]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 !text-[#78dac9]" />
                  {tip}
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-white/10 pt-4 text-[10px] leading-4 !text-[#93bdb7]">
              If you experience a technical issue, notify the supervising teacher before leaving the screen.
            </div>
          </aside>
          </div>
        </section>
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-[#d8e6e3] py-6 text-center text-[10px] font-semibold text-[#74888d]">
        &copy; {new Date().getFullYear()} Admissions OS. Physically Present At-School Examination Mode.
      </footer>

      {/* Premium Notification Dialog Overlay */}
      {dialogInfo?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-2xl relative animate-in scale-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-white text-sm tracking-tight">{dialogInfo.title}</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
              {dialogInfo.message}
            </p>

            <button
              onClick={() => setDialogInfo(null)}
              className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs transition-all active:scale-[0.98]"
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      )}
      {gameRuntime && (
        <GameRuntimePlayer
          initial={gameRuntime}
          tutorial={runtimeTutorial}
          request={studentGameRequest}
          onClose={() => { setGameRuntime(null); setRuntimeTutorial(null); setActiveGameAssignment(null); }}
          onComplete={completeAssignedGame}
          secureMode
        />
      )}
      {/* At-School Slot Booking Modal */}
      {bookingAssessment && bookingData && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4 font-sans text-xs text-[#071633]">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#071633]">At-School Assessment Booking</h3>
                <p className="text-[10px] text-[#71818d] mt-0.5">Manage your venue attendance and test slot</p>
              </div>
              <button 
                onClick={() => {
                  setBookingAssessment(null);
                  setIsRescheduling(false);
                }}
                className="text-[#607080] hover:text-[#071633] font-bold text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Assessment Read-Only Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#f8fbf9] p-4 rounded-xl border border-[#cfe6e0]">
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Candidate</span>
                  <span className="font-bold text-[#071633]">{profile?.studentName || "Candidate"}</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Assessment</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.assessmentName}</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Subject & Grade</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.subject} ({bookingAssessment.class || bookingAssessment.grade || ""})</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Duration</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.duration}</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Mode</span>
                  <span className="font-bold text-[#007f70]">At School</span>
                </div>
              </div>

              {bookingData.schedule ? (
                <>
                  {/* Venue & Contact & Documents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-xs text-[#071633] mb-1">Venue Details</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px] text-[#071633]">
                          <p><strong>Campus:</strong> {bookingData.schedule.campus}</p>
                          <p><strong>Location:</strong> Room {bookingData.schedule.roomNumber}, Floor {bookingData.schedule.floor}, {bookingData.schedule.building}</p>
                          {bookingData.schedule.venue && <p><strong>Description:</strong> {bookingData.schedule.venue}</p>}
                          <p><strong>Date:</strong> {new Date(bookingData.schedule.assessmentDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-[#071633] mb-1">Contact Information</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px] text-[#071633]">
                          <p><strong>Coordinator:</strong> {bookingData.schedule.contactPerson}</p>
                          <p><strong>Phone:</strong> {bookingData.schedule.contactPhone}</p>
                          <p><strong>Email:</strong> {bookingData.schedule.contactEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-xs text-[#071633] mb-1">Required Documents</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-[#071633]">
                          {bookingData.schedule.documentsRequired && bookingData.schedule.documentsRequired.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {bookingData.schedule.documentsRequired.map((doc: string) => (
                                <li key={doc}>{doc}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-slate-500">No documents required.</p>
                          )}
                        </div>
                      </div>

                      {bookingData.schedule.instructions && (
                        <div>
                          <h4 className="font-bold text-xs text-[#071633] mb-1">Candidate Instructions</h4>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-[#607080] leading-relaxed max-h-24 overflow-y-auto">
                            {bookingData.schedule.instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slot Booking Section */}
                  <div className="border-t border-[#dceae6] pt-4 space-y-3">
                    <h4 className="font-bold text-xs text-[#071633]">Slot Assignment</h4>

                    {bookingData.currentBooking && !isRescheduling ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold text-emerald-800">Your Booked Slot</p>
                          <p className="text-[11px] text-[#071633] mt-1 font-semibold">
                            {bookingData.currentBooking.slot?.slotName} ({bookingData.currentBooking.slot?.startTime} - {bookingData.currentBooking.slot?.endTime})
                          </p>
                          <p className="text-[9px] text-[#71818d] mt-0.5">Booking Status: {bookingData.currentBooking.bookingStatus}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handlePrintHallTicket}
                            className="bg-white border border-[#007f70] text-[#007f70] px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#eefaf7] transition-all"
                          >
                            Print Hall Ticket
                          </button>
                          <button
                            onClick={() => setIsRescheduling(true)}
                            className="bg-white border border-blue-600 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all"
                          >
                            Reschedule Slot
                          </button>
                          <button
                            onClick={() => handleCancelBooking(bookingData.currentBooking.id)}
                            className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {isRescheduling && (
                          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg text-blue-800 text-[10px] font-bold">
                            <span>Rescheduling Mode Active</span>
                            <button onClick={() => setIsRescheduling(false)} className="underline hover:text-blue-900">Back to current booking</button>
                          </div>
                        )}
                        <p className="text-[10px] text-[#71818d] text-left">Select one of the available time slots below:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {bookingData.slots.map((slot: any) => {
                            const percent = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
                            const isFull = percent >= 100;
                            const isSelected = bookingData.currentBooking?.slotId === slot.id;
                            
                            return (
                              <div 
                                key={slot.id} 
                                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all text-left ${
                                  isSelected ? "border-[#007f70] bg-[#f0faf7] shadow-sm" : 
                                  isFull ? "border-slate-200 bg-slate-50 opacity-60" : "border-[#dceae6] bg-white hover:border-[#cfe6e0]"
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-[#071633] text-xs">{slot.slotName}</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${isFull ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                                      {isFull ? "FULL" : `${slot.capacity - slot.bookedCount} Left`}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#607080] mt-1 font-semibold">{slot.startTime} - {slot.endTime}</p>
                                </div>

                                <button
                                  type="button"
                                  disabled={isFull || isSelected || actionLoading}
                                  onClick={() => handleBookSlot(slot.id)}
                                  className={`w-full py-2 rounded-lg text-[10px] font-bold transition-all ${
                                    isSelected ? "bg-emerald-100 text-emerald-800 cursor-default" :
                                    isFull ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" :
                                    "bg-[#007f70] text-white hover:bg-[#00665a] shadow-xs"
                                  }`}
                                >
                                  {isSelected ? "Currently Booked" : isFull ? "Fully Booked" : "Book Slot"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                </>
              ) : (
                <div className="text-center py-10 bg-slate-50 border rounded-xl">
                  <p className="text-xs font-bold text-slate-500">The school has not published a scheduling venue or slots for this assessment yet.</p>
                </div>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
