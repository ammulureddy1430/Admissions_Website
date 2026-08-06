"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  Globe, 
  Settings,
  LogOut, 
  Loader2,
  FileCheck,
  Layers,
  ClipboardList,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";
import { PehchaanBrand } from "@/components/pehchaan-brand";
import { PortalMobileNav } from "@/components/portal-mobile-nav";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/students", label: "Student Management" },
  { href: "/admin/documents", label: "Document Vault" },
  { href: "/admin/interviews", label: "Interview slots" },
  { href: "/admin/payments", label: "Payments Log" },
  { href: "/admin/reports", label: "Reports & Exports" },
  { href: "/admin/assessments", label: "Assessments" },
  { href: "/admin/game-assessments", label: "Game-Based Assessments" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedSchoolName = localStorage.getItem("schoolName");
    const storedSubdomain = localStorage.getItem("subdomain");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (!["SCHOOL_ADMIN", "ADMISSIONS_STAFF", "PRINCIPAL", "TEACHER"].includes(parsedUser.role)) {
      router.push("/login");
      return;
    }

    setUser(parsedUser);
    setSchoolName(storedSchoolName || "School Portal");
    setSubdomain(storedSubdomain || "school");
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    let refreshPromise: Promise<string | null> | null = null;
    let redirectingToLogin = false;

    const endExpiredSession = () => {
      if (redirectingToLogin) return;
      redirectingToLogin = true;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login?session=expired");
    };

    const refreshAccessToken = () => {
      if (!refreshPromise) {
        refreshPromise = nativeFetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        })
          .then(async (response) => {
            if (!response.ok) return null;

            const data = await response.json();
            if (!data.accessToken) return null;

            localStorage.setItem("token", data.accessToken);
            if (data.user) {
              localStorage.setItem("user", JSON.stringify(data.user));
            }
            return data.accessToken as string;
          })
          .catch(() => null)
          .finally(() => {
            refreshPromise = null;
          });
      }

      return refreshPromise;
    };

    const fetchWithSessionRefresh: typeof window.fetch = async (input, init) => {
      const requestUrl = input instanceof Request ? input.url : input.toString();
      const isAuthRequest = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"]
        .some((path) => requestUrl.includes(path));
      const retryInput = input instanceof Request ? input.clone() : input;
      const response = await nativeFetch(input, init);

      if (response.status !== 401 || isAuthRequest) {
        return response;
      }

      const accessToken = await refreshAccessToken();
      if (!accessToken) {
        endExpiredSession();
        return response;
      }

      const retryHeaders = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      retryHeaders.set("Authorization", `Bearer ${accessToken}`);

      return nativeFetch(retryInput, {
        ...init,
        headers: retryHeaders,
        credentials: "include",
      });
    };

    window.fetch = fetchWithSessionRefresh;

    return () => {
      if (window.fetch === fetchWithSessionRefresh) {
        window.fetch = nativeFetch;
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Resolving school administrator portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faf8] text-[#071633] font-sans lg:h-screen lg:overflow-hidden">
      <PortalMobileNav subtitle={schoolName} links={adminLinks} onLogout={handleLogout} />
      
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden h-screen w-64 bg-white border-r border-[#dceae6] lg:flex flex-col justify-between">
        <div>
          {/* Tenant Title Header */}
          <div className="admin-tenant-brand p-5 border-b border-[#dceae6]">
            <PehchaanBrand name={schoolName} subtitle="School Admin" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
              { href: "/admin/applications", label: "Applications", icon: <FileText className="h-4 w-4" /> },
              { href: "/admin/students", label: "Student Management", icon: <FileCheck className="h-4 w-4" /> },
              { href: "/admin/documents", label: "Document Vault", icon: <Layers className="h-4 w-4" /> },
              { href: "/admin/interviews", label: "Interview slots", icon: <Calendar className="h-4 w-4" /> },
              { href: "/admin/payments", label: "Payments Log", icon: <CreditCard className="h-4 w-4" /> },
              { href: "/admin/reports", label: "Reports & Exports", icon: <Globe className="h-4 w-4" /> },
              { href: "/admin/assessments", label: "Assessments", icon: <ClipboardList className="h-4 w-4" /> },
              { href: "/admin/game-assessments", label: "Game-Based Assessments", icon: <Gamepad2 className="h-4 w-4" /> },
              { href: "/admin/games", label: "Games", icon: <Gamepad2 className="h-4 w-4" /> },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${(link.href === "/admin/games" ? pathname.startsWith("/admin/games") : pathname === link.href) ? "bg-[#e6f7f2] text-[#007f70] border border-[#cceae3]" : "text-[#607080] border border-transparent hover:text-[#007f70] hover:bg-[#f1f8f5]"}`}
              >
                {(link.href === "/admin/games" ? pathname.startsWith("/admin/games") : pathname === link.href) && <span className="absolute -left-4 h-5 w-1 rounded-r-full bg-[#009b87]" />}
                {link.icon} {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="p-4 border-t border-[#dceae6] space-y-1.5 bg-white">
          <Link
            href="/admin/settings"
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${pathname === "/admin/settings" ? "bg-[#e6f7f2] text-[#007f70] border border-[#cceae3]" : "text-[#607080] border border-transparent hover:text-[#007f70] hover:bg-[#f1f8f5]"}`}
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 border border-transparent hover:bg-[#fff1f2] text-[#ef4444] hover:text-[#dc2626] rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#f6faf8] p-4 sm:p-6 lg:ml-64 lg:h-screen lg:min-h-0 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 right-0 bg-[radial-gradient(circle_at_top_right,rgba(188,239,226,0.35),transparent_34rem)] lg:left-64" />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
