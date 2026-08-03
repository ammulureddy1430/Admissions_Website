"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Bookmark, Building2, Calculator, Calendar, CheckCircle2, ClipboardCheck, Clock, Download, ExternalLink, FilePlus2, GitCompareArrows, Loader2, RotateCcw, Search, SlidersHorizontal, Sparkles, Trash2, Upload, MessageSquare, Send, Star, Target, ShieldAlert, Video, Plus, UserCheck, FileText, Users } from "lucide-react";
import { applicationStages, demoUniversities, documentTypes, studyAbroadFeatures, supportGroups } from "@/components/study-abroad-data";

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="study-empty"><CheckCircle2 /><h3>{title}</h3><p>{copy}</p></div>;
}

type LiveUniversity = {
  id: string; name: string; country: string; region: string;
  countryCode: string; domain: string; website: string;
};

type StudyApplication = {
  id: string; university: string; programme: string; intake: string;
  studyLevel: string; status: string; decision?: "ACCEPTED" | "DECLINED"; createdAt: string;
};

const API = "http://localhost:5001";

const defaultLoanPartners = [
  { id: "partner-pehchaan", name: "Pehchaan Global Finance", interestRate: "8.8% - 9.6%", maxAmount: "₹80 Lakhs", processingFee: "0.5%", collateral: "Not Required", tagline: "Exclusive low-interest collateral-free loans for Pehchaan students." },
  { id: "partner-prodigy", name: "Prodigy Finance", interestRate: "11.2% - 13.9%", maxAmount: "$120,000 USD", processingFee: "2.5%", collateral: "Not Required", tagline: "Specialized US/UK dollar loans for international graduate candidates." },
  { id: "partner-hdfc", name: "HDFC Credila", interestRate: "9.5% - 11.2%", maxAmount: "₹1.5 Crores", processingFee: "1.0%", collateral: "Required", tagline: "Flexible Indian Rupee education loans with income tax benefits." },
  { id: "partner-mpower", name: "Mpower Financing", interestRate: "12.5% - 14.5%", maxAmount: "$100,000 USD", processingFee: "5.0%", collateral: "Not Required", tagline: "Fixed-rate loans without co-signers or collateral requirements." },
];
const applicationWorkflow = ["DRAFT", "DOCUMENTS_COMPLETED", "SUBMITTED", "UNDER_REVIEW", "DECISION"] as const;
const statusLabel: Record<string, string> = {
  DRAFT: "Draft", DOCUMENTS_COMPLETED: "Documents completed", SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review", DECISION: "Decision",
};

const defaultChecklist = [
  { id: "passport", label: "Valid Passport", category: "Core Documents", description: "Must be valid for at least 6 months after your course end date." },
  { id: "offer-letter", label: "Official Offer Letter / COE", category: "Core Documents", description: "Confirmation of Enrollment or Letter of Acceptance from your institution." },
  { id: "photos", label: "Passport-size Photos", category: "Core Documents", description: "Recent photos meeting specific embassy dimension guidelines." },
  { id: "funds", label: "Proof of Funds", category: "Financial Documents", description: "Bank statements, sponsor letters, or education loan approval certificate." },
  { id: "receipts", label: "Tuition Fee Payment Receipt", category: "Financial Documents", description: "Receipt showing payment of the initial deposit or first semester fees." },
  { id: "app-form", label: "Completed Visa Application Form", category: "Embassy Forms", description: "Completed DS-160 (USA), VFS form, or country equivalent." },
  { id: "receipt-visa-fee", label: "Visa Fee Payment Confirmation", category: "Embassy Forms", description: "Receipt of the embassy visa processing fee payment." }
];

const mockInterviewQuestions = [
  "Why do you want to study in this specific country?",
  "How are you going to fund your tuition fees and living expenses?",
  "Why did you choose this university instead of others in your home country?",
  "What are your career plans after completing this course?"
];

const officialScholarships = [
  {
    name: "Erasmus Mundus Joint Masters",
    provider: "European Union",
    destination: "Europe",
    level: "Masters",
    funding: "Full scholarships available",
    summary: "Joint international master’s programmes delivered by universities in multiple countries.",
    eligibility: "Open worldwide; programme-specific academic requirements apply.",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters",
  },
  {
    name: "Chevening Scholarships",
    provider: "UK Government",
    destination: "United Kingdom",
    level: "Masters",
    funding: "Fully funded",
    summary: "A one-year UK master’s scholarship for emerging leaders from eligible countries and territories.",
    eligibility: "Country, degree, work experience and leadership requirements apply.",
    url: "https://www.chevening.org/scholarships/",
  },
  {
    name: "DAAD Scholarship Database",
    provider: "German Academic Exchange Service",
    destination: "Germany",
    level: "Multiple levels",
    funding: "Programme dependent",
    summary: "Official searchable directory of DAAD programmes and selected funding opportunities.",
    eligibility: "Varies by programme, applicant country, subject and study purpose.",
    url: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
  },
  {
    name: "Fulbright-Nehru Master’s Fellowships",
    provider: "USIEF",
    destination: "United States",
    level: "Masters",
    funding: "Funded fellowship",
    summary: "Up to two years of master’s study in eligible fields at institutions in the United States.",
    eligibility: "For eligible Indian citizens; degree, experience and field requirements apply.",
    url: "https://www.usief.org.in/fulbright-fellowships/fellowships-for-indian-citizen/fulbright-nehru-masters-fellowships/",
  },
  {
    name: "Australia Awards Scholarships",
    provider: "Australian Government",
    destination: "Australia",
    level: "Undergraduate & Postgraduate",
    funding: "Fully funded",
    summary: "Long-term awards for eligible citizens of participating countries to study in Australia.",
    eligibility: "Country-specific eligibility, priority areas and conditions apply.",
    url: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
  },
  {
    name: "Commonwealth Master’s Scholarships",
    provider: "Commonwealth Scholarship Commission",
    destination: "United Kingdom",
    level: "Masters",
    funding: "Funded scholarship",
    summary: "Full-time taught master’s study in the UK for eligible Commonwealth-country candidates.",
    eligibility: "Available to candidates from eligible low and middle income Commonwealth countries.",
    url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
  },
] as const;

export default function StudyAbroadFeaturePage({ featureOverride }: { featureOverride?: string } = {}) {
  const params = useParams<{ feature: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const rawFeature = featureOverride || params?.feature;
  const cleanPath = (pathname || "").split("?")[0].replace(/\/$/, "");
  const urlSlug = cleanPath.split("/").pop() || "";
  const featureSlug = Array.isArray(rawFeature) ? rawFeature[0] : (rawFeature || urlSlug);
  const [saved, setSaved] = useState<string[]>([]);
  const [compared, setCompared] = useState<string[]>([]);
  const [isCompareAddModalOpen, setIsCompareAddModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    keyword: "", country: "", course: "", degree: "", intake: "", ranking: "",
    tuition: "", ielts: "", toefl: "", gre: "", gmat: "", pte: "", scholarship: "",
  });
  const [activeFilters, setActiveFilters] = useState(filters);
  const [sort, setSort] = useState("ranking");
  const [liveUniversities, setLiveUniversities] = useState<LiveUniversity[]>([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [applications, setApplications] = useState<StudyApplication[]>([]);
  const [applicationForm, setApplicationForm] = useState({ university: "", programme: "", intake: "", studyLevel: "Masters" });
  const [applicationNotice, setApplicationNotice] = useState("");

  // User session state
  const [user, setUser] = useState<any>(null);

  // Mentorship states
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [savedMentors, setSavedMentors] = useState<string[]>([]);
  const [mentorTab, setMentorTab] = useState<"all" | "recommended" | "top" | "saved">("all");

  useEffect(() => {
    try {
      setSavedMentors(JSON.parse(localStorage.getItem("pehchaan-saved-mentors") || "[]"));
    } catch {
      setSavedMentors([]);
    }
  }, []);

  const toggleSaveMentor = (mentorId: string) => {
    const next = savedMentors.includes(mentorId)
      ? savedMentors.filter(id => id !== mentorId)
      : [...savedMentors, mentorId];
    setSavedMentors(next);
    localStorage.setItem("pehchaan-saved-mentors", JSON.stringify(next));
  };
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [priceRange, setPriceRange] = useState(5000);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [allCountries, setAllCountries] = useState<string[]>([]);

  // Booking Modal State
  const [bookingMentor, setBookingMentor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingQuestions, setBookingQuestions] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  // Chat Inbox State
  const [chatRecipients, setChatRecipients] = useState<any[]>([]);
  const [activeChatRecipient, setActiveChatRecipient] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  // Projects State
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectType, setProjectType] = useState("App");

  // Admin states
  const [adminMentors, setAdminMentors] = useState<any[]>([]);

  // Advisor States
  const [advisorSessions, setAdvisorSessions] = useState<any[]>([]);
  const [advisorResumes, setAdvisorResumes] = useState<any[]>([]);
  const [reviewScore, setReviewScore] = useState<Record<string, number>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [reviewSuggestions, setReviewSuggestions] = useState<Record<string, string>>({});
  const [careersList, setCareersList] = useState<any[]>([]);
  const [studentBookingsList, setStudentBookingsList] = useState<any[]>([]);

  // Builders - reviews state
  const [resumesList, setResumesList] = useState<any[]>([]);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeMentorId, setResumeMentorId] = useState("");

  const [scholarshipQuery, setScholarshipQuery] = useState("");
  const [scholarshipDestination, setScholarshipDestination] = useState("");
  const [scholarshipLevel, setScholarshipLevel] = useState("");
  const filteredScholarships = useMemo(() => officialScholarships.filter(scholarship => {
    const query = scholarshipQuery.trim().toLowerCase();
    if (query && !`${scholarship.name} ${scholarship.provider} ${scholarship.destination} ${scholarship.summary}`.toLowerCase().includes(query)) return false;
    if (scholarshipDestination && scholarship.destination !== scholarshipDestination) return false;
    if (scholarshipLevel && scholarship.level !== scholarshipLevel && scholarship.level !== "Multiple levels") return false;
    return true;
  }), [scholarshipQuery, scholarshipDestination, scholarshipLevel]);
  useEffect(() => {
    setSaved(JSON.parse(localStorage.getItem("pehchaan-saved-universities") || "[]"));
    setCompared(JSON.parse(localStorage.getItem("pehchaan-compared-universities") || "[]"));
  }, []);
  useEffect(() => { localStorage.setItem("pehchaan-saved-universities", JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem("pehchaan-compared-universities", JSON.stringify(compared)); }, [compared]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        fetchDashboardData(parsed);
        if (featureSlug === "advisor") {
          fetchAdvisorDashboard();
        }
        if (featureSlug === "careers") {
          fetchCareersList();
        }
        if (featureSlug === "bookings") {
          fetchStudentBookings();
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchMentorsList();
  }, [featureSlug]);

  const fetchStudentBookings = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/mentorship/sessions/student`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setStudentBookingsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCareersList = async () => {
    try {
      const res = await fetch(`${API}/mentorship/careers`);
      if (res.ok) setCareersList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdvisorDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const resSessions = await fetch(`${API}/mentorship/sessions/mentor`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resSessions.ok) setAdvisorSessions(await resSessions.json());

      const resResumes = await fetch(`${API}/mentorship/resumes/mentor`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resResumes.ok) setAdvisorResumes(await resResumes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmSession = async (id: string, status: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API}/mentorship/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await fetchAdvisorDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitReviewFeedback = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const atsScore = reviewScore[id] || 80;
    const comments = reviewFeedback[id] || "";
    const suggestions = reviewSuggestions[id] || "";
    try {
      const response = await fetch(`${API}/mentorship/resumes/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ atsScore, comments, suggestions }),
      });
      if (response.ok) {
        alert("Review feedback submitted successfully!");
        await fetchAdvisorDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (featureSlug === "mentorship") {
      fetchMentorsList();
    }
  }, [featureSlug, searchQuery, selectedSkill, selectedCountry]);

  const fetchMentorsList = async () => {
    try {
      const query = new URLSearchParams();
      if (searchQuery.trim()) query.set("search", searchQuery.trim());
      if (selectedSkill) query.set("skill", selectedSkill);
      if (selectedCountry) query.set("country", selectedCountry);
      
      const res = await fetch(`${API}/mentorship/mentors?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMentors(data);
        setAdminMentors(data);
        
        // Extract filters metadata from the full database seed
        if (!searchQuery && !selectedSkill && !selectedCountry) {
          const skills = Array.from(new Set<string>(data.flatMap((m: any) => m.skills || [])));
          const countries = Array.from(new Set<string>(data.map((m: any) => m.country)));
          setAllSkills(skills);
          setAllCountries(countries);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async (currentUser: any) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/mentorship/dashboards/student`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
        setResumesList(data.resumes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChatHistory = async (partnerId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/mentorship/messages/${partnerId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setChatMessages(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeChatRecipient) {
      fetchChatHistory(activeChatRecipient.id);
      const interval = setInterval(() => fetchChatHistory(activeChatRecipient.id), 4000);
      return () => clearInterval(interval);
    }
  }, [activeChatRecipient]);

  // Operations
  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in to book a session.");

    try {
      const res = await fetch(`${API}/mentorship/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId: bookingMentor.id,
          date: bookingDate,
          time: bookingTime,
          topic: bookingTopic,
          questions: bookingQuestions
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Booking failed.");
      }
      const data = await res.json();
      setBookingSuccess(data);
      if (user) fetchDashboardData(user);
    } catch (err: any) {
      alert(`Error booking session: ${err.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !newMessageText.trim() || !activeChatRecipient) return;

    try {
      const res = await fetch(`${API}/mentorship/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: activeChatRecipient.id,
          text: newMessageText
        })
      });
      if (res.ok) {
        setNewMessageText("");
        fetchChatHistory(activeChatRecipient.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !projectTitle.trim()) return;

    try {
      const res = await fetch(`${API}/mentorship/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDesc,
          type: projectType
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create project.");
      }
      setProjectTitle("");
      setProjectDesc("");
      alert("Project milestones initialized!");
      if (user) fetchDashboardData(user);
    } catch (err: any) {
      alert(`Error creating initiative: ${err.message}`);
    }
  };

  const handleToggleMilestone = async (proj: any, milestoneIndex: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const updatedMilestones = [...proj.milestones];
      updatedMilestones[milestoneIndex].completed = !updatedMilestones[milestoneIndex].completed;
      
      const res = await fetch(`${API}/mentorship/projects/${proj.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ milestones: updatedMilestones })
      });
      if (res.ok) {
        if (user) fetchDashboardData(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/mentorship/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        if (user) fetchDashboardData(user);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to delete project: ${errorData.message || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error deleting project: ${err.message}`);
    }
  };

  const handleReviewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !resumeUrl.trim()) return;

    try {
      const res = await fetch(`${API}/mentorship/resumes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId: resumeMentorId || mentors[0]?.id,
          resumeUrl
        })
      });
      if (res.ok) {
        setResumeUrl("");
        alert("Document draft submitted for mentor review!");
        if (user) fetchDashboardData(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminVerify = async (id: string, verified: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/mentorship/mentors/${id}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ verified })
      });
      if (res.ok) {
        fetchMentorsList();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Document states
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { fileName: string; fileSize: string; uploadedAt: string }>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalDocType, setModalDocType] = useState("Passport");

  useEffect(() => {
    if (params.feature === "documents") {
      setUploadedDocs(JSON.parse(localStorage.getItem("pehchaan-study-documents") || "{}"));
    }
  }, [params.feature]);

  const handleFileUpload = (type: string, file: File) => {
    setUploadingDocType(type);
    // Simulate upload progress
    setTimeout(() => {
      const updated = {
        ...uploadedDocs,
        [type]: {
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: new Date().toLocaleDateString()
        }
      };
      setUploadedDocs(updated);
      localStorage.setItem("pehchaan-study-documents", JSON.stringify(updated));
      setUploadingDocType(null);
      setIsUploadModalOpen(false);
    }, 1500);
  };

  const removeUploadedDoc = (type: string) => {
    const updated = { ...uploadedDocs };
    delete updated[type];
    setUploadedDocs(updated);
    localStorage.setItem("pehchaan-study-documents", JSON.stringify(updated));
  };

  const triggerFileSelect = (type: string) => {
    setUploadingDocType(type);
    document.getElementById("hidden-file-input")?.click();
  };

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  // Counselling states
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionForm, setSessionForm] = useState({ counsellor: "Dr. Sarah Jenkins (US/UK)", topic: "University Selection", date: "", time: "" });
  const [aiCounselQuery, setAiCounselQuery] = useState("");
  const [aiCounselAdvice, setAiCounselAdvice] = useState<string | null>(null);
  const [aiCounselLoading, setAiCounselLoading] = useState(false);

  useEffect(() => {
    if (params.feature === "counselling") {
      setSessions(JSON.parse(localStorage.getItem("pehchaan-study-counselling") || "[]"));
      setAiCounselAdvice(localStorage.getItem("pehchaan-counselling-advice") || null);
    }
  }, [params.feature]);

  const addCounsellingSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.date || !sessionForm.time) return;
    const newSession = {
      id: Date.now().toString(),
      ...sessionForm,
      status: "Scheduled",
      link: "https://zoom.us/j/9998887777"
    };
    const updated = [...sessions, newSession];
    setSessions(updated);
    localStorage.setItem("pehchaan-study-counselling", JSON.stringify(updated));
    setSessionForm({ counsellor: "Dr. Sarah Jenkins (US/UK)", topic: "University Selection", date: "", time: "" });
  };

  const removeCounsellingSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem("pehchaan-study-counselling", JSON.stringify(updated));
  };

  const getAiCounselAdvice = async () => {
    if (!aiCounselQuery.trim()) return;
    setAiCounselLoading(true);
    try {
      const token = localStorage.getItem("token");
      let schoolId = localStorage.getItem("schoolId") || "";
      if (!schoolId) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            schoolId = user.schoolId || "";
          } catch (e) {
            console.error(e);
          }
        }
      }
      if (!schoolId) {
        try {
          const listRes = await fetch(`${API}/school/list`);
          if (listRes.ok) {
            const schools = await listRes.json();
            if (schools && schools[0]) {
              schoolId = schools[0].id;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      const prompt = `You are a professional study abroad career counselor. Give short, structured recommendations on university selection, career path, or study destinations for this student query: "${aiCounselQuery}"`;
      const res = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: prompt })
      });
      if (res.ok) {
        const data = await res.json();
        setAiCounselAdvice(data.response);
        localStorage.setItem("pehchaan-counselling-advice", data.response);
      } else {
        alert("Failed to get response from AI Counselor.");
      }
    } catch (e) {
      console.error(e);
      alert("Error reaching AI Counselor.");
    } finally {
      setAiCounselLoading(false);
    }
  };

  // Support services states
  const [supportProgress, setSupportProgress] = useState<Record<string, boolean>>({});
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ stage: "Before admission", item: "", notes: "" });

  useEffect(() => {
    if (params.feature === "support") {
      setSupportProgress(JSON.parse(localStorage.getItem("pehchaan-support-progress") || "{}"));
      setSupportRequests(JSON.parse(localStorage.getItem("pehchaan-support-requests") || "[]"));
    }
  }, [params.feature]);

  const toggleSupportItem = (id: string) => {
    const updated = { ...supportProgress, [id]: !supportProgress[id] };
    setSupportProgress(updated);
    localStorage.setItem("pehchaan-support-progress", JSON.stringify(updated));
  };

  const submitSupportRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.item) return;
    const newRequest = {
      id: Date.now().toString(),
      ...requestForm,
      status: "Assigned to Advisor",
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [...supportRequests, newRequest];
    setSupportRequests(updated);
    localStorage.setItem("pehchaan-support-requests", JSON.stringify(updated));
    setIsRequestModalOpen(false);
    setRequestForm({ stage: "Before admission", item: "", notes: "" });
  };

  const cancelSupportRequest = (id: string) => {
    const updated = supportRequests.filter(r => r.id !== id);
    setSupportRequests(updated);
    localStorage.setItem("pehchaan-support-requests", JSON.stringify(updated));
  };

  // Loan States
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [loanTenure, setLoanTenure] = useState<string>("");
  const [calculatedEmi, setCalculatedEmi] = useState<any>(null);
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [coSignerIncome, setCoSignerIncome] = useState("");
  const [collateralValue, setCollateralValue] = useState("No");
  const [applyingLoader, setApplyingLoader] = useState(false);
  const [calculatorError, setCalculatorError] = useState<string | null>(null);

  // EMI calculator trigger
  const calculateEMIValue = () => {
    setCalculatorError(null);
    const P = parseFloat(loanAmount);
    const r = parseFloat(interestRate) / (12 * 100);
    const n = parseFloat(loanTenure) * 12;
    if (isNaN(P) || isNaN(r) || isNaN(n) || P <= 0 || r <= 0 || n <= 0) {
      setCalculatorError("Please enter valid positive values for all inputs.");
      setCalculatedEmi(null);
      return;
    }
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;
    setCalculatedEmi({
      monthlyEmi: emi.toFixed(0),
      totalInterest: totalInterest.toFixed(0),
      totalPayment: totalPayment.toFixed(0)
    });
  };

  useEffect(() => {
    if (params.feature === "loans") {
      const stored = localStorage.getItem("pehchaan-loans-status");
      if (stored) {
        setLoanApplications(JSON.parse(stored));
      } else {
        setLoanApplications([]);
      }
    }
  }, [params.feature]);

  const submitLoanApplication = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setApplyingLoader(true);
    setTimeout(() => {
      const newApp = {
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        coSignerIncome,
        collateralValue,
        status: "Pre-Approved",
        appliedAt: new Date().toLocaleDateString()
      };
      const updated = [...loanApplications.filter(app => app.partnerId !== selectedPartner.id), newApp];
      setLoanApplications(updated);
      localStorage.setItem("pehchaan-loans-status", JSON.stringify(updated));
      setApplyingLoader(false);
      setSelectedPartner(null);
      setCoSignerIncome("");
      setCollateralValue("No");
    }, 1500);
  };

  const removeLoanApplication = (partnerId: string) => {
    const updated = loanApplications.filter(app => app.partnerId !== partnerId);
    setLoanApplications(updated);
    localStorage.setItem("pehchaan-loans-status", JSON.stringify(updated));
  };


  // Student Profile states
  const [profileData, setProfileData] = useState<any>({
    degree: "",
    school: "",
    gpa: "",
    gradYear: "",
    ielts: "",
    gre: "",
    experience: [],
    skills: [],
    achievements: []
  });
  const [tempExp, setTempExp] = useState({ title: "", company: "", duration: "" });
  const [tempSkill, setTempSkill] = useState("");
  const [tempAch, setTempAch] = useState("");

  const [academicsForm, setAcademicsForm] = useState({
    degree: "",
    school: "",
    gpa: "",
    gradYear: "",
    ielts: "",
    gre: ""
  });
  const [academicsNotice, setAcademicsNotice] = useState<string | null>(null);

  useEffect(() => {
    if (params.feature === "profile") {
      const stored = localStorage.getItem("pehchaan-student-profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfileData(parsed);
        setAcademicsForm({
          degree: parsed.degree || "",
          school: parsed.school || "",
          gpa: parsed.gpa || "",
          gradYear: parsed.gradYear || "",
          ielts: parsed.ielts || "",
          gre: parsed.gre || ""
        });
      }
    }
  }, [params.feature]);

  const saveAcademics = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...profileData,
      ...academicsForm
    };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
    setAcademicsNotice("Academic profile saved successfully.");
    setTimeout(() => setAcademicsNotice(null), 3000);
  };

  const addProfileExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempExp.title || !tempExp.company) return;
    const updatedExp = [...(profileData.experience || []), { id: Date.now().toString(), ...tempExp }];
    const updated = { ...profileData, experience: updatedExp };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
    setTempExp({ title: "", company: "", duration: "" });
  };

  const removeProfileExperience = (id: string) => {
    const updatedExp = (profileData.experience || []).filter((exp: any) => exp.id !== id);
    const updated = { ...profileData, experience: updatedExp };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
  };

  const addProfileSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSkill.trim()) return;
    const updatedSkills = [...(profileData.skills || []), tempSkill.trim()];
    const updated = { ...profileData, skills: updatedSkills };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
    setTempSkill("");
  };

  const removeProfileSkill = (index: number) => {
    const updatedSkills = (profileData.skills || []).filter((_: any, i: number) => i !== index);
    const updated = { ...profileData, skills: updatedSkills };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
  };

  const addProfileAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempAch.trim()) return;
    const updatedAchs = [...(profileData.achievements || []), tempAch.trim()];
    const updated = { ...profileData, achievements: updatedAchs };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
    setTempAch("");
  };

  const removeProfileAchievement = (index: number) => {
    const updatedAchs = (profileData.achievements || []).filter((_: any, i: number) => i !== index);
    const updated = { ...profileData, achievements: updatedAchs };
    setProfileData(updated);
    localStorage.setItem("pehchaan-student-profile", JSON.stringify(updated));
  };

  // Visa states
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptForm, setApptForm] = useState({ embassy: "", type: "Biometrics", date: "", time: "" });
  const [feedback, setFeedback] = useState<Record<string, { answer: string; review: string }>>({});
  const [activeQuestion, setActiveQuestion] = useState("");
  const [mockAnswer, setMockAnswer] = useState("");
  const [aiCoachLoading, setAiCoachLoading] = useState(false);

  useEffect(() => {
    if (params.feature === "visa") {
      setChecklist(JSON.parse(localStorage.getItem("pehchaan-visa-checklist") || "{}"));
      setAppointments(JSON.parse(localStorage.getItem("pehchaan-visa-appointments") || "[]"));
      setFeedback(JSON.parse(localStorage.getItem("pehchaan-visa-feedback") || "{}"));
    }
  }, [params.feature]);

  const toggleChecklistItem = (id: string) => {
    const updated = { ...checklist, [id]: !checklist[id] };
    setChecklist(updated);
    localStorage.setItem("pehchaan-visa-checklist", JSON.stringify(updated));
  };

  const addAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptForm.embassy || !apptForm.date || !apptForm.time) return;
    const newAppt = { id: Date.now().toString(), ...apptForm, status: "Scheduled" };
    const updated = [...appointments, newAppt];
    setAppointments(updated);
    localStorage.setItem("pehchaan-visa-appointments", JSON.stringify(updated));
    setApptForm({ embassy: "", type: "Biometrics", date: "", time: "" });
  };

  const removeAppointment = (id: string) => {
    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    localStorage.setItem("pehchaan-visa-appointments", JSON.stringify(updated));
  };

  const getAiFeedback = async (question: string, answer: string) => {
    if (!answer.trim()) return;
    setAiCoachLoading(true);
    try {
      const token = localStorage.getItem("token");
      let schoolId = localStorage.getItem("schoolId") || "";
      if (!schoolId) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            schoolId = user.schoolId || "";
          } catch (e) {
            console.error(e);
          }
        }
      }
      if (!schoolId) {
        try {
          const listRes = await fetch(`${API}/school/list`);
          if (listRes.ok) {
            const schools = await listRes.json();
            if (schools && schools[0]) {
              schoolId = schools[0].id;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      const prompt = `You are an expert student visa interviewer. Provide concise feedback, a score out of 10, and suggestions to improve this response for the question: "${question}". Response to evaluate: "${answer}"`;
      const res = await fetch("http://localhost:5001/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": schoolId,
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: prompt })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...feedback, [question]: { answer, review: data.response } };
        setFeedback(updated);
        localStorage.setItem("pehchaan-visa-feedback", JSON.stringify(updated));
      } else {
        alert("Failed to get AI Coach response. Please make sure backend is running.");
      }
    } catch (err) {
      console.error(err);
      alert("Error reaching AI Coach.");
    } finally {
      setAiCoachLoading(false);
    }
  };
  const filteredUniversities = useMemo(() => {
    const value = (key: keyof typeof activeFilters) => activeFilters[key].trim().toLowerCase();
    const maximum = (key: keyof typeof activeFilters) => Number(activeFilters[key]) || 0;
    return demoUniversities.filter(university => {
      const keyword = value("keyword");
      if (keyword && !`${university.name} ${university.country} ${university.courses.join(" ")}`.toLowerCase().includes(keyword)) return false;
      if (value("country") && university.country.toLowerCase() !== value("country")) return false;
      if (value("course") && !university.courses.some(course => course.toLowerCase() === value("course"))) return false;
      if (value("degree") && !university.degrees.some(degree => degree.toLowerCase() === value("degree"))) return false;
      if (value("intake") && !university.intake.toLowerCase().includes(value("intake"))) return false;
      if (maximum("ranking") && university.rankingNumber > maximum("ranking")) return false;
      if (maximum("tuition") && university.tuitionMax > maximum("tuition")) return false;
      if (maximum("ielts") && university.ielts > maximum("ielts")) return false;
      if (maximum("toefl") && university.toefl > maximum("toefl")) return false;
      if (maximum("gre") && university.gre > maximum("gre")) return false;
      if (maximum("gmat") && university.gmat > maximum("gmat")) return false;
      if (maximum("pte") && university.pte > maximum("pte")) return false;
      if (value("scholarship") === "yes" && !university.scholarship) return false;
      return true;
    }).sort((a, b) => sort === "fees" ? a.tuitionMax - b.tuitionMax : sort === "name" ? a.name.localeCompare(b.name) : a.rankingNumber - b.rankingNumber);
  }, [activeFilters, sort]);
  const updateFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const searchLiveUniversities = async (name = filters.keyword, country = filters.country) => {
    if (!name.trim() && !country.trim()) {
      setLiveError("Enter a university name or select a destination.");
      return;
    }
    setLiveLoading(true); setLiveError("");
    try {
      const query = new URLSearchParams();
      if (name.trim()) query.set("name", name.trim());
      if (country.trim()) query.set("country", country.trim());
      const response = await fetch(`/api/universities?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setLiveUniversities(data.universities); setLiveTotal(data.total);
    } catch (error) {
      setLiveUniversities([]);
      setLiveError(error instanceof Error ? error.message : "Unable to load universities.");
    } finally { setLiveLoading(false); }
  };
  useEffect(() => { if (params.feature === "universities") void searchLiveUniversities("", "India"); }, [params.feature]);
  useEffect(() => {
    if (params.feature !== "universities") return;
    fetch("/api/universities?mode=countries")
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setDestinations(data.countries))
      .catch(() => setDestinations(["Australia", "Canada", "Germany", "India", "Ireland", "Singapore", "United Kingdom", "United States"]));
  }, [params.feature]);
  const loadApplications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const response = await fetch(`${API}/higher-education-applications/mine`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      localStorage.clear();
      router.push(`/login?role=study-abroad&next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!response.ok) return;
    const records = await response.json();
    setApplications(records.map((record: any) => ({ ...record, university: record.institutionName })));
  };
  useEffect(() => {
    void loadApplications();
    if (params.feature === "applications") {
      const selectedUniversity = new URLSearchParams(window.location.search).get("university") || "";
      if (selectedUniversity) setApplicationForm(current => ({ ...current, university: selectedUniversity }));
    }
  }, [params.feature]);
  const submitApplication = async (event: FormEvent) => {
    event.preventDefault();
    if (!applicationForm.university.trim() || !applicationForm.programme.trim() || !applicationForm.intake.trim()) return;
    const token = localStorage.getItem("token");
    const response = await fetch(`${API}/higher-education-applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ institutionName: applicationForm.university, programme: applicationForm.programme, intake: applicationForm.intake, studyLevel: applicationForm.studyLevel }),
    });
    if (response.status === 401) {
      localStorage.clear();
      router.push(`/login?role=study-abroad&next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setApplicationNotice(data.message || "Could not create the application.");
      return;
    }
    await loadApplications();
    setApplicationNotice("Application draft created successfully.");
    setApplicationForm({ university: "", programme: "", intake: "", studyLevel: "Masters" });
    window.history.replaceState({}, "", "/study-abroad/applications");
  };
  const updateApplication = async (id: string, action: "documents-complete" | "submit") => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API}/higher-education-applications/${id}/${action}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      localStorage.clear();
      router.push(`/login?role=study-abroad&next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (response.ok) await loadApplications();
  };
  const removeApplication = async (id: string) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API}/higher-education-applications/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      localStorage.clear();
      router.push(`/login?role=study-abroad&next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (response.ok) await loadApplications();
  };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setActiveFilters(filters); void searchLiveUniversities(); };
  const clearSearch = () => {
    const empty = { keyword: "", country: "", course: "", degree: "", intake: "", ranking: "", tuition: "", ielts: "", toefl: "", gre: "", gmat: "", pte: "", scholarship: "" };
    setFilters(empty); setActiveFilters(empty); setLiveUniversities([]); setLiveTotal(0); setLiveError("");
  };
  const feature = studyAbroadFeatures.find(item => item.slug === featureSlug) || {
    slug: featureSlug,
    label: featureSlug ? featureSlug.replaceAll("-", " ") : "Service",
    description: "Access higher education tools, advisory, and guidance.",
    icon: Users,
  };
  const Icon = feature.icon;

  return (
    <div className="study-page">
      <header className="study-page-header"><div className="study-feature-icon"><Icon /></div><div><span>Study Abroad</span><h1>{feature.label}</h1><p>{feature.description}</p></div></header>

      {params.feature === "universities" && <>
        <form className="study-panel study-search-panel" onSubmit={submitSearch}>
          <div className="study-search-title"><div><span className="study-search-kicker"><SlidersHorizontal /> Live university directory</span><h2>Find a university</h2><p>Search current institution names, locations, domains and official websites from the live directory.</p></div><div className="study-shortlist-links"><Link href="/study-abroad/saved"><Bookmark /> Saved <strong>{saved.length}</strong></Link><Link href="/study-abroad/compare"><GitCompareArrows /> Compare <strong>{compared.length}</strong></Link></div></div>
          <label className="study-keyword"><span>University name <small>(optional)</small></span><div><Search /><input value={filters.keyword} onChange={event => updateFilter("keyword", event.target.value)} placeholder="Leave blank to browse every university in a country" /></div></label>
          <div className="study-filters">
            <label><span>Destination country</span><select value={filters.country} onChange={event => { updateFilter("country", event.target.value); if (event.target.value) void searchLiveUniversities(filters.keyword, event.target.value); }}><option value="">Select a country</option>{destinations.map(item => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="study-search-actions"><button className="study-primary" type="submit"><Search /> Search universities</button><button className="study-reset" type="button" onClick={clearSearch}><RotateCcw /> Clear filters</button></div>
        </form>
        <section className="study-demo-results">
          <div className="study-demo-heading"><div><span>Live directory</span><h2>University results</h2><p>Institution names and official domains are loaded live. Confirm programmes, admissions, fees and requirements on the university website.</p></div><div className="study-results-tools"><strong>{liveLoading ? "Searching…" : `${liveUniversities.length}${liveTotal > liveUniversities.length ? ` of ${liveTotal}` : ""} results`}</strong></div></div>
          <div className="study-university-grid">
            {liveUniversities.map(university => {
              const isSaved = saved.includes(university.id);
              const isCompared = compared.includes(university.id);
              return <article key={university.id}>
                <div className="study-university-top"><span className="study-university-logo"><Building2 /></span><span className="study-live-badge">Live listing</span></div>
                <h3>{university.name}</h3><p>{[university.region, university.country].filter(Boolean).join(", ")}</p>
                <dl>
                  <div><dt>Country code</dt><dd>{university.countryCode || "—"}</dd></div>
                  <div><dt>Official domain</dt><dd>{university.domain || "Not listed"}</dd></div>
                </dl>
                {(() => {
                  const matchingAlumni = mentors.filter(m => m.university.toLowerCase().includes(university.name.toLowerCase()) || university.name.toLowerCase().includes(m.university.toLowerCase()));
                  if (matchingAlumni.length > 0) {
                    return (
                      <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e2ece8', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#008f7d', display: 'block', marginBottom: '0.35rem' }}>Verified Alumni Mentors Available:</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {matchingAlumni.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setBookingMentor(m);
                                setBookingSuccess(null);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#f0faf8', color: '#007f70', border: '1px solid #d1fae5', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Connect with {m.user.firstName}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="study-university-actions">
                  <Link href={`/study-abroad/applications?university=${encodeURIComponent(university.name)}`}>Apply <ArrowRight /></Link>
                  {university.website && <a className="official" href={university.website} target="_blank" rel="noreferrer">Website <ExternalLink /></a>}
                  <button type="button" className={isSaved ? "selected" : ""} onClick={() => setSaved(current => isSaved ? current.filter(id => id !== university.id) : [...current, university.id])}><Bookmark />{isSaved ? "Saved" : "Save"}</button>
                  <button type="button" className={isCompared ? "selected" : ""} onClick={() => setCompared(current => isCompared ? current.filter(id => id !== university.id) : [...current, university.id])}><GitCompareArrows />{isCompared ? "Added" : "Compare"}</button>
                </div>
              </article>;
            })}
          </div>
          {!liveLoading && liveUniversities.length === 0 && <div className="study-no-results"><Search /><h3>{liveError || "Search the live university directory"}</h3><p>Enter a university name or choose a destination to find current institutions.</p>{liveError && <button type="button" onClick={clearSearch}>Clear search</button>}</div>}
        </section>
      </>}

      {params.feature === "timeline" && <section className="study-panel"><div className="study-panel-heading"><div><h2>Application journey</h2><p>Track the recorded progress of every higher-education application.</p></div><Link className="study-primary" href="/study-abroad/applications"><ClipboardCheck /> Manage applications</Link></div>{applications.length > 0 ? <div className="study-timeline-apps">{applications.map(application => { const currentIndex = applicationWorkflow.indexOf(application.status as typeof applicationWorkflow[number]); return <article key={application.id}><div><span>{application.studyLevel} · {application.intake}</span><h3>{application.university}</h3><p>{application.programme}</p></div><ol className="study-status-steps">{applicationWorkflow.map((stage, index) => <li className={index < currentIndex ? "complete" : index === currentIndex ? "current" : ""} key={stage}><i>{index < currentIndex ? <CheckCircle2 /> : index + 1}</i><span>{statusLabel[stage]}{stage === "DECISION" && application.decision ? `: ${application.decision === "ACCEPTED" ? "Accepted" : "Declined"}` : ""}</span></li>)}</ol></article>; })}</div> : <EmptyState title="No timeline yet" copy="Create an application first. Its progress will then appear here automatically." />}</section>}

      {params.feature === "saved" && <section className="study-panel">
        <div className="study-panel-heading"><div><h2>Your saved universities</h2><p>Your shortlist is stored in this browser and remains available when you return.</p></div><Link className="study-primary" href="/study-abroad/universities"><Search /> Find universities</Link></div>
        {saved.length > 0 ? <div className="study-saved-list">{demoUniversities.filter(item => saved.includes(item.id)).map(university => <article key={university.id}><span className="study-university-logo">{university.initials}</span><div><strong>{university.name}</strong><small>{university.country} · {university.intake}</small></div><button type="button" onClick={() => setSaved(current => current.filter(id => id !== university.id))}>Remove</button><Link href={`/study-abroad/applications?university=${encodeURIComponent(university.name)}`}>Apply <ArrowRight /></Link></article>)}</div> : <EmptyState title="No saved universities" copy="Use the Save button in university search to create your shortlist." />}
      </section>}

      {params.feature === "compare" && <>
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>Compare Universities</h2>
              <p>Compare up to three saved choices side-by-side across rankings, exam requirements, and costs.</p>
            </div>
            <button type="button" className="study-primary" onClick={() => setIsCompareAddModalOpen(true)}>
              <SlidersHorizontal /> Add Universities
            </button>
          </div>

          {compared.length > 0 ? (
            <div className="study-compare-wrap" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
              <table className="study-compare-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.72rem', fontWeight: 800, width: '20%' }}>University Details</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <th key={item.id} style={{ padding: '1rem', verticalAlign: 'top', width: '26%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2.2rem', height: '2.2rem', background: '#008f7d', color: '#fff', fontWeight: 900, borderRadius: '0.6rem', fontSize: '0.85rem' }}>
                            {item.initials}
                          </span>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: '1.3' }}>{item.name}</h4>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800 }}>{item.country}</span>
                          
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                            <Link href={`/study-abroad/applications?university=${encodeURIComponent(item.name)}`} className="study-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.6rem', height: 'auto' }}>
                              Apply Now <ArrowRight style={{ width: '0.7rem', height: '0.7rem' }} />
                            </Link>
                            <button type="button" onClick={() => setCompared(current => current.filter(id => id !== item.id))} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #f87171', background: 'none', color: '#ef4444', padding: '0.35rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer' }}>
                              <Trash2 style={{ width: '0.65rem', height: '0.65rem' }} /> Remove
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>World Ranking</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: '#0f172a', fontWeight: 800 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#d97706' }}>
                          <Sparkles style={{ width: '0.75rem', height: '0.75rem' }} /> Rank #{item.rankingNumber} ({item.ranking})
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>Annual Tuition</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: '#0f172a', fontWeight: 700 }}>
                        {item.tuition}
                        <div style={{ height: '4px', width: '5rem', background: '#e2e8f0', borderRadius: '99px', marginTop: '0.35rem', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: item.tuitionMax <= 15 ? '#16a34a' : item.tuitionMax <= 35 ? '#d97706' : '#ef4444', width: `${Math.min(100, (item.tuitionMax / 45) * 100)}%` }} />
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>Living Cost</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: '#475569' }}>
                        {item.living}
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>Available Intakes</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', color: '#0f172a', fontWeight: 800 }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem' }}>
                          {item.intake}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>Min Exam Requirements</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.68rem', color: '#475569' }}>
                        <div style={{ display: 'grid', gap: '0.15rem' }}>
                          <span>IELTS: <strong>{item.ielts}</strong></span>
                          <span>TOEFL: <strong>{item.toefl}</strong></span>
                          {item.gre > 0 && <span>GRE: <strong>{item.gre}</strong></span>}
                          {item.gmat > 0 && <span>GMAT: <strong>{item.gmat}</strong></span>}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>Scholarships Offered</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.72rem' }}>
                        {item.scholarship ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#d1fae5', color: '#065f46', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem' }}>
                            <CheckCircle2 style={{ width: '0.75rem', height: '0.75rem' }} /> Scholarships Available
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem' }}>
                            None Dedicated
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <th style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.68rem', fontWeight: 800 }}>Key Entry Criteria</th>
                    {demoUniversities.filter(item => compared.includes(item.id)).slice(0, 3).map(item => (
                      <td key={item.id} style={{ padding: '0.85rem 1rem', fontSize: '0.68rem', color: '#475569', lineHeight: '1.4' }}>
                        {item.eligibility}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nothing to compare yet" copy="Use the Add Universities button above to select up to three universities to compare side-by-side." />
          )}
        </section>

        {/* University Add Modal */}
        {isCompareAddModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 22, 51, 0.45)' }} onClick={() => setIsCompareAddModalOpen(false)} />
            
            <div className="study-panel" style={{ position: 'relative', zIndex: 110, width: '100%', maxWidth: '28rem', background: '#fff', padding: '1.5rem', borderRadius: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div className="study-panel-heading">
                <div>
                  <h2>Add Universities to Compare</h2>
                  <p>Choose up to 3 universities to compare cost, criteria, and requirements side-by-side.</p>
                </div>
              </div>

              {compared.length >= 3 && (
                <div className="study-application-notice" style={{ marginTop: '1rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                  <Sparkles style={{ color: '#d97706' }} /> You have already selected the maximum of 3 universities. Remove one to add another.
                </div>
              )}

              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.25rem', maxHeight: '18rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {demoUniversities.map(item => {
                  const isAdded = compared.includes(item.id);
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dceae6', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#fff' }}>
                      <div>
                        <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>{item.name}</strong>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.15rem' }}>{item.country} · Rank #{item.rankingNumber}</div>
                      </div>
                      
                      {isAdded ? (
                        <button
                          type="button"
                          onClick={() => setCompared(current => current.filter(id => id !== item.id))}
                          style={{
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.4rem 0.8rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          Added
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={compared.length >= 3}
                          onClick={() => setCompared(current => [...current, item.id])}
                          style={{
                            border: 'none',
                            background: compared.length >= 3 ? '#e2e8f0' : '#008f7d',
                            color: compared.length >= 3 ? '#94a3b8' : '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.4rem 0.8rem',
                            borderRadius: '0.5rem',
                            cursor: compared.length >= 3 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Add to Compare
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCompareAddModalOpen(false)}
                  className="study-primary"
                  style={{ padding: '0.5rem 1.25rem', height: 'auto', fontSize: '0.72rem' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </>}

      {params.feature === "applications" && <>
        <section className="study-panel">
          <div className="study-panel-heading"><div><h2>Start an application</h2><p>Create a draft for the university and programme you want to apply to.</p></div></div>
          {applicationNotice && <div className="study-application-notice"><CheckCircle2 />{applicationNotice}</div>}
          <form className="study-application-form" onSubmit={submitApplication}>
            <label><span>University</span><input required value={applicationForm.university} onChange={event => setApplicationForm(current => ({ ...current, university: event.target.value }))} placeholder="University name" /></label>
            <label><span>Programme</span><input required value={applicationForm.programme} onChange={event => setApplicationForm(current => ({ ...current, programme: event.target.value }))} placeholder="For example, MSc Computer Science" /></label>
            <label><span>Study level</span><select value={applicationForm.studyLevel} onChange={event => setApplicationForm(current => ({ ...current, studyLevel: event.target.value }))}><option>Bachelors</option><option>Masters</option><option>PhD</option><option>Diploma</option></select></label>
            <label><span>Preferred intake</span><input required value={applicationForm.intake} onChange={event => setApplicationForm(current => ({ ...current, intake: event.target.value }))} placeholder="For example, September 2027" /></label>
            <button className="study-primary" type="submit"><FilePlus2 /> Create application draft</button>
          </form>
        </section>
        <section className="study-panel">
          <div className="study-panel-heading"><div><h2>My application records</h2><p>Continue and track the applications created in this workspace.</p></div><Link className="study-primary" href="/study-abroad/universities"><Search /> Find universities</Link></div>
          {applications.length > 0 ? <div className="study-application-list">{applications.map(application => { const currentIndex = applicationWorkflow.indexOf(application.status as typeof applicationWorkflow[number]); return <article key={application.id}>
            <div className="study-feature-icon"><ClipboardCheck /></div>
            <div className="study-application-summary"><span>{application.studyLevel} · {application.intake}</span><h3>{application.university}</h3><p>{application.programme}</p></div>
            <strong>{application.status === "DECISION" && application.decision ? (application.decision === "ACCEPTED" ? "Accepted" : "Declined") : statusLabel[application.status]}</strong>
            <div className="study-application-progress"><div style={{ width: `${Math.max(4, (currentIndex / (applicationWorkflow.length - 1)) * 100)}%` }} /></div>
            <div className="study-application-actions">
              {application.status === "DRAFT" && <button className="primary" type="button" onClick={() => updateApplication(application.id, "documents-complete")}>Mark documents complete</button>}
              {application.status === "DOCUMENTS_COMPLETED" && <button className="primary" type="button" onClick={() => updateApplication(application.id, "submit")}>Submit application</button>}
              {application.status === "SUBMITTED" && <span className="study-awaiting-review"><CheckCircle2 /> Submitted · Waiting for college review</span>}
              {application.status === "UNDER_REVIEW" && <span className="study-awaiting-review"><ClipboardCheck /> Review in progress at the college</span>}
              {application.status === "DECISION" && <span className="study-awaiting-review"><CheckCircle2 /> College decision recorded</span>}
              <Link href="/study-abroad/timeline">View timeline <ArrowRight /></Link>
              {(application.status === "DRAFT" || application.status === "SUBMITTED") && <button className="remove" type="button" onClick={() => removeApplication(application.id)}>Remove</button>}
            </div>
          </article>; })}</div> : <EmptyState title="No applications yet" copy="Choose Apply from a university result, or use the form above to create your first application draft." />}
        </section>
      </>}

      {params.feature === "documents" && <>
        <input
          type="file"
          id="hidden-file-input"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(uploadingDocType || modalDocType, file);
            }
          }}
        />

        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>Required documents</h2>
              <p>Upload and manage academic, financial, identity, and visa documents locally.</p>
            </div>
            <button className="study-primary" type="button" onClick={openUploadModal}>
              <Upload /> Upload document
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
            {documentTypes.map(item => {
              const doc = uploadedDocs[item];
              const isUploading = uploadingDocType === item;

              return (
                <article
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: doc ? '1px solid #dceae6' : '1px dashed #bddbd3',
                    borderRadius: '1rem',
                    padding: '1.15rem',
                    background: doc ? '#fff' : '#fbfdfc',
                    transition: 'all 0.2s',
                    boxShadow: doc ? '0 6px 16px rgba(0,0,0,0.015)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                    <div className="study-feature-icon" style={{ background: doc ? '#e8f7f2' : '#f1f5f9', color: doc ? '#008f7d' : '#64748b' }}>
                      <FilePlus2 />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: '0.78rem', color: '#1e293b', display: 'block' }}>{item}</strong>
                      {isUploading ? (
                        <span style={{ fontSize: '0.64rem', color: '#008f7d', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <span className="animate-spin" style={{ display: 'inline-block', width: '0.65rem', height: '0.65rem', border: '1.5px solid #008f7d', borderTopColor: 'transparent', borderRadius: '50%' }} /> Uploading...
                        </span>
                      ) : doc ? (
                        <div style={{ marginTop: '0.15rem', minWidth: 0 }}>
                          <span style={{ fontSize: '0.68rem', color: '#008f7d', fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
                            {doc.fileName}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginTop: '0.05rem' }}>
                            {doc.fileSize} · Uploaded on {doc.uploadedAt}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>Not uploaded</span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginLeft: '0.85rem' }}>
                    {doc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert(`Mock downloading ${doc.fileName}...`); }}
                          style={{ fontSize: '0.68rem', fontWeight: 800, color: '#008f7d' }}
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => removeUploadedDoc(item)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                          title="Remove document"
                        >
                          <Trash2 style={{ width: '0.9rem', height: '0.9rem' }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!!uploadingDocType}
                        onClick={() => triggerFileSelect(item)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #bddbd3',
                          background: '#fff',
                          color: '#008f7d',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Upload
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Upload Document Modal */}
        {isUploadModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(7, 22, 51, 0.4)',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '1.25rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '28rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              border: '1px solid #d9e8e3'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#073a3d', marginBottom: '0.5rem' }}>Upload Document</h3>
              <p style={{ fontSize: '0.72rem', color: '#607080', marginBottom: '1.25rem' }}>Select the category and pick a file to upload to your Document Center.</p>
              
              <label style={{ display: 'grid', gap: '0.45rem', fontSize: '0.72rem', fontWeight: 800, color: '#526474', marginBottom: '1.25rem' }}>
                <span>Document Category</span>
                <select
                  value={modalDocType}
                  onChange={e => setModalDocType(e.target.value)}
                  style={{
                    minHeight: '2.5rem',
                    border: '1px solid #d4e4df',
                    borderRadius: '0.6rem',
                    padding: '0.6rem',
                    fontSize: '0.72rem',
                    outline: 0,
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230a2244\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
                    backgroundPosition: 'right 0.8rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '0.9rem'
                  }}
                >
                  {documentTypes.map(type => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '0.65rem',
                    border: '1px solid #cfe2dd',
                    background: '#fff',
                    color: '#526474',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadingDocType(modalDocType);
                    document.getElementById("hidden-file-input")?.click();
                  }}
                  className="study-primary"
                  style={{ padding: '0.65rem 1.25rem', height: 'auto', fontSize: '0.72rem' }}
                >
                  Select File
                </button>
              </div>
            </div>
          </div>
        )}

        {isUploadModalOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(7, 22, 51, 0.25)' }} onClick={() => setIsUploadModalOpen(false)} />}
      </>}

      {params.feature === "scholarships" && <>
        <section className="study-panel study-scholarship-search">
          <div className="study-panel-heading"><div><h2>Find official scholarship programmes</h2><p>Search verified opportunities and continue on the provider’s official website.</p></div><span className="study-official-count"><CheckCircle2 /> {filteredScholarships.length} official sources</span></div>
          <div className="study-scholarship-filters">
            <label className="study-keyword"><span>Keyword</span><div><Search /><input value={scholarshipQuery} onChange={event => setScholarshipQuery(event.target.value)} placeholder="Scholarship, provider or destination" /></div></label>
            <label><span>Destination</span><select value={scholarshipDestination} onChange={event => setScholarshipDestination(event.target.value)}><option value="">All destinations</option>{Array.from(new Set(officialScholarships.map(item => item.destination))).map(item => <option key={item}>{item}</option>)}</select></label>
            <label><span>Study level</span><select value={scholarshipLevel} onChange={event => setScholarshipLevel(event.target.value)}><option value="">All study levels</option><option>Undergraduate &amp; Postgraduate</option><option>Masters</option></select></label>
          </div>
        </section>
        <section className="study-scholarship-results">
          <div className="study-demo-heading"><div><span>Official opportunities</span><h2>Scholarships you can explore</h2><p>Funding, eligibility and application windows can change. Always confirm the current details on the official programme page.</p></div></div>
          {filteredScholarships.length > 0 ? <div className="study-scholarship-grid">{filteredScholarships.map(scholarship => <article key={scholarship.name}>
            <div className="study-scholarship-card-top"><span className="study-feature-icon"><BadgeDollarSign /></span><span>{scholarship.destination}</span></div>
            <p className="study-scholarship-provider">{scholarship.provider}</p>
            <h3>{scholarship.name}</h3>
            <p className="study-scholarship-summary">{scholarship.summary}</p>
            <dl><div><dt>Study level</dt><dd>{scholarship.level}</dd></div><div><dt>Funding</dt><dd>{scholarship.funding}</dd></div></dl>
            <p className="study-scholarship-eligibility"><CheckCircle2 />{scholarship.eligibility}</p>
            <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <a href={scholarship.url} style={{ flex: 1 }} target="_blank" rel="noreferrer">View official programme <ExternalLink /></a>
              <button
                type="button"
                onClick={() => {
                  const matchingMentor = mentors.find(m => m.skills.some((s: string) => s.toLowerCase().includes("scholarship")) || m.achievements.some((a: string) => a.toLowerCase().includes("scholar")));
                  if (matchingMentor) {
                    setBookingMentor(matchingMentor);
                    setBookingSuccess(null);
                  } else {
                    setBookingMentor(mentors[0] || null);
                    setBookingSuccess(null);
                  }
                }}
                style={{ background: '#f0faf8', color: '#007f70', border: '1px solid #d1fae5', padding: '0.4rem 0.65rem', borderRadius: '0.5rem', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Ask a Winner
              </button>
            </div>
          </article>)}</div> : <EmptyState title="No matching scholarships" copy="Try clearing one of the filters or using a broader keyword." />}
        </section>
      </>}

      {params.feature === "support" && <>
        <div className="study-support-grid">
          {supportGroups.map(({ title, items, icon: SupportIcon }) => (
            <article key={title} style={{ padding: '1.25rem', border: '1px solid #dceae6', borderRadius: '1.25rem', background: '#fff', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="study-feature-icon"><SupportIcon /></div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{title}</h2>
              </div>
              
              {/* Card stage progress bar */}
              {(() => {
                const checkedCount = items.filter(i => supportProgress[i]).length;
                const pct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', margin: '0.85rem 0 1rem' }}>
                    <div style={{ flex: 1, height: '0.45rem', background: '#e2ece8', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#008f7d', width: `${pct}%`, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#315568' }}>{checkedCount}/{items.length}</span>
                  </div>
                );
              })()}

              <ul style={{ display: 'grid', gap: '0.65rem', flex: 1 }}>
                {items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem', color: supportProgress[item] ? '#7c8e9d' : '#334155' }}>
                    <input
                      type="checkbox"
                      checked={!!supportProgress[item]}
                      onChange={() => toggleSupportItem(item)}
                      style={{ width: '0.9rem', height: '0.9rem', accentColor: '#008f7d', cursor: 'pointer' }}
                    />
                    <span style={{ textDecoration: supportProgress[item] ? 'line-through' : 'none', transition: 'all 0.2s' }}>{item}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  setRequestForm({ stage: title, item: items[0] || "", notes: "" });
                  setIsRequestModalOpen(true);
                }}
                style={{
                  marginTop: '1.25rem',
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '0.6rem',
                  border: '1px solid #bddbd3',
                  background: '#fff',
                  color: '#008f7d',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Request Assistance
              </button>
            </article>
          ))}
        </div>

        {/* Active Support Tickets list */}
        {supportRequests.length > 0 && (
          <section className="study-panel" style={{ marginTop: '2rem' }}>
            <div className="study-panel-heading" style={{ marginBottom: '1rem' }}>
              <div>
                <h2>Active Assistance Requests</h2>
                <p>Track direct advisor ticketing status for support actions.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {supportRequests.map(req => (
                <article key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dceae6', borderRadius: '0.9rem', padding: '0.85rem 1rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.015)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div className="study-feature-icon" style={{ background: '#e8f7f2', color: '#008f7d' }}><CheckCircle2 /></div>
                    <div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#008f7d' }}>{req.stage}</span>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.1rem' }}>{req.item}</h4>
                      {req.notes && <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem', fontStyle: 'italic' }}>"{req.notes}"</p>}
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>Submitted on {req.createdAt}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '999px', background: '#fef3c7', color: '#d97706' }}>{req.status}</span>
                    <button onClick={() => cancelSupportRequest(req.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Cancel request">
                      <Trash2 style={{ width: '0.95rem', height: '0.95rem' }} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Floating Modal Form */}
        {isRequestModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(7, 22, 51, 0.4)',
            backdropFilter: 'blur(4px)'
          }}>
            <form onSubmit={submitSupportRequest} style={{
              background: '#fff',
              borderRadius: '1.25rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '28rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              border: '1px solid #d9e8e3'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#073a3d', marginBottom: '0.5rem' }}>Request Assistance</h3>
              <p style={{ fontSize: '0.72rem', color: '#607080', marginBottom: '1.25rem' }}>Specify the item you need guidance on under stage: <strong>{requestForm.stage}</strong></p>
              
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.68rem', fontWeight: 800, color: '#526474', marginBottom: '0.85rem' }}>
                <span>Select Service / Milestone</span>
                <select
                  value={requestForm.item}
                  onChange={e => setRequestForm({ ...requestForm, item: e.target.value })}
                  style={{
                    minHeight: '2.5rem',
                    border: '1px solid #d4e4df',
                    borderRadius: '0.6rem',
                    padding: '0.6rem',
                    fontSize: '0.72rem',
                    outline: 0,
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230a2244\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
                    backgroundPosition: 'right 0.8rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '0.9rem'
                  }}
                >
                  {supportGroups.find(g => g.title === requestForm.stage)?.items.map(item => (
                    <option key={item}>{item}</option>
                  )) || <option>General support</option>}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.68rem', fontWeight: 800, color: '#526474', marginBottom: '1.25rem' }}>
                <span>Optional notes for the advisor</span>
                <textarea
                  rows={3}
                  value={requestForm.notes}
                  onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Explain what help you need..."
                  style={{ width: '100%', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0, resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '0.65rem',
                    border: '1px solid #cfe2dd',
                    background: '#fff',
                    color: '#526474',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="study-primary"
                  style={{ padding: '0.65rem 1.25rem', height: 'auto', fontSize: '0.72rem' }}
                >
                  Request Help
                </button>
              </div>
            </form>
          </div>
        )}

        {isRequestModalOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(7, 22, 51, 0.25)' }} onClick={() => setIsRequestModalOpen(false)} />}
      </>}

      {["sop-builder", "lor-builder", "resume-builder"].includes(params.feature) && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '2rem' }}>
          {/* Main Draft Area */}
          <section className="study-panel" style={{ height: 'fit-content' }}>
            <div className="study-builder">
              <div>
                <h2>Start a new draft</h2>
                <p>Create and edit drafts locally in the workspace. Export will be enabled when document generation is connected.</p>
              </div>
              <div className="study-builder-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="study-primary" style={{ padding: '0 1rem', fontSize: '0.72rem', height: '2.5rem' }}><FilePlus2 /> New draft</button>
                <button disabled style={{ padding: '0 1rem', fontSize: '0.72rem', height: '2.5rem', opacity: 0.5 }}><Download /> Export PDF</button>
              </div>
            </div>
            <textarea className="study-editor" style={{ width: '100%', minHeight: '350px', border: '1px solid #d4e4df', borderRadius: '0.8rem', padding: '1rem', outline: 'none', marginTop: '1rem' }} placeholder={`Start writing your ${feature.label.replace(" Builder", "")} here...`} />
          </section>

          {/* Direct Mentor Assessment Sidebar */}
          <div style={{ display: 'grid', gap: '1.25rem', alignContent: 'start' }}>
            <section className="bg-white border border-[#dceae6] p-5 rounded-3xl shadow-sm space-y-4">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>Request Mentor Assessment</h3>
              <p style={{ fontSize: '0.68rem', color: '#64748b' }}>Submit your shareable link to an expert advisor or verified alumni for review.</p>
              <form onSubmit={handleReviewDocument} className="space-y-3">
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Shareable Link / PDF URL</span>
                  <input
                    type="url"
                    required
                    placeholder="https://docs.google.com/..."
                    value={resumeUrl}
                    onChange={e => setResumeUrl(e.target.value)}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Choose Mentor</span>
                  <select
                    value={resumeMentorId}
                    onChange={e => setResumeMentorId(e.target.value)}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  >
                    <option value="">Select Mentor</option>
                    {mentors.map(m => (
                      <option key={m.id} value={m.id}>{m.user.firstName} {m.user.lastName} ({m.company})</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="w-full bg-[#008f7d] hover:bg-[#007f70] text-white py-2 rounded-xl text-xs font-bold shadow-md">
                  Submit for Review
                </button>
              </form>
            </section>

            {/* Assessment reports */}
            {resumesList.length > 0 && (
              <section className="bg-white border border-[#dceae6] p-5 rounded-3xl shadow-sm space-y-4">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>Assessment Reports</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {resumesList.map((res: any) => (
                    <div key={res.id} style={{ padding: '0.85rem', border: '1px solid #f1f5f9', borderRadius: '1rem', background: '#f8fafc', fontSize: '0.72rem' }} className="space-y-2">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <a href={res.resumeUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#008f7d', textDecoration: 'underline' }}>Draft URL</a>
                        <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: '999px', background: res.status === 'REVIEWED' ? '#ecfdf5' : '#fef3c7', color: res.status === 'REVIEWED' ? '#047857' : '#d97706' }}>
                          {res.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Assigned: {res.mentor?.user?.firstName} {res.mentor?.user?.lastName}</p>
                      {res.status === 'REVIEWED' && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }} className="space-y-1">
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>ATS Core Score: {res.score}/100</div>
                          <div><strong>Suggestions:</strong> {res.suggestions}</div>
                          <div><strong>Key Tips:</strong> {res.tips}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {params.feature === "loans" && <>
        {/* EMI Calculator */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>EMI Calculator</h2>
              <p>Estimate monthly repayments and compare loan payment breakdowns.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', marginTop: '1.25rem' }}>
            {/* Inputs Form */}
            <div style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Loan Amount (₹)</span>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  placeholder="Enter amount in Rupees"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Annual Interest Rate (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  placeholder="Enter annual percentage rate"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Tenure in Years</span>
                <input
                  type="number"
                  value={loanTenure}
                  onChange={e => setLoanTenure(e.target.value)}
                  placeholder="Enter tenure in years"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <button type="button" className="study-primary" onClick={calculateEMIValue} style={{ minHeight: '2.5rem', marginTop: '0.5rem' }}>
                <Calculator /> Calculate EMI
              </button>
            </div>

            {/* Results breakdown */}
            <div style={{ display: 'grid', gap: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Repayment Summary</h3>
              {calculatedEmi ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '0.75rem' }}>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Monthly EMI</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 900, color: '#008f7d', marginTop: '0.25rem' }}>₹{Number(calculatedEmi.monthlyEmi).toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '0.75rem' }}>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Interest</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 900, color: '#d97706', marginTop: '0.25rem' }}>₹{Number(calculatedEmi.totalInterest).toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '0.75rem' }}>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Repayment</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '0.25rem' }}>₹{Number(calculatedEmi.totalPayment).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Ratio bar */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#475569', fontWeight: 800, marginBottom: '0.35rem' }}>
                      <span>Principal Amount ({Math.round((parseFloat(loanAmount) / parseFloat(calculatedEmi.totalPayment)) * 100)}%)</span>
                      <span>Interest Payable ({Math.round((parseFloat(calculatedEmi.totalInterest) / parseFloat(calculatedEmi.totalPayment)) * 100)}%)</span>
                    </div>
                    <div style={{ height: '0.75rem', borderRadius: '999px', overflow: 'hidden', display: 'flex', background: '#e2ece8' }}>
                      <div style={{ background: '#008f7d', width: `${(parseFloat(loanAmount) / parseFloat(calculatedEmi.totalPayment)) * 100}%` }} />
                      <div style={{ background: '#d97706', width: `${(parseFloat(calculatedEmi.totalInterest) / parseFloat(calculatedEmi.totalPayment)) * 100}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '8rem', textAlign: 'center' }}>
                  <Calculator style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                  {calculatorError ? (
                    <p style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 800 }}>{calculatorError}</p>
                  ) : (
                    <>
                      <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>No calculation generated</h4>
                      <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Enter the loan amount, interest rate, and tenure details on the left, then click Calculate EMI.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Loan Partners List */}
        <section className="study-panel" style={{ marginTop: '1.5rem' }}>
          <div className="study-panel-heading">
            <div>
              <h2>Pre-Approved Loan Partners</h2>
              <p>Apply for in-principle education loan approval from partner lenders.</p>
            </div>
          </div>

          <div className="study-application-list" style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
            {defaultLoanPartners.map(partner => {
              const application = loanApplications.find(app => app.partnerId === partner.id);
              return (
                <article key={partner.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dceae6', borderRadius: '1rem', padding: '1rem 1.25rem', background: '#fff', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div className="study-feature-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Building2 /></div>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>{partner.name}</h4>
                      <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>{partner.tagline}</p>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Interest Rate</strong> {partner.interestRate}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Max Loan Limit</strong> {partner.maxAmount}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Collateral</strong> {partner.collateral}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Processing Fee</strong> {partner.processingFee}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {application ? (
                      <>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#d1fae5', color: '#065f46', fontSize: '0.65rem', fontWeight: 800, padding: '0.35rem 0.65rem', borderRadius: '999px' }}>
                          <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem' }} /> {application.status}
                        </span>
                        <button type="button" className="remove" onClick={() => removeLoanApplication(partner.id)} style={{ fontSize: '0.65rem', background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer' }}>
                          Cancel application
                        </button>
                      </>
                    ) : (
                      <button type="button" className="study-primary" onClick={() => setSelectedPartner(partner)} style={{ height: '2.1rem', fontSize: '0.68rem', padding: '0 1rem' }}>
                        Apply Now
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Application Modal */}
        {selectedPartner && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 22, 51, 0.45)' }} onClick={() => setSelectedPartner(null)} />
            
            <div className="study-panel" style={{ position: 'relative', zIndex: 110, width: '100%', maxWidth: '28rem', background: '#fff', padding: '1.5rem', borderRadius: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div className="study-panel-heading">
                <div>
                  <h2>Pre-Approval Eligibility</h2>
                  <p>Apply for in-principle loan approval from {selectedPartner.name}.</p>
                </div>
              </div>

              <form onSubmit={submitLoanApplication} style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Co-signer Monthly Income (₹)</span>
                  <input
                    type="number"
                    required
                    value={coSignerIncome}
                    onChange={e => setCoSignerIncome(e.target.value)}
                    placeholder="e.g. 75000"
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Do you have collateral to offer?</span>
                  <select
                    value={collateralValue}
                    onChange={e => setCollateralValue(e.target.value)}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0, background: '#fff' }}
                  >
                    <option value="No">No Collateral (Unsecured Loan)</option>
                    <option value="Property">Yes, Property (House/Land)</option>
                    <option value="FD">Yes, Fixed Deposits / Financial Securities</option>
                  </select>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    style={{
                      border: 'none',
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '0.6rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="study-primary"
                    disabled={applyingLoader}
                    style={{ padding: '0.65rem 1.25rem', height: 'auto', fontSize: '0.72rem' }}
                  >
                    {applyingLoader ? (
                      <>
                        <Loader2 className="animate-spin" /> Verifying score...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>}

      {params.feature === "visa" && <>
        {/* Visa Document Checklist */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>Visa Document Checklist</h2>
              <p>Tick off the documents required for your visa application process.</p>
            </div>
            {/* Dynamic Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '12rem', height: '0.65rem', background: '#e2ece8', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  background: '#008f7d',
                  width: `${Math.round((defaultChecklist.filter(item => checklist[item.id]).length / defaultChecklist.length) * 100)}%`,
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#315568' }}>
                {defaultChecklist.filter(item => checklist[item.id]).length} of {defaultChecklist.length} completed
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            {Array.from(new Set(defaultChecklist.map(item => item.category))).map(category => (
              <div key={category} style={{ border: '1px solid #dceae6', borderRadius: '1rem', background: '#fcfdfd', padding: '1rem' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#008f7d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{category}</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {defaultChecklist.filter(item => item.category === category).map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={!!checklist[item.id]}
                        onChange={() => toggleChecklistItem(item.id)}
                        style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', accentColor: '#008f7d', cursor: 'pointer' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.74rem', color: checklist[item.id] ? '#7c8e9d' : '#1e293b', textDecoration: checklist[item.id] ? 'line-through' : 'none', display: 'block', transition: 'all 0.2s' }}>
                          {item.label}
                        </strong>
                        <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginTop: '0.1rem' }}>
                          {item.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visa Appointment Tracker */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>Visa Appointments</h2>
              <p>Schedule and track your biometrics, submission, and embassy interview dates.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            {/* Appointment Booking Form */}
            <form onSubmit={addAppointment} style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Embassy / VFS Center</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. VFS Global, Mumbai"
                  value={apptForm.embassy}
                  onChange={e => setApptForm({ ...apptForm, embassy: e.target.value })}
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Appointment Type</span>
                <select
                  value={apptForm.type}
                  onChange={e => setApptForm({ ...apptForm, type: e.target.value })}
                  style={{
                    minHeight: '2.5rem',
                    border: '1px solid #d4e4df',
                    borderRadius: '0.6rem',
                    padding: '0.6rem',
                    fontSize: '0.72rem',
                    outline: 0,
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230a2244\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
                    backgroundPosition: 'right 0.8rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '0.9rem'
                  }}
                >
                  <option>Biometrics</option>
                  <option>Document Verification</option>
                  <option>Embassy Interview</option>
                  <option>Passport Collection</option>
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Date</span>
                  <input
                    type="date"
                    required
                    value={apptForm.date}
                    onChange={e => setApptForm({ ...apptForm, date: e.target.value })}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Time</span>
                  <input
                    type="time"
                    required
                    value={apptForm.time}
                    onChange={e => setApptForm({ ...apptForm, time: e.target.value })}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  />
                </label>
              </div>

              <button className="study-primary" type="submit" style={{ marginTop: '0.5rem', height: '2.5rem' }}>
                <FilePlus2 /> Add Appointment
              </button>
            </form>

            {/* Scheduled Appointments List */}
            <div style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              {appointments.length > 0 ? (
                appointments.map(appt => (
                  <article key={appt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dceae6', borderRadius: '0.9rem', padding: '0.85rem 1rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.015)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div className="study-feature-icon" style={{ background: '#e8f7f2', color: '#008f7d' }}><Calendar /></div>
                      <div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#008f7d' }}>{appt.type}</span>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.1rem' }}>{appt.embassy}</h4>
                        <p style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <Clock style={{ width: '0.75rem', height: '0.75rem' }} /> {appt.date} at {appt.time}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '999px', background: '#ecfdf5', color: '#047857' }}>{appt.status}</span>
                      <button onClick={() => removeAppointment(appt.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Remove appointment">
                        <Trash2 style={{ width: '0.95rem', height: '0.95rem' }} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', height: '100%', minHeight: '12rem' }}>
                  <Calendar style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>No appointments tracked</h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Use the form on the left to schedule your visa submissions and interview dates.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* AI Visa Mock Interview Coach */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>AI Visa Interview Coach</h2>
              <p>Practice mock embassy interviews and receive feedback on your answers instantly.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            {/* Questions Selection & Answer Input */}
            <div style={{ display: 'grid', gap: '0.95rem' }}>
              <div style={{ display: 'grid', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#526474' }}>Select a Question to Practice</span>
                <div style={{ display: 'grid', gap: '0.45rem' }}>
                  {mockInterviewQuestions.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setActiveQuestion(q);
                        setMockAnswer(feedback[q]?.answer || "");
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '0.65rem',
                        border: activeQuestion === q ? '1px solid #008f7d' : '1px solid #dceae6',
                        background: activeQuestion === q ? '#f0faf7' : '#fff',
                        color: activeQuestion === q ? '#007f70' : '#334155',
                        fontSize: '0.72rem',
                        fontWeight: activeQuestion === q ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{q}</span>
                      {feedback[q] && <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem', color: '#008f7d', flexShrink: 0, marginLeft: '0.5rem' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {activeQuestion && (
                <div style={{ display: 'grid', gap: '0.55rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.95rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>Draft Your Answer</h4>
                  <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Provide a detailed response that covers your course details, financial stability, and post-study plans.</p>
                  <textarea
                    rows={4}
                    value={mockAnswer}
                    onChange={e => setMockAnswer(e.target.value)}
                    placeholder="Type your response here..."
                    style={{ width: '100%', border: '1px solid #d4e4df', borderRadius: '0.65rem', padding: '0.75rem', fontSize: '0.74rem', outline: 0, resize: 'vertical' }}
                  />
                  <button
                    type="button"
                    className="study-primary"
                    disabled={aiCoachLoading || !mockAnswer.trim()}
                    onClick={() => getAiFeedback(activeQuestion, mockAnswer)}
                    style={{ height: '2.5rem', justifyContent: 'center' }}
                  >
                    {aiCoachLoading ? (
                      <>Evaluating with AI...</>
                    ) : (
                      <>
                        <Sparkles /> Submit for AI Feedback
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* AI Coach Feedback Display */}
            <div>
              {activeQuestion ? (
                feedback[activeQuestion] ? (
                  <div style={{ border: '1px solid #dcdce6', borderRadius: '0.95rem', background: '#fcfcfd', padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                      <div className="study-feature-icon" style={{ background: '#fef3c7', color: '#d97706', width: '2.25rem', height: '2.25rem' }}><Sparkles /></div>
                      <div>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>Coach Feedback</h4>
                        <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Evaluated in real-time</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '0.85rem' }}>
                      <div>
                        <h5 style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Your Response</h5>
                        <p style={{ fontSize: '0.72rem', color: '#334155', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '0.5rem', padding: '0.65rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          "{feedback[activeQuestion].answer}"
                        </p>
                      </div>

                      <div>
                        <h5 style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>AI Evaluation & Guidance</h5>
                        <div style={{ fontSize: '0.72rem', color: '#1e293b', marginTop: '0.25rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                          {feedback[activeQuestion].review}
                        </div>
                        <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }} className="space-y-2">
                          <p style={{ fontSize: '0.68rem', color: '#64748b' }}>Want a live mock interview rehearsal? Schedule one-on-one with a visa advisor.</p>
                          <button
                            onClick={() => {
                              const visaMentor = mentors.find(m => m.skills.some((s: string) => s.toLowerCase().includes("visa")) || m.skills.some((s: string) => s.toLowerCase().includes("abroad")));
                              setBookingMentor(visaMentor || mentors[0] || null);
                              setBookingSuccess(null);
                            }}
                            className="bg-[#008f7d] hover:bg-[#007f70] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            Schedule Mock Interview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', height: '100%', minHeight: '16rem' }}>
                    <Sparkles style={{ width: '1.75rem', height: '1.75rem', color: '#d97706', marginBottom: '0.5rem' }} />
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>Awaiting Submission</h4>
                    <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Submit your drafted answer on the left to receive instant evaluation and coaching tips from our AI.</p>
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', height: '100%', minHeight: '16rem' }}>
                  <Sparkles style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>Select a question</h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Choose one of the mock interview questions on the left to start practicing.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </>}

      {params.feature === "counselling" && <>
        {/* Counselling Session Booking */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>Schedule a Guidance Session</h2>
              <p>Book 1-on-1 sessions with certified global career counsellors.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            {/* Booking Form */}
            <form onSubmit={addCounsellingSession} style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Select Counsellor</span>
                <select
                  value={sessionForm.counsellor}
                  onChange={e => setSessionForm({ ...sessionForm, counsellor: e.target.value })}
                  style={{
                    minHeight: '2.5rem',
                    border: '1px solid #d4e4df',
                    borderRadius: '0.6rem',
                    padding: '0.6rem',
                    fontSize: '0.72rem',
                    outline: 0,
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230a2244\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
                    backgroundPosition: 'right 0.8rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '0.9rem'
                  }}
                >
                  <option>Dr. Sarah Jenkins (US/UK)</option>
                  <option>Aarav Gupta (Canada/Ireland)</option>
                  <option>Emma Watson (Europe/Australia)</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Discussion Topic</span>
                <select
                  value={sessionForm.topic}
                  onChange={e => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  style={{
                    minHeight: '2.5rem',
                    border: '1px solid #d4e4df',
                    borderRadius: '0.6rem',
                    padding: '0.6rem',
                    fontSize: '0.72rem',
                    outline: 0,
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230a2244\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
                    backgroundPosition: 'right 0.8rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '0.9rem'
                  }}
                >
                  <option>University Selection</option>
                  <option>SOP & Resume Prep</option>
                  <option>Visa Process Guidance</option>
                  <option>Scholarships & Loans</option>
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Date</span>
                  <input
                    type="date"
                    required
                    value={sessionForm.date}
                    onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>Time</span>
                  <input
                    type="time"
                    required
                    value={sessionForm.time}
                    onChange={e => setSessionForm({ ...sessionForm, time: e.target.value })}
                    style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                  />
                </label>
              </div>

              <button className="study-primary" type="submit" style={{ marginTop: '0.5rem', height: '2.5rem' }}>
                <FilePlus2 /> Book Session
              </button>
            </form>

            {/* Scheduled Sessions List */}
            <div style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              {sessions.length > 0 ? (
                sessions.map(session => (
                  <article key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dceae6', borderRadius: '0.9rem', padding: '0.85rem 1rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.015)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div className="study-feature-icon" style={{ background: '#e8f7f2', color: '#008f7d' }}><Calendar /></div>
                      <div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#008f7d' }}>{session.topic}</span>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.1rem' }}>{session.counsellor}</h4>
                        <p style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <Clock style={{ width: '0.75rem', height: '0.75rem' }} /> {session.date} at {session.time}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <a href={session.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.64rem', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '999px', background: '#ecfdf5', color: '#047857' }}>Join Zoom</a>
                      <button onClick={() => removeCounsellingSession(session.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Cancel Booking">
                        <Trash2 style={{ width: '0.95rem', height: '0.95rem' }} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', height: '100%', minHeight: '12rem' }}>
                  <Calendar style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>No scheduled sessions</h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Schedule a consultation on the left to resolve your queries with our expert study abroad advisors.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* AI Career & Admission Counselor Coach */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>AI Admission & Career Guidance</h2>
              <p>Ask our AI Counselor for instant advice on international admissions, course selection, and career roadmaps.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            {/* Input area */}
            <div style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Tell us about your educational background, goals, and budget</span>
                <textarea
                  rows={6}
                  value={aiCounselQuery}
                  onChange={e => setAiCounselQuery(e.target.value)}
                  placeholder="e.g. I am a B.Tech CS student with 8.0 CGPA. My budget is 15-20 Lakhs. Which countries are best for a Master's in Data Science?"
                  style={{ width: '100%', border: '1px solid #d4e4df', borderRadius: '0.65rem', padding: '0.75rem', fontSize: '0.74rem', outline: 0, resize: 'vertical' }}
                />
              </label>

              <button
                type="button"
                className="study-primary"
                disabled={aiCounselLoading || !aiCounselQuery.trim()}
                onClick={getAiCounselAdvice}
                style={{ height: '2.5rem', justifyContent: 'center' }}
              >
                {aiCounselLoading ? (
                  <>Consulting AI Coach...</>
                ) : (
                  <>
                    <Sparkles /> Get AI Recommendations
                  </>
                )}
              </button>
            </div>

            {/* AI Advisor Response */}
            <div>
              {aiCounselAdvice ? (
                <div style={{ border: '1px solid #dcdce6', borderRadius: '0.95rem', background: '#fcfcfd', padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                    <div className="study-feature-icon" style={{ background: '#fef3c7', color: '#d97706', width: '2.25rem', height: '2.25rem' }}><Sparkles /></div>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>AI Career Advice</h4>
                      <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Simulated Advisor Recommendations</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                      {aiCounselAdvice}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', height: '100%', minHeight: '16rem' }}>
                  <Sparkles style={{ width: '1.75rem', height: '1.75rem', color: '#d97706', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>Awaiting Inquiry</h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Submit your query on the left to receive customized university shortlists and study abroad roadmaps.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </>}

      {params.feature === "profile" && <>
        {/* Academics & Test Scores */}
        <section className="study-panel">
          <form onSubmit={saveAcademics}>
            <div className="study-panel-heading">
              <div>
                <h2>Academic Profile & Test Scores</h2>
                <p>Maintain your GPA, previous qualifications, and standardized exam results.</p>
              </div>
              <button className="study-primary" type="submit">Save Academic Profile</button>
            </div>

            {academicsNotice && (
              <div className="study-application-notice" style={{ marginTop: '1rem', background: '#e8f7f2', color: '#008f7d', border: '1px solid #bddbd3' }}>
                <CheckCircle2 /> {academicsNotice}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Target/Current Degree</span>
                <input
                  type="text"
                  value={academicsForm.degree}
                  onChange={e => setAcademicsForm({ ...academicsForm, degree: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Institution Name</span>
                <input
                  type="text"
                  value={academicsForm.school}
                  onChange={e => setAcademicsForm({ ...academicsForm, school: e.target.value })}
                  placeholder="e.g. Delhi University"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>GPA / Percentage</span>
                <input
                  type="text"
                  value={academicsForm.gpa}
                  onChange={e => setAcademicsForm({ ...academicsForm, gpa: e.target.value })}
                  placeholder="e.g. 8.4 CGPA or 84%"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Graduation Year</span>
                <input
                  type="text"
                  value={academicsForm.gradYear}
                  onChange={e => setAcademicsForm({ ...academicsForm, gradYear: e.target.value })}
                  placeholder="e.g. 2026"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>IELTS / TOEFL Score</span>
                <input
                  type="text"
                  value={academicsForm.ielts}
                  onChange={e => setAcademicsForm({ ...academicsForm, ielts: e.target.value })}
                  placeholder="e.g. IELTS 7.5 or TOEFL 102"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>GRE / GMAT Score</span>
                <input
                  type="text"
                  value={academicsForm.gre}
                  onChange={e => setAcademicsForm({ ...academicsForm, gre: e.target.value })}
                  placeholder="e.g. GRE 318 or GMAT 680"
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>
            </div>
          </form>
        </section>

        {/* Work Experience & Internships */}
        <section className="study-panel">
          <div className="study-panel-heading">
            <div>
              <h2>Work Experience & Internships</h2>
              <p>Add relevant professional exposure or academic research positions.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            <form onSubmit={addProfileExperience} style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Job Title / Role</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Engineering Intern"
                  value={tempExp.title}
                  onChange={e => setTempExp({ ...tempExp, title: e.target.value })}
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Company / Organization</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. TechCorp Solutions"
                  value={tempExp.company}
                  onChange={e => setTempExp({ ...tempExp, company: e.target.value })}
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Duration</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 months (Summer 2025)"
                  value={tempExp.duration}
                  onChange={e => setTempExp({ ...tempExp, duration: e.target.value })}
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>

              <button className="study-primary" type="submit" style={{ marginTop: '0.5rem', height: '2.5rem' }}>
                <FilePlus2 /> Add Experience
              </button>
            </form>

            <div style={{ display: 'grid', gap: '0.85rem', alignContent: 'start' }}>
              {profileData.experience && profileData.experience.length > 0 ? (
                profileData.experience.map((exp: any) => (
                  <article key={exp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dceae6', borderRadius: '0.9rem', padding: '0.85rem 1rem', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div className="study-feature-icon" style={{ background: '#e8f7f2', color: '#008f7d' }}><ClipboardCheck /></div>
                      <div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#008f7d' }}>{exp.duration}</span>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.1rem' }}>{exp.title}</h4>
                        <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.1rem' }}>at {exp.company}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeProfileExperience(exp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 style={{ width: '0.95rem', height: '0.95rem' }} />
                    </button>
                  </article>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', height: '100%', minHeight: '11rem' }}>
                  <ClipboardCheck style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>No professional experience listed</h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Add internship or work details to make your admissions application stand out.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Skills & Achievements */}
        <section className="study-panel">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Skills Card */}
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Technical Skills & Proficiencies</h2>
              <form onSubmit={addProfileSkill} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="e.g. Python, Academic Writing"
                  value={tempSkill}
                  onChange={e => setTempSkill(e.target.value)}
                  style={{ flex: 1, minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
                <button type="submit" className="study-primary" style={{ padding: '0 1rem', height: '2.5rem' }}>Add</button>
              </form>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profileData.skills && profileData.skills.length > 0 ? (
                  profileData.skills.map((skill: string, idx: number) => (
                    <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', fontWeight: 700, padding: '0.35rem 0.65rem', borderRadius: '999px', background: '#e8f7f2', color: '#008f7d' }}>
                      {skill}
                      <button type="button" onClick={() => removeProfileSkill(idx)} style={{ background: 'none', border: 'none', color: '#008f7d', cursor: 'pointer', padding: 0, fontSize: '0.6rem', fontWeight: 800 }}>×</button>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>No skills listed yet.</span>
                )}
              </div>
            </div>

            {/* Achievements Card */}
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Achievements & Publications</h2>
              <form onSubmit={addProfileAchievement} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="e.g. Rank 1 in Hackathon, Research Paper"
                  value={tempAch}
                  onChange={e => setTempAch(e.target.value)}
                  style={{ flex: 1, minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
                <button type="submit" className="study-primary" style={{ padding: '0 1rem', height: '2.5rem' }}>Add</button>
              </form>

              <div style={{ display: 'grid', gap: '0.45rem' }}>
                {profileData.achievements && profileData.achievements.length > 0 ? (
                  profileData.achievements.map((ach: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid #e2ece8', background: '#fcfdfd', fontSize: '0.72rem', color: '#334155' }}>
                      <span>{ach}</span>
                      <button type="button" onClick={() => removeProfileAchievement(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>×</button>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>No achievements listed yet.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </>}

      {/* --- MENTORSHIP MARKETPLACE VIEW --- */}
      {featureSlug === "mentorship" && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Sub Navigation Discovery Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #dceae6', paddingTop: '1rem', paddingBottom: '0.75rem' }}>
            <button
              onClick={() => setMentorTab("all")}
              style={{ padding: '0.45rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', border: mentorTab === 'all' ? '1px solid #008f7d' : '1px solid #dceae6', background: mentorTab === 'all' ? '#008f7d' : '#fff', color: mentorTab === 'all' ? '#fff' : '#475569' }}
            >
              Verified Mentors
            </button>
            <button
              onClick={() => setMentorTab("recommended")}
              style={{ padding: '0.45rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', border: mentorTab === 'recommended' ? '1px solid #008f7d' : '1px solid #dceae6', background: mentorTab === 'recommended' ? '#008f7d' : '#fff', color: mentorTab === 'recommended' ? '#fff' : '#475569' }}
            >
              Recommended For You ✨
            </button>
            <button
              onClick={() => setMentorTab("top")}
              style={{ padding: '0.45rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', border: mentorTab === 'top' ? '1px solid #008f7d' : '1px solid #dceae6', background: mentorTab === 'top' ? '#008f7d' : '#fff', color: mentorTab === 'top' ? '#fff' : '#475569' }}
            >
              Top Rated ⭐
            </button>
            <button
              onClick={() => setMentorTab("saved")}
              style={{ padding: '0.45rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', border: mentorTab === 'saved' ? '1px solid #008f7d' : '1px solid #dceae6', background: mentorTab === 'saved' ? '#008f7d' : '#fff', color: mentorTab === 'saved' ? '#fff' : '#475569' }}
            >
              Saved Mentors ({savedMentors.length})
            </button>
          </div>

          {/* Filters Bar */}
          <section className="bg-white border border-[#d8e8e3] p-4 rounded-3xl grid md:grid-cols-4 gap-4 shadow-sm">
            <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
              <span>Search Keyword</span>
              <input
                type="text"
                placeholder="Name, course, university, language..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
              <span>Goal / Specialization</span>
              <select
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
              >
                <option value="">All Fields</option>
                {allSkills.map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
              <span>Destination Country</span>
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
              >
                <option value="">All Countries</option>
                {allCountries.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gridTemplateRows: 'auto 2.5rem', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
              <span>Max Session Price (₹{priceRange})</span>
              <input
                type="range"
                min="0"
                max="5000"
                step="250"
                value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))}
                style={{ width: '100%', alignSelf: 'center', margin: 0, cursor: 'pointer', accentColor: '#008f7d' }}
              />
            </label>
          </section>

          {/* Mentors Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {(mentors.length > 0 ? mentors : [
              {
                id: "a32554f2-727e-408c-9e38-bbd9fbc6b817",
                userId: "0f3b7efe-5163-4968-8e7a-952ceeada56c",
                user: { firstName: "Dr. Anjali", lastName: "Mehta" },
                position: "Lead AI Scientist",
                company: "Google",
                university: "Stanford University",
                country: "USA",
                yearsExperience: 8,
                rating: 4.9,
                sessionPrice: 1500,
                verified: true,
                skills: ["AI & Data Science", "Study Abroad", "Research", "Coding"],
                bio: "PhD in Computer Science from Stanford University. Former Researcher at Google AI.",
              },
              {
                id: "5fbdfc31-41f9-4ea9-ac7a-eea33b94184c",
                userId: "813f2fd9-b818-4c2f-badc-eab8b71f27c0",
                user: { firstName: "Vikram", lastName: "Sen" },
                position: "Director of Product Management",
                company: "Amazon",
                university: "University of Toronto",
                country: "Canada",
                yearsExperience: 12,
                rating: 5.0,
                sessionPrice: 2000,
                verified: true,
                skills: ["MBA", "Study Abroad", "Business", "Entrepreneurship"],
                bio: "MBA from University of Toronto. Former Senior Consultant at McKinsey.",
              },
              {
                id: "be65eb0c-d074-4fd4-bf5f-1fae4aaae3fc",
                userId: "6369327d-347b-4694-81db-29087039ea93",
                user: { firstName: "Rahul", lastName: "Verma" },
                position: "Senior Academic Director",
                company: "IIT Jee Academy",
                university: "IIT Madras",
                country: "India",
                yearsExperience: 6,
                rating: 4.8,
                sessionPrice: 500,
                verified: true,
                skills: ["Engineering", "Civil Services", "Physics", "Maths"],
                bio: "IIT Madras Alumnus. Mentored over 500+ JEE aspirants to top IITs.",
              },
            ])
              .filter(m => {
                if (mentorTab === "top" && (m.rating || 0) < 4.8) return false;
                if (mentorTab === "saved" && !savedMentors.includes(m.id)) return false;
                if (mentorTab === "recommended" && m.country !== "USA" && m.country !== "Canada") return false;
                return (m?.sessionPrice ?? 0) <= priceRange;
              })
              .map(mentor => {
                const isSaved = savedMentors.includes(mentor.id);
                return (
                  <article key={mentor.id} style={{ border: '1px solid #dceae6', borderRadius: '1.5rem', padding: '1.25rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                    {mentor.verified && (
                      <span style={{ position: 'absolute', right: '1rem', top: '1rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '999px', background: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5' }}>
                        <UserCheck style={{ width: '0.7rem', height: '0.7rem' }} /> Verified
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '0.85rem' }}>
                      <div style={{ width: '3rem', height: '3rem', borderRadius: '0.85rem', background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.15rem', flexShrink: 0 }}>
                        {mentor.user?.firstName?.[0] || 'M'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>{mentor.user?.firstName || 'Mentor'} {mentor.user?.lastName || ''}</h3>
                        <p style={{ fontSize: '0.68rem', color: '#008f7d', fontWeight: 700, marginTop: '0.1rem' }}>{mentor.position || 'Advisor'} {mentor.company ? `at ${mentor.company}` : ''}</p>
                        <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.1rem' }}>{mentor.university || ''} {mentor.country ? `· ${mentor.country}` : ''}</p>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.85rem', lineHeight: '1.5' }}>{mentor.bio || mentor.about || 'Ivy League & Top University Advisor'}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.85rem' }}>
                      {(Array.isArray(mentor.skills) ? mentor.skills : []).map((s: string) => (
                        <span key={s} style={{ fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '999px', background: '#f1f5f9', color: '#475569' }}>{s}</span>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Session Charge</span>
                        <strong style={{ fontSize: '0.78rem', color: '#1e293b' }}>₹{mentor.sessionPrice || 0} / session</strong>
                      </div>
                      
                      {/* 4 Action Buttons requested */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        <button
                          onClick={() => setSelectedMentor(mentor)}
                          style={{ border: '1px solid #dceae6', background: '#fff', color: '#334155', borderRadius: '0.6rem', padding: '0.45rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            setBookingMentor(mentor);
                            setBookingSuccess(null);
                          }}
                          style={{ background: '#008f7d', color: '#fff', border: 'none', borderRadius: '0.6rem', padding: '0.45rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Book Session
                        </button>
                        <button
                          onClick={() => {
                            setActiveChatRecipient(mentor.user);
                            router.push("/study-abroad/inbox");
                          }}
                          style={{ border: '1px solid #008f7d', background: '#eef8f5', color: '#007f70', borderRadius: '0.6rem', padding: '0.45rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Send Message
                        </button>
                        <button
                          onClick={() => toggleSaveMentor(mentor.id)}
                          style={{ border: '1px solid #dceae6', background: isSaved ? '#fef2f2' : '#fff', color: isSaved ? '#dc2626' : '#64748b', borderRadius: '0.6rem', padding: '0.45rem', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {isSaved ? "Saved ❤️" : "Save Mentor"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>

          {/* Profile Modal */}
          {selectedMentor && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)' }}>
              <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', width: '90%', maxWidth: '36rem', border: '1px solid #d9e8e3', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'grid', gap: '1.25rem', position: 'relative' }}>
                <button onClick={() => setSelectedMentor(null)} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '1rem', background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900 }}>{selectedMentor.user?.firstName[0]}</div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>{selectedMentor.user?.firstName} {selectedMentor.user?.lastName}</h3>
                    <p style={{ fontSize: '0.72rem', color: '#008f7d', fontWeight: 700 }}>{selectedMentor.position} at {selectedMentor.company}</p>
                    <p style={{ fontSize: '0.68rem', color: '#64748b' }}>{selectedMentor.university} · {selectedMentor.country}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Biography</h4>
                  <p style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.6' }}>{selectedMentor.about}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Education</h4>
                    {(selectedMentor.education as any[]).map((edu, idx) => (
                      <div key={idx} style={{ fontSize: '0.68rem', color: '#475569' }}><strong>{edu.degree}</strong> from {edu.institution} ({edu.year})</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Experience</h4>
                    {(selectedMentor.experience as any[]).map((exp, idx) => (
                      <div key={idx} style={{ fontSize: '0.68rem', color: '#475569' }}><strong>{exp.role}</strong> at {exp.company} ({exp.duration})</div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block' }}>Base pricing</span>
                    <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>₹{selectedMentor.sessionPrice} INR</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setActiveChatRecipient(selectedMentor.user);
                        setSelectedMentor(null);
                        router.push("/study-abroad/inbox");
                      }}
                      style={{ border: '1px solid #dceae6', background: '#fff', color: '#334155', borderRadius: '0.65rem', padding: '0.5rem 1rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Message
                    </button>
                    <button
                      onClick={() => {
                        setBookingMentor(selectedMentor);
                        setSelectedMentor(null);
                        setBookingSuccess(null);
                      }}
                      style={{ background: '#008f7d', color: '#fff', border: 'none', borderRadius: '0.65rem', padding: '0.5rem 1rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Book Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Calendar Dialog */}
          {bookingMentor && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)' }}>
              <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', width: '90%', maxWidth: '26rem', border: '1px solid #d9e8e3', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'grid', gap: '1rem', position: 'relative' }}>
                <button onClick={() => setBookingMentor(null)} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>Confirm Session Booking</h3>
                
                {!bookingSuccess ? (
                  <form onSubmit={handleBookSession} style={{ display: 'grid', gap: '0.85rem' }}>
                    <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                      <span>Proposed Date</span>
                      <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }} />
                    </label>
                    <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                      <span>Proposed Time</span>
                      <select required value={bookingTime} onChange={e => setBookingTime(e.target.value)} style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}>
                        <option value="">Select slot</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:30 AM">11:30 AM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="04:30 PM">04:30 PM</option>
                        <option value="06:00 PM">06:00 PM</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                      <span>Subject of Discussion</span>
                      <input type="text" required placeholder="e.g. Stanford CS SOP Review" value={bookingTopic} onChange={e => setBookingTopic(e.target.value)} style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }} />
                    </label>
                    <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                      <span>Add context details (questions/background)</span>
                      <textarea placeholder="List details you wish to discuss..." value={bookingQuestions} onChange={e => setBookingQuestions(e.target.value)} style={{ width: '100%', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0, resize: 'vertical' }} rows={3} />
                    </label>
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Fee: ₹{bookingMentor.sessionPrice}</span>
                      <button type="submit" className="study-primary" style={{ padding: '0.5rem 1.25rem', height: 'auto', fontSize: '0.72rem' }}>Confirm Book</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }} className="space-y-4">
                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✓</div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>Booking Successful!</h4>
                    <p style={{ fontSize: '0.68rem', color: '#64748b', maxWidth: '18rem', margin: '0.5rem auto' }}>Your video session has been scheduled. Meeting room details generated below.</p>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.68rem', textAlign: 'left' }} className="font-mono space-y-1">
                      <div><strong>Topic:</strong> {bookingSuccess.topic}</div>
                      <div><strong>Time:</strong> {bookingSuccess.date} at {bookingSuccess.time}</div>
                      <div><strong>Link:</strong> <a href={bookingSuccess.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#008f7d', textDecoration: 'underline' }}>{bookingSuccess.meetingLink}</a></div>
                    </div>
                    <button onClick={() => setBookingMentor(null)} className="study-primary" style={{ width: '100%', height: '2.5rem', marginTop: '1rem' }}>Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- CHAT INBOX VIEW --- */}
      {params.feature === "inbox" && (
        <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm flex flex-col" style={{ height: '480px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', height: '100%' }}>
            {/* List */}
            <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '1rem', overflowY: 'auto' }} className="space-y-1">
              <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', display: 'block', padding: '0.25rem 0.55rem' }}>Advisors</span>
              {mentors.map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveChatRecipient(m.user)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    border: 'none',
                    background: activeChatRecipient?.id === m.user.id ? '#e6f7f2' : 'none',
                    color: activeChatRecipient?.id === m.user.id ? '#007f70' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {m.user.firstName} {m.user.lastName}
                </button>
              ))}
            </div>

            {/* Conversation */}
            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '1.25rem' }}>
              {activeChatRecipient ? (
                <>
                  <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>
                    Chat with {activeChatRecipient.firstName} {activeChatRecipient.lastName}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }} className="space-y-3 pr-1">
                    {chatMessages.length > 0 ? (
                      chatMessages.map(msg => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '1rem',
                              borderTopRightRadius: isMe ? 0 : '1rem',
                              borderTopLeftRadius: isMe ? '1rem' : 0,
                              background: isMe ? '#008f7d' : '#f1f5f9',
                              color: isMe ? '#fff' : '#1e293b',
                              fontSize: '0.72rem',
                              maxWidth: '75%',
                              lineHeight: '1.5'
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.68rem', color: '#94a3b8' }}>No message logs. Send a query to start.</div>
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessageText}
                      onChange={e => setNewMessageText(e.target.value)}
                      style={{ flex: 1, minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                    />
                    <button type="submit" className="study-primary" style={{ padding: '0 1rem', height: '2.5rem' }}>
                      <Send style={{ width: '0.9rem', height: '0.9rem' }} />
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.72rem', color: '#94a3b8' }}>
                  Select an advisor from the left list to open the messaging portal.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* --- PASSION PROJECTS VIEW --- */}
      {params.feature === "projects" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
          {/* Create form */}
          <section className="study-panel" style={{ height: 'fit-content' }}>
            <div className="study-panel-heading">
              <div>
                <h2>Create Passion Project</h2>
                <p>Register your extracurricular roadmap or research initiative.</p>
              </div>
            </div>
            <form onSubmit={handleCreateProject} style={{ display: 'grid', gap: '0.85rem', marginTop: '1.25rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Project Name / Title</span>
                <input type="text" required placeholder="e.g. Build an NGO support portal" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }} />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Brief Description</span>
                <textarea required placeholder="Describe milestones, purpose, and technologies..." value={projectDesc} onChange={e => setProjectDesc(e.target.value)} style={{ width: '100%', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0, resize: 'vertical' }} rows={3} />
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', color: '#526474', fontSize: '0.68rem', fontWeight: 800 }}>
                <span>Project Type</span>
                <select value={projectType} onChange={e => setProjectType(e.target.value)} style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}>
                  <option value="App">Mobile / Web App</option>
                  <option value="Research">Research Initiative</option>
                  <option value="NGO">NGO/Extracurricular</option>
                  <option value="Startup">Business Venture</option>
                </select>
              </label>
              <button type="submit" className="study-primary" style={{ marginTop: '0.5rem', height: '2.5rem' }}>
                Create Initiative
              </button>
            </form>
          </section>

          {/* Initiatives checklist tracker */}
          <div style={{ display: 'grid', gap: '1rem', alignContent: 'start', marginTop: '1.5rem' }}>
            {projectsList.length > 0 ? (
              projectsList.map(proj => (
                <section key={proj.id} className="bg-white border border-[#dceae6] p-5 rounded-3xl shadow-sm space-y-3">
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>{proj.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8' }}>
                        {proj.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                        title="Delete project"
                      >
                        <Trash2 style={{ width: '0.85rem', height: '0.85rem' }} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#64748b' }}>{proj.description}</p>
                  
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', marginTop: '0.85rem' }} className="space-y-2">
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Milestone Checklist</span>
                    {(proj.milestones as any[]).map((ms, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem', color: ms.completed ? '#94a3b8' : '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={ms.completed}
                          onChange={() => handleToggleMilestone(proj, idx)}
                          style={{ width: '0.85rem', height: '0.85rem', accentColor: '#008f7d' }}
                        />
                        <span style={{ textDecoration: ms.completed ? 'line-through' : 'none' }}>{ms.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1.5rem', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <Target style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>No Extracurricular Project active</h4>
                <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Create a passion project to demonstrate leadership qualities in your Ivy League application portfolio.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUPER ADMIN VERIFICATION VIEW --- */}
      {params.feature === "admin" && (
        <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
          <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2>Onboarding Verification Panel</h2>
              <p>Review advisor submissions and toggle verification checkmarks.</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>Candidate</th>
                  <th style={{ padding: '0.75rem' }}>Designation & University</th>
                  <th style={{ padding: '0.75rem' }}>Charge</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody style={{ color: '#334155' }}>
                {adminMentors.map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800 }}>
                      {m.user?.firstName} {m.user?.lastName}
                      <span style={{ display: 'block', fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'normal' }}>{m.user?.email}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{m.position} at {m.company}</strong>
                      <span style={{ display: 'block', fontSize: '0.64rem', color: '#64748b' }}>{m.university} · {m.country}</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 800 }}>₹{m.sessionPrice}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {m.verified ? (
                        <button onClick={() => handleAdminVerify(m.id, false)} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer' }}>Verified ✓</button>
                      ) : (
                        <button onClick={() => handleAdminVerify(m.id, true)} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer' }}>Verify Profile</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- CAREER EXPLORER VIEW --- */}
      {params.feature === "careers" && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Career Paths & Guidance</h2>
                <p>Explore structured professional roadmaps, resources, and connect with specialist mentors in each industry.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '2.5rem' }}>
              {careersList.length > 0 ? careersList.map((cp: any) => {
                // Find matching mentors based on career title matching mentor skills/bio/position
                const matchingMentors = mentors.filter((m: any) =>
                  cp.title.toLowerCase().split(" ").some((word: string) =>
                    word.length > 3 && (
                      m.position.toLowerCase().includes(word) ||
                      m.bio.toLowerCase().includes(word) ||
                      (m.skills as string[]).some(s => s.toLowerCase().includes(word))
                    )
                  )
                );

                return (
                  <article key={cp.id} style={{ border: '1px solid #dceae6', borderRadius: '1.5rem', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>{cp.title}</h3>
                      <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.35rem', lineHeight: '1.5' }}>{cp.overview || cp.description}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                      {/* Timeline roadmap */}
                      <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Structured Roadmap</h4>
                        <div style={{ display: 'grid', gap: '1.25rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1.25rem', marginLeft: '0.5rem', position: 'relative' }}>
                          {(cp.roadmap as any[]).map((step: any, idx: number) => (
                            <div key={idx} style={{ position: 'relative' }}>
                              <span style={{
                                position: 'absolute',
                                left: '-1.75rem',
                                top: '0.15rem',
                                width: '1rem',
                                height: '1rem',
                                borderRadius: '999px',
                                background: '#008f7d',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.55rem',
                                fontWeight: 900,
                              }}>
                                {idx + 1}
                              </span>
                              <h5 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>{step.title || step.step || step}</h5>
                              <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>{step.description || "Acquire foundational skills and certifications."}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Resources */}
                      <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Resources</h4>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {(cp.resources as any[]).map((res: any, idx: number) => {
                            const resourceUrl = res.link || res.url;
                            return (
                              <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.75rem' }}>
                                <h5 style={{ fontSize: '0.72rem', fontWeight: 900, color: '#1e293b' }}>{res.title || res}</h5>
                                <p style={{ fontSize: '0.64rem', color: '#64748b', marginTop: '0.15rem' }}>Type: {res.type || "Book/Link"}</p>
                                {resourceUrl && (
                                  <a href={resourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.64rem', color: '#008f7d', fontWeight: 800, textDecoration: 'none', marginTop: '0.35rem', display: 'inline-block' }}>Access Resource ↗</a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Matched Mentors */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', marginBottom: '0.85rem', textTransform: 'uppercase' }}>Industry Mentors for {cp.title}</h4>
                      {matchingMentors.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                          {matchingMentors.slice(0, 3).map((m: any) => (
                            <div key={m.id} style={{ border: '1px solid #e2ece8', borderRadius: '1rem', padding: '1rem', background: '#fcfdfd', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.6rem', background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>
                                {m.user?.firstName[0]}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.user?.firstName} {m.user?.lastName}</h5>
                                <p style={{ fontSize: '0.64rem', color: '#008f7d', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.position} at {m.company}</p>
                                <button onClick={() => {
                                  setSelectedMentor(m);
                                  setBookingMentor(m);
                                  setBookingTopic(`Career Discussion: ${cp.title}`);
                                  // Navigate to mentorship
                                  window.location.href = "/study-abroad/mentorship";
                                }} style={{ background: 'none', border: 'none', color: '#008f7d', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer', padding: 0, marginTop: '0.35rem' }}>Book Session →</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.68rem', color: '#64748b' }}>No direct specialists assigned. Connect with any global admissions mentor for broad guidance.</p>
                      )}
                    </div>
                  </article>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No career roadmaps found in database.</div>
              )}
            </div>
          </section>

          {selectedMentor && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Mentor profile"
              onClick={() => setSelectedMentor(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                style={{ position: 'relative', width: '100%', maxWidth: '34rem', borderRadius: '1.5rem', border: '1px solid #d9e8e3', background: '#fff', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
              >
                <button
                  type="button"
                  aria-label="Close mentor profile"
                  onClick={() => setSelectedMentor(null)}
                  style={{ position: 'absolute', right: '1rem', top: '0.75rem', border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '1.5rem' }}
                >
                  ×
                </button>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingRight: '2rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', flexShrink: 0, borderRadius: '1rem', background: '#073a3d', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.25rem', fontWeight: 900 }}>
                    {selectedMentor.user?.firstName?.[0] || 'M'}
                  </div>
                  <div>
                    <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 900 }}>
                      {selectedMentor.user?.firstName || 'Mentor'} {selectedMentor.user?.lastName || ''}
                    </h3>
                    <p style={{ color: '#008f7d', fontSize: '0.72rem', fontWeight: 700 }}>
                      {selectedMentor.position || 'Advisor'}{selectedMentor.company ? ` at ${selectedMentor.company}` : ''}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.68rem' }}>
                      {selectedMentor.university || ''}{selectedMentor.country ? ` · ${selectedMentor.country}` : ''}
                    </p>
                  </div>
                </div>
                <p style={{ marginTop: '1.25rem', color: '#475569', fontSize: '0.75rem', lineHeight: 1.65 }}>
                  {selectedMentor.about || selectedMentor.bio || 'Experienced mentor supporting students through university admissions and career planning.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <span style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 800 }}>
                    Rating: {selectedMentor.rating || 'New mentor'}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push('/study-abroad/reviews')}
                    style={{ border: 0, borderRadius: '0.65rem', background: '#008f7d', color: '#fff', cursor: 'pointer', padding: '0.55rem 1rem', fontSize: '0.72rem', fontWeight: 800 }}
                  >
                    View Reviews
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ALUMNI NETWORK VIEW --- */}
      {params.feature === "alumni" && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Global Alumni & Expert Network</h2>
                <p>Connect directly with Pehchaan alumni now studying at top global universities or working at Fortune 500 companies.</p>
              </div>
            </div>

            {/* Alumni Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>
                <span>Search by University</span>
                <input
                  type="text"
                  placeholder="e.g. Stanford, Toronto, MIT"
                  value={scholarshipDestination}
                  onChange={e => setScholarshipDestination(e.target.value)}
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>
                <span>Search by Current Employer</span>
                <input
                  type="text"
                  placeholder="e.g. Google, Amazon, McKinsey"
                  value={scholarshipQuery}
                  onChange={e => setScholarshipQuery(e.target.value)}
                  style={{ minHeight: '2.5rem', border: '1px solid #d4e4df', borderRadius: '0.6rem', padding: '0.6rem', fontSize: '0.72rem', outline: 0 }}
                />
              </label>
            </div>

            {/* Alumni Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {mentors
                .filter((m: any) => {
                  const matchesUni = !scholarshipDestination || m.university.toLowerCase().includes(scholarshipDestination.toLowerCase());
                  const matchesComp = !scholarshipQuery || m.company.toLowerCase().includes(scholarshipQuery.toLowerCase());
                  return matchesUni && matchesComp;
                })
                .map((mentor: any) => (
                  <article key={mentor.id} style={{ border: '1px solid #dceae6', borderRadius: '1.5rem', padding: '1.25rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                    {mentor.verified && (
                      <span style={{ position: 'absolute', right: '1rem', top: '1rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '999px', background: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5' }}>
                        Verified
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '0.85rem' }}>
                      <div style={{ width: '3rem', height: '3rem', borderRadius: '0.85rem', background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.15rem', flexShrink: 0 }}>
                        {mentor.user?.firstName[0]}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>{mentor.user?.firstName} {mentor.user?.lastName}</h3>
                        <p style={{ fontSize: '0.68rem', color: '#008f7d', fontWeight: 700, marginTop: '0.1rem' }}>{mentor.position} at {mentor.company}</p>
                        <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.1rem' }}>{mentor.university} · {mentor.country}</p>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.85rem', lineHeight: '1.5' }}>{mentor.bio}</p>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                      <button onClick={() => {
                        setActiveChatRecipient(mentor.user);
                        // Open chat window
                        window.location.href = "/study-abroad/inbox";
                      }} className="study-secondary" style={{ flex: 1, minHeight: '2.25rem', fontSize: '0.68rem' }}>Message</button>
                      <button onClick={() => {
                        setSelectedMentor(mentor);
                        setBookingMentor(mentor);
                        setBookingTopic("Alumni Mentorship");
                        window.location.href = "/study-abroad/mentorship";
                      }} className="study-primary" style={{ flex: 1, minHeight: '2.25rem', fontSize: '0.68rem' }}>Book Slot</button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        </div>
      )}

      {/* --- SESSION BOOKINGS CALENDAR & HISTORY --- */}
      {params.feature === "bookings" && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Your Mentoring Calendar & Bookings</h2>
                <p>View your scheduled virtual sessions, history archives, and access live video call meeting rooms.</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem' }}>Mentor / Advisor</th>
                    <th style={{ padding: '0.75rem' }}>Topic & Description</th>
                    <th style={{ padding: '0.75rem' }}>Scheduled Time</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#334155' }}>
                  {studentBookingsList.length > 0 ? studentBookingsList.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800 }}>
                        {s.mentor?.user?.firstName} {s.mentor?.user?.lastName}
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#008f7d', fontWeight: 700 }}>{s.mentor?.position} at {s.mentor?.company}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong>{s.topic}</strong>
                        <span style={{ display: 'block', fontSize: '0.64rem', color: '#64748b' }}>{s.questions || "No details provided"}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800 }}>{s.date} at {s.time}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '0.6rem',
                          background: s.status === 'CONFIRMED' ? '#ecfdf5' : s.status === 'REJECTED' ? '#fef2f2' : '#fff7ed',
                          color: s.status === 'CONFIRMED' ? '#047857' : s.status === 'REJECTED' ? '#b91c1c' : '#c2410c',
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {s.status === 'CONFIRMED' && (
                            <a href={s.meetingUrl || `https://meet.jit.si/${s.id}`} target="_blank" rel="noreferrer" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', textDecoration: 'none', display: 'inline-block' }}>Join Room</a>
                          )}
                          <button onClick={() => {
                            setSelectedMentor(s.mentor);
                          }} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer' }}>Reviews / Profile</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No mentoring bookings scheduled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {selectedMentor && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Mentor reviews and profile"
              onClick={() => setSelectedMentor(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(3px)' }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                style={{ position: 'relative', width: '100%', maxWidth: '34rem', borderRadius: '1.5rem', border: '1px solid #d9e8e3', background: '#fff', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}
              >
                <button type="button" aria-label="Close profile" onClick={() => setSelectedMentor(null)} style={{ position: 'absolute', right: '1rem', top: '.75rem', border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '2rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', flexShrink: 0, borderRadius: '1rem', background: '#073a3d', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.25rem', fontWeight: 900 }}>
                    {selectedMentor.user?.firstName?.[0] || 'M'}
                  </div>
                  <div>
                    <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 900 }}>{selectedMentor.user?.firstName || 'Mentor'} {selectedMentor.user?.lastName || ''}</h3>
                    <p style={{ color: '#008f7d', fontSize: '.72rem', fontWeight: 700 }}>{selectedMentor.position || 'Advisor'}{selectedMentor.company ? ` at ${selectedMentor.company}` : ''}</p>
                    <p style={{ color: '#64748b', fontSize: '.68rem' }}>{selectedMentor.university || ''}{selectedMentor.country ? ` · ${selectedMentor.country}` : ''}</p>
                  </div>
                </div>
                <p style={{ marginTop: '1.25rem', color: '#475569', fontSize: '.75rem', lineHeight: 1.65 }}>{selectedMentor.about || selectedMentor.bio || 'Experienced mentor supporting students through university admissions and career planning.'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <span style={{ color: '#475569', fontSize: '.72rem', fontWeight: 800 }}>Rating: {selectedMentor.rating || 'New mentor'}</span>
                  <button type="button" onClick={() => router.push('/study-abroad/reviews')} style={{ border: 0, borderRadius: '.65rem', background: '#008f7d', color: '#fff', cursor: 'pointer', padding: '.55rem 1rem', fontSize: '.72rem', fontWeight: 800 }}>View Reviews</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- STUDENT DOCUMENT REVIEWS VIEW --- */}
      {params.feature === "reviews" && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Document SOP & Resume Reviews</h2>
                <p>Track your submitted document drafts, advisor feedback scores, and read customized suggestions.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {resumesList.length > 0 ? resumesList.map((r: any) => (
                <div key={r.id} style={{ border: '1px solid #e2ece8', borderRadius: '1.25rem', padding: '1.25rem', background: '#fcfdfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>Draft for SOP / Resume Builder</h4>
                      <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Submitted to Mentor: <strong>{r.mentor?.user?.firstName} {r.mentor?.user?.lastName}</strong></span>
                    </div>
                    <a href={r.documentUrl} target="_blank" rel="noreferrer" className="study-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.68rem' }}>Open Draft Link</a>
                  </div>

                  {r.atsScore ? (
                    <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', padding: '1rem', borderRadius: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#047857' }}>ATS Score:</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#047857' }}>{r.atsScore} / 100</span>
                      </div>
                      <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.72rem', color: '#334155' }}>
                        <p><strong>Comments:</strong> {r.comments}</p>
                        <p><strong>Suggestions:</strong> {r.suggestions}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '1rem', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c2410c', fontSize: '0.72rem' }}>
                      <span>Review Pending. Your assigned mentor has been notified.</span>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dceae6', borderRadius: '1.5rem', padding: '3rem 1.5rem', textAlign: 'center' }}>
                  <FileText style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>No SOP/Resume reviews requested yet</h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '16rem' }}>Go to SOP Builder or Resume Builder, write your document draft, and submit for expert advisor reviews.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* --- STARTUP & ENTREPRENEURSHIP HUB VIEW --- */}
      {params.feature === "startup" && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Entrepreneurship & Startup Hub</h2>
                <p>Prepare your business plans, slide pitches, and request MVP evaluations from top tier business mentors.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
              {/* Guidelines */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.85rem' }}>Startup Roadmap Guidelines</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>Phase 1: Idea Validation & MVP</h4>
                    <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.25rem', lineHeight: '1.4' }}>Formulate the core problem statement. Build a minimal feature prototype (MVP) to gather early validation metrics from users.</p>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>Phase 2: Business Modelling</h4>
                    <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.25rem', lineHeight: '1.4' }}>Outline cost structures, key partners, value propositions, and revenue streams. Design the startup business canvas model.</p>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>Phase 3: Investor Pitch Deck</h4>
                    <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.25rem', lineHeight: '1.4' }}>Compile a compelling slide deck summarizing team background, market size (TAM/SAM/SOM), financials, and current traction metrics.</p>
                  </div>
                </div>
              </div>

              {/* Startup Advisors */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.85rem' }}>Startup Mentors</h3>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {mentors
                    .filter((m: any) =>
                      m.skills.some((s: string) =>
                        /business|entrepreneur|startup|mba/i.test(s)
                      )
                    )
                    .map((mentor: any) => (
                      <div key={mentor.id} style={{ border: '1px solid #e2ece8', borderRadius: '1rem', padding: '1rem', background: '#fcfdfd', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.6rem', background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>
                          {mentor.user?.firstName[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{mentor.user?.firstName} {mentor.user?.lastName}</h4>
                          <p style={{ fontSize: '0.64rem', color: '#008f7d', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{mentor.position} at {mentor.company}</p>
                          <button onClick={() => {
                            setSelectedMentor(mentor);
                            setBookingMentor(mentor);
                            setBookingTopic("Startup Mentorship & Pitch Review");
                            window.location.href = "/study-abroad/mentorship";
                          }} style={{ background: 'none', border: 'none', color: '#008f7d', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer', padding: 0, marginTop: '0.35rem' }}>Book Session →</button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* --- MENTOR / ADVISOR DASHBOARD VIEW --- */}
      {params.feature === "advisor" && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Sessions Card */}
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Advising Bookings</h2>
                <p>Approve upcoming 1-on-1 virtual mentoring slots and access Jitsi meeting links.</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem' }}>Learner</th>
                    <th style={{ padding: '0.75rem' }}>Topic & Description</th>
                    <th style={{ padding: '0.75rem' }}>Scheduled Time</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#334155' }}>
                  {advisorSessions.length > 0 ? advisorSessions.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800 }}>
                        {s.student?.firstName} {s.student?.lastName}
                        <span style={{ display: 'block', fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'normal' }}>{s.student?.email}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong>{s.topic}</strong>
                        <span style={{ display: 'block', fontSize: '0.64rem', color: '#64748b' }}>{s.questions || "No details provided"}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800 }}>{s.date} at {s.time}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '0.6rem',
                          background: s.status === 'CONFIRMED' ? '#ecfdf5' : s.status === 'REJECTED' ? '#fef2f2' : '#fff7ed',
                          color: s.status === 'CONFIRMED' ? '#047857' : s.status === 'REJECTED' ? '#b91c1c' : '#c2410c',
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {s.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleConfirmSession(s.id, 'CONFIRMED')} style={{ background: '#008f7d', color: '#fff', border: 0, padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer' }}>Approve</button>
                            <button onClick={() => handleConfirmSession(s.id, 'REJECTED')} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', cursor: 'pointer' }}>Decline</button>
                          </div>
                        )}
                        {s.status === 'CONFIRMED' && (
                          <a href={s.meetingUrl || `https://meet.jit.si/${s.id}`} target="_blank" rel="noreferrer" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #d1fae5', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.64rem', textDecoration: 'none', display: 'inline-block' }}>Join Room</a>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No mentoring bookings scheduled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Resumes Reviews Card */}
          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="study-panel-heading" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h2>Document SOP / Resume Assessments</h2>
                <p>Review draft links and submit ATS grading scores with improvements feedback.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {advisorResumes.length > 0 ? advisorResumes.map((r: any) => (
                <div key={r.id} style={{ border: '1px solid #e2ece8', borderRadius: '1.25rem', padding: '1.25rem', background: '#fcfdfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>{r.student?.firstName} {r.student?.lastName}</h4>
                      <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Submitted on {new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <a href={r.documentUrl} target="_blank" rel="noreferrer" className="study-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Open Draft Link</a>
                  </div>

                  {r.atsScore ? (
                    <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.85rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569' }}>ATS Score:</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#008f7d' }}>{r.atsScore} / 100</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#334155', margin: '0.2rem 0' }}><strong>Comments:</strong> {r.comments}</p>
                      <p style={{ fontSize: '0.72rem', color: '#334155' }}><strong>Suggestions:</strong> {r.suggestions}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#fff', border: '1px solid #dceae6', padding: '1rem', borderRadius: '0.85rem' }}>
                      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>
                        <span>ATS Score (0 - 100)</span>
                        <input
                          type="number"
                          placeholder="e.g. 85"
                          value={reviewScore[r.id] || ""}
                          onChange={e => setReviewScore(curr => ({ ...curr, [r.id]: Number(e.target.value) }))}
                          style={{ minHeight: '2.25rem', border: '1px solid #d4e4df', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.72rem' }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>
                        <span>Comments / Reviews</span>
                        <textarea
                          placeholder="Provide overall thoughts on structure..."
                          value={reviewFeedback[r.id] || ""}
                          onChange={e => setReviewFeedback(curr => ({ ...curr, [r.id]: e.target.value }))}
                          style={{ minHeight: '3rem', border: '1px solid #d4e4df', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.72rem' }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 800, color: '#475569', gridColumn: 'span 2' }}>
                        <span>Specific Suggestions & Tips</span>
                        <textarea
                          placeholder="Write action items for improvements..."
                          value={reviewSuggestions[r.id] || ""}
                          onChange={e => setReviewSuggestions(curr => ({ ...curr, [r.id]: e.target.value }))}
                          style={{ minHeight: '3rem', border: '1px solid #d4e4df', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.72rem' }}
                        />
                      </label>
                      <button onClick={() => submitReviewFeedback(r.id)} className="study-primary" style={{ gridColumn: 'span 2', minHeight: '2.5rem', marginTop: '0.5rem' }}>Submit Assessment Feedback</button>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No pending document assessments.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {!["universities", "saved", "compare", "applications", "timeline", "documents", "scholarships", "support", "sop-builder", "lor-builder", "resume-builder", "loans", "visa", "counselling", "profile", "mentorship", "inbox", "projects", "admin", "advisor", "careers", "alumni", "bookings", "reviews", "startup"].includes(featureSlug) &&
        <EmptyState title={`No ${feature?.label?.toLowerCase() || "feature"} yet`} copy={`The workspace is ready. Records and actions will appear when the corresponding service is connected.`} />}

      <a className="study-feedback" href="mailto:hello@pehchaan.io?subject=Study Abroad support">Need help with this step? Contact Pehchaan <ArrowRight /></a>
    </div>
  );
}
