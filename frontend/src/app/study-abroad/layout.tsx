"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, LogOut, Menu, X, LayoutDashboard, Search, Bookmark, ClipboardCheck,
  CalendarDays, Files, BadgeDollarSign, HandCoins, Users, MessageCircleMore,
  ShieldCheck, GraduationCap, BookOpenText, BarChart3, Wallet,
  CheckSquare, FileSignature, BriefcaseBusiness, Building2, UserCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { PehchaanBrand } from "@/components/pehchaan-brand";

// Student / Parent Workspace Navigation Items (Clean Original List)
const studentParentNav = [
  { label: "Dashboard", href: "/study-abroad", icon: LayoutDashboard },
  { label: "Search Universities", href: "/study-abroad/universities", icon: Search },
  { label: "Mentor Marketplace", href: "/study-abroad/mentorship", icon: Users },
  { label: "Inbox Messages", href: "/study-abroad/inbox", icon: MessageCircleMore },
  { label: "Passion Projects", href: "/study-abroad/projects", icon: ShieldCheck },
  { label: "Career Explorer", href: "/study-abroad/careers", icon: GraduationCap },
];

// Mentor Workspace Navigation Items (Flat Clean List)
const mentorNav = [
  { label: "Dashboard", href: "/study-abroad/mentor/dashboard", icon: LayoutDashboard },
  { label: "My Students", href: "/study-abroad/mentor/students", icon: Users },
  { label: "University Recommendations", href: "/study-abroad/mentor/university-recommendations", icon: Building2 },
  { label: "Sessions & Calendar", href: "/study-abroad/mentor/sessions", icon: CalendarDays },
  { label: "Messages", href: "/study-abroad/mentor/messages", icon: MessageCircleMore },
  { label: "Resources Library", href: "/study-abroad/mentor/resources", icon: Files },
  { label: "Performance Analytics", href: "/study-abroad/mentor/analytics", icon: BarChart3 },
  { label: "Payments & Earnings", href: "/study-abroad/mentor/earnings", icon: Wallet },
  { label: "Profile", href: "/study-abroad/mentor/profile", icon: UserCheck },
];

export default function StudyAbroadLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [userRole, setUserRole] = useState<string>("STUDENT");
  const [signedInUser, setSignedInUser] = useState<any>(null);
  const [mentorProfession, setMentorProfession] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.replace(`/login?role=study-abroad&next=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      const user = JSON.parse(storedUser);
      const allowedRoles = ["PARENT", "SUPER_ADMIN", "MENTOR", "STUDENT", "ALUMNI"];
      if (!allowedRoles.includes(user.role)) {
        router.replace(`/login?role=study-abroad&next=${encodeURIComponent(pathname)}`);
        return;
      }

      setUserRole(user.role);
      setSignedInUser(user);
      const isMentorUser = user.role === "MENTOR";
      if (isMentorUser) {
        fetch("http://localhost:5001/mentorship/profile/mentor", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(response => response.ok ? response.json() : null)
          .then(profile => setMentorProfession(profile?.position || profile?.headline || "Mentor"))
          .catch(() => setMentorProfession("Mentor"));
      }
      const isMentorPath = pathname === "/study-abroad/mentor" || pathname.startsWith("/study-abroad/mentor/");

      // Strict role-based workspace guard
      if (isMentorUser && !isMentorPath) {
        router.replace("/study-abroad/mentor/dashboard");
        return;
      }
      if (!isMentorUser && isMentorPath) {
        router.replace("/study-abroad");
        return;
      }

      setReady(true);
    } catch {
      router.replace(`/login?role=study-abroad&next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    const updateMentorIdentity = (event: Event) => {
      const updatedUser = (event as CustomEvent).detail;
      if (updatedUser?.role === "MENTOR") {
        setSignedInUser(updatedUser);
        if (updatedUser.profession) setMentorProfession(updatedUser.profession);
      }
    };
    window.addEventListener("mentor-profile-updated", updateMentorIdentity);
    return () => window.removeEventListener("mentor-profile-updated", updateMentorIdentity);
  }, []);

  const logout = () => {
    localStorage.clear();
    router.push("/login?role=study-abroad&next=/study-abroad");
  };

  if (!ready) return (
    <div className="study-auth-loading">
      <Loader2 className="animate-spin text-[#009b87]" />
      <p>Opening your Higher Education workspace...</p>
    </div>
  );

  const isMentorPath = pathname === "/study-abroad/mentor" || pathname.startsWith("/study-abroad/mentor/");
  const navItems = isMentorPath ? mentorNav : studentParentNav;
  const brandSubtitle = isMentorPath ? "Mentor Workspace" : userRole === "PARENT" ? "Parent Workspace" : "Student Workspace";
  const signedInName = [signedInUser?.firstName, signedInUser?.lastName]
    .filter(Boolean)
    .join(" ") || signedInUser?.name || "Student";
  const identityLabel = isMentorPath
    ? mentorProfession || "Mentor"
    : userRole === "PARENT"
      ? "Parent account"
      : "Student account";

  return (
    <div className="study-shell">
      <header className="study-mobile-header">
        <PehchaanBrand name={brandSubtitle} subtitle="Study Abroad" />
        <button type="button" onClick={() => setOpen(value => !value)} aria-label="Toggle navigation">
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside className={open ? "study-sidebar study-sidebar--open" : "study-sidebar"}>
        <div className="study-sidebar__brand">
          <PehchaanBrand name={brandSubtitle} subtitle="Study Abroad" />
        </div>
        
        <div className="study-sidebar-nav-container">
          <nav>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-[#dfece8] bg-[#f8faf9]">
          {signedInUser && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#dceae6] bg-white p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f2] text-sm font-extrabold uppercase text-[#008f7d]">
                {signedInName.replace(/^Dr\.\s*/i, "")[0] || "S"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-[#071633]">{signedInName}</p>
                {userRole !== "PARENT" && (
                  <p className="mt-0.5 truncate text-[10px] font-medium text-[#71818d]">{identityLabel}</p>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 border border-transparent bg-white hover:bg-[#fff1f2] text-[#ef4444] hover:text-[#dc2626] rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" /> Sign Out
          </button>
        </div>
      </aside>
      {open && <button type="button" className="study-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <main className="study-main">
        {children}
      </main>
    </div>
  );
}
