"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar, 
  CreditCard, 
  Send, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Check,
  ClipboardList,
  Clock3,
  GraduationCap,
  PlusCircle,
  MessageCircle,
  Trash2,
  X,
  Gamepad2,
  Play,
  RotateCcw
} from "lucide-react";
import { GameRuntimePlayer } from "@/components/game-runtime-player";

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void; on: (event: string, callback: (response: any) => void) => void };
  }
}

const loadRazorpayCheckout = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});
const mockParentApplications = [
  {
    id: "mock-app-diya",
    studentFirstName: "Diya",
    studentLastName: "Sharma",
    studentDob: "2021-09-20T00:00:00.000Z",
    grade: "Nursery",
    paymentStatus: "PENDING",
    status: "DRAFT",
    createdAt: "2026-07-23T10:00:00.000Z",
    documents: []
  },
  {
    id: "mock-app-aarav",
    studentFirstName: "Aarav",
    studentLastName: "Sharma",
    studentDob: "2018-05-15T00:00:00.000Z",
    grade: "Grade 1",
    paymentStatus: "PAID",
    status: "ASSESSMENT",
    createdAt: "2026-07-23T10:00:00.000Z",
    documents: [
      { id: "doc-1", type: "BIRTH_CERTIFICATE", name: "Birth Certificate", status: "APPROVED" },
      { id: "doc-2", type: "TRANSCRIPT", name: "Previous School Transcript", status: "APPROVED" }
    ]
  },
  {
    id: "mock-app-vihaan",
    studentFirstName: "Vihaan",
    studentLastName: "Sharma",
    studentDob: "2016-06-12T00:00:00.000Z",
    grade: "Grade 4",
    paymentStatus: "PAID",
    status: "SUBMITTED",
    createdAt: "2026-07-23T10:00:00.000Z",
    documents: [
      { id: "doc-3", type: "BIRTH_CERTIFICATE", name: "Birth Certificate", status: "APPROVED" }
    ]
  },
  {
    id: "mock-app-meera",
    studentFirstName: "Meera",
    studentLastName: "Sharma",
    studentDob: "2013-11-05T00:00:00.000Z",
    grade: "Grade 7",
    paymentStatus: "PAID",
    status: "SUBMITTED",
    createdAt: "2026-07-23T10:00:00.000Z",
    documents: [
      { id: "doc-4", type: "BIRTH_CERTIFICATE", name: "Birth Certificate", status: "APPROVED" }
    ]
  }
];

export default function ParentDashboard() {
  const router = useRouter();
  
  // Local contexts
  const [schoolId, setSchoolId] = useState("");
  const [user, setUser] = useState<any>(null);

  // States
  const [applications, setApplications] = useState<any[]>([]);
  const [assignedGames, setAssignedGames] = useState<any[]>([]);
  const [selectedGameChildId, setSelectedGameChildId] = useState("all");
  const [selectedGameContentType, setSelectedGameContentType] = useState<"games" | "assessments">("games");
  const [gameRuntime, setGameRuntime] = useState<any | null>(null);
  const [activeGameAssignment, setActiveGameAssignment] = useState<any | null>(null);
  const [gameBusy, setGameBusy] = useState<string | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [runtimeTutorial, setRuntimeTutorial] = useState<any | null>(null);
  const [gameSequenceDeadline, setGameSequenceDeadline] = useState<number | null>(null);
  const sequenceDeadlineRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [deletingApplication, setDeletingApplication] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [registrationFee, setRegistrationFee] = useState(1000);
  const [demoPayment, setDemoPayment] = useState<{ orderId: string; amount: number; currency: string; appId: string } | null>(null);
  const [demoPaymentMethod, setDemoPaymentMethod] = useState<"upi" | "card">("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm">("gpay");
  const applicationsList = applications.length > 0 ? applications : mockParentApplications;
  const gameChildren = useMemo(() => {
    const children = new Map<string, any>();
    assignedGames.forEach((assignment) => {
      if (assignment.child?.id && !children.has(assignment.child.id)) {
        children.set(assignment.child.id, assignment.child);
      }
    });
    return Array.from(children.values()).sort((a, b) =>
      `${a.studentFirstName} ${a.studentLastName}`.localeCompare(`${b.studentFirstName} ${b.studentLastName}`),
    );
  }, [assignedGames]);
  const childAssignedGames = useMemo(
    () => selectedGameChildId === "all"
      ? assignedGames
      : assignedGames.filter((assignment) => assignment.child?.id === selectedGameChildId),
    [assignedGames, selectedGameChildId],
  );
  const isRegularGame = (assignment: any) =>
    String(assignment.gameAssessment?.settings?.source || "").startsWith("REAL_TIME_GAMES");
  const visibleAssignedGames = childAssignedGames.filter((assignment) =>
    selectedGameContentType === "games" ? isRegularGame(assignment) : !isRegularGame(assignment),
  );
  const regularGameCount = childAssignedGames.filter(isRegularGame).length;
  const gameAssessmentCount = childAssignedGames.length - regularGameCount;
  const selectedGameChild = gameChildren.find((child) => child.id === selectedGameChildId);
  const visibleGameStats = {
    ready: visibleAssignedGames.filter((assignment) => assignment.result?.status !== "COMPLETED" && assignment.availability?.available).length,
    completed: visibleAssignedGames.filter((assignment) => assignment.result?.status === "COMPLETED").length,
    pending: visibleAssignedGames.filter((assignment) => assignment.result?.status === "COMPLETED" && !["REVIEWED", "NEEDS_FOLLOW_UP"].includes(assignment.result?.reviewStatus)).length,
  };

  useEffect(() => {
    document.body.classList.toggle("payment-modal-open", Boolean(demoPayment));
    return () => document.body.classList.remove("payment-modal-open");
  }, [demoPayment]);

  useEffect(() => {
    if (!gameSequenceDeadline) return;
    sequenceDeadlineRef.current = gameSequenceDeadline;
    const timer = window.setInterval(() => {
      if (Date.now() < gameSequenceDeadline) return;
      window.clearInterval(timer);
      sequenceDeadlineRef.current = null;
      setGameSequenceDeadline(null);
      setGameRuntime(null);
      setRuntimeTutorial(null);
      setActiveGameAssignment(null);
      setGameError("The 10-minute game session has ended. Ask the school to assign a new session if games remain.");
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    }, 500);
    return () => window.clearInterval(timer);
  }, [gameSequenceDeadline]);

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", content: "Hi! I’m your Pehchaan assistant. Ask me about applications, required documents, admission stages, or school fees." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Load context on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedSchoolId = localStorage.getItem("schoolId");

    if (!storedUser || !storedSchoolId) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    setSchoolId(storedSchoolId);
  }, [router]);

  // Fetch parent applications
  useEffect(() => {
    if (!schoolId) return;

    async function fetchApplications() {
      setIsLoading(true);
      setError(null);
      try {
        const requestApplications = (accessToken: string | null) => fetch("http://localhost:5001/application/parent", {
          credentials: "include",
          headers: { "x-tenant-id": schoolId, ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}) },
        });
        let res = await requestApplications(localStorage.getItem("token"));
        if (res.status === 401) {
          const refreshRes = await fetch("http://localhost:5001/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          if (!refreshRes.ok) {
            localStorage.removeItem("token");
            throw new Error("SESSION_EXPIRED");
          }
          const refreshed = await refreshRes.json();
          localStorage.setItem("token", refreshed.accessToken);
          if (refreshed.user) localStorage.setItem("user", JSON.stringify(refreshed.user));
          res = await requestApplications(refreshed.accessToken);
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.message || "Applications could not be loaded.");
        }
        const data = await res.json();
        setApplications(data);
        const gamesRes = await fetch(`${API_URL}/game-assessments/parent/games`, {
          credentials: "include",
          headers: {
            "x-tenant-id": schoolId,
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        if (gamesRes.ok) setAssignedGames(await gamesRes.json());
      } catch (err: any) {
        if (err.message === "SESSION_EXPIRED") {
          setError("Your session expired. Please sign in again.");
          router.replace("/login?role=parent");
        } else {
          setError(err.message || "Failed to load page.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplications();
    fetch(`${API_URL}/school/details`, {
      headers: { "x-tenant-id": schoolId, "Authorization": `Bearer ${localStorage.getItem("token")}` },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((school) => {
        if (school?.settings?.admissionFee) setRegistrationFee(Number(school.settings.admissionFee));
      })
      .catch(() => undefined);
  }, [schoolId]);

  const refreshApplications = async () => {
    const appsRes = await fetch("http://localhost:5001/application/parent", {
      headers: { "x-tenant-id": schoolId, "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
    if (appsRes.ok) setApplications(await appsRes.json());
  };

  const refreshAssignedGames = async () => {
    const response = await fetch(`${API_URL}/game-assessments/parent/games`, {
      credentials: "include",
      headers: {
        "x-tenant-id": schoolId,
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!response.ok) throw new Error("Assigned games could not be refreshed.");
    const games = await response.json();
    setAssignedGames(games);
    return games;
  };

  const parentGameRequest = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_URL}/${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": schoolId,
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Game request failed.");
    return payload;
  };

  const requestGameReassessment = async (assignment: any) => {
    if (!window.confirm("Send your one-time re-assessment request to the school?")) return;
    setGameBusy(assignment.id);
    setGameError(null);
    try {
      await parentGameRequest(`game-assessments/parent/games/${assignment.id}/reassessment-request`, {
        method: "POST",
        body: JSON.stringify({ childId: assignment.child.id }),
      });
      await refreshAssignedGames();
    } catch (error: any) {
      setGameError(error.message || "The re-assessment request could not be sent.");
    } finally {
      setGameBusy(null);
    }
  };

  const openGameTutorial = async (assignment: any, continueSequence = false) => {
    setGameBusy(assignment.id);
    setGameError(null);
    try {
      if (isRegularGame(assignment) && !continueSequence && !sequenceDeadlineRef.current) {
        const deadline = Date.now() + 10 * 60 * 1000;
        sequenceDeadlineRef.current = deadline;
        setGameSequenceDeadline(deadline);
      }
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.().catch(() => undefined);
      }
      const tutorial = await parentGameRequest(`game-assessments/parent/games/${assignment.id}/tutorial`, {
        method: "POST",
        body: JSON.stringify({ childId: assignment.child.id }),
      });
      await parentGameRequest(`game-assessments/parent/games/${assignment.id}/tutorial/progress`, {
        method: "POST",
        body: JSON.stringify({ childId: assignment.child.id, tutorialViewed: true }),
      });
      const session = await parentGameRequest(`game-assessments/parent/games/${assignment.id}/start`, {
        method: "POST",
        body: JSON.stringify({ childId: assignment.child.id }),
      });
      if (session?.alreadyCompleted) {
        await refreshAssignedGames();
        setGameError(null);
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }
        return;
      }
      setActiveGameAssignment(assignment);
      setRuntimeTutorial(tutorial);
      setGameRuntime(session);
    } catch (gameRequestError) {
      if (!continueSequence) {
        sequenceDeadlineRef.current = null;
        setGameSequenceDeadline(null);
      }
      setGameError(gameRequestError instanceof Error ? gameRequestError.message : "The tutorial could not be opened.");
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } finally {
      setGameBusy(null);
    }
  };

  const completeAssignedGame = async (session: any) => {
    if (!activeGameAssignment) return;
    try {
      const result = await parentGameRequest(`game-assessments/parent/games/${activeGameAssignment.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ childId: activeGameAssignment.child.id, sessionId: session.id }),
      });
      setGameRuntime(null);
      setRuntimeTutorial(null);
      setActiveGameAssignment(null);
      const refreshedGames = await refreshAssignedGames();
      const sequenceActive = isRegularGame(activeGameAssignment) && Number(sequenceDeadlineRef.current) > Date.now();
      const nextGame = sequenceActive
        ? refreshedGames
          .filter((assignment: any) => assignment.child?.id === activeGameAssignment.child.id && isRegularGame(assignment) && assignment.result?.status !== "COMPLETED")
          .sort((a: any, b: any) => Number(a.sequence?.position || 0) - Number(b.sequence?.position || 0))[0]
        : null;
      if (nextGame) {
        window.setTimeout(() => void openGameTutorial(nextGame, true), 250);
      } else {
        sequenceDeadlineRef.current = null;
        setGameSequenceDeadline(null);
        window.alert(`Game sequence complete! Final score ${result.score}. ${result.rewards?.xpEarned || 0} XP earned.`);
      }
    } catch (gameRequestError) {
      setGameError(gameRequestError instanceof Error ? gameRequestError.message : "The game result could not be saved.");
    }
  };

  const handleDeleteApplication = async (app: any) => {
    const studentName = `${app.studentFirstName} ${app.studentLastName}`.trim();
    if (!window.confirm(`Delete ${studentName}'s draft application? This cannot be undone.`)) return;
    setDeletingApplication(app.id);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/application/${app.id}`, {
        method: "DELETE",
        headers: {
          "x-tenant-id": schoolId,
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Application could not be deleted.");
      }
      setApplications((current) => current.filter((application) => application.id !== app.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Application could not be deleted.");
    } finally {
      setDeletingApplication(null);
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
    const verifyRes = await fetch("http://localhost:5001/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": schoolId,
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature }),
    });
    if (!verifyRes.ok) {
      const payload = await verifyRes.json().catch(() => null);
      throw new Error(payload?.message || "Payment verification failed.");
    }
    const result = await verifyRes.json();
    if (result.notification?.status === "DEMO_SENT") {
      setPaymentNotice(`Demo WhatsApp payment confirmation sent to father's mobile ${result.notification.phone}.`);
    } else if (result.notification?.status === "SENT") {
      setPaymentNotice(`WhatsApp payment confirmation sent to father's mobile ${result.notification.phone}.`);
    }
    await refreshApplications();
  };

  const handlePayFee = async (app: any) => {
    setActionLoading(true);
    setError(null);
    try {
      // 1. Create order
      const orderRes = await fetch("http://localhost:5001/payment/order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ applicationId: app.id }),
      });

      if (!orderRes.ok) {
        const payload = await orderRes.json().catch(() => null);
        throw new Error(payload?.message || "Razorpay order creation failed.");
      }
      const orderData = await orderRes.json();
      if (orderData.mock) {
        setDemoPayment({ orderId: orderData.orderId, amount: Number(orderData.amount), currency: orderData.currency || "INR", appId: app.id });
        return;
      }

      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) throw new Error("Unable to load Razorpay Checkout.");
      const razorpay = new window.Razorpay({
        key: orderData.key,
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency || "INR",
        name: "School Admissions",
        description: `Registration fee for ${app.studentFirstName} ${app.studentLastName}`,
        order_id: orderData.orderId,
        theme: { color: "#008f7d" },
        handler: async (response: any) => {
          setActionLoading(true);
          try {
            await verifyPayment(orderData.orderId, response.razorpay_payment_id, response.razorpay_signature);
          } catch (paymentError) {
            setError(paymentError instanceof Error ? paymentError.message : "Payment verification failed.");
          } finally {
            setActionLoading(false);
          }
        },
      });
      razorpay.on("payment.failed", (response: any) => setError(response?.error?.description || "Payment failed."));
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const completeDemoPayment = async () => {
    if (!demoPayment) return;
    setActionLoading(true);
    setError(null);
    try {
      await verifyPayment(demoPayment.orderId, `pay_mock_${Math.random().toString(36).slice(2, 10)}`, "mock_signature_valid");
      setDemoPayment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDocument = async (
    appId: string,
    name: string,
    type: string,
    file: File,
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      if (appId.startsWith("mock-app-")) {
        setApplications((current) => {
          const source = current.length > 0 ? current : mockParentApplications;
          return source.map((application) =>
            application.id === appId
              ? {
                  ...application,
                  documents: [
                    ...application.documents,
                    {
                      id: `mock-doc-${appId}-${type}`,
                      type,
                      name: file.name,
                      status: "UPLOADED",
                    },
                  ],
                }
              : application,
          );
        });
        return;
      }

      const token = localStorage.getItem("token");
      const uploadDetailsResponse = await fetch(
        `${API_URL}/document/presigned-url?applicationId=${encodeURIComponent(appId)}&fileName=${encodeURIComponent(file.name)}`,
        {
          headers: {
            "x-tenant-id": schoolId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!uploadDetailsResponse.ok) {
        const payload = await uploadDetailsResponse.json().catch(() => null);
        throw new Error(payload?.message || "Could not prepare the document upload.");
      }
      const uploadDetails = await uploadDetailsResponse.json();
      const storageResponse = await fetch(uploadDetails.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!storageResponse.ok) throw new Error("The file could not be saved to document storage.");

      const res = await fetch("http://localhost:5001/document", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          applicationId: appId,
          name,
          type,
          url: uploadDetails.key,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || "Document upload failed.");
      }

      await refreshApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document upload failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (
    app: any,
    documentType: "receipt" | "admission-letter",
  ) => {
    const downloadKey = `${app.id}-${documentType}`;
    const studentName = `${app.studentFirstName} ${app.studentLastName}`;
    const safeStudentName = studentName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename =
      documentType === "receipt"
        ? `fee-receipt-${safeStudentName}.pdf`
        : `admission-offer-letter-${safeStudentName}.pdf`;

    setDownloadingDocument(downloadKey);
    setError(null);

    try {
      let documentHtml: string;

      if (app.id.startsWith("mock-app-")) {
        const title =
          documentType === "receipt"
            ? "Registration Fee Receipt"
            : "Admission Offer Letter";
        const body =
          documentType === "receipt"
            ? `<p><strong>Student:</strong> ${studentName}</p>
               <p><strong>Grade:</strong> ${app.grade}</p>
               <p><strong>Amount paid:</strong> ₹1,500</p>
               <p><strong>Status:</strong> PAID</p>`
            : `<p>Dear Parent / Guardian,</p>
               <p>We are pleased to offer <strong>${studentName}</strong> admission to <strong>${app.grade}</strong> for the upcoming academic session.</p>
               <p>Congratulations!</p>`;
        const demoDocument = `<!doctype html>
          <html><head><meta charset="utf-8"><title>${title}</title>
          <style>body{max-width:720px;margin:48px auto;padding:32px;font:16px/1.6 Arial,sans-serif;color:#172033;border:1px solid #dceae6}h1{color:#073a3d;border-bottom:2px solid #75ead0;padding-bottom:16px}</style>
          </head><body><h1>${title}</h1>${body}<p><small>Demo document generated by the parent portal.</small></p></body></html>`;
        documentHtml = demoDocument;
      } else {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_URL}/application/${app.id}/${documentType}`,
          {
            headers: {
              "x-tenant-id": schoolId,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = Array.isArray(payload?.message)
            ? payload.message.join(", ")
            : payload?.message;
          throw new Error(message || "The document could not be downloaded.");
        }

        documentHtml = await response.text();
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const parsedDocument = new DOMParser().parseFromString(
        documentHtml,
        "text/html",
      );
      const title =
        parsedDocument.querySelector("h1, h2")?.textContent?.trim() ||
        (documentType === "receipt"
          ? "Registration Fee Receipt"
          : "Admission Offer Letter");
      const content = (parsedDocument.body.textContent || "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n+/g, "\n")
        .trim();

      pdf.setProperties({ title, subject: title });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(7, 58, 61);
      pdf.text(title, 48, 60);
      pdf.setDrawColor(0, 143, 125);
      pdf.line(48, 72, 547, 72);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(23, 32, 51);
      const lines = pdf.splitTextToSize(content, 499) as string[];
      let y = 100;
      for (const line of lines) {
        if (y > 790) {
          pdf.addPage();
          y = 54;
        }
        pdf.text(line, 48, y);
        y += 17;
      }

      const blob = pdf.output("blob");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The document could not be downloaded.",
      );
    } finally {
      setDownloadingDocument(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "I encountered an error connecting to my AI logic. Please try again." }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Network error. Try checking your backend." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      <style>{`
        .color-force-white {
          color: #ffffff !important;
        }
      `}</style>
      {/* Parent dashboard viewport */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-7">
        
        {error && (
          <div className="bg-rose-955/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {paymentNotice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />{paymentNotice}</span>
            <button type="button" onClick={() => setPaymentNotice(null)} aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Intro Banner */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center gap-5 bg-[#073a3d] p-7 rounded-[1.5rem] border border-[#14575a] shadow-[0_20px_50px_rgba(7,58,61,.14)]">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border border-[#75ead0]/20" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#75ead0]">Parent dashboard</span>
            <h1 className="parent-welcome-title mt-2 mb-1">Welcome back, {user?.firstName}!</h1>
            <p className="parent-welcome-copy">Everything you need for your child&apos;s admission journey.</p>
          </div>
          <Link
            href="/parent/application/new"
            className="relative bg-[#75ead0] hover:bg-white hover:-translate-y-0.5 px-4 py-3 rounded-xl text-xs font-extrabold text-[#073a3d] flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95"
          >
            Start New Application <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Applications", value: applicationsList.length, icon: ClipboardList, color: "text-[#008f7d] bg-[#e6f7f2] border-[#cceae3]" },
            { label: "In progress", value: applicationsList.filter(app => !["APPROVED", "REJECTED"].includes(app.status)).length, icon: Clock3, color: "text-[#b77916] bg-[#fff7e6] border-[#f2dfb9]" },
            { label: "Admissions", value: applicationsList.filter(app => app.status === "APPROVED").length, icon: GraduationCap, color: "text-[#16805f] bg-[#eaf8f2] border-[#cce9dc]" },
          ].map(stat => { const Icon = stat.icon; return <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-[#dceae6] bg-white p-5 shadow-[0_10px_30px_rgba(28,65,56,.06)]"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#71818d]">{stat.label}</p><p className="mt-1 text-2xl font-black text-[#071633]">{stat.value}</p></div><span className={`rounded-xl border p-2.5 ${stat.color}`}><Icon className="h-4 w-4" /></span></div>; })}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#dceae6] bg-white shadow-[0_10px_30px_rgba(28,65,56,.06)]">
          <div className="flex flex-col gap-4 border-b border-[#e4efec] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-[#071633]">Assigned to your children</h3>
              <p className="mt-1 text-[11px] font-medium text-[#71818d]">Choose a child, then switch between learning games and formal game-based assessments.</p>
            </div>
            <span className="rounded-full bg-[#e6f7f2] px-3 py-1 text-[10px] font-extrabold text-[#007f70]">{assignedGames.length} {assignedGames.length === 1 ? "game" : "games"}</span>
          </div>

          {gameChildren.length > 0 && <div className="border-b border-[#e4efec] bg-[#f8fbfa] px-5 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-4" role="tablist" aria-label="Choose a child">
              <button type="button" role="tab" aria-selected={selectedGameChildId === "all"} onClick={() => setSelectedGameChildId("all")} className={`min-w-fit rounded-xl border px-4 py-3 text-left transition-all ${selectedGameChildId === "all" ? "border-[#007f70] bg-[#007f70] text-white shadow-sm" : "border-[#d8e7e3] bg-white text-[#526474] hover:border-[#8fc9bd]"}`}>
                <span className="block text-xs font-extrabold">All children</span>
                <span className={`mt-0.5 block text-[9px] font-bold ${selectedGameChildId === "all" ? "text-[#bff3e7]" : "text-[#8a9aa5]"}`}>{assignedGames.length} games</span>
              </button>
              {gameChildren.map((child) => {
                const childGames = assignedGames.filter((assignment) => assignment.child?.id === child.id);
                const childReady = childGames.filter((assignment) => assignment.result?.status !== "COMPLETED" && assignment.availability?.available).length;
                const selected = selectedGameChildId === child.id;
                return <button key={child.id} type="button" role="tab" aria-selected={selected} onClick={() => setSelectedGameChildId(child.id)} className={`flex min-w-[180px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? "border-[#007f70] bg-[#007f70] text-white shadow-sm" : "border-[#d8e7e3] bg-white text-[#526474] hover:border-[#8fc9bd]"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${selected ? "bg-white/15 text-white" : "bg-[#e6f7f2] text-[#007f70]"}`}>{child.studentFirstName?.charAt(0)}{child.studentLastName?.charAt(0)}</span>
                  <span className="min-w-0"><span className="block truncate text-xs font-extrabold">{child.studentFirstName} {child.studentLastName}</span><span className={`mt-0.5 block truncate text-[9px] font-bold ${selected ? "text-[#bff3e7]" : "text-[#8a9aa5]"}`}>{child.grade} · {childGames.length} games{childReady ? ` · ${childReady} ready` : ""}</span></span>
                </button>;
              })}
            </div>
          </div>}

          <div className="space-y-4 p-5">
          {gameError && <div role="alert" className="game-assessment-alert--error rounded-xl border p-3 text-xs font-bold">{gameError}</div>}
          {assignedGames.length ? (
            <>
            <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Assignment type">
              <button type="button" role="tab" aria-selected={selectedGameContentType === "games"} onClick={() => setSelectedGameContentType("games")} className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${selectedGameContentType === "games" ? "border-[#007f70] bg-[#edf9f6] ring-1 ring-[#007f70]" : "border-[#dceae6] bg-white hover:border-[#8fc9bd]"}`}>
                <span className="block text-sm font-extrabold text-[#071633]">Games</span>
                <span className="ml-4 inline-flex min-w-[88px] shrink-0 items-center justify-center rounded-full border border-[#8bd8c6] bg-[#d9fff5] px-3.5 py-2 text-xs font-black text-[#064e45] shadow-sm">{regularGameCount} assigned</span>
              </button>
              <button type="button" role="tab" aria-selected={selectedGameContentType === "assessments"} onClick={() => setSelectedGameContentType("assessments")} className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${selectedGameContentType === "assessments" ? "border-[#6d5bd0] bg-[#f5f3ff] ring-1 ring-[#6d5bd0]" : "border-[#dceae6] bg-white hover:border-[#b8afe8]"}`}>
                <span className="block text-sm font-extrabold text-[#071633]">Game-based assessments</span>
                <span className="ml-4 inline-flex min-w-[88px] shrink-0 items-center justify-center rounded-full border border-[#c5baf5] bg-[#eee9ff] px-3.5 py-2 text-xs font-black text-[#362a78] shadow-sm">{gameAssessmentCount} assigned</span>
              </button>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-[#dceae6] bg-[#f8fbfa] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-extrabold text-[#071633]">{selectedGameChild ? `${selectedGameChild.studentFirstName}'s ${selectedGameContentType === "games" ? "games" : "game-based assessments"}` : `Family ${selectedGameContentType === "games" ? "games" : "game-based assessments"}`}</p><p className="mt-0.5 text-[10px] font-medium text-[#71818d]">{selectedGameChild ? `${selectedGameChild.grade} · ${visibleAssignedGames.length} assigned` : `${gameChildren.length} children · ${visibleAssignedGames.length} assigned`}</p></div>
              <div className="flex flex-wrap gap-2 text-[9px] font-extrabold"><span className="rounded-full bg-blue-100 px-2.5 py-1.5 text-blue-700">{visibleGameStats.ready} ready</span><span className="rounded-full bg-amber-100 px-2.5 py-1.5 text-amber-700">{visibleGameStats.pending} awaiting review</span><span className="rounded-full bg-emerald-100 px-2.5 py-1.5 text-emerald-700">{visibleGameStats.completed} completed</span></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[...visibleAssignedGames].sort((a, b) => {
                const childOrder = `${a.child?.studentFirstName || ""} ${a.child?.studentLastName || ""}`.localeCompare(`${b.child?.studentFirstName || ""} ${b.child?.studentLastName || ""}`);
                return childOrder || Number(a.sequence?.position || 0) - Number(b.sequence?.position || 0);
              }).map((assignment) => {
                const completed = assignment.result?.status === "COMPLETED";
                const requestStatus = assignment.result?.reassessmentRequestStatus;
                const approvedReplay = completed && requestStatus === "APPROVED" && assignment.availability?.available;
                const childInitials = `${assignment.child?.studentFirstName?.charAt(0) || ""}${assignment.child?.studentLastName?.charAt(0) || ""}`;
                return (
                <article key={`${assignment.generatedGameId}-${assignment.child.id}`} className="flex flex-col rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-[#e6f7f2] px-2 text-[9px] font-black text-[#007f70]">{assignment.sequence?.position ? selectedGameChild ? assignment.sequence.position : `${childInitials} · ${assignment.sequence.position}` : <Gamepad2 className="h-4 w-4" />}</span>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${completed ? "bg-emerald-100 text-emerald-700" : assignment.availability?.available ? "bg-blue-100 text-blue-700" : assignment.availability?.reason === "Maximum attempts reached." ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{completed ? "COMPLETED" : assignment.availability?.available ? assignment.result?.status === "IN_PROGRESS" ? "IN PROGRESS" : "READY TO PLAY" : assignment.availability?.reason === "Maximum attempts reached." ? "ATTEMPTS REACHED" : "LOCKED"}</span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-extrabold text-[#071633]">{assignment.generatedGame?.title}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-semibold text-[#71818d]">
                    {assignment.sequence?.total > 1 && <span className="font-black uppercase tracking-wider text-[#8a9aa5]">{selectedGameChild ? "" : `${assignment.child.studentFirstName}'s `}Game {assignment.sequence.position} of {assignment.sequence.total}</span>}
                    <span>{selectedGameChild ? assignment.child.grade : `${assignment.child.studentFirstName} ${assignment.child.studentLastName} · ${assignment.child.grade}`}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-[9px] text-[#71818d]">{assignment.generatedGame?.template?.category?.name || "Learning game"} · {assignment.maxAttempts} {assignment.maxAttempts === 1 ? "attempt" : "attempts"} · Pass {assignment.passingScore}%</p>
                  {assignment.result?.status === "COMPLETED" && <div className="mt-3 rounded-xl border border-[#cfe5df] bg-white p-3">
                    {assignment.result.reviewStatus === "REVIEWED" || assignment.result.reviewStatus === "NEEDS_FOLLOW_UP" ? <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-extrabold text-[#607080]">Published game result</span><span className="text-xs font-black text-[#007f70]">{Math.round(Number(assignment.result.percentage) || 0)}%</span></div> : <div><p className="text-[10px] font-extrabold text-[#607080]">School review pending</p><p className="mt-1 text-[9px] leading-4 text-[#71818d]">The score will appear after the school completes its review.</p></div>}
                    {(assignment.result.reviewStatus === "REVIEWED" || assignment.result.reviewStatus === "NEEDS_FOLLOW_UP") && assignment.result.schoolReview && <div className="mt-3 border-t border-[#e2eeeb] pt-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#007f70]">School review</p><p className="mt-1 text-[10px] leading-5 text-[#526474]">{assignment.result.schoolReview}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-[8px] font-black uppercase ${assignment.result.reviewStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{assignment.result.reviewStatus === "REVIEWED" ? "Reviewed" : "Needs follow-up"}</span></div>}
                  </div>}
                  {completed && requestStatus === "PENDING" && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-extrabold text-amber-800">Re-assessment request pending school approval</p>}
                  {completed && requestStatus === "REJECTED" && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-extrabold text-rose-700">Re-assessment request was not approved</p>}
                  {approvedReplay && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-extrabold text-emerald-700">One additional attempt approved</p>}
                  {!completed && (assignment.availability?.sequenceLocked ? <p className="mt-2.5 rounded-lg bg-slate-100 px-3 py-2 text-[9px] font-extrabold text-slate-600">🔒 Complete {selectedGameChild ? "" : `${assignment.child.studentFirstName}'s `}game {Math.max(1, Number(assignment.sequence?.position || 1) - 1)} first</p> : assignment.availability?.reason === "Maximum attempts reached." ? <p className="mt-2.5 text-[9px] font-extrabold text-rose-700">Maximum attempts reached</p> : <p className="mt-2.5 text-[9px] font-extrabold text-[#007f70]">{assignment.result?.status === "IN_PROGRESS" ? "Continue the current game" : "Ready for the student to play"}</p>)}
                  {!completed && assignment.availability?.available && <div className="mt-3 flex gap-2">
                    <button type="button" disabled={gameBusy === assignment.id} onClick={() => void openGameTutorial(assignment)} className="keep-white inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#007f70] px-3 py-2 text-[10px] font-extrabold text-white hover:bg-[#006b5e] disabled:opacity-50">
                      {gameBusy === assignment.id ? <Loader2 className="keep-white h-4 w-4 animate-spin" /> : <Play className="keep-white h-4 w-4" />}
                      {assignment.result?.status === "IN_PROGRESS" ? "Resume game" : "Start game"}
                    </button>
                  </div>}
                  {approvedReplay && <button type="button" disabled={gameBusy === assignment.id} onClick={() => void openGameTutorial(assignment)} className="keep-white mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#006b5e] disabled:opacity-50"><Play className="keep-white h-4 w-4" />Start re-assessment</button>}
                  {completed && (assignment.result.reviewStatus === "REVIEWED" || assignment.result.reviewStatus === "NEEDS_FOLLOW_UP") && !requestStatus && <button type="button" disabled={gameBusy === assignment.id} onClick={() => void requestGameReassessment(assignment)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#007f70] bg-white px-4 py-2.5 text-xs font-extrabold text-[#007f70] hover:bg-[#edf9f6] disabled:opacity-50"><RotateCcw className="h-4 w-4" />Request re-assessment (one time)</button>}
                </article>
              )})}
            </div>
            {visibleAssignedGames.length === 0 && <div className="rounded-xl border border-dashed border-[#cfe1dd] bg-[#fafdfc] p-7 text-center"><Gamepad2 className="mx-auto h-6 w-6 text-[#8aa19b]" /><p className="mt-2 text-xs font-bold text-[#526474]">No {selectedGameContentType === "games" ? "games" : "game-based assessments"} are assigned for this selection.</p><p className="mt-1 text-[10px] text-[#8a9aa5]">Try another child or switch the assignment type above.</p></div>}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#cfe1dd] bg-[#fafdfc] p-5 text-center">
              <Gamepad2 className="mx-auto h-6 w-6 text-[#8aa19b]" />
              <p className="mt-2 text-xs font-bold text-[#607080]">No games have been assigned yet.</p>
            </div>
          )}
          </div>
        </section>

        {/* Active applications list */}
        <div className="space-y-6">
          <div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#008f7d]">Application center</span><h3 className="mt-1 text-lg font-extrabold text-[#071633]">Your applications</h3></div>
                   {applications.length === 0 && (
            <div className="p-4 bg-emerald-50 text-[#008f7d] border border-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Displaying demo student applications. Click "Start New Application" to begin a real application wizard.</span>
            </div>
          )}

          {applicationsList.map((app) => (
            <div key={app.id} className="bg-white border border-[#dceae6] shadow-[0_10px_30px_rgba(28,65,56,.06)] rounded-2xl p-6 space-y-6">
              
              {/* Row 1: Student details & status */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-extrabold text-base text-[#071633]">{app.studentFirstName} {app.studentLastName}</h4>
                  <span className="text-xs text-[#71818d]">{app.grade} • DOB: {new Date(app.studentDob).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <div>
                  <span className="text-[10px] text-slate-400 font-mono block mb-1">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    app.status === "SUBMITTED" ? "bg-blue-100 text-blue-800 border-blue-200" :
                    app.status === "DRAFT" ? "bg-slate-100 text-slate-700 border-slate-200" :
                    app.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    "bg-indigo-100 text-indigo-800 border-indigo-200"
                  }`}>
                    {app.status.replace('_', ' ')}
                  </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Status stages tracker */}
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { step: "Applied", active: true },
                  { step: "Documents Upload", active: app.documents.length > 0 },
                  { step: "Registration Payment", active: app.paymentStatus === "PAID" },
                  { step: "Interview Assessment", active: app.status === "INTERVIEW_SCHEDULED" || app.status === "APPROVED" || app.status === "SUBMITTED" },
                ].map((st, i) => (
                  <div key={i} className="space-y-2">
                    <div className={`h-1.5 rounded-full ${st.active ? "bg-[#008f7d]" : "bg-slate-100"}`} />
                    <span className={`text-[10px] block font-semibold ${st.active ? "text-[#008f7d]" : "text-slate-400"}`}>{st.step}</span>
                  </div>
                ))}
              </div>

              {/* Row 3: Action panels */}
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                
                {/* Action 1: Upload Documents */}
                <div className="bg-[#f8fafc] border border-slate-200 p-4 rounded-xl space-y-4">
                  <h5 className="font-bold text-xs text-[#071633] flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#008f7d]" /> Documents Checklist
                  </h5>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { name: "Birth Certificate", type: "BIRTH_CERTIFICATE" },
                      { name: "Previous School Transcript", type: "TRANSCRIPT" },
                      { name: "Parent ID Proof", type: "ID_PROOF" },
                    ].map((doc, idx) => {
                      const uploaded = app.documents.find((d: any) => d.type === doc.type);
                      return (
                        <div key={idx} className="flex justify-between items-center p-2 rounded bg-white border border-slate-100">
                          <div>
                            <span className="font-medium text-slate-700">{doc.name}</span>
                            {uploaded && (
                              <span className="block text-[9px] font-bold text-emerald-600">{uploaded.status || "UPLOADED"}</span>
                            )}
                          </div>
                          {uploaded ? (
                            <CheckCircle className="h-4 w-4 text-[#008f7d]" />
                          ) : (
                            <label
                              className={`cursor-pointer text-[10px] bg-[#008f7d] hover:bg-[#073a3d] color-force-white px-2 py-1 rounded transition-all font-bold ${actionLoading ? "pointer-events-none opacity-50" : ""}`}
                              style={{ color: "#ffffff" }}
                            >
                              Upload File
                              <input
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                disabled={actionLoading}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) handleUploadDocument(app.id, doc.name, doc.type, file);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action 2: Registration Payments */}
                <div className="bg-[#f8fafc] border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs text-[#071633] flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-[#008f7d]" /> Registration Fee Payment
                    </h5>
                    <p className="text-[11px] text-[#71818d] leading-relaxed">
                      To finalize application review, pay the school registration processing fee.
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-150">
                    <div>
                      <span className="text-[9px] text-slate-400 font-mono block">Amount due:</span>
                      <span className="text-base font-extrabold text-[#071633]">₹{registrationFee.toLocaleString("en-IN")}</span>
                    </div>
                    {app.paymentStatus === "PAID" ? (
                      <div className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Paid Success
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (app.id.startsWith("mock-app-")) {
                            alert("Mock payment successfully captured!");
                          } else {
                            handlePayFee(app);
                          }
                        }}
                        disabled={actionLoading}
                        className="bg-[#008f7d] hover:bg-[#073a3d] px-4 py-2 rounded-lg text-xs font-bold color-force-white shadow-md active:scale-95 transition-all"
                        style={{ color: "#ffffff" }}
                      >
                        Pay Registration Fee
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Letters & Receipts Downloads */}
              <div className="border-t border-slate-100 pt-4 flex gap-4 text-xs font-semibold">
                {app.paymentStatus === "PAID" && (
                  <button
                    type="button"
                    onClick={() => handleDownload(app, "receipt")}
                    disabled={downloadingDocument === `${app.id}-receipt`}
                    className="text-[#008f7d] hover:text-[#073a3d] flex items-center gap-1"
                  >
                    {downloadingDocument === `${app.id}-receipt` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Download Fee Receipt
                  </button>
                )}
                {app.status === "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => handleDownload(app, "admission-letter")}
                    disabled={downloadingDocument === `${app.id}-admission-letter`}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 ml-auto"
                  >
                    {downloadingDocument === `${app.id}-admission-letter` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Download Admission Offer Letter
                  </button>
                )}
                {app.status === "DRAFT" && !app.id.startsWith("mock-app-") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteApplication(app)}
                    disabled={deletingApplication === app.id}
                    aria-label={`Delete ${app.studentFirstName} ${app.studentLastName}'s draft application`}
                    className="ml-auto flex items-center gap-1.5 rounded-lg !border-[#64748b] !bg-[#64748b] px-3 py-2 !text-white shadow-sm transition hover:!border-[#475569] hover:!bg-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingApplication === app.id ? <Loader2 className="h-4 w-4 animate-spin color-force-white" /> : <Trash2 className="h-4 w-4 color-force-white" />}
                    <span className="color-force-white">{deletingApplication === app.id ? "Deleting..." : "Delete"}</span>
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {gameRuntime && <GameRuntimePlayer initial={gameRuntime} tutorial={runtimeTutorial} request={parentGameRequest} onClose={() => { setGameRuntime(null); setRuntimeTutorial(null); setActiveGameAssignment(null); sequenceDeadlineRef.current = null; setGameSequenceDeadline(null); }} onComplete={completeAssignedGame} secureMode sequenceDeadline={gameSequenceDeadline} />}

      {demoPayment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071633]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0b1f3a] px-5 py-4 text-white">
              <div><p className="text-sm font-extrabold color-force-white">Razorpay Checkout</p><p className="text-[11px] font-semibold color-force-white opacity-80">Secure test payment</p></div>
              <button type="button" onClick={() => setDemoPayment(null)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close payment"><X className="h-5 w-5 color-force-white" /></button>
            </div>
            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-[#f0fdfa] p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#607080]">Registration fee</p>
                <p className="mt-1 text-3xl font-extrabold text-[#071633]">₹{demoPayment.amount.toLocaleString("en-IN")}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-[#071633]">Choose payment method</p>
                  <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#8a5a00]">Test mode</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDemoPaymentMethod("upi")} className={`rounded-xl border-2 p-4 text-left transition ${demoPaymentMethod === "upi" ? "border-[#008f7d] bg-[#e6f7f2]" : "border-[#dceae6] bg-white hover:border-[#9bcfc3]"}`}>
                    <span className="flex items-center justify-between text-sm font-extrabold text-[#071633]">UPI {demoPaymentMethod === "upi" && <Check className="h-4 w-4 text-[#008f7d]" />}</span>
                    <span className="mt-1 block text-[10px] font-medium text-[#526b64]">Google Pay, PhonePe, Paytm</span>
                  </button>
                  <button type="button" onClick={() => setDemoPaymentMethod("card")} className={`rounded-xl border-2 p-4 text-left transition ${demoPaymentMethod === "card" ? "border-[#008f7d] bg-[#e6f7f2]" : "border-[#dceae6] bg-white hover:border-[#9bcfc3]"}`}>
                    <span className="flex items-center justify-between text-sm font-extrabold text-[#071633]">Card {demoPaymentMethod === "card" && <Check className="h-4 w-4 text-[#008f7d]" />}</span>
                    <span className="mt-1 block text-[10px] font-medium text-[#526b64]">Credit or debit card</span>
                  </button>
                </div>
                {demoPaymentMethod === "upi" && (
                  <div className="space-y-2 rounded-xl border border-[#dceae6] bg-[#f8fafc] p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#526b64]">Select UPI app</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "gpay", label: "Google Pay", mark: "G" },
                        { id: "phonepe", label: "PhonePe", mark: "P" },
                        { id: "paytm", label: "Paytm", mark: "Pay" },
                      ].map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setSelectedUpiApp(provider.id as "gpay" | "phonepe" | "paytm")}
                          className={`relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border-2 bg-white px-2 py-3 transition ${selectedUpiApp === provider.id ? "border-[#008f7d] shadow-[0_0_0_3px_rgba(0,143,125,.12)]" : "border-[#dceae6] hover:border-[#9bcfc3]"}`}
                        >
                          <span className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-black ${provider.id === "gpay" ? "bg-[#eef4ff] text-[#246fdb]" : provider.id === "phonepe" ? "bg-[#f2eaff] text-[#5f259f]" : "bg-[#eaf8ff] text-[#00a5e4]"}`}>{provider.mark}</span>
                          <span className="text-[10px] font-extrabold text-[#071633]">{provider.label}</span>
                          {selectedUpiApp === provider.id && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-[#008f7d]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-[10px] font-medium leading-relaxed text-[#405852]">
                  {demoPaymentMethod === "upi" ? `${selectedUpiApp === "gpay" ? "Google Pay" : selectedUpiApp === "phonepe" ? "PhonePe" : "Paytm"} selected. Click below to simulate an approved UPI payment.` : "Card selected. In test mode, click the button below to simulate an approved card payment."}
                </p>
              </div>
              <button type="button" disabled={actionLoading} onClick={completeDemoPayment} className="w-full rounded-xl bg-[#008f7d] px-4 py-3 text-xs font-extrabold color-force-white hover:bg-[#073a3d] disabled:opacity-60">
                {actionLoading ? "Processing Payment..." : `Pay ₹${demoPayment.amount.toLocaleString("en-IN")} using ${demoPaymentMethod === "upi" ? (selectedUpiApp === "gpay" ? "Google Pay" : selectedUpiApp === "phonepe" ? "PhonePe" : "Paytm") : "Card"}`}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          aria-label="Open Pehchaan Assistant"
          title="Open Pehchaan Assistant"
          className="parent-assistant-trigger fixed bottom-6 right-6 z-30"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {isChatOpen && <button type="button" aria-label="Close assistant" onClick={() => setIsChatOpen(false)} className="fixed inset-0 z-30 bg-black/55 lg:hidden" />}

      {/* Interactive AI Assistant drawer */}
      {isChatOpen && <aside className="parent-assistant-panel fixed inset-y-0 right-0 z-40 flex w-[calc(100%-2rem)] max-w-sm flex-col lg:w-80">
        <div className="parent-assistant-header">
          <span className="parent-assistant-mark"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><h3>Pehchaan Assistant</h3><p>● Online · Here to help</p></div>
          <button type="button" onClick={() => setIsChatOpen(false)} aria-label="Close Pehchaan Assistant" className="parent-assistant-close"><X className="h-4 w-4" /></button>
        </div>
        
        {/* Chat Messages Log */}
        <div className="parent-assistant-messages min-h-0 flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {chatMessages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`parent-chat-message max-w-[88%] ${
                msg.role === "user" 
                  ? "parent-chat-message--user ml-auto rounded-tr-none" 
                  : "parent-chat-message--assistant mr-auto rounded-tl-none"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isAiLoading && (
            <div className="flex items-center gap-2 text-[10px] text-[#71818d] italic pl-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="parent-assistant-composer">
          <input 
            type="text" 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about admissions..."
            className="parent-assistant-input min-w-0 flex-1"
          />
          <button 
            type="submit" 
            className="parent-assistant-send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </aside>}
    </div>
  );
}
