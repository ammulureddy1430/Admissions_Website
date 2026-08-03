"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  User, 
  PlusCircle, 
  LogOut, 
  Loader2,
  Layers,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { PehchaanBrand } from "@/components/pehchaan-brand";
import { PortalMobileNav } from "@/components/portal-mobile-nav";

const parentLinks = [
  { href: "/parent/dashboard", label: "Dashboard" },
  { href: "/parent/applications", label: "My Applications" },
  { href: "/parent/application/new", label: "Apply New Student" },
  { href: "/parent/documents", label: "Document Vault" },
  { href: "/parent/payments", label: "Billing & Payments" },
  { href: "/parent/assessments", label: "Assessments" },
  { href: "/parent/profile", label: "My Profile" },
];

export default function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [schoolName, setSchoolName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedSchoolName = localStorage.getItem("schoolName");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "PARENT") {
      router.push("/login");
      return;
    }

    setUser(parsedUser);
    setSchoolName(storedSchoolName || "School Portal");
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const updatedUser = (event as CustomEvent).detail;
      if (updatedUser?.role === "PARENT") setUser(updatedUser);
    };
    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === "user" && event.newValue) {
        const updatedUser = JSON.parse(event.newValue);
        if (updatedUser?.role === "PARENT") setUser(updatedUser);
      }
    };
    window.addEventListener("parent-profile-updated", handleProfileUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener("parent-profile-updated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Resolving parent profile workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faf8] text-[#071633] font-sans lg:h-screen lg:overflow-hidden">
      <PortalMobileNav subtitle={`${schoolName} · Parent`} links={parentLinks} onLogout={handleLogout} />
      
      {/* Sidebar Navigation */}
      <aside className="parent-sidebar fixed inset-y-0 left-0 z-30 hidden h-screen w-64 bg-white border-r border-[#dceae6] lg:flex flex-col justify-between">
        <div>
          {/* Tenant Title Header */}
          <div className="parent-tenant-brand p-5 border-b border-[#dceae6]">
            <PehchaanBrand name={schoolName} subtitle="Parent Portal" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { href: "/parent/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
              { href: "/parent/applications", label: "My Applications", icon: <FileText className="h-4 w-4" /> },
              { href: "/parent/application/new", label: "Apply New Student", icon: <PlusCircle className="h-4 w-4" /> },
              { href: "/parent/documents", label: "Document Vault", icon: <Layers className="h-4 w-4" /> },
              { href: "/parent/payments", label: "Billing & Payments", icon: <CreditCard className="h-4 w-4" /> },
              { href: "/parent/assessments", label: "Assessments", icon: <ClipboardList className="h-4 w-4" /> },
              { href: "/parent/profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${pathname === link.href ? "bg-[#e6f7f2] text-[#007f70] border border-[#cceae3]" : "text-[#607080] border border-transparent hover:text-[#007f70] hover:bg-[#f1f8f5]"}`}
              >
                {pathname === link.href && <span className="absolute -left-4 h-5 w-1 rounded-r-full bg-[#009b87]" />}
                {link.icon} {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer User Block */}
        <div className="p-4 border-t border-[#dceae6] space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-[#f4faf7] p-3">
            <div className="h-9 w-9 rounded-xl bg-[#e1f6f0] border border-[#cceae3] flex items-center justify-center text-xs font-bold text-[#008f7d] uppercase">
              {user?.firstName?.[0] || "P"}
            </div>
            <div className="overflow-hidden font-sans">
              <h4 className="text-xs font-bold text-[#071633] truncate">{user?.firstName} {user?.lastName}</h4>
              <span className="text-[10px] text-[#71818d] truncate block">{user?.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 border border-transparent bg-white hover:bg-[#fff1f2] text-[#ef4444] hover:text-[#dc2626] rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#f6faf8] lg:ml-64 lg:h-screen lg:min-h-0">
        <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 right-0 bg-[radial-gradient(circle_at_top_right,rgba(188,239,226,0.35),transparent_34rem)] lg:left-64" />
        <div className="relative z-10 min-h-full">{children}</div>
      </main>
    </div>
  );
}
