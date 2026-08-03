import {
  BadgeDollarSign,
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  FileSignature,
  FileText,
  Files,
  GraduationCap,
  HandCoins,
  Landmark,
  MessageCircleMore,
  Plane,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type React from "react";

export const studyAbroadFeatures = [
  { slug: "universities", label: "Search Universities", description: "Explore institutions using destination, course, intake, cost, ranking, and test filters.", icon: Search },
  { slug: "saved", label: "Saved Universities", description: "Keep shortlisted institutions together for later review.", icon: BookmarkIcon },
  { slug: "compare", label: "Compare Universities", description: "Review costs, eligibility, rankings, and intakes side by side.", icon: Building2 },
  { slug: "applications", label: "My Applications", description: "Follow every overseas application from shortlist to enrollment.", icon: ClipboardCheck },
  { slug: "timeline", label: "Application Timeline", description: "Understand completed steps, current actions, and upcoming milestones.", icon: CalendarDays },
  { slug: "scholarships", label: "Scholarships", description: "Browse funding opportunities and review eligibility requirements.", icon: BadgeDollarSign },
  { slug: "loans", label: "Education Loans", description: "Estimate repayments and prepare loan documentation.", icon: HandCoins },
  { slug: "visa", label: "Visa Assistance", description: "Organize visa checklists, appointments, and interview preparation.", icon: Plane },
  { slug: "sop-builder", label: "SOP Builder", description: "Structure, edit, save, and export a statement of purpose.", icon: FileSignature },
  { slug: "lor-builder", label: "LOR Builder", description: "Prepare recommendation requests and track their progress.", icon: BookOpenText },
  { slug: "resume-builder", label: "Resume Builder", description: "Create an education-focused professional resume.", icon: BriefcaseBusiness },
  { slug: "documents", label: "Document Center", description: "Organize required academic, financial, identity, and visa documents.", icon: Files },
  { slug: "counselling", label: "Counselling", description: "Plan guidance sessions and keep meeting details in one place.", icon: MessageCircleMore },
  { slug: "notifications", label: "Notifications", description: "Stay informed about deadlines, documents, applications, and visa actions.", icon: Bell },
  { slug: "community", label: "Student Community", description: "Connect through alumni, country groups, discussions, events, and stories.", icon: Users },
  { slug: "support", label: "Support Services", description: "Access guidance before admission, during applications, and after arrival.", icon: CircleHelp },
  { slug: "profile", label: "Student Profile", description: "Maintain academics, test scores, experience, projects, skills, and achievements.", icon: GraduationCap },
  { slug: "mentorship", label: "Mentor Marketplace", description: "Discover verified Ivy League and top-tech professional mentors.", icon: Users },
  { slug: "inbox", label: "Inbox Messages", description: "1-on-1 direct chat channel with your assigned advisors.", icon: MessageCircleMore },
  { slug: "projects", label: "Passion Projects", description: "Build your portfolio project roadmap and track milestones.", icon: ShieldCheck },
  { slug: "careers", label: "Career Explorer", description: "Browse career roadmaps and resources seeded in the database.", icon: GraduationCap },
  { slug: "alumni", label: "Alumni Directory", description: "Search and filter mentors by their corporate company or university.", icon: Users },
  { slug: "reviews", label: "SOP & Resume Reviews", description: "Track your document drafts, ATS scores, and comments in one place.", icon: FileText },
  { slug: "bookings", label: "Session Bookings", description: "View your calendar of sessions, including past history.", icon: CalendarDays },
  { slug: "startup", label: "Entrepreneurship Hub", description: "Guide pitch preparations and match business mentors.", icon: Landmark },
  { slug: "advisor", label: "Mentor Dashboard", description: "Manage session requests, students, document reviews, projects, availability, and follow-up work.", icon: Users },
] as const;

function BookmarkIcon(props: React.ComponentProps<typeof FileText>) {
  return <FileText {...props} />;
}

export const studyDestinations = [
  "USA", "Canada", "UK", "Australia", "Germany", "Ireland",
  "France", "Netherlands", "New Zealand", "Singapore", "UAE",
];

export const demoUniversities = [
  { id: "demo-toronto", initials: "UT", name: "University of Toronto", country: "Canada", ranking: "Top 50", rankingNumber: 25, tuition: "₹30–42 lakh/year", tuitionMax: 42, living: "₹12–16 lakh/year", eligibility: "Strong academics · English proficiency", intake: "September", courses: ["Computer Science", "Business", "Engineering"], degrees: ["Masters", "Bachelors"], ielts: 6.5, toefl: 100, gre: 315, gmat: 650, pte: 65, scholarship: true },
  { id: "demo-melbourne", initials: "UM", name: "University of Melbourne", country: "Australia", ranking: "Top 50", rankingNumber: 14, tuition: "₹24–38 lakh/year", tuitionMax: 38, living: "₹13–17 lakh/year", eligibility: "Relevant academics · English proficiency", intake: "February · July", courses: ["Data Science", "Business", "Engineering"], degrees: ["Masters", "Bachelors"], ielts: 6.5, toefl: 79, gre: 305, gmat: 600, pte: 58, scholarship: true },
  { id: "demo-tum", initials: "TU", name: "Technical University of Munich", country: "Germany", ranking: "Top 100", rankingNumber: 37, tuition: "₹4–10 lakh/year", tuitionMax: 10, living: "₹10–13 lakh/year", eligibility: "Relevant degree · Language requirements", intake: "Winter · Summer", courses: ["Computer Science", "Engineering", "Data Science"], degrees: ["Masters", "PhD"], ielts: 6.5, toefl: 88, gre: 310, gmat: 0, pte: 65, scholarship: false },
  { id: "demo-manchester", initials: "MU", name: "University of Manchester", country: "UK", ranking: "Top 50", rankingNumber: 32, tuition: "₹25–36 lakh/year", tuitionMax: 36, living: "₹11–15 lakh/year", eligibility: "Strong academics · English proficiency", intake: "September", courses: ["Business", "Engineering", "Medicine"], degrees: ["Masters", "Bachelors", "PhD"], ielts: 6.5, toefl: 90, gre: 305, gmat: 600, pte: 59, scholarship: true },
  { id: "demo-trinity", initials: "TC", name: "Trinity College Dublin", country: "Ireland", ranking: "Top 100", rankingNumber: 81, tuition: "₹18–30 lakh/year", tuitionMax: 30, living: "₹11–15 lakh/year", eligibility: "Relevant academics · English proficiency", intake: "September", courses: ["Computer Science", "Business", "Medicine"], degrees: ["Masters", "Bachelors"], ielts: 6.5, toefl: 88, gre: 300, gmat: 550, pte: 63, scholarship: true },
  { id: "demo-nus", initials: "NS", name: "National University of Singapore", country: "Singapore", ranking: "Top 50", rankingNumber: 8, tuition: "₹20–32 lakh/year", tuitionMax: 32, living: "₹10–14 lakh/year", eligibility: "Competitive academics · Programme requirements", intake: "August", courses: ["Computer Science", "Business", "Engineering"], degrees: ["Masters", "Bachelors", "PhD"], ielts: 6.5, toefl: 92, gre: 320, gmat: 650, pte: 62, scholarship: true },
] as const;

export const applicationStages = [
  "Profile Created",
  "University Shortlisted",
  "Documents Uploaded",
  "Application Submitted",
  "University Review",
  "Offer Letter",
  "Offer Accepted",
  "Visa Processing",
  "Pre-Departure",
  "University Enrollment",
];

export const documentTypes = [
  "Passport", "Resume", "SOP", "LOR", "Transcripts", "Degree Certificates",
  "IELTS", "TOEFL", "GRE", "GMAT", "PTE", "Financial Documents", "Visa Documents",
];

export const supportGroups = [
  { title: "Before admission", items: ["Career counselling", "University shortlisting", "Profile evaluation", "Admission planning", "Course selection", "Scholarship guidance"], icon: GraduationCap },
  { title: "During application", items: ["SOP review", "LOR review", "Resume review", "Document verification", "Interview preparation", "Application guidance"], icon: FileText },
  { title: "Visa support", items: ["Visa filing", "Documentation", "Financial guidance", "Mock interviews", "Visa tracking"], icon: ShieldCheck },
  { title: "Pre-departure", items: ["Accommodation assistance", "Flight guidance", "Forex", "Travel insurance", "Packing checklist", "Airport pickup"], icon: Plane },
  { title: "Post arrival", items: ["University registration", "Local SIM", "Bank account", "Health insurance", "Internship guidance", "Part-time job guidance", "Student community", "Emergency support"], icon: Landmark },
];
