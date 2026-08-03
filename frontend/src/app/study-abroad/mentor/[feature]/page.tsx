"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users, ClipboardCheck, CheckSquare, Files, FileSignature, BookOpenText,
  BriefcaseBusiness, Building2, CalendarDays, MessageCircleMore, BarChart3,
  Wallet, UserCheck, Settings, CheckCircle2, AlertCircle, Clock, Star,
  Plus, Search, Download, Eye, Edit, ThumbsUp, ThumbsDown, Filter, ArrowRight,
  Send, ExternalLink, ShieldCheck, DollarSign, Upload, FileText, X, Trash2
} from "lucide-react";

const API = "http://localhost:5001";

// Demo Students Data
const initialStudents = [
  { id: "s1", name: "Aarav Sharma", country: "USA", intake: "Fall 2026", stage: "Application Submitted", progress: 75, targetUniversities: ["Stanford", "MIT", "CMU"], upcomingSession: "Tomorrow at 4:00 PM", status: "ACTIVE", email: "aarav@student.demo" },
  { id: "s2", name: "Diya Patel", country: "Canada", intake: "Fall 2026", stage: "Document Verification", progress: 50, targetUniversities: ["Univ of Toronto", "UBC"], upcomingSession: "Jul 24 at 2:30 PM", status: "ACTIVE", email: "diya@student.demo" },
  { id: "s3", name: "Rohan Verma", country: "UK", intake: "Spring 2027", stage: "SOP Drafting", progress: 35, targetUniversities: ["Imperial", "Oxford", "UCL"], upcomingSession: "Jul 28 at 6:00 PM", status: "ACTIVE", email: "rohan@student.demo" },
  { id: "s4", name: "Ananya Iyer", country: "Germany", intake: "Winter 2026", stage: "Offer Received", progress: 90, targetUniversities: ["TUM", "RWTH Aachen"], upcomingSession: "Completed", status: "COMPLETED", email: "ananya@student.demo" },
];

// Demo Reviews Data
const initialReviews = [
  { id: "r1", student: "Aarav Sharma", type: "Statement of Purpose (SOP)", university: "Stanford University", status: "PENDING", date: "Today, 10:15 AM", documentUrl: "#" },
  { id: "r2", student: "Diya Patel", type: "Letter of Recommendation (LOR)", university: "University of Toronto", status: "NEEDS_REVISION", date: "Yesterday", documentUrl: "#" },
  { id: "r3", student: "Rohan Verma", type: "Technical Resume & CV", university: "Imperial College London", status: "APPROVED", date: "Jul 18, 2026", documentUrl: "#" },
  { id: "r4", student: "Aarav Sharma", type: "Portfolio & GitHub Roadmap", university: "Carnegie Mellon Univ", status: "PENDING", date: "Jul 19, 2026", documentUrl: "#" },
];

// Demo Sessions Data
const initialSessions = [
  { id: "ses1", student: "Aarav Sharma", topic: "Ivy League SOP Strategy & Review", date: "2026-07-21", time: "16:00", duration: "45 mins", meetingLink: "https://meet.google.com/xyz-abc-def", status: "UPCOMING" },
  { id: "ses2", student: "Diya Patel", topic: "Canada Study Visa & Financial Planning", date: "2026-07-24", time: "14:30", duration: "60 mins", meetingLink: "https://meet.google.com/uvw-rst-xyz", status: "UPCOMING" },
  { id: "ses3", student: "Rohan Verma", topic: "UK University Shortlisting & LOR Prep", date: "2026-07-28", time: "18:00", duration: "45 mins", meetingLink: "https://meet.google.com/opq-rst-uvw", status: "UPCOMING" },
];

const demoCandidateProgress = initialStudents.map((student, index) => ({
  id: student.id,
  name: student.name,
  email: student.email,
  detail: `${student.country} · ${student.intake}`,
  progress: student.progress,
  completedActivities: [6, 4, 3, 9][index],
  totalActivities: [8, 8, 9, 10][index],
  stage: student.stage,
  isDemo: true,
}));

const demoMentorDashboard = {
  metrics: { assignedStudents: 4, activeThisWeek: 3, upcomingSessions: 3, successRate: 92, monthlyEarnings: 18500 },
  candidateProgress: demoCandidateProgress,
  pendingSessions: [
    { id: "demo-session-1", student: { firstName: "Aarav", lastName: "Sharma" }, topic: "Ivy League SOP Strategy", startsAt: "2026-07-25T16:00:00.000Z", time: "4:00 PM", duration: 45, status: "CONFIRMED", meetingLink: "https://meet.google.com/xyz-abc-def" },
  ],
  upcomingSessions: [
    { id: "demo-session-2", student: { firstName: "Diya", lastName: "Patel" }, topic: "Canada Visa & Financial Planning", startsAt: "2026-07-26T09:00:00.000Z", time: "2:30 PM", duration: 60, status: "CONFIRMED", meetingLink: "https://meet.google.com/uvw-rst-xyz" },
    { id: "demo-session-3", student: { firstName: "Rohan", lastName: "Verma" }, topic: "UK University Shortlisting", startsAt: "2026-07-28T12:30:00.000Z", time: "6:00 PM", duration: 45, status: "CONFIRMED", meetingLink: "https://meet.google.com/opq-rst-uvw" },
  ],
  generatedAt: "2026-07-24T12:00:00.000Z",
  isDemo: true,
};

const demoMentorResources = [
  { id: "demo-resource-1", title: "Winning SOP Framework", type: "PDF", description: "1.8 MB · Demo resource", published: true, isDemo: true },
  { id: "demo-resource-2", title: "University Shortlisting Worksheet", type: "XLSX", description: "420 KB · Demo resource", published: true, isDemo: true },
  { id: "demo-resource-3", title: "Study Visa Document Checklist", type: "PDF", description: "860 KB · Demo resource", published: false, isDemo: true },
  { id: "demo-resource-4", title: "Academic LOR Writing Guide", type: "DOCX", description: "640 KB · Demo resource", published: true, isDemo: true },
];

const demoMentorAnalytics = {
  metrics: { studentsGuided: 24, reviewsCompleted: 38, averageRating: 4.9, ratingCount: 21, medianResponseMinutes: 42, completedSessions: 47, totalSessions: 52, activeProjects: 6 },
  monthlyActivity: [
    { month: "Feb", booked: 5, completed: 4 }, { month: "Mar", booked: 7, completed: 6 },
    { month: "Apr", booked: 8, completed: 7 }, { month: "May", booked: 9, completed: 8 },
    { month: "Jun", booked: 11, completed: 10 }, { month: "Jul", booked: 12, completed: 12 },
  ],
  sessionStatuses: [
    { status: "COMPLETED", count: 47 }, { status: "CONFIRMED", count: 3 }, { status: "PENDING", count: 1 }, { status: "CANCELLED", count: 1 },
  ],
  generatedAt: "2026-07-24T12:00:00.000Z",
  isDemo: true,
};

const demoEarningEntries = [
  { id: "demo-earning-1", earnedAt: "2026-07-22T10:30:00.000Z", service: "SOP Strategy & Review", student: "Aarav Sharma", studentEmail: "aarav@student.demo", duration: 60, amount: 3500, currency: "INR", status: "EARNED" },
  { id: "demo-earning-2", earnedAt: "2026-07-18T09:00:00.000Z", service: "Canada Visa Planning", student: "Diya Patel", studentEmail: "diya@student.demo", duration: 60, amount: 3000, currency: "INR", status: "EARNED" },
  { id: "demo-earning-3", earnedAt: "2026-07-12T12:30:00.000Z", service: "University Shortlisting", student: "Rohan Verma", studentEmail: "rohan@student.demo", duration: 45, amount: 2500, currency: "INR", status: "EARNED" },
  { id: "demo-earning-4", earnedAt: "2026-07-05T11:00:00.000Z", service: "Offer Evaluation", student: "Ananya Iyer", studentEmail: "ananya@student.demo", duration: 45, amount: 2500, currency: "INR", status: "EARNED" },
];

const demoMentorEarnings = {
  totalsByCurrency: { INR: 78500 },
  currentMonthByCurrency: { INR: 18500 },
  completedSessionCount: 24,
  entries: demoEarningEntries,
  monthly: [
    { month: "Feb", amount: 8000, sessions: 3 }, { month: "Mar", amount: 9500, sessions: 4 },
    { month: "Apr", amount: 11000, sessions: 4 }, { month: "May", amount: 13500, sessions: 5 },
    { month: "Jun", amount: 18000, sessions: 5 }, { month: "Jul", amount: 18500, sessions: 4 },
  ],
  note: "Demo earnings based on completed mentorship sessions.",
  generatedAt: "2026-07-24T12:00:00.000Z",
  isDemo: true,
};

const demoMessageThreads: Record<string, any[]> = {
  s1: [
    { id: "demo-msg-1", senderId: "s1", text: "I have uploaded the revised Stanford SOP. Could you review the opening paragraph?", createdAt: "2026-07-24T09:15:00.000Z" },
    { id: "demo-msg-2", senderId: "mentor-id", text: "Yes, Aarav. The new opening is much stronger. I’ll add detailed comments before our session.", createdAt: "2026-07-24T09:28:00.000Z" },
  ],
  s2: [
    { id: "demo-msg-3", senderId: "s2", text: "Are the bank statements for the last six months sufficient for my visa file?", createdAt: "2026-07-23T14:10:00.000Z" },
    { id: "demo-msg-4", senderId: "mentor-id", text: "Bring those along with the sponsor letter. We’ll verify the complete checklist tomorrow.", createdAt: "2026-07-23T14:31:00.000Z" },
  ],
};

export default function MentorFeaturePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams?.get("studentId");
  const featureSlug = params?.feature as string || "dashboard";

  const [students, setStudents] = useState(initialStudents);
  const [reviews, setReviews] = useState(initialReviews);
  const [sessions, setSessions] = useState(initialSessions);
  const [reviewComment, setReviewComment] = useState("");
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [recommendSuccess, setRecommendSuccess] = useState<string | null>(null);
  const [selectedStudentDocs, setSelectedStudentDocs] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [user, setUser] = useState<any>(null);
  const [activeCandidate, setActiveCandidate] = useState<any>(initialStudents[0]);
  const [candidateThreads, setCandidateThreads] = useState<Record<string, any[]>>(demoMessageThreads);
  const [chatInput, setChatInput] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resourceFileRef = useRef<HTMLInputElement>(null);
  const [mentorResources, setMentorResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceUploading, setResourceUploading] = useState(false);
  const [resourcesError, setResourcesError] = useState("");
  const [mentorAnalytics, setMentorAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [mentorEarnings, setMentorEarnings] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const [earningsMonth, setEarningsMonth] = useState("all");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [mentorDashboard, setMentorDashboard] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [studentProfileModal, setStudentProfileModal] = useState<any>(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [studentProfileError, setStudentProfileError] = useState("");
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    headline: "",
    position: "",
    company: "",
    university: "",
    country: "",
    timezone: "UTC",
    yearsExperience: 0,
    sessionPrice: 0,
    bio: "",
    about: "",
    languages: "",
    skills: "",
    targetDestinations: "",
  });
  const activeMessages = activeCandidate
    ? candidateThreads[activeCandidate.id] ?? []
    : [];

  const [recTargetStudent, setRecTargetStudent] = useState<any>(initialStudents[0]);

  useEffect(() => {
    if (studentIdParam) {
      const found = students.find(s => s.id === studentIdParam);
      if (found) {
        setRecTargetStudent(found);
        setActiveCandidate(found);
      }
    }
  }, [studentIdParam, students]);
  const [recommendations, setRecommendations] = useState<Record<string, { safe: string[], target: string[], dream: string[] }>>({
    "s1": {
      safe: ["Arizona State University (MS CS)", "University of Texas at Dallas"],
      target: ["University of Southern California", "Northeastern University"],
      dream: ["Stanford University", "Carnegie Mellon University"]
    },
    "s2": {
      safe: ["University of Alberta", "Simon Fraser University"],
      target: ["University of Toronto", "University of British Columbia"],
      dream: ["McGill University", "University of Waterloo"]
    },
    "s3": {
      safe: ["University of Manchester", "University of Edinburgh"],
      target: ["Imperial College London", "UCL"],
      dream: ["University of Oxford", "University of Cambridge"]
    },
    "s4": {
      safe: ["Technical University of Munich", "RWTH Aachen"],
      target: ["Karlsruhe Institute of Technology", "TU Berlin"],
      dream: ["ETH Zurich", "LMU Munich"]
    }
  });
  const [newUnivName, setNewUnivName] = useState("");
  const [newUnivCategory, setNewUnivCategory] = useState<"safe" | "target" | "dream">("target");

  const handleAddUniversity = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!newUnivName.trim()) return;
    const name = newUnivName.trim();
    const targetId = recTargetStudent?.id || "s1";

    setRecommendations(prev => {
      const studentRecs = prev[targetId] || { safe: [], target: [], dream: [] };
      const currentList = studentRecs[newUnivCategory] || [];
      return {
        ...prev,
        [targetId]: {
          ...studentRecs,
          [newUnivCategory]: [...currentList, name]
        }
      };
    });
    setNewUnivName("");
  };

  const handleRemoveUniversity = (category: "safe" | "target" | "dream", index: number) => {
    const targetId = recTargetStudent?.id || "s1";
    setRecommendations(prev => {
      const studentRecs = prev[targetId] || { safe: [], target: [], dream: [] };
      const currentList = studentRecs[category] || [];
      return {
        ...prev,
        [targetId]: {
          ...studentRecs,
          [category]: currentList.filter((_, i) => i !== index)
        }
      };
    });
  };

  const handleIssueRecommendations = async () => {
    const targetStudent = recTargetStudent || students[0] || initialStudents[0];
    const targetId = targetStudent.id;
    const currentRecs = recommendations[targetId] || { safe: [], target: [], dream: [] };
    const safeList = currentRecs.safe || [];
    const targetList = currentRecs.target || [];
    const dreamList = currentRecs.dream || [];
    const allUniversities = [...safeList, ...targetList, ...dreamList];

    // Update local students target universities list
    setStudents(prev => prev.map(s => s.id === targetId ? { ...s, targetUniversities: allUniversities.slice(0, 3) } : s));

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${API}/mentorship/recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ candidateId: targetId, recommendations: currentRecs })
        });
      } catch (e) {
        console.error(e);
      }
    }

    setRecommendSuccess(`Official university recommendations successfully issued to ${targetStudent.name}'s workspace!`);
    setTimeout(() => setRecommendSuccess(null), 5000);
  };

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSessionStudent, setNewSessionStudent] = useState<any>(initialStudents[0]);
  const [newSessionTopic, setNewSessionTopic] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("2026-07-25");
  const [newSessionTime, setNewSessionTime] = useState("15:00");
  const [newSessionDuration, setNewSessionDuration] = useState("45 mins");

  const [tasks, setTasks] = useState<any[]>([
    { id: "t1", studentId: "s1", studentName: "Aarav Sharma", title: "Submit Stanford SOP Paragraph 3 Edit", dueDate: "Tomorrow", completed: false },
    { id: "t2", studentId: "s2", studentName: "Diya Patel", title: "Gather Financial Bank Statements for Visa", dueDate: "Jul 24, 2026", completed: false },
    { id: "t3", studentId: "s3", studentName: "Rohan Verma", title: "Request Professor Recommendation Letters", dueDate: "Jul 28, 2026", completed: true }
  ]);
  const [newTaskStudent, setNewTaskStudent] = useState<any>(initialStudents[0]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("In 2 days");

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTopic.trim()) return;
    const newSes = {
      id: `ses-${Date.now()}`,
      student: newSessionStudent?.name || "Aarav Sharma",
      topic: newSessionTopic.trim(),
      date: newSessionDate || "2026-07-25",
      time: newSessionTime || "15:00",
      duration: newSessionDuration,
      meetingLink: `https://meet.google.com/advisory-${Date.now().toString().slice(-6)}`,
      status: "UPCOMING"
    };
    setSessions(prev => [newSes, ...prev]);

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${API}/mentorship/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(newSes)
        });
      } catch (e) {
        console.error(e);
      }
    }

    setNewSessionTopic("");
    setShowSessionModal(false);
  };

  const handleMarkSessionComplete = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: "COMPLETED" } : s));
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: `t-${Date.now()}`,
      studentId: newTaskStudent?.id || "s1",
      studentName: newTaskStudent?.name || "Aarav Sharma",
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate || "In 2 days",
      completed: false
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle("");
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const fetchMessageCandidates = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessagesError("Please sign in as a mentor to access live conversations.");
      setMessagesLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/mentorship/messages/candidates`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Unable to load candidates (${res.status})`);
      }
      const data = await res.json();
      const candidates = Array.isArray(data) ? data : [];
      const visibleCandidates = candidates.length ? candidates : initialStudents;
      setStudents(visibleCandidates);
      setActiveCandidate((current: any) =>
        visibleCandidates.find((candidate: any) => candidate.id === current?.id) ??
        visibleCandidates[0] ??
        null
      );
      setMessagesError("");
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "Unable to load live conversations.");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (featureSlug !== "messages") return;
    setMessagesLoading(true);
    fetchMessageCandidates();
    const interval = setInterval(fetchMessageCandidates, 10000);
    return () => clearInterval(interval);
  }, [featureSlug]);

  const fetchChatHistory = async (partnerId: string) => {
    if (initialStudents.some(student => student.id === partnerId)) {
      setMessagesError("");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token || !partnerId) return;
    try {
      const res = await fetch(`${API}/mentorship/messages/${partnerId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCandidateThreads(prev => ({
            ...prev,
            [partnerId]: data,
          }));
        }
        setMessagesError("");
      } else {
        const body = await res.json().catch(() => null);
        setMessagesError(body?.message || `Unable to load conversation (${res.status})`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeCandidate?.id && featureSlug === "messages") {
      fetchChatHistory(activeCandidate.id);
      const interval = setInterval(() => fetchChatHistory(activeCandidate.id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeCandidate, featureSlug]);

  useEffect(() => {
    if (featureSlug === "messages") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages, featureSlug]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeCandidate || isSendingMessage) return;

    const content = chatInput.trim();
    const token = localStorage.getItem("token");
    if (!token) {
      setMessagesError("Your session has expired. Please sign in again.");
      return;
    }
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || "mentor-id",
      recipientId: activeCandidate.id,
      text: content,
      createdAt: new Date().toISOString()
    };

    setIsSendingMessage(true);
    setMessagesError("");
    setCandidateThreads(prev => ({
      ...prev,
      [activeCandidate.id]: [...(prev[activeCandidate.id] ?? []), newMsg],
    }));
    setChatInput("");

    if (initialStudents.some(student => student.id === activeCandidate.id)) {
      setIsSendingMessage(false);
      return;
    }

    try {
      const res = await fetch(`${API}/mentorship/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            recipientId: activeCandidate.id,
            text: content
          })
        });
        if (!res.ok) {
          throw new Error(`Unable to send message (${res.status})`);
        }

        const savedMessage = await res.json();
        setCandidateThreads(prev => ({
          ...prev,
          [activeCandidate.id]: (prev[activeCandidate.id] ?? []).map(message =>
            message.id === newMsg.id ? savedMessage : message
          ),
        }));
      await fetchMessageCandidates();
    } catch (error) {
      setCandidateThreads(prev => ({
        ...prev,
        [activeCandidate.id]: (prev[activeCandidate.id] ?? []).filter(
          message => message.id !== newMsg.id
        ),
      }));
      setChatInput(content);
      setMessagesError(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const fetchMentorResources = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setResourcesError("Please sign in as a mentor to manage resources.");
      return;
    }
    try {
      const res = await fetch(`${API}/mentorship/resources`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Unable to load resources (${res.status})`);
      }
      const data = await res.json();
      setMentorResources(Array.isArray(data) && data.length ? data : demoMentorResources);
      setResourcesError("");
    } catch (error) {
      setResourcesError(error instanceof Error ? error.message : "Unable to load resources.");
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    if (featureSlug !== "resources") return;
    setResourcesLoading(true);
    fetchMentorResources();
  }, [featureSlug]);

  const handleResourceUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setResourcesError("Resource files must be 10 MB or smaller.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setResourcesError("Your session has expired. Please sign in again.");
      return;
    }

    setResourceUploading(true);
    setResourcesError("");
    try {
      const uploadResponse = await fetch(`${API}/mentorship/resources/upload-url`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData?.message || "Could not prepare the upload.");
      }

      const storageResponse = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!storageResponse.ok) throw new Error("The file could not be uploaded to storage.");

      const resourceResponse = await fetch(`${API}/mentorship/resources`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: file.name,
          description: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.name.split(".").pop()?.toUpperCase() || "FILE",
          url: uploadData.resourceUrl,
        }),
      });
      if (!resourceResponse.ok) {
        const body = await resourceResponse.json().catch(() => null);
        throw new Error(body?.message || "Could not save the resource.");
      }
      await fetchMentorResources();
    } catch (error) {
      setResourcesError(error instanceof Error ? error.message : "Resource upload failed.");
    } finally {
      setResourceUploading(false);
      if (resourceFileRef.current) resourceFileRef.current.value = "";
    }
  };

  const toggleResourcePublished = async (resource: any) => {
    if (resource.isDemo) {
      setMentorResources(current =>
        current.map(item => item.id === resource.id ? { ...item, published: !item.published } : item)
      );
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/mentorship/resources/${resource.id}/publish`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: !resource.published }),
      });
      if (!res.ok) throw new Error("Could not update sharing.");
      const updated = await res.json();
      setMentorResources(current =>
        current.map(item => item.id === resource.id ? updated : item)
      );
    } catch (error) {
      setResourcesError(error instanceof Error ? error.message : "Could not update sharing.");
    }
  };

  const downloadMentorResource = async (resource: any) => {
    if (resource.isDemo) {
      setResourcesError("This is a demo resource preview. Upload a real file to enable downloads.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return setResourcesError("Your session has expired. Please sign in again.");
    try {
      const res = await fetch(`${API}/mentorship/resources/${resource.id}/download-url`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Could not download the resource.");
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setResourcesError(error instanceof Error ? error.message : "Could not download the resource.");
    }
  };

  const deleteMentorResource = async (resource: any) => {
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    if (resource.isDemo) {
      setMentorResources(current => current.filter(item => item.id !== resource.id));
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/mentorship/resources/${resource.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not delete the resource.");
      setMentorResources(current => current.filter(item => item.id !== resource.id));
    } catch (error) {
      setResourcesError(error instanceof Error ? error.message : "Could not delete the resource.");
    }
  };

  const fetchMentorAnalytics = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAnalyticsError("Please sign in as a mentor to view analytics.");
      setAnalyticsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/mentorship/analytics/mentor`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Unable to load analytics (${res.status})`);
      setMentorAnalytics(data?.metrics?.totalSessions > 0 ? data : demoMentorAnalytics);
      setAnalyticsError("");
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : "Unable to load analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (featureSlug !== "analytics") return;
    setAnalyticsLoading(true);
    fetchMentorAnalytics();
  }, [featureSlug]);

  const formatResponseTime = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return "No replies yet";
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hrs`;
  };

  const fetchMentorEarnings = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setEarningsError("Please sign in as a mentor to view earnings.");
      setEarningsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/mentorship/earnings/mentor`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Unable to load earnings (${res.status})`);
      setMentorEarnings(data?.entries?.length ? data : demoMentorEarnings);
      setEarningsError("");
    } catch (error) {
      setEarningsError(error instanceof Error ? error.message : "Unable to load earnings.");
    } finally {
      setEarningsLoading(false);
    }
  };

  useEffect(() => {
    if (featureSlug !== "earnings") return;
    setEarningsLoading(true);
    fetchMentorEarnings();
  }, [featureSlug]);

  const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const exportEarningsCsv = () => {
    if (!mentorEarnings?.entries?.length) return;
    const header = ["Date", "Service", "Student", "Email", "Duration (minutes)", "Amount", "Currency", "Status"];
    const rows = mentorEarnings.entries.map((entry: any) => [
      new Date(entry.earnedAt).toISOString().slice(0, 10),
      entry.service,
      entry.student,
      entry.studentEmail,
      entry.duration,
      entry.amount,
      entry.currency,
      entry.status,
    ]);
    const csv = [header, ...rows]
      .map(row => row.map((value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mentor-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const fetchMentorProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setProfileError("Please sign in as a mentor to edit your profile.");
      setProfileLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/mentorship/profile/mentor`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Unable to load profile (${res.status})`);
      setProfileForm({
        firstName: data.user?.firstName || "Dr. Anjali",
        lastName: data.user?.lastName || "Mehta",
        headline: data.headline || "AI Research Leader & Global Admissions Mentor",
        position: data.position || "Lead AI Scientist",
        company: data.company || "Google",
        university: data.university || "Stanford University",
        country: data.country || "USA",
        timezone: data.timezone ?? "UTC",
        yearsExperience: data.yearsExperience || 8,
        sessionPrice: data.sessionPrice || 1500,
        bio: data.bio || "PhD in Computer Science from Stanford University and former Google AI researcher.",
        about: data.about || "I guide students through university shortlisting, SOP strategy, research portfolios, scholarships, and interview preparation.",
        languages: Array.isArray(data.languages) && data.languages.length ? data.languages.join(", ") : "English, Hindi",
        skills: Array.isArray(data.skills) && data.skills.length ? data.skills.join(", ") : "AI & Data Science, Study Abroad, SOP Review, Research",
        targetDestinations: Array.isArray(data.targetDestinations) && data.targetDestinations.length ? data.targetDestinations.join(", ") : "USA, Canada, UK, Germany",
      });
      setProfileError("");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (featureSlug !== "profile") return;
    setProfileLoading(true);
    fetchMentorProfile();
  }, [featureSlug]);

  const updateProfileField = (field: string, value: string | number) => {
    setProfileForm(current => ({ ...current, [field]: value }));
    setProfileMessage("");
  };

  const saveMentorProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return setProfileError("Your session has expired. Please sign in again.");
    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");
    const parseList = (value: string) =>
      value.split(",").map(item => item.trim()).filter(Boolean);
    try {
      const res = await fetch(`${API}/mentorship/profile/mentor`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profileForm,
          yearsExperience: Number(profileForm.yearsExperience),
          sessionPrice: Number(profileForm.sessionPrice),
          languages: parseList(profileForm.languages),
          skills: parseList(profileForm.skills),
          targetDestinations: parseList(profileForm.targetDestinations),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        throw new Error(message || "Profile could not be saved.");
      }
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = {
        ...storedUser,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new CustomEvent("mentor-profile-updated", { detail: { ...updatedUser, profession: data.position || data.headline || "Mentor" } }));
      setProfileMessage("Profile saved successfully.");
      await fetchMentorProfile();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchMentorDashboard = async () => {
    let token = localStorage.getItem("token");
    if (!token) {
      setDashboardError("Please sign in as a mentor to view the dashboard.");
      setDashboardLoading(false);
      return;
    }
    try {
      const requestDashboard = (accessToken: string) => fetch(`${API}/mentorship/dashboards/mentor`, {
        credentials: "include",
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      let res = await requestDashboard(token);
      if (res.status === 401) {
        const refreshRes = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!refreshRes.ok) {
          localStorage.removeItem("token");
          setDashboardError("Your session expired. Please sign in again.");
          router.replace(`/login?role=study-abroad&next=${encodeURIComponent("/study-abroad/mentor/dashboard")}`);
          return;
        }
        const refreshed = await refreshRes.json();
        token = refreshed.accessToken;
        localStorage.setItem("token", refreshed.accessToken);
        if (refreshed.user) {
          localStorage.setItem("user", JSON.stringify(refreshed.user));
          setUser(refreshed.user);
        }
        res = await requestDashboard(refreshed.accessToken);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Unable to load dashboard (${res.status})`);
      setMentorDashboard(data?.metrics?.assignedStudents > 0 ? data : demoMentorDashboard);
      setDashboardError("");
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (featureSlug !== "dashboard") return;
    setDashboardLoading(true);
    fetchMentorDashboard();
  }, [featureSlug]);

  const openStudentProfile = async (studentId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return setDashboardError("Your session has expired. Please sign in again.");
    setStudentProfileLoading(true);
    setStudentProfileError("");
    setStudentProfileModal({ student: null });
    try {
      const res = await fetch(`${API}/mentorship/students/${studentId}/profile`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to load student profile.");
      setStudentProfileModal(data);
    } catch (error) {
      setStudentProfileError(error instanceof Error ? error.message : "Unable to load student profile.");
    } finally {
      setStudentProfileLoading(false);
    }
  };

  const closeStudentProfile = () => {
    setStudentProfileModal(null);
    setStudentProfileError("");
  };

  useEffect(() => {
    if (!studentProfileModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStudentProfile();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studentProfileModal]);

  const handleApproveReview = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r));
    setActiveReviewId(null);
  };

  const handleRevisionReview = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "NEEDS_REVISION" } : r));
    setActiveReviewId(null);
  };

  return (
    <div className="study-page space-y-6">

      {/* DASHBOARD SLUG */}
      {featureSlug === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {dashboardError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {dashboardError}
            </div>
          )}
          {dashboardLoading && !mentorDashboard ? (
            <div className="bg-white border border-[#d8e8e3] rounded-3xl py-24 text-center text-xs text-[#64748b]">
              Loading your live dashboard…
            </div>
          ) : mentorDashboard && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#d8e8e3] p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Assigned Students</span>
                  <span className="text-2xl font-extrabold text-[#071633] block mt-1">{mentorDashboard.metrics.assignedStudents} Students</span>
                  <span className="text-[10px] text-[#008f7d] font-medium block mt-1">{mentorDashboard.metrics.activeThisWeek} active this week</span>
                </div>
                <div className="bg-white border border-[#d8e8e3] p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Upcoming Sessions</span>
                  <span className="text-2xl font-extrabold text-amber-500 block mt-1">{mentorDashboard.metrics.upcomingSessions} Scheduled</span>
                  <span className="text-[10px] text-[#64748b] font-medium block mt-1">Pending and confirmed</span>
                </div>
                <div className="bg-white border border-[#d8e8e3] p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Completion Rate</span>
                  <span className="text-2xl font-extrabold text-emerald-500 block mt-1">{mentorDashboard.metrics.successRate}%</span>
                  <span className="text-[10px] text-[#64748b] font-medium block mt-1">Completed vs concluded sessions</span>
                </div>
                <div className="bg-white border border-[#d8e8e3] p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Monthly Earnings</span>
                  <span className="text-2xl font-extrabold text-[#008f7d] block mt-1">{formatCurrency(mentorDashboard.metrics.monthlyEarnings)}</span>
                  <span className="text-[10px] text-[#008f7d] font-medium block mt-1">Completed sessions this month</span>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-[#d8e8e3] rounded-2xl overflow-hidden p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#d8e8e3] pb-3">
                    <h3 className="font-extrabold text-[#071633] text-sm">Assigned Candidates Progress</h3>
                    <Link href="/study-abroad/mentor/students" className="text-xs text-[#009b87] hover:underline font-bold">View All →</Link>
                  </div>
                  <div className="divide-y divide-[#d8e8e3]">
                    {mentorDashboard.candidateProgress.slice(0, 6).map((candidate: any) => (
                      <div key={candidate.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#071633] text-xs">
                            {candidate.name}
                            <span className="text-[10px] font-normal text-[#64748b]"> · {candidate.detail}</span>
                          </h4>
                          <p className="text-[10px] text-[#64748b] mt-0.5">
                            Stage: <strong className="text-[#008f7d]">{candidate.stage}</strong> · {candidate.completedActivities} of {candidate.totalActivities} activities completed
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24 bg-[#edf5f2] rounded-full h-2 overflow-hidden">
                            <div className="bg-[#009b87] h-full" style={{ width: `${candidate.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#526474] w-8">{candidate.progress}%</span>
                          <button
                            type="button"
                            onClick={() => openStudentProfile(candidate.id)}
                            className="border border-[#bcd7cf] bg-white hover:bg-[#edf5f2] text-xs px-2.5 py-1 rounded-lg text-[#071633]"
                          >
                            Profile
                          </button>
                        </div>
                      </div>
                    ))}
                    {mentorDashboard.candidateProgress.length === 0 && (
                      <div className="py-12 text-center text-xs text-[#64748b]">No assigned candidates yet.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-[#d8e8e3] rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#d8e8e3] pb-3">
                    <h3 className="font-extrabold text-[#071633] text-sm">Upcoming Sessions</h3>
                    <Link href="/study-abroad/mentor/sessions" className="text-[10px] text-[#009b87] font-bold hover:underline">Calendar →</Link>
                  </div>
                  <div className="space-y-3">
                    {[...mentorDashboard.pendingSessions, ...mentorDashboard.upcomingSessions]
                      .sort((a: any, b: any) => new Date(a.startsAt || a.date).getTime() - new Date(b.startsAt || b.date).getTime())
                      .slice(0, 4)
                      .map((session: any) => (
                        <div key={session.id} className="p-3 bg-[#f8faf9] border border-[#d4e4df] rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between gap-2 text-[10px] text-[#64748b]">
                            <span className="font-bold text-[#009b87]">{session.student.firstName} {session.student.lastName}</span>
                            <span className="font-mono text-[#526474]">{new Date(session.startsAt || session.date).toLocaleDateString()}</span>
                          </div>
                          <p className="font-bold text-[#071633] text-xs">{session.topic}</p>
                          <p className="text-[10px] text-[#64748b]">
                            {session.time} ({session.duration} mins) · {session.status}
                          </p>
                          {session.meetingLink ? (
                            <a href={session.meetingLink} target="_blank" rel="noreferrer" className="block text-center bg-[#009b87] hover:bg-[#007f70] text-white keep-white py-1.5 rounded text-[10px] font-bold mt-2">
                              Launch Meeting
                            </a>
                          ) : (
                            <span className="block text-center bg-[#edf5f2] text-[#64748b] py-1.5 rounded text-[10px] font-bold mt-2">
                              Meeting link pending
                            </span>
                          )}
                        </div>
                      ))}
                    {mentorDashboard.metrics.upcomingSessions === 0 && (
                      <div className="py-10 text-center text-xs text-[#64748b]">No upcoming sessions.</div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-[#94a3b8]">
                Updated {new Date(mentorDashboard.generatedAt).toLocaleString()} · Candidate progress is based on completed sessions, reviewed resumes, and completed projects.
              </p>
            </>
          )}
        </div>
      )}

      {/* MY STUDENTS SLUG */}
      {(featureSlug === "students" || featureSlug === "applications") && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#d8e8e3] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-extrabold text-[#526474] uppercase tracking-wider block">Assigned Candidates</span>
              <span className="text-xl font-black text-[#071633] block mt-1">4 Active Students</span>
              <span className="text-[10px] text-[#008f7d] font-bold block mt-0.5">● 100% On Track</span>
            </div>
            <div className="bg-white border border-[#d8e8e3] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-extrabold text-[#526474] uppercase tracking-wider block">Applications Submitted</span>
              <span className="text-xl font-black text-[#1d4ed8] block mt-1">8 Applications</span>
              <span className="text-[10px] text-[#64748b] font-semibold block mt-0.5">USA, Canada, UK, Germany</span>
            </div>
            <div className="bg-white border border-[#d8e8e3] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-extrabold text-[#526474] uppercase tracking-wider block">Offers & Admissions</span>
              <span className="text-xl font-black text-[#047857] block mt-1">1 Admitted (TUM)</span>
              <span className="text-[10px] text-[#047857] font-bold block mt-0.5">Winter 2026 Intake</span>
            </div>
            <div className="bg-white border border-[#d8e8e3] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-extrabold text-[#526474] uppercase tracking-wider block">Next Advisory Session</span>
              <span className="text-xl font-black text-[#7e22ce] block mt-1">Tomorrow 4:00 PM</span>
              <span className="text-[10px] text-[#64748b] font-semibold block mt-0.5">With Aarav Sharma</span>
            </div>
          </div>

          {/* Main Directory Card */}
          <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eef5f3] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#071633]">Supervised Student Directory & Applications</h2>
                <p className="text-xs text-[#64748b] mt-0.5">Track candidate progress, issue university recommendations, and schedule sessions.</p>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Search candidate name or university..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-[#f8faf9] border border-[#d4e4df] rounded-xl pl-9 pr-4 py-2 text-xs text-[#071633] placeholder-[#94a3b8] w-full md:w-72 outline-none focus:border-[#008f7d]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f2f8f6] border-b border-[#dfece8] text-[#526474] text-[10px] font-black uppercase tracking-wider">
                    <th className="p-3.5 rounded-l-xl">Student Name</th>
                    <th className="p-3.5">Destination</th>
                    <th className="p-3.5">Target Intake</th>
                    <th className="p-3.5">Stage / Status</th>
                    <th className="p-3.5">Target Universities</th>
                    <th className="p-3.5 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf5f2]">
                  {students
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.country.toLowerCase().includes(searchQuery.toLowerCase()) || s.targetUniversities.some(u => u.toLowerCase().includes(searchQuery.toLowerCase())))
                    .map(s => {
                      const isOffer = s.stage.includes("Offer");
                      const isSubmitted = s.stage.includes("Submitted");
                      const isVerification = s.stage.includes("Verification");
                      const badgeStyle = isOffer
                        ? "bg-[#ecfdf5] text-[#047857] border-[#d1fae5]"
                        : isSubmitted
                        ? "bg-[#eff6ff] text-[#1d4ed8] border-[#dbeafe]"
                        : isVerification
                        ? "bg-[#faf5ff] text-[#7e22ce] border-[#f3e8ff]"
                        : "bg-[#fffbeb] text-[#b45309] border-[#fef3c7]";

                      return (
                        <tr key={s.id} className="hover:bg-[#f8faf9] transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#dff3ee] text-[#007568] border border-[#bfe3da] flex items-center justify-center font-black text-xs shrink-0">
                                {s.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div>
                                <span className="font-extrabold text-[#071633] block text-xs">{s.name}</span>
                                <span className="text-[10px] text-[#64748b]">{s.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-[#334155]">{s.country}</td>
                          <td className="p-3.5 font-semibold text-[#64748b]">{s.intake}</td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-extrabold ${badgeStyle}`}>
                              ● {s.stage}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {s.targetUniversities.map(u => (
                                <span key={u} className="bg-[#f0faf7] text-[#007f70] border border-[#d1fae5] px-2 py-0.5 rounded-md text-[10px] font-bold">
                                  {u}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/study-abroad/mentor/university-recommendations?studentId=${s.id}`}
                                style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                                className="hover:bg-[#007f70] px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition shadow-sm inline-flex items-center gap-1 keep-white"
                              >
                                Suggest Univ
                              </Link>
                              <Link
                                href="/study-abroad/mentor/messages"
                                className="bg-white hover:bg-slate-50 text-[#334155] border border-[#d4e4df] px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition"
                                title="Send Message"
                              >
                                <MessageCircleMore className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSITY RECOMMENDATIONS SLUG */}
      {featureSlug === "university-recommendations" && (
        <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eef5f3] pb-4">
            <div>
              <h2 className="text-lg font-black text-[#071633]">University & Course Recommendation Tool</h2>
              <p className="text-xs text-[#64748b] mt-0.5">Categorize university choices into Safe, Target, and Dream categories for assigned candidates.</p>
            </div>
            {/* Candidate Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#526474]">Target Candidate:</span>
              <select
                value={recTargetStudent?.id}
                onChange={e => {
                  const s = students.find(item => item.id === e.target.value);
                  if (s) setRecTargetStudent(s);
                }}
                className="bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-1.5 text-xs text-[#071633] font-bold outline-none cursor-pointer"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {recommendSuccess && (
            <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] p-3.5 rounded-2xl text-xs font-bold animate-in fade-in">
              ✓ {recommendSuccess}
            </div>
          )}

          {/* Quick Add University Bar */}
          <form onSubmit={handleAddUniversity} className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center">
            <input
              type="text"
              placeholder="Enter University & Program Name (e.g. Columbia University MS CS)..."
              value={newUnivName}
              onChange={e => setNewUnivName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddUniversity(e); }}
              className="flex-1 bg-white border border-[#d4e4df] rounded-xl px-4 py-2 text-xs text-[#071633] outline-none focus:border-[#008f7d] w-full"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={newUnivCategory}
                onChange={e => setNewUnivCategory(e.target.value as any)}
                className="bg-white border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] font-bold outline-none cursor-pointer"
              >
                <option value="safe">Safe Category</option>
                <option value="target">Target Category</option>
                <option value="dream">Dream Category</option>
              </select>
              <button
                type="button"
                onClick={handleAddUniversity}
                style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                className="hover:bg-[#007f70] px-4 py-2 rounded-xl text-xs font-black shrink-0 transition cursor-pointer keep-white"
              >
                + Add Choice
              </button>
            </div>
          </form>

          {/* Recommendations Grid */}
          {(() => {
            const activeStudentId = recTargetStudent?.id || "s1";
            const rawRecs = recommendations[activeStudentId] || { safe: [], target: [], dream: [] };
            const currentRecs = {
              safe: rawRecs.safe || [],
              target: rawRecs.target || [],
              dream: rawRecs.dream || []
            };
            return (
              <div className="grid md:grid-cols-3 gap-6">
                {/* SAFE */}
                <div className="bg-[#f0faf7] border border-[#c3e8de] p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-[#c3e8de] pb-2">
                    <span className="text-xs font-extrabold text-[#007f70] uppercase tracking-wider">Safe Universities</span>
                    <span className="text-[10px] font-bold bg-[#008f7d] text-white keep-white px-2 py-0.5 rounded-full">
                      {currentRecs.safe.length} Universities
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526474] font-medium">90%+ acceptance likelihood based on current academic GPA & test scores.</p>
                  <ul className="space-y-2 text-xs font-semibold text-[#071633]">
                    {currentRecs.safe.map((univ, idx) => (
                      <li key={idx} className="p-2.5 bg-white rounded-xl border border-[#d4e4df] flex items-center justify-between shadow-xs">
                        <span>{univ}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUniversity("safe", idx)}
                          className="text-[#94a3b8] hover:text-rose-500 transition font-bold px-1"
                          title="Remove choice"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* TARGET */}
                <div className="bg-[#eff6ff] border border-[#bfdbfe] p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-[#bfdbfe] pb-2">
                    <span className="text-xs font-extrabold text-[#1d4ed8] uppercase tracking-wider">Target Universities</span>
                    <span className="text-[10px] font-bold bg-[#1d4ed8] text-white keep-white px-2 py-0.5 rounded-full">
                      {currentRecs.target.length} Universities
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526474] font-medium">50-70% acceptance likelihood matching student profile target range.</p>
                  <ul className="space-y-2 text-xs font-semibold text-[#071633]">
                    {currentRecs.target.map((univ, idx) => (
                      <li key={idx} className="p-2.5 bg-white rounded-xl border border-[#d4e4df] flex items-center justify-between shadow-xs">
                        <span>{univ}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUniversity("target", idx)}
                          className="text-[#94a3b8] hover:text-rose-500 transition font-bold px-1"
                          title="Remove choice"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* DREAM */}
                <div className="bg-[#fffbeb] border border-[#fef3c7] p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-[#fef3c7] pb-2">
                    <span className="text-xs font-extrabold text-[#b45309] uppercase tracking-wider">Dream Universities</span>
                    <span className="text-[10px] font-bold bg-[#b45309] text-white keep-white px-2 py-0.5 rounded-full">
                      {currentRecs.dream.length} Universities
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526474] font-medium">High reach institutions requiring outstanding SOP and strong LORs.</p>
                  <ul className="space-y-2 text-xs font-semibold text-[#071633]">
                    {currentRecs.dream.map((univ, idx) => (
                      <li key={idx} className="p-2.5 bg-white rounded-xl border border-[#d4e4df] flex items-center justify-between shadow-xs">
                        <span>{univ}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUniversity("dream", idx)}
                          className="text-[#94a3b8] hover:text-rose-500 transition font-bold px-1"
                          title="Remove choice"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}

          {/* Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleIssueRecommendations}
              style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
              className="hover:bg-[#007f70] px-6 py-3 rounded-2xl text-xs font-black cursor-pointer shadow-md transition keep-white"
            >
              Issue Recommendations to {recTargetStudent?.name}'s Workspace
            </button>
          </div>
        </div>
      )}

      {/* SESSIONS / CALENDAR SLUG */}
      {(featureSlug === "sessions" || featureSlug === "tasks") && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Sessions Card */}
          <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eef5f3] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#071633]">Mentorship Sessions & Calendar Schedule</h2>
                <p className="text-xs text-[#64748b] mt-0.5">Schedule 1-on-1 advisory sessions, launch video meetings, and manage candidate follow-ups.</p>
              </div>
              <button
                onClick={() => setShowSessionModal(true)}
                style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                className="hover:bg-[#007f70] px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition keep-white shrink-0"
              >
                <Plus className="h-4 w-4 keep-white" /> Schedule New Session
              </button>
            </div>

            {/* Sessions Feed */}
            <div className="space-y-3">
              {sessions.map(ses => (
                <div key={ses.id} className="p-4 bg-[#f8faf9] border border-[#d4e4df] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-[#bde3d8]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#008f7d] bg-[#e0f5f0] px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {ses.student}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        ses.status === "COMPLETED"
                          ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
                          : "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                      }`}>
                        ● {ses.status || "UPCOMING"}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-[#071633] text-sm">{ses.topic}</h4>
                    <p className="text-xs text-[#64748b] flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#008f7d]" />
                      <span>{ses.date} at {ses.time} ({ses.duration})</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ses.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleMarkSessionComplete(ses.id)}
                        className="bg-white hover:bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer"
                      >
                        ✓ Mark Completed
                      </button>
                    )}
                    <a
                      href={ses.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                      className="hover:bg-[#007f70] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition keep-white shadow-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5 keep-white" /> Launch Google Meet
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Task Checklist Section */}
          <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-[#eef5f3] pb-4">
              <h3 className="text-base font-black text-[#071633]">Candidate Follow-up Tasks & Checklists</h3>
              <p className="text-xs text-[#64748b] mt-0.5">Assign and track candidate milestones before your next advisory session.</p>
            </div>

            {/* Quick Add Task Form */}
            <form onSubmit={handleAddTask} className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={newTaskStudent?.id}
                onChange={e => {
                  const s = students.find(item => item.id === e.target.value);
                  if (s) setNewTaskStudent(s);
                }}
                className="bg-white border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] font-bold outline-none cursor-pointer w-full sm:w-auto"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Assign task (e.g. Submit Stanford SOP Draft v2)..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-white border border-[#d4e4df] rounded-xl px-4 py-2 text-xs text-[#071633] outline-none focus:border-[#008f7d] w-full"
              />
              <input
                type="text"
                placeholder="Due Date (e.g. In 2 days)"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                className="bg-white border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] outline-none w-full sm:w-36"
              />
              <button
                type="submit"
                style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                className="hover:bg-[#007f70] px-4 py-2 rounded-xl text-xs font-black shrink-0 transition cursor-pointer keep-white"
              >
                + Assign Task
              </button>
            </form>

            {/* Tasks List */}
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="p-3.5 bg-white border border-[#e2eee9] rounded-xl flex items-center justify-between gap-3 hover:bg-[#fafcfc]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="h-4 w-4 accent-[#008f7d] rounded cursor-pointer"
                    />
                    <div>
                      <span className={`text-xs font-extrabold block ${task.completed ? "line-through text-[#94a3b8]" : "text-[#071633]"}`}>
                        {task.title}
                      </span>
                      <span className="text-[10px] text-[#64748b] font-semibold">
                        Assigned to: <strong className="text-[#008f7d]">{task.studentName}</strong> · Due: {task.dueDate}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    task.completed ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]" : "bg-[#fffbeb] text-[#b45309] border-[#fef3c7]"
                  }`}>
                    {task.completed ? "COMPLETED" : "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SCHEDULE NEW SESSION MODAL */}
          {showSessionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-full cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="border-b border-[#eef5f3] pb-3">
                  <span className="text-[10px] font-extrabold text-[#008f7d] uppercase tracking-wider block">Advisory Session</span>
                  <h3 className="text-lg font-black text-[#071633]">Schedule New Session</h3>
                </div>

                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div>
                    <label className="text-xs font-extrabold text-[#526474] block mb-1">Select Candidate</label>
                    <select
                      value={newSessionStudent?.id}
                      onChange={e => {
                        const s = students.find(item => item.id === e.target.value);
                        if (s) setNewSessionStudent(s);
                      }}
                      className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] font-bold outline-none"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#526474] block mb-1">Session Agenda / Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Stanford MS CS SOP Final Strategy Review"
                      value={newSessionTopic}
                      onChange={e => setNewSessionTopic(e.target.value)}
                      required
                      className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-4 py-2 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-extrabold text-[#526474] block mb-1">Date</label>
                      <input
                        type="date"
                        value={newSessionDate}
                        onChange={e => setNewSessionDate(e.target.value)}
                        required
                        className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-[#526474] block mb-1">Time</label>
                      <input
                        type="time"
                        value={newSessionTime}
                        onChange={e => setNewSessionTime(e.target.value)}
                        required
                        className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#526474] block mb-1">Duration</label>
                    <select
                      value={newSessionDuration}
                      onChange={e => setNewSessionDuration(e.target.value)}
                      className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2 text-xs text-[#071633] font-bold outline-none"
                    >
                      <option value="30 mins">30 minutes</option>
                      <option value="45 mins">45 minutes</option>
                      <option value="60 mins">60 minutes</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSessionModal(false)}
                      className="flex-1 bg-[#f8faf9] border border-[#d4e4df] text-[#526474] py-2.5 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                      className="flex-1 hover:bg-[#007f70] py-2.5 rounded-xl text-xs font-black keep-white shadow-sm cursor-pointer"
                    >
                      Confirm & Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MESSAGES WORKSPACE */}
      {featureSlug === "messages" && (
        <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-5 shadow-sm animate-in fade-in">
          <div>
            <h2 className="text-lg font-black text-[#071633]">Messages Workspace</h2>
            <p className="text-xs text-[#64748b] mt-0.5">Real-time 1-on-1 direct messaging channel with your assigned candidates.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 min-h-[480px]">
            {/* Candidate Selector Sidebar */}
            <div className="border border-[#d4e4df] rounded-2xl p-3 bg-[#f8faf9] space-y-2">
              <span className="text-[10px] font-extrabold text-[#526474] uppercase tracking-wider block px-2 py-1">Assigned Candidates</span>
              <div className="space-y-1">
                {messagesLoading && students.length === 0 && (
                  <div className="px-3 py-8 text-center text-xs text-[#64748b]">Loading assigned candidates…</div>
                )}
                {!messagesLoading && students.length === 0 && !messagesError && (
                  <div className="px-3 py-8 text-center text-xs text-[#64748b]">
                    No assigned candidates yet. Candidates appear here after a mentorship session, resume review, or project assignment.
                  </div>
                )}
                {students.map((candidate: any) => {
                  const isSelected = activeCandidate?.id === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      onClick={() => setActiveCandidate(candidate)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-[#e6f7f2] text-[#071633] border border-[#8fd3c4] shadow-sm"
                          : "bg-white hover:bg-[#edf5f2] text-[#071633] border border-[#e2eee9]"
                      }`}
                    >
                      <div
                        style={{ background: isSelected ? '#008f7d' : '#dff3ee', color: isSelected ? '#ffffff' : '#007568' }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                      >
                        {candidate.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-extrabold text-xs truncate text-[#071633]">{candidate.name}</h4>
                        <p className={`text-[10px] truncate ${isSelected ? "text-[#467168]" : "text-[#64748b]"}`}>
                          {candidate.grade || candidate.email || `${candidate.country} · ${candidate.intake}`}
                        </p>
                      </div>
                      {candidate.unreadCount > 0 && (
                        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#00a991] text-white text-[9px] font-black flex items-center justify-center">
                          {candidate.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Thread */}
            <div className="md:col-span-2 border border-[#d4e4df] rounded-2xl flex flex-col justify-between bg-white overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#edf5f2] bg-[#f8faf9] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ background: '#dff3ee', color: '#007568' }} className="w-8 h-8 rounded-lg border border-[#bfe3da] flex items-center justify-center font-black text-xs shrink-0">
                    {activeCandidate?.name ? activeCandidate.name.split(" ").map((n: string) => n[0]).join("") : 'C'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-[#071633]">{activeCandidate?.name || "Select a candidate"}</h3>
                    {activeCandidate && <span className="text-[10px] text-[#008f7d] font-bold">● Live conversation</span>}
                  </div>
                </div>
                {activeCandidate && (
                  <span className="text-[10px] text-[#64748b] bg-white border border-[#d4e4df] px-2.5 py-1 rounded-full font-semibold">
                    {activeCandidate.grade || activeCandidate.email || activeCandidate.status}
                  </span>
                )}
              </div>

              {/* Messages Feed */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[340px] bg-[#fafcfc]">
                {messagesError && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    {messagesError}
                  </div>
                )}
                {!activeCandidate ? (
                  <div className="text-center py-12 text-[#94a3b8] text-xs">
                    Select an assigned candidate to open a live conversation.
                  </div>
                ) : activeMessages.length > 0 ? (
                  activeMessages.map((msg, idx) => {
                    const isMentorSender = msg.senderId === user?.id || msg.senderId === "mentor-id";
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isMentorSender ? "items-end" : "items-start"}`}
                      >
                        <div
                          style={{
                            background: isMentorSender ? '#008f7d' : '#eaf5ff',
                            color: isMentorSender ? '#ffffff' : '#17324d',
                            border: isMentorSender ? '1px solid #008f7d' : '1px solid #c9e2f5',
                          }}
                          className="max-w-[80%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm"
                        >
                          <span style={{ color: isMentorSender ? '#d1fae5' : '#28658f' }} className="text-[10px] block mb-1 font-black uppercase tracking-wider">
                            {isMentorSender ? "You (Mentor)" : activeCandidate?.name}
                          </span>
                          <div style={{ color: isMentorSender ? '#ffffff' : '#17324d' }} className="font-semibold text-xs leading-relaxed">
                            {msg.text ?? msg.content}
                          </div>
                        </div>
                        <span className="text-[9px] text-[#94a3b8] mt-1 font-mono">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-[#94a3b8] text-xs">
                    No message history yet. Type a message below to start chatting with {activeCandidate?.name}.
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#edf5f2] bg-white flex gap-2">
                <input
                  type="text"
                  placeholder={activeCandidate ? `Send direct message to ${activeCandidate.name}...` : "Select a candidate to start messaging"}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={!activeCandidate || isSendingMessage}
                  className="flex-1 bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-4 py-2 text-xs text-[#071633] placeholder-[#94a3b8] outline-none focus:border-[#008f7d]"
                />
                <button
                  type="submit"
                  disabled={!activeCandidate || !chatInput.trim() || isSendingMessage}
                  style={{ background: '#008f7d', color: '#ffffff', border: 'none' }}
                  className="hover:bg-[#007f70] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition keep-white"
                >
                  <Send className="h-3.5 w-3.5 keep-white" style={{ color: '#ffffff' }} />
                  {isSendingMessage ? "Sending…" : "Send"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESOURCES LIBRARY */}
      {featureSlug === "resources" && (
        <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#071633]">Resources Library</h2>
              <p className="text-xs text-[#64748b] mt-1">Upload and manage SOP templates, LOR guidelines, and study visa checklists for candidates.</p>
            </div>
            <div>
              <input
                ref={resourceFileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                onChange={event => handleResourceUpload(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => resourceFileRef.current?.click()}
                disabled={resourceUploading}
                className="bg-[#008f7d] hover:bg-[#007f70] disabled:opacity-60 text-white keep-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <Upload className="h-4 w-4" />
                {resourceUploading ? "Uploading…" : "Upload resource"}
              </button>
            </div>
          </div>
          {resourcesError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {resourcesError}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            {resourcesLoading && (
              <div className="md:col-span-2 py-10 text-center text-xs text-[#64748b]">Loading your resources…</div>
            )}
            {!resourcesLoading && mentorResources.length === 0 && (
              <div className="md:col-span-2 border border-dashed border-[#bcd7cf] rounded-2xl py-12 text-center">
                <FileText className="h-8 w-8 text-[#85aaa1] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#526474]">No resources uploaded yet</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">Upload a file up to 10 MB to share it with candidates.</p>
              </div>
            )}
            {mentorResources.map(resource => (
              <div key={resource.id} className="p-4 bg-[#f8faf9] border border-[#d4e4df] rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-6 w-6 text-[#008f7d] shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-[#071633] truncate">{resource.title}</h4>
                    <span className="text-[10px] text-[#64748b]">
                      {resource.type} {resource.description ? `· ${resource.description}` : ""}
                      {resource.published ? " · Shared with candidates" : " · Private"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadMentorResource(resource)}
                    title="Download resource"
                    className="border border-[#bcd7cf] bg-white text-[#008f7d] p-2 rounded-lg hover:bg-[#edf5f2]"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleResourcePublished(resource)}
                    className={`text-[10px] font-extrabold px-3 py-2 rounded-lg ${
                      resource.published
                        ? "bg-[#d8eee8] text-[#006f62]"
                        : "bg-[#008f7d] text-white keep-white"
                    }`}
                  >
                    {resource.published ? "Shared" : "Share"}
                  </button>
                  <button
                    type="button"
                    title="Delete resource"
                    aria-label={`Delete ${resource.title}`}
                    onClick={() => deleteMentorResource(resource)}
                    className="!border !border-rose-300 !bg-rose-50 !text-rose-700 p-2 rounded-lg hover:!bg-rose-100 shadow-sm transition-colors"
                  >
                    <Trash2 className="h-4 w-4 !text-rose-700" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PERFORMANCE ANALYTICS SLUG */}
      {featureSlug === "analytics" && (
        <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-[#071633] text-base">Mentor Performance & Impact Analytics</h3>
              <p className="text-xs text-[#64748b] mt-1">Live metrics calculated from your sessions, reviews, candidates, and messages.</p>
            </div>
            <button
              type="button"
              onClick={fetchMentorAnalytics}
              disabled={analyticsLoading}
              className="border border-[#bcd7cf] bg-white text-[#008f7d] px-3 py-2 rounded-xl text-[10px] font-extrabold hover:bg-[#edf5f2] disabled:opacity-50"
            >
              {analyticsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {analyticsError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {analyticsError}
            </div>
          )}

          {analyticsLoading && !mentorAnalytics ? (
            <div className="py-16 text-center text-xs text-[#64748b]">Calculating performance metrics…</div>
          ) : mentorAnalytics && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Students Guided</span>
                  <span className="text-xl font-extrabold text-[#071633] block mt-1">{mentorAnalytics.metrics.studentsGuided} Candidates</span>
                  <span className="text-[10px] text-[#64748b] block mt-1">Unique assigned students</span>
                </div>
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Reviews Completed</span>
                  <span className="text-xl font-extrabold text-[#008f7d] block mt-1">{mentorAnalytics.metrics.reviewsCompleted} Reviews</span>
                  <span className="text-[10px] text-[#64748b] block mt-1">Completed resume reviews</span>
                </div>
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Average Rating</span>
                  <span className="text-xl font-extrabold text-amber-500 block mt-1">{mentorAnalytics.metrics.averageRating} / 5.0</span>
                  <span className="text-[10px] text-[#64748b] block mt-1">{mentorAnalytics.metrics.ratingCount} submitted ratings</span>
                </div>
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Median Response Time</span>
                  <span className="text-xl font-extrabold text-[#008f7d] block mt-1">{formatResponseTime(mentorAnalytics.metrics.medianResponseMinutes)}</span>
                  <span className="text-[10px] text-[#64748b] block mt-1">Candidate message to reply</span>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 border border-[#d4e4df] rounded-2xl p-5">
                  <div className="mb-5">
                    <h4 className="text-xs font-extrabold text-[#071633]">Session activity</h4>
                    <p className="text-[10px] text-[#64748b] mt-1">Booked and completed sessions over the last six calendar months</p>
                  </div>
                  <div className="h-48 flex items-end gap-3">
                    {mentorAnalytics.monthlyActivity.map((month: any) => {
                      const maxValue = Math.max(
                        1,
                        ...mentorAnalytics.monthlyActivity.map((item: any) => Math.max(item.booked, item.completed))
                      );
                      return (
                        <div key={month.month} className="flex-1 h-full flex flex-col justify-end">
                          <div className="flex-1 flex items-end justify-center gap-1">
                            <div
                              title={`${month.booked} booked`}
                              className="w-2/5 max-w-8 bg-[#b7dcd3] rounded-t-md"
                              style={{ height: `${Math.max(month.booked ? 8 : 0, (month.booked / maxValue) * 100)}%` }}
                            />
                            <div
                              title={`${month.completed} completed`}
                              className="w-2/5 max-w-8 bg-[#008f7d] rounded-t-md"
                              style={{ height: `${Math.max(month.completed ? 8 : 0, (month.completed / maxValue) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-[#64748b] text-center mt-2">{month.month}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-[#64748b]">
                    <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 bg-[#b7dcd3] rounded-sm" /> Booked</span>
                    <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 bg-[#008f7d] rounded-sm" /> Completed</span>
                  </div>
                </div>

                <div className="border border-[#d4e4df] rounded-2xl p-5">
                  <h4 className="text-xs font-extrabold text-[#071633]">Session status</h4>
                  <p className="text-[10px] text-[#64748b] mt-1 mb-5">Current distribution across all sessions</p>
                  <div className="space-y-4">
                    {mentorAnalytics.sessionStatuses.map((item: any) => {
                      const total = Math.max(1, mentorAnalytics.metrics.totalSessions);
                      const percent = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.status}>
                          <div className="flex justify-between text-[10px] font-bold mb-1.5">
                            <span className="text-[#526474]">{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</span>
                            <span className="text-[#071633]">{item.count} · {percent}%</span>
                          </div>
                          <div className="h-2 bg-[#edf5f2] rounded-full overflow-hidden">
                            <div className="h-full bg-[#008f7d] rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-[#edf5f2]">
                    <div>
                      <span className="text-lg font-black text-[#071633]">{mentorAnalytics.metrics.completedSessions}</span>
                      <span className="block text-[9px] text-[#64748b]">Completed sessions</span>
                    </div>
                    <div>
                      <span className="text-lg font-black text-[#071633]">{mentorAnalytics.metrics.activeProjects}</span>
                      <span className="block text-[9px] text-[#64748b]">Active projects</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-[#94a3b8]">
                Updated {new Date(mentorAnalytics.generatedAt).toLocaleString()} · Response time uses the median elapsed time from an incoming candidate message to the next mentor reply.
              </p>
            </>
          )}
        </div>
      )}

      {/* PAYMENTS & EARNINGS SLUG */}
      {featureSlug === "earnings" && (
        <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-[#d8e8e3] pb-4">
            <div>
              <h3 className="font-extrabold text-[#071633] text-base">Payments & Mentor Earnings Log</h3>
              <p className="text-xs text-[#64748b] mt-1">Live earnings recognized from completed mentorship sessions.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchMentorEarnings}
                disabled={earningsLoading}
                className="border border-[#bcd7cf] bg-white text-[#008f7d] px-3 py-2 rounded-xl text-[10px] font-extrabold hover:bg-[#edf5f2] disabled:opacity-50"
              >
                {earningsLoading ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={exportEarningsCsv}
                disabled={!mentorEarnings?.entries?.length}
                className="bg-[#008f7d] text-white keep-white px-3 py-2 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {earningsError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {earningsError}
            </div>
          )}

          {earningsLoading && !mentorEarnings ? (
            <div className="py-16 text-center text-xs text-[#64748b]">Calculating earnings…</div>
          ) : mentorEarnings && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#e9fbf3] border border-[#b8ead3] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#526474] uppercase">Total Earned</span>
                  <span className="text-xl font-extrabold text-[#087f45] block mt-1">
                    {formatCurrency(mentorEarnings.totalsByCurrency.INR ?? 0)}
                  </span>
                  <span className="text-[10px] text-[#64748b] block mt-1">All completed sessions</span>
                </div>
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">This Month</span>
                  <span className="text-xl font-extrabold text-[#071633] block mt-1">
                    {formatCurrency(mentorEarnings.currentMonthByCurrency.INR ?? 0)}
                  </span>
                  <span className="text-[10px] text-[#64748b] block mt-1">Current calendar month</span>
                </div>
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Paid Sessions</span>
                  <span className="text-xl font-extrabold text-[#071633] block mt-1">{mentorEarnings.completedSessionCount}</span>
                  <span className="text-[10px] text-[#64748b] block mt-1">Marked completed</span>
                </div>
                <div className="bg-[#f8faf9] border border-[#d4e4df] p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Average Per Session</span>
                  <span className="text-xl font-extrabold text-[#071633] block mt-1">
                    {formatCurrency(
                      mentorEarnings.completedSessionCount
                        ? (mentorEarnings.totalsByCurrency.INR ?? 0) / mentorEarnings.completedSessionCount
                        : 0
                    )}
                  </span>
                  <span className="text-[10px] text-[#64748b] block mt-1">INR completed sessions</span>
                </div>
              </div>

              <div className="border border-[#d4e4df] rounded-2xl p-5">
                <h4 className="text-xs font-extrabold text-[#071633]">Monthly earnings</h4>
                <p className="text-[10px] text-[#64748b] mt-1 mb-4">INR earned from completed sessions over the last six months</p>
                <div className="h-36 flex items-end gap-3">
                  {mentorEarnings.monthly.map((month: any) => {
                    const maximum = Math.max(1, ...mentorEarnings.monthly.map((item: any) => item.amount));
                    return (
                      <div key={month.month} className="flex-1 h-full flex flex-col justify-end items-center">
                        <span className="text-[9px] font-bold text-[#526474] mb-1">
                          {month.amount ? formatCurrency(month.amount) : ""}
                        </span>
                        <div
                          title={`${formatCurrency(month.amount)} from ${month.sessions} sessions`}
                          className="w-full max-w-16 bg-[#008f7d] rounded-t-lg"
                          style={{ height: `${Math.max(month.amount ? 8 : 0, (month.amount / maximum) * 100)}%` }}
                        />
                        <span className="text-[9px] text-[#64748b] mt-2">{month.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h4 className="text-xs font-extrabold text-[#071633]">Completed session ledger</h4>
                <select
                  value={earningsMonth}
                  onChange={event => setEarningsMonth(event.target.value)}
                  className="border border-[#bcd7cf] bg-white text-[#526474] rounded-xl px-3 py-2 text-[10px] font-bold"
                >
                  <option value="all">All months</option>
                  {Array.from(new Set(mentorEarnings.entries.map((entry: any) => entry.earnedAt.slice(0, 7)))).map((month: any) => (
                    <option key={month} value={month}>
                      {new Date(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto border border-[#d4e4df] rounded-2xl">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="bg-[#f3f8f6] text-[#526474] uppercase text-[10px]">
                      <th className="p-3">Date</th>
                      <th className="p-3">Session / Service</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Earned Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d8e8e3] text-[#526474]">
                    {mentorEarnings.entries
                      .filter((entry: any) => earningsMonth === "all" || entry.earnedAt.startsWith(earningsMonth))
                      .map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-[#fafcfc]">
                          <td className="p-3">{new Date(entry.earnedAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className="font-bold text-[#071633] block">{entry.service}</span>
                            <span className="text-[9px] text-[#94a3b8]">{entry.duration} minutes</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-[#071633] block">{entry.student}</span>
                            <span className="text-[9px] text-[#94a3b8]">{entry.studentEmail}</span>
                          </td>
                          <td className="p-3">
                            <span className="bg-[#d8eee8] text-[#006f62] px-2.5 py-1 rounded-full text-[9px] font-extrabold">Earned</span>
                          </td>
                          <td className="p-3 text-right font-extrabold text-[#087f45]">
                            {formatCurrency(entry.amount, entry.currency)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {mentorEarnings.entries.filter((entry: any) => earningsMonth === "all" || entry.earnedAt.startsWith(earningsMonth)).length === 0 && (
                  <div className="py-12 text-center text-xs text-[#64748b]">
                    No completed-session earnings for this period.
                  </div>
                )}
              </div>

              <p className="text-[9px] text-[#94a3b8]">
                {mentorEarnings.note} Updated {new Date(mentorEarnings.generatedAt).toLocaleString()}.
              </p>
            </>
          )}
        </div>
      )}

      {/* PROFILE SLUG */}
      {featureSlug === "profile" && (
        <div className="bg-white border border-[#d8e8e3] rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
          <div>
            <h3 className="font-extrabold text-[#071633] text-base">Mentor Profile</h3>
            <p className="text-xs text-[#64748b] mt-1">Keep your marketplace profile and session information accurate.</p>
          </div>

          {profileError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {profileError}
            </div>
          )}
          {profileMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {profileMessage}
            </div>
          )}

          {profileLoading ? (
            <div className="py-16 text-center text-xs text-[#64748b]">Loading your profile…</div>
          ) : (
            <form onSubmit={saveMentorProfile} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ["firstName", "First name"],
                  ["lastName", "Last name"],
                  ["headline", "Professional title"],
                  ["position", "Current position"],
                  ["company", "Company / Organization"],
                  ["university", "Alumni university"],
                  ["country", "Current country"],
                  ["timezone", "Timezone"],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] text-[#526474] font-bold uppercase">{label}</label>
                    <input
                      type="text"
                      value={(profileForm as any)[field]}
                      onChange={event => updateProfileField(field, event.target.value)}
                      required={["firstName", "position", "company", "university", "country", "timezone"].includes(field)}
                      className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#526474] font-bold uppercase">Years of experience</label>
                  <input
                    type="number"
                    min="0"
                    value={profileForm.yearsExperience}
                    onChange={event => updateProfileField("yearsExperience", Number(event.target.value))}
                    className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#526474] font-bold uppercase">Session price (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={profileForm.sessionPrice}
                    onChange={event => updateProfileField("sessionPrice", Number(event.target.value))}
                    className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#526474] font-bold uppercase">Target destinations</label>
                  <input
                    type="text"
                    value={profileForm.targetDestinations}
                    onChange={event => updateProfileField("targetDestinations", event.target.value)}
                    placeholder="USA, Canada, UK, Germany"
                    className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                  />
                  <p className="text-[9px] text-[#94a3b8]">Separate entries with commas.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#526474] font-bold uppercase">Languages</label>
                  <input
                    type="text"
                    value={profileForm.languages}
                    onChange={event => updateProfileField("languages", event.target.value)}
                    placeholder="English, Hindi"
                    className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                  />
                  <p className="text-[9px] text-[#94a3b8]">Separate entries with commas.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#526474] font-bold uppercase">Expertise and skills</label>
                <input
                  type="text"
                  value={profileForm.skills}
                  onChange={event => updateProfileField("skills", event.target.value)}
                  placeholder="Study Abroad, SOP Review, Research, Computer Science"
                  className="w-full bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                />
                <p className="text-[9px] text-[#94a3b8]">Separate entries with commas.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#526474] font-bold uppercase">Short biography</label>
                  <textarea
                    rows={5}
                    value={profileForm.bio}
                    onChange={event => updateProfileField("bio", event.target.value)}
                    required
                    className="w-full resize-none bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#526474] font-bold uppercase">About your mentoring</label>
                  <textarea
                    rows={5}
                    value={profileForm.about}
                    onChange={event => updateProfileField("about", event.target.value)}
                    required
                    className="w-full resize-none bg-[#f8faf9] border border-[#d4e4df] rounded-xl px-3 py-2.5 text-xs text-[#071633] outline-none focus:border-[#008f7d]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-[#009b87] text-white keep-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-60"
                >
                  {profileSaving ? "Saving…" : "Save profile"}
                </button>
                <button
                  type="button"
                  onClick={fetchMentorProfile}
                  disabled={profileSaving}
                  className="border border-[#bcd7cf] bg-white text-[#526474] px-5 py-2.5 rounded-xl text-xs font-bold"
                >
                  Reset changes
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {studentProfileModal && (
        <div
          className="fixed inset-0 z-[100] bg-[#071633]/55 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeStudentProfile();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Student profile"
        >
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#d8e8e3] shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b border-[#d8e8e3] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#071633]">Student Profile</h2>
                <p className="text-[10px] text-[#64748b] mt-0.5">Assigned candidate details and mentorship activity</p>
              </div>
              <button
                type="button"
                onClick={closeStudentProfile}
                aria-label="Close student profile"
                className="!bg-[#f3f8f6] !text-[#526474] border border-[#d4e4df] p-2 rounded-xl hover:!bg-[#e6f1ed]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {studentProfileLoading ? (
                <div className="py-20 text-center text-xs text-[#64748b]">Loading student profile…</div>
              ) : studentProfileError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {studentProfileError}
                </div>
              ) : studentProfileModal.student && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#dff3ee] text-[#007568] border border-[#bfe3da] flex items-center justify-center text-xl font-black shrink-0">
                      {`${studentProfileModal.student.firstName?.[0] ?? ""}${studentProfileModal.student.lastName?.[0] ?? ""}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-[#071633]">
                        {studentProfileModal.student.firstName} {studentProfileModal.student.lastName}
                      </h3>
                      <p className="text-xs text-[#64748b] mt-1">{studentProfileModal.student.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-[#d8eee8] text-[#006f62] px-2.5 py-1 rounded-full text-[9px] font-extrabold">
                          {studentProfileModal.student.status}
                        </span>
                        {studentProfileModal.student.studentProfile?.currentGrade && (
                          <span className="bg-[#f3f8f6] text-[#526474] px-2.5 py-1 rounded-full text-[9px] font-bold">
                            {studentProfileModal.student.studentProfile.currentGrade}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-2xl font-black text-[#008f7d]">{studentProfileModal.progress.percent}%</span>
                      <span className="block text-[9px] text-[#64748b]">Mentorship progress</span>
                    </div>
                  </div>

                  <div className="h-2.5 bg-[#edf5f2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#008f7d] rounded-full" style={{ width: `${studentProfileModal.progress.percent}%` }} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ["Phone", studentProfileModal.student.phone || "Not provided"],
                      ["Gender", studentProfileModal.student.studentProfile?.gender || "Not provided"],
                      ["Date of birth", studentProfileModal.student.studentProfile?.dob ? new Date(studentProfileModal.student.studentProfile.dob).toLocaleDateString() : "Not provided"],
                      ["Previous school", studentProfileModal.student.studentProfile?.previousSchool || "Not provided"],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#f8faf9] border border-[#d4e4df] rounded-xl p-3">
                        <span className="text-[9px] uppercase font-bold text-[#64748b]">{label}</span>
                        <span className="text-xs font-bold text-[#071633] block mt-1 break-words">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="border border-[#d4e4df] rounded-2xl p-4">
                      <h4 className="text-xs font-black text-[#071633] mb-3">Sessions ({studentProfileModal.sessions.length})</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {studentProfileModal.sessions.map((session: any) => (
                          <div key={session.id} className="bg-[#f8faf9] rounded-xl p-2.5">
                            <span className="text-[10px] font-bold text-[#071633] block">{session.topic}</span>
                            <span className="text-[9px] text-[#64748b]">
                              {new Date(session.startsAt || session.date).toLocaleDateString()} · {session.status}
                            </span>
                          </div>
                        ))}
                        {!studentProfileModal.sessions.length && <p className="text-[10px] text-[#94a3b8]">No sessions.</p>}
                      </div>
                    </div>

                    <div className="border border-[#d4e4df] rounded-2xl p-4">
                      <h4 className="text-xs font-black text-[#071633] mb-3">Resume Reviews ({studentProfileModal.resumes.length})</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {studentProfileModal.resumes.map((resume: any) => (
                          <div key={resume.id} className="bg-[#f8faf9] rounded-xl p-2.5">
                            <span className="text-[10px] font-bold text-[#071633] block">{resume.status}</span>
                            <span className="text-[9px] text-[#64748b]">Score: {resume.score || "Pending"}</span>
                          </div>
                        ))}
                        {!studentProfileModal.resumes.length && <p className="text-[10px] text-[#94a3b8]">No resume reviews.</p>}
                      </div>
                    </div>

                    <div className="border border-[#d4e4df] rounded-2xl p-4">
                      <h4 className="text-xs font-black text-[#071633] mb-3">Projects ({studentProfileModal.projects.length})</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {studentProfileModal.projects.map((project: any) => (
                          <div key={project.id} className="bg-[#f8faf9] rounded-xl p-2.5">
                            <span className="text-[10px] font-bold text-[#071633] block">{project.title}</span>
                            <span className="text-[9px] text-[#64748b]">{project.type} · {project.status}</span>
                          </div>
                        ))}
                        {!studentProfileModal.projects.length && <p className="text-[10px] text-[#94a3b8]">No projects.</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeStudentProfile}
                      className="bg-[#008f7d] text-white keep-white px-5 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
