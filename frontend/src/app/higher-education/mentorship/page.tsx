"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Award, BookOpen, Bookmark, Calendar, CheckCircle2, ChevronRight, 
  Clipboard, Clock, Compass, DollarSign, Download, ExternalLink, FileCheck, 
  FileText, Globe, GraduationCap, Heart, HelpCircle, Inbox, Info, Languages, 
  Loader2, Mail, MapPin, MessageSquare, Phone, Plus, Send, ShieldAlert, 
  Sparkles, Star, Target, Trash2, Trophy, Upload, User, UserCheck, Video, X 
} from "lucide-react";
import Link from "next/link";

const API = "http://localhost:5001";

// Mock/Initial Data
const GOALS = [
  { id: "Study Abroad", label: "Study Abroad", description: "Global admissions guidance (US, UK, Canada, Europe)" },
  { id: "Engineering", label: "Engineering", description: "B.Tech/BE admissions, JEE prep, CS/IT roadmaps" },
  { id: "Medical", label: "Medical", description: "MBBS admissions, NEET prep, clinical careers" },
  { id: "MBA", label: "MBA & Business", description: "CAT, GMAT, executive MBA programs" },
  { id: "Law", label: "Law", description: "CLAT prep, corporate law, public advocacy" },
  { id: "Civil Services", label: "Civil Services", description: "UPSC prep, public administration, state exams" },
  { id: "Research", label: "Research & Academia", description: "PhD guides, fellowship applications, publications" },
  { id: "AI & Data Science", label: "AI & Data Science", description: "Machine learning roadmap, analytics careers" },
];

const SUCCESS_STORIES = [
  { id: 1, name: "Rohit Sharma", university: "Stanford University", course: "MS in Computer Science", country: "USA", achievement: "Received $40,000 scholarship", mentor: "Dr. Anjali Mehta", text: "Dr. Mehta guided me on my SOP and research proposals. Her review was the single most crucial factor in my acceptance." },
  { id: 2, name: "Sneha Reddy", university: "University of Toronto", course: "MBA", country: "Canada", achievement: "100% scholarship winner", mentor: "Vikram Sen", text: "Vikram helped me structure my essay and prepare for mock interviews. Absolutely life-changing mentorship." },
  { id: 3, name: "Aman Gupta", university: "IIT Bombay", course: "B.Tech in Aerospace", country: "India", achievement: "JEE Rank 142", mentor: "Rahul Verma", text: "Rahul's roadmap kept me focused and motivated during my preparation. Highly recommend Pehchaan's program." }
];

const WEBINARS = [
  { id: "webinar-1", title: "Sailing Through Ivy League SOPs", host: "Dr. Anjali Mehta (Stanford Alumni)", type: "Study Abroad", time: "July 24, 2026 - 6:00 PM IST", link: "https://meet.google.com/abc-defg-hij", registered: false },
  { id: "webinar-2", title: "AI & Data Science Careers in 2026", host: "Siddharth Rao (Lead AI Researcher)", type: "Career Session", time: "August 02, 2026 - 5:00 PM IST", link: "https://meet.google.com/xyz-pdqr-wuv", registered: false },
  { id: "webinar-3", title: "Crack UPSC on Your First Attempt", host: "Surbhi Mishra (IAS Officer)", type: "Q&A Session", time: "August 15, 2026 - 11:00 AM IST", link: "https://meet.google.com/qrs-tuvw-xyz", registered: false }
];

const CAREERS = [
  { id: "se", title: "Software Engineer", salary: "₹8L - ₹45L / year", overview: "Design, build, and maintain software applications and systems.", skills: ["JavaScript", "Python", "System Design", "Data Structures"], scope: "Exponential growth with AI developments.", roadmap: ["Learn Programming", "Build Personal Projects", "Participate in Open Source", "Crack Interviews"], colleges: ["IITs", "NITs", "BITS Pilani"], exams: ["JEE Mains", "JEE Advanced", "BITSAT"], scholarships: ["Pehchaan Merit Scholarship"] },
  { id: "ds", title: "Data Scientist", salary: "₹10L - ₹50L / year", overview: "Analyze complex data sets to discover actionable patterns and insights.", skills: ["Statistics", "SQL", "Machine Learning", "Python/R"], scope: "High demand across finance, tech, and retail.", roadmap: ["Learn Math & Stats", "Master SQL & Python", "Understand Machine Learning", "Participate in Kaggle"], colleges: ["ISI Kolkata", "IIT Delhi", "IISc Bangalore"], exams: ["JAM", "JEE"], scholarships: ["CSIR Fellowship"] },
  { id: "md", title: "Medical Practitioner", salary: "₹12L - ₹60L / year", overview: "Diagnose, treat, and prevent illnesses in patients.", skills: ["Anatomy", "Diagnostics", "Patient Care", "Medical Ethics"], scope: "Recession-proof career with high societal value.", roadmap: ["Clear NEET", "Complete MBBS", "Do Internship", "Specialization (MD/MS)"], colleges: ["AIIMS New Delhi", "CMC Vellore", "JIPMER Puducherry"], exams: ["NEET UG", "NEET PG"], scholarships: ["DHR Fellowship"] },
];

const SCHOLARSHIPS = [
  { id: "sch-1", name: "Inlaks Shivdasani Foundation Scholarship", amount: "Up to $100,000 USD", country: "UK, USA, Europe", eligibility: "Indian citizens under 30 holding a first-class degree.", course: "Masters/PhD", category: "General", deadline: "2026-09-15", checklist: ["Graduation Degree", "Acceptance Letter", "2 LORs", "SOP"] },
  { id: "sch-2", name: "Erasmus Mundus Joint Masters", amount: "Fully Funded + Monthly Allowance", country: "Europe", eligibility: "Graduates worldwide with excellent academic records.", course: "Masters", category: "General", deadline: "2026-12-01", checklist: ["Academic Transcripts", "IELTS/TOEFL", "SOP", "Resume"] },
  { id: "sch-3", name: "Tata Scholarship for Cornell University", amount: "Full Tuition Coverage", country: "USA", eligibility: "Indian citizens admitted to Cornell undergraduate programs.", course: "Undergraduate", category: "Need-based", deadline: "2026-11-01", checklist: ["Cornell Admission Letter", "Family Income Proof", "Pehchaan Student ID"] },
];

const INITIAL_MENTORS = [
  {
    id: "mentor-1",
    user: { firstName: "Dr. Anjali", lastName: "Mehta" },
    bio: "PhD in Computer Science from Stanford University. Former Researcher at Google AI.",
    position: "Lead AI Scientist",
    company: "Google",
    university: "Stanford University",
    country: "USA",
    yearsExperience: 8,
    languages: ["English", "Hindi"],
    rating: 4.9,
    skills: ["AI & Data Science", "Study Abroad", "Research", "Coding"],
    sessionPrice: 1500,
    about: "I specialize in guiding students towards Ivy League admissions, setting up passion research projects, and preparing for research roles in top tier tech organizations.",
    education: [{ degree: "PhD in Computer Science", institution: "Stanford", year: "2018" }],
    experience: [{ role: "Lead AI Scientist", company: "Google", duration: "2020 - Present" }],
    achievements: ["Stanford Graduate Fellowship", "30+ International Research Publications"],
    research: ["Neuro-symbolic AI models", "Transformer architectures for genomics"],
    certifications: ["Google Certified Cloud Architect"],
    verified: true,
  },
  {
    id: "mentor-2",
    user: { firstName: "Vikram", lastName: "Sen" },
    bio: "MBA from University of Toronto. Former Senior Consultant at McKinsey.",
    position: "Director of Product Management",
    company: "Amazon",
    university: "University of Toronto",
    country: "Canada",
    yearsExperience: 12,
    languages: ["English", "Bengali"],
    rating: 5.0,
    skills: ["MBA", "Study Abroad", "Business", "Entrepreneurship"],
    sessionPrice: 2000,
    about: "I help candidates ace MBA applications, crack McKinsey case interviews, and transition smoothly into product management leadership.",
    education: [{ degree: "MBA", institution: "Rotman School of Management", year: "2014" }],
    experience: [{ role: "Director of Product", company: "Amazon", duration: "2021 - Present" }],
    achievements: ["Rotman Scholar", "McKinsey Consultant of the Year 2018"],
    research: [],
    certifications: ["Pragmatic Certified Product Leader"],
    verified: true,
  },
  {
    id: "mentor-3",
    user: { firstName: "Rahul", lastName: "Verma" },
    bio: "IIT Madras Alumnus. Mentored over 500+ JEE aspirants to top IITs.",
    position: "Senior Academic Director",
    company: "IIT Jee Academy",
    university: "IIT Madras",
    country: "India",
    yearsExperience: 6,
    languages: ["English", "Hindi", "Tamil"],
    rating: 4.8,
    skills: ["Engineering", "Civil Services", "Physics", "Maths"],
    sessionPrice: 500,
    about: "Struggling with JEE advanced concepts? I break down tough Physics and Maths topics and provide a bulletproof study plan.",
    education: [{ degree: "B.Tech in Engineering", institution: "IIT Madras", year: "2020" }],
    experience: [{ role: "Academic Director", company: "IIT Jee Academy", duration: "2020 - Present" }],
    achievements: ["JEE Advanced Rank 84", "Best Mentor Award 2024"],
    research: [],
    certifications: [],
    verified: true,
  },
];

export default function MentorshipPlatform() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "landing";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState<any>(null);

  // Lists State
  const [mentors, setMentors] = useState<any[]>(INITIAL_MENTORS);
  const [webinars, setWebinars] = useState<any[]>(WEBINARS);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [priceRange, setPriceRange] = useState(5000);

  // Booking Modal State
  const [bookingMentor, setBookingMentor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingDuration, setBookingDuration] = useState(30);
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingQuestions, setBookingQuestions] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  // Student Dashboard State
  const [studentDash, setStudentDash] = useState<any>({
    upcomingSessions: [],
    pastSessions: [],
    projects: [],
    resumes: [],
    portfolio: null,
    savedMentors: [],
  });

  // Mentor Dashboard State
  const [mentorDash, setMentorDash] = useState<any>({
    pendingSessions: [],
    upcomingSessions: [],
    allSessions: [],
    projects: [],
    resumes: [],
    earnings: 0,
  });

  // Messenger State
  const [activeChatRecipient, setActiveChatRecipient] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  // Tools Form States
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectType, setProjectType] = useState("App");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeMentorId, setResumeMentorId] = useState("");

  // Portfolio Form State
  const [portfolioBio, setPortfolioBio] = useState("");
  const [portfolioWebsite, setPortfolioWebsite] = useState("");
  const [portfolioSkills, setPortfolioSkills] = useState("");

  // Super Admin Verification State
  const [adminMentors, setAdminMentors] = useState<any[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  // Load User & Data
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchDashboardData(parsed);
      fetchChatHistory(parsed.id);
    }
    fetchMentors();
    fetchAdminMentors();
  }, [activeTab]);

  const fetchMentors = async () => {
    try {
      const res = await fetch(`${API}/mentorship/mentors`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setMentors(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminMentors = async () => {
    try {
      const res = await fetch(`${API}/mentorship/mentors`);
      if (res.ok) {
        setAdminMentors(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async (currentUser: any) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      if (currentUser.role === 'PARENT' || currentUser.role === 'STUDENT') {
        const res = await fetch(`${API}/mentorship/dashboards/student`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStudentDash(data);
          if (data.portfolio) {
            setPortfolioBio(data.portfolio.bio || "");
            setPortfolioWebsite(data.portfolio.websiteUrl || "");
            setPortfolioSkills(data.portfolio.skills?.join(", ") || "");
          }
        }
      } else {
        const res = await fetch(`${API}/mentorship/dashboards/mentor`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setMentorDash(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChatHistory = async (myId: string) => {
    const token = localStorage.getItem("token");
    if (!token || !activeChatRecipient) return;
    try {
      const res = await fetch(`${API}/mentorship/messages/${activeChatRecipient.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setChatMessages(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) fetchChatHistory(user.id);
  }, [activeChatRecipient]);

  // Book Session Handler
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
          duration: bookingDuration,
          topic: bookingTopic,
          questions: bookingQuestions
        })
      });
      if (!res.ok) throw new Error("Booking failed.");
      const data = await res.json();
      setBookingSuccess(data);
      fetchDashboardData(user);
    } catch (err) {
      alert("Error booking session: Time slot selected might already be reserved.");
    }
  };

  // Register Webinar Handler
  const handleRegisterWebinar = async (id: string) => {
    try {
      const res = await fetch(`${API}/mentorship/webinars/${id}/register`, { method: "POST" });
      if (res.ok) {
        setWebinars(prev => prev.map(w => w.id === id ? { ...w, registered: true } : w));
        alert("Webinar registration successful! Meeting details have been emailed.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Project Handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

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
      if (res.ok) {
        alert("Passion project created successfully!");
        setProjectTitle("");
        setProjectDesc("");
        fetchDashboardData(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Resume Handler
  const handleSubmitResume = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

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
        alert("Resume submitted successfully for mentor review!");
        setResumeUrl("");
        fetchDashboardData(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Portfolio Handler
  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/mentorship/portfolios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          bio: portfolioBio,
          websiteUrl: portfolioWebsite,
          skills: portfolioSkills.split(",").map(s => s.trim())
        })
      });
      if (res.ok) {
        alert("Student portfolio saved!");
        fetchDashboardData(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !newMessageText) return;

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
        fetchChatHistory(user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Super Admin Verify Mentor
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
        alert("Verification status updated!");
        fetchAdminMentors();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Mentors
  const filteredMentors = mentors.filter(m => {
    const matchesSearch = searchQuery === "" || 
      `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.skills.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSkill = selectedSkill === "" || m.skills.includes(selectedSkill);
    const matchesCountry = selectedCountry === "" || m.country === selectedCountry;
    const matchesPrice = m.sessionPrice <= priceRange;

    return matchesSearch && matchesSkill && matchesCountry && matchesPrice;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      
      {/* -------------------- LANDING TAB -------------------- */}
      {activeTab === "landing" && (
        <div className="space-y-12">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-3xl border border-[#d8e8e3] bg-white p-8 md:p-12 shadow-sm flex flex-col lg:flex-row items-center gap-8">
            <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#c8f7eb]/40 blur-3xl" />
            <div className="relative z-10 flex-1 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e1f6f0] text-xs font-bold text-[#008f7d]"><Sparkles className="h-3.5 w-3.5" /> Higher Education Hub</span>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] text-[#071633]">Your Future Starts With The Right Mentor</h1>
              <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                Connect with verified mentors from top universities, industry-leading companies, startup founders, researchers, and career experts.
                Whether you're planning higher education, studying abroad, preparing for competitive exams, or exploring your dream career, our mentors guide you every step of the way.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setActiveTab("discover")} className="inline-flex items-center gap-2 bg-[#008f7d] hover:bg-[#007f70] text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all">
                  Find a Mentor <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => alert("Registration as a mentor is currently available under Super Admin configuration or onboarding contact support@pehchaan.com")} className="inline-flex items-center gap-2 bg-[#fff] border border-[#dceae6] hover:border-[#9bd6c8] text-[#33435a] px-5 py-3 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all">
                  Become a Mentor
                </button>
              </div>
            </div>
            <div className="relative w-full max-w-[320px] shrink-0 border border-[#c8e6de] bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden shadow-2xl flex flex-col justify-between min-h-[300px]">
              <div className="absolute -inset-10 bg-[radial-gradient(circle_at_top_right,rgba(117,234,208,0.25),transparent_20rem)]" />
              <div className="relative z-10 flex items-center justify-between">
                <Compass className="h-8 w-8 text-[#75ead0]" />
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Pehchaan Network</span>
              </div>
              <div className="relative z-10 space-y-2 mt-12">
                <div className="flex gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><Star className="h-4 w-4 fill-amber-400 text-amber-400" /></div>
                <h4 className="text-xl font-bold">500+ Verified Mentors</h4>
                <p className="text-[10px] text-slate-300">Guiding Indian students globally from 500+ universities across 35+ countries.</p>
              </div>
            </div>
          </section>

          {/* Statistics Grid */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { val: "500+", label: "Verified Mentors" },
              { val: "50,000+", label: "Students Guided" },
              { val: "35+", label: "Countries" },
              { val: "500+", label: "Universities" },
              { val: "4.9★", label: "Average Rating" }
            ].map(stat => (
              <div key={stat.label} className="border border-[#dceae6] bg-white p-4 rounded-2xl text-center">
                <h3 className="text-xl sm:text-2xl font-black text-[#008f7d]">{stat.val}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* Goal Browse Grid */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[#071633]">Browse By Goal</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {GOALS.map(goal => (
                <button 
                  key={goal.id} 
                  onClick={() => {
                    setSelectedSkill(goal.id);
                    setActiveTab("discover");
                  }}
                  className="flex flex-col text-left border border-[#d8e8e3] bg-white p-5 rounded-2xl hover:border-[#008f7d] transition-all hover:-translate-y-1 shadow-sm"
                >
                  <span className="text-[10px] text-[#008f7d] font-black uppercase tracking-wider">Focus Area</span>
                  <h3 className="text-sm font-bold text-[#071633] mt-2">{goal.label}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 flex-1">{goal.description}</p>
                  <span className="inline-flex items-center text-[10px] text-[#008f7d] font-bold mt-4">Browse Mentors <ChevronRight className="h-3 w-3" /></span>
                </button>
              ))}
            </div>
          </section>

          {/* Featured Mentors */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[#071633]">Featured Mentors</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {mentors.slice(0, 3).map(mentor => (
                <article key={mentor.id} className="border border-[#d8e8e3] bg-white p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-sm font-black text-white shrink-0">
                      {mentor.user.firstName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#071633]">{mentor.user.firstName} {mentor.user.lastName}</h3>
                      <p className="text-[10px] text-[#008f7d] font-bold mt-0.5">{mentor.position} at {mentor.company}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mentor.university} · {mentor.country}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 leading-relaxed line-clamp-2">{mentor.bio}</p>
                  <div className="flex flex-wrap gap-1 mt-4">
                    {mentor.skills.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[8px] font-bold text-slate-500">{s}</span>
                    ))}
                  </div>
                  <div className="border-t border-[#f0f5f3] pt-4 mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Session Fee</span>
                      <strong className="text-xs text-slate-900">₹{mentor.sessionPrice} / session</strong>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedMentor(mentor);
                        setActiveTab("discover");
                      }} 
                      className="bg-[#008f7d] hover:bg-[#007f70] text-white px-3.5 py-2 rounded-lg text-[10px] font-bold"
                    >
                      View Profile
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Student Success Stories */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[#071633]">Student Success Stories</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {SUCCESS_STORIES.map(story => (
                <div key={story.id} className="border border-[#dceae6] bg-white p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="space-y-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[9px] font-extrabold text-[#008f7d] uppercase tracking-wider">{story.achievement}</span>
                    <p className="text-[10px] text-slate-500 italic mt-3">"{story.text}"</p>
                  </div>
                  <div className="border-t border-[#f0f5f3] pt-3 mt-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#008f7d] text-white font-black text-[10px] flex items-center justify-center uppercase">{story.name[0]}</div>
                    <div>
                      <h4 className="text-[10px] font-extrabold text-[#071633]">{story.name}</h4>
                      <p className="text-[8px] text-slate-400">{story.course} · {story.university}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming Webinars */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[#071633]">Upcoming Webinars</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {webinars.map(webinar => (
                <div key={webinar.id} className="border border-[#dceae6] bg-white p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">{webinar.type}</span>
                    <h3 className="text-xs font-bold text-[#071633] mt-2">{webinar.title}</h3>
                    <p className="text-[9px] text-[#008f7d] font-bold mt-1">Host: {webinar.host}</p>
                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {webinar.time}</p>
                  </div>
                  <button 
                    onClick={() => handleRegisterWebinar(webinar.id)} 
                    disabled={webinar.registered}
                    className={`w-full mt-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      webinar.registered ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-[#008f7d] hover:bg-[#007f70] text-white"
                    }`}
                  >
                    {webinar.registered ? "Registered ✓" : "Register Now"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* -------------------- DISCOVER MENTORS TAB -------------------- */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          <header className="flex justify-between items-center border-b border-[#dceae6] pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#071633]">Verified Mentors</h1>
              <p className="text-xs text-slate-400 mt-1">Search or filter credentials from top industry researchers, managers, and alumni.</p>
            </div>
            <button onClick={() => setActiveTab("landing")} className="text-xs font-bold text-[#008f7d] flex items-center gap-1"><Compass className="h-4 w-4" /> Back to Landing</button>
          </header>

          {/* Filters Bar */}
          <section className="bg-white border border-[#d8e8e3] p-4 rounded-2xl grid md:grid-cols-4 gap-4 shadow-sm">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Keyword</span>
              <input 
                type="text" 
                placeholder="Name, skills, company..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#008f7d]"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal / Skill</span>
              <select 
                value={selectedSkill} 
                onChange={e => setSelectedSkill(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
              >
                <option value="">All Fields</option>
                {Array.from(new Set(mentors.flatMap(m => m.skills))).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Country</span>
              <select 
                value={selectedCountry} 
                onChange={e => setSelectedCountry(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
              >
                <option value="">All Countries</option>
                {Array.from(new Set(mentors.map(m => m.country))).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Session Price (₹{priceRange})</span>
              <input 
                type="range" 
                min="0" 
                max="5000" 
                step="250"
                value={priceRange} 
                onChange={e => setPriceRange(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#008f7d] mt-3"
              />
            </label>
          </section>

          {/* Mentors Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {filteredMentors.map(mentor => (
              <article key={mentor.id} className="border border-[#d8e8e3] bg-white p-6 rounded-3xl flex flex-col justify-between shadow-sm relative">
                {mentor.verified && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[9px] font-black text-emerald-800 border border-emerald-100">
                    <UserCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                <div>
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-sm font-black text-white shrink-0">
                      {mentor.user.firstName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#071633]">{mentor.user.firstName} {mentor.user.lastName}</h3>
                      <p className="text-[10px] text-[#008f7d] font-bold mt-0.5">{mentor.position} at {mentor.company}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mentor.university} · {mentor.country}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 mt-3">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-700">{mentor.rating}</span>
                    <span className="text-[10px] text-slate-400">({mentor.yearsExperience} yrs exp)</span>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">{mentor.bio}</p>
                  
                  <div className="flex flex-wrap gap-1 mt-4">
                    {mentor.skills.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[8px] font-bold text-slate-500">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#f0f5f3] pt-4 mt-6 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Session Charge</span>
                    <strong className="text-sm text-slate-900">₹{mentor.sessionPrice} / session</strong>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedMentor(mentor)}
                      className="border border-[#dceae6] hover:border-[#9bd6c8] text-[#33435a] px-3 py-2 rounded-xl text-[10px] font-bold"
                    >
                      View Profile
                    </button>
                    {user ? (
                      <button 
                        onClick={() => {
                          setBookingMentor(mentor);
                          setBookingSuccess(null);
                        }}
                        className="bg-[#008f7d] hover:bg-[#007f70] text-white px-3.5 py-2 rounded-xl text-[10px] font-bold"
                      >
                        Book
                      </button>
                    ) : (
                      <Link href="/login?role=parent&next=/higher-education/mentorship?tab=discover" className="bg-[#008f7d] hover:bg-[#007f70] text-white px-3.5 py-2 rounded-xl text-[10px] font-bold">
                        Login to Book
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Profile Modal */}
          {selectedMentor && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-[#dceae6] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 relative shadow-2xl">
                <button onClick={() => setSelectedMentor(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900"><X className="h-6 w-6" /></button>
                <div className="flex gap-4 items-center">
                  <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-lg">{selectedMentor.user.firstName[0]}</div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedMentor.user.firstName} {selectedMentor.user.lastName}</h2>
                    <p className="text-xs text-[#008f7d] font-bold">{selectedMentor.position} at {selectedMentor.company}</p>
                    <p className="text-xs text-slate-400">{selectedMentor.university} · {selectedMentor.country}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#071633] uppercase tracking-wider">About Mentor</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{selectedMentor.about}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#071633] uppercase tracking-wider">Education</h3>
                    {selectedMentor.education?.map((edu: any, i: number) => (
                      <div key={i} className="text-xs text-slate-500"><strong className="text-slate-800">{edu.degree}</strong> - {edu.institution} ({edu.year})</div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#071633] uppercase tracking-wider">Experience</h3>
                    {selectedMentor.experience?.map((exp: any, i: number) => (
                      <div key={i} className="text-xs text-slate-500"><strong className="text-slate-800">{exp.role}</strong> at {exp.company} ({exp.duration})</div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#071633] uppercase tracking-wider">Skills & Areas</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMentor.skills.map((s: string) => <span key={s} className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-600">{s}</span>)}
                  </div>
                </div>

                {selectedMentor.achievements?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#071633] uppercase tracking-wider">Achievements</h3>
                    <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1">
                      {selectedMentor.achievements.map((ach: string, i: number) => <li key={i}>{ach}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#f0f5f3] pt-4 mt-6">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Charge per slot</span>
                    <strong className="text-sm text-slate-900">₹{selectedMentor.sessionPrice} INR</strong>
                  </div>
                  <div className="flex gap-2">
                    {user && (
                      <button 
                        onClick={() => {
                          setSelectedChatRecipient(selectedMentor.user);
                          setSelectedMentor(null);
                          setActiveTab("student-dashboard");
                        }}
                        className="border border-[#dceae6] hover:border-[#9bd6c8] text-[#33435a] px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Message
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setBookingMentor(selectedMentor);
                        setSelectedMentor(null);
                        setBookingSuccess(null);
                      }}
                      className="bg-[#008f7d] hover:bg-[#007f70] text-white px-5 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Book Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Modal */}
          {bookingMentor && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-[#dceae6] rounded-3xl max-w-md w-full p-6 space-y-6 relative shadow-2xl">
                <button onClick={() => setBookingMentor(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900"><X className="h-6 w-6" /></button>
                <h2 className="text-lg font-bold border-b border-slate-100 pb-2">Book Mentorship Session</h2>
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white text-sm">{bookingMentor.user.firstName[0]}</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{bookingMentor.user.firstName} {bookingMentor.user.lastName}</h3>
                    <p className="text-[10px] text-slate-400">{bookingMentor.position} · {bookingMentor.university}</p>
                  </div>
                </div>

                {!bookingSuccess ? (
                  <form onSubmit={handleBookSession} className="space-y-4">
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Date</span>
                      <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Time Slot</span>
                      <select required value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none">
                        <option value="">Select Time Slot</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:30 AM">11:30 AM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="04:30 PM">04:30 PM</option>
                        <option value="06:00 PM">06:00 PM</option>
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topic of Mentorship</span>
                      <input type="text" required placeholder="SOP review, career roadmap, study abroad..." value={bookingTopic} onChange={e => setBookingTopic(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Questions / Notes</span>
                      <textarea placeholder="List details you wish to discuss..." value={bookingQuestions} onChange={e => setBookingQuestions(e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 h-20 outline-none resize-none" />
                    </label>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                      <span className="text-xs font-bold text-slate-600">Total charge: ₹{bookingMentor.sessionPrice}</span>
                      <button type="submit" className="bg-[#008f7d] hover:bg-[#007f70] text-white px-5 py-2.5 rounded-xl text-xs font-bold">Confirm & Book</button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 items-center justify-center"><CheckCircle2 className="h-6 w-6" /></div>
                    <h3 className="text-md font-bold text-slate-800">Booking Confirmed!</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Your session with {bookingMentor.user.firstName} is scheduled for {bookingDate} at {bookingTime}. Meeting link generated.</p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-left space-y-1 font-mono">
                      <div><strong>Topic:</strong> {bookingSuccess.topic}</div>
                      <div><strong>Duration:</strong> {bookingSuccess.duration} mins</div>
                      <div><strong>Meeting Link:</strong> <a href={bookingSuccess.meetingLink} target="_blank" className="text-[#008f7d] underline truncate inline-block max-w-[200px] align-bottom">{bookingSuccess.meetingLink}</a></div>
                    </div>
                    <button onClick={() => setBookingMentor(null)} className="w-full bg-[#008f7d] hover:bg-[#007f70] text-white py-2 rounded-xl text-xs font-bold">Done</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- STUDENT DASHBOARD TAB -------------------- */}
      {activeTab === "student-dashboard" && (
        <div className="space-y-6">
          <header className="flex justify-between items-center border-b border-[#dceae6] pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#071633]">Student Guidance Dashboard</h1>
              <p className="text-xs text-slate-400 mt-1">Check advisor schedules, messages, career tools, and resume reviews.</p>
            </div>
          </header>

          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-8">
            {/* Left Side: Sessions & Messaging */}
            <div className="space-y-8">
              {/* Upcoming Sessions */}
              <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm space-y-4">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><Calendar className="h-5 w-5 text-[#008f7d]" /> Upcoming Sessions</h2>
                
                {studentDash.upcomingSessions?.length > 0 ? (
                  <div className="space-y-3">
                    {studentDash.upcomingSessions.map((session: any) => (
                      <div key={session.id} className="border border-slate-100 bg-slate-50/70 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-[8px] font-bold text-emerald-800 uppercase tracking-wider">{session.status}</span>
                          <h3 className="text-xs font-bold text-slate-800 mt-1.5">{session.topic}</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">With {session.mentor.user.firstName} {session.mentor.user.lastName} · {session.duration} mins</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">{new Date(session.date).toLocaleDateString()} at {session.time}</p>
                        </div>
                        {session.meetingLink && (
                          <div className="flex gap-2">
                            <a href={session.meetingLink} target="_blank" className="inline-flex items-center gap-1 bg-[#008f7d] hover:bg-[#007f70] text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold"><Video className="h-3 w-3" /> Join Room</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400">
                    No sessions scheduled. Propose a date and book a verified mentor now.
                  </div>
                )}
              </section>

              {/* Chat & Messages console */}
              <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm flex flex-col h-[400px]">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100"><MessageSquare className="h-5 w-5 text-[#008f7d]" /> Chat Inbox</h2>
                <div className="grid grid-cols-[150px_1fr] flex-1 min-h-0">
                  {/* Left Side: Users list */}
                  <div className="border-r border-slate-100 p-2 space-y-1 overflow-y-auto">
                    <span className="text-[8px] font-mono uppercase text-slate-400 block px-2 py-1">Advisors</span>
                    {mentors.map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => setActiveChatRecipient(m.user)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold truncate block ${
                          activeChatRecipient?.id === m.user.id ? "bg-[#e6f7f2] text-[#007f70]" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {m.user.firstName} {m.user.lastName}
                      </button>
                    ))}
                  </div>
                  {/* Right Side: Chat box */}
                  <div className="flex flex-col min-h-0 pl-4">
                    {activeChatRecipient ? (
                      <>
                        <div className="py-2 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-800">Chat with {activeChatRecipient.firstName} {activeChatRecipient.lastName}</span>
                        </div>
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                          {chatMessages.length > 0 ? (
                            chatMessages.map(msg => {
                              const isMe = msg.senderId === user.id;
                              return (
                                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                  <div className={`p-2.5 rounded-2xl max-w-[70%] text-[10px] leading-relaxed ${
                                    isMe ? "bg-[#008f7d] text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none"
                                  }`}>
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-10 text-[9px] text-slate-400">No message logs. Start the conversation below.</div>
                          )}
                        </div>
                        {/* Send Form */}
                        <form onSubmit={handleSendMessage} className="border-t border-slate-100 pt-3 flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Type a message..." 
                            value={newMessageText}
                            onChange={e => setNewMessageText(e.target.value)}
                            className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                          />
                          <button type="submit" className="bg-[#008f7d] hover:bg-[#007f70] text-white p-2 rounded-xl shrink-0"><Send className="h-4 w-4" /></button>
                        </form>
                      </>
                    ) : (
                      <div className="flex items-center justify-center flex-1 text-[10px] text-slate-400">Select an advisor on the left list to begin messaging.</div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Right Side: Tools (Resume, Portfolio, Project builders) */}
            <div className="space-y-8">
              {/* Resume Review Tool */}
              <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm space-y-4">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><FileText className="h-5 w-5 text-[#008f7d]" /> Pro Resume Review</h2>
                <form onSubmit={handleSubmitResume} className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PDF Resume Link / URL</span>
                    <input 
                      type="url" 
                      required 
                      placeholder="https://drive.google.com/..." 
                      value={resumeUrl}
                      onChange={e => setResumeUrl(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#008f7d]" 
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assign Mentor</span>
                    <select 
                      value={resumeMentorId} 
                      onChange={e => setResumeMentorId(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    >
                      {mentors.map(m => <option key={m.id} value={m.id}>{m.user.firstName} {m.user.lastName} ({m.company})</option>)}
                    </select>
                  </label>
                  <button type="submit" className="w-full bg-[#008f7d] hover:bg-[#007f70] text-white py-2 rounded-xl text-xs font-bold shadow-md">Submit Resume</button>
                </form>

                {studentDash.resumes?.length > 0 && (
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <span className="text-[8px] font-mono uppercase text-slate-400 block">Submitted Files</span>
                    {studentDash.resumes.map((res: any) => (
                      <div key={res.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] space-y-1">
                        <div className="flex justify-between font-bold">
                          <a href={res.resumeUrl} target="_blank" className="text-slate-800 hover:underline truncate max-w-[150px]">Resume URL</a>
                          <span className={res.status === 'REVIEWED' ? 'text-emerald-600' : 'text-amber-600'}>{res.status}</span>
                        </div>
                        {res.status === 'REVIEWED' && (
                          <div className="mt-1 space-y-1 pt-1.5 border-t border-slate-200">
                            <div><strong>Score:</strong> {res.score}/100 (ATS analyzed)</div>
                            <div><strong>Suggestions:</strong> {res.suggestions}</div>
                            <div><strong>Tips:</strong> {res.tips}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Portfolio Builder */}
              <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm space-y-4">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><Award className="h-5 w-5 text-[#008f7d]" /> Student Portfolio Builder</h2>
                <form onSubmit={handleSavePortfolio} className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professional Bio</span>
                    <textarea 
                      placeholder="Write your accomplishments..." 
                      value={portfolioBio}
                      onChange={e => setPortfolioBio(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 h-16 outline-none resize-none" 
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website URL</span>
                    <input 
                      type="url" 
                      placeholder="https://myportfolio.com" 
                      value={portfolioWebsite}
                      onChange={e => setPortfolioWebsite(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none" 
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skills (comma separated)</span>
                    <input 
                      type="text" 
                      placeholder="React, CSS, Machine Learning..." 
                      value={portfolioSkills}
                      onChange={e => setPortfolioSkills(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none" 
                    />
                  </label>
                  <button type="submit" className="w-full bg-[#008f7d] hover:bg-[#007f70] text-white py-2 rounded-xl text-xs font-bold">Update Portfolio</button>
                </form>
                {studentDash.portfolio && (
                  <div className="bg-[#e1f6f0] p-3 rounded-xl border border-[#cceae3] flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-emerald-800">Your Portfolio is LIVE!</span>
                    <a href={`/portfolio/${studentDash.portfolio.publicUrl}`} target="_blank" className="font-bold text-[#008f7d] flex items-center gap-1">View Public Link <ExternalLink className="h-3 w-3" /></a>
                  </div>
                )}
              </section>

              {/* Passion Project Builder */}
              <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm space-y-4">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><Target className="h-5 w-5 text-[#008f7d]" /> Passion Project Tracker</h2>
                <form onSubmit={handleCreateProject} className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Title</span>
                    <input 
                      type="text" 
                      required 
                      placeholder="Building an NGO platform, Python research paper..." 
                      value={projectTitle}
                      onChange={e => setProjectTitle(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#008f7d]" 
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</span>
                    <textarea 
                      placeholder="Details, execution goals, milestones..." 
                      value={projectDesc}
                      onChange={e => setProjectDesc(e.target.value)}
                      className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 h-16 outline-none resize-none" 
                    />
                  </label>
                  <button type="submit" className="w-full bg-[#008f7d] hover:bg-[#007f70] text-white py-2 rounded-xl text-xs font-bold">Start Project</button>
                </form>

                {studentDash.projects?.length > 0 && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[8px] font-mono uppercase text-slate-400 block">Current Initiatives</span>
                    {studentDash.projects.map((proj: any) => (
                      <div key={proj.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[10px] space-y-2">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800">{proj.title}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[8px] font-black">{proj.status}</span>
                        </div>
                        <p className="text-slate-500 text-[9px]">{proj.description}</p>
                        
                        <div className="space-y-1.5 mt-2">
                          <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Milestone Progress</span>
                          {proj.milestones?.map((ms: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 text-slate-600 text-[9px]">
                              <input 
                                type="checkbox" 
                                checked={ms.completed} 
                                onChange={async () => {
                                  const updatedMilestones = [...proj.milestones];
                                  updatedMilestones[idx].completed = !updatedMilestones[idx].completed;
                                  // Call API
                                  const token = localStorage.getItem("token");
                                  if (!token) return;
                                  const response = await fetch(`${API}/mentorship/projects/${proj.id}`, {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ milestones: updatedMilestones })
                                  });
                                  if (response.ok) fetchDashboardData(user);
                                }}
                                className="accent-[#008f7d]"
                              />
                              <span className={ms.completed ? 'line-through text-slate-400' : ''}>{ms.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUPER ADMIN TAB -------------------- */}
      {activeTab === "admin" && (
        <div className="space-y-6">
          <header className="border-b border-[#dceae6] pb-4">
            <h1 className="text-2xl font-extrabold text-[#071633]">Verification Center</h1>
            <p className="text-xs text-slate-400 mt-1">Audit onboarding requests, manage credentials, and toggle verified checkmarks.</p>
          </header>

          <section className="bg-white border border-[#dceae6] p-6 rounded-3xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#dceae6] text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-4">Mentor Candidate</th>
                    <th className="p-4">Bio & Position</th>
                    <th className="p-4">Base Pricing</th>
                    <th className="p-4 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminMentors.map((mentor: any) => (
                    <tr key={mentor.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{mentor.user?.firstName} {mentor.user?.lastName}</div>
                        <div className="text-[10px] text-slate-400">{mentor.university} · {mentor.country}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-700">{mentor.position} at {mentor.company}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{mentor.bio}</div>
                      </td>
                      <td className="p-4 font-bold text-slate-800">₹{mentor.sessionPrice}</td>
                      <td className="p-4 text-right">
                        {mentor.verified ? (
                          <button onClick={() => handleAdminVerify(mentor.id, false)} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[9px]">Verified ✓</button>
                        ) : (
                          <button onClick={() => handleAdminVerify(mentor.id, true)} className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[9px]">Verify Profile</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}

// Wrapper state helper to handle messaging select
let setSelectedChatRecipient: any = () => {};
