"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { 
  Building, 
  Users, 
  CreditCard, 
  FileText,
  LogOut, 
  LayoutDashboard,
  Loader2,
  Layers
} from "lucide-react";
import Link from "next/link";
import { PehchaanBrand } from "@/components/pehchaan-brand";
import { PortalMobileNav } from "@/components/portal-mobile-nav";

const superAdminLinks = [
  { href: "/super-admin/dashboard", label: "Overview" },
  { href: "/super-admin/schools", label: "Schools (Tenants)" },
  { href: "/super-admin/applications", label: "Applications" },
  { href: "/super-admin/users", label: "Global Users" },
  { href: "/super-admin/subscriptions", label: "Subscriptions" },
  { href: "/super-admin/documents", label: "Document Vault" },
  { href: "/super-admin/settings", label: "Settings" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "SUPER_ADMIN") {
      router.push("/login");
      return;
    }

    setUser(parsedUser);
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400">Loading Platform Administration Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faf8] text-[#071633] font-sans lg:h-screen lg:overflow-hidden">
      <PortalMobileNav subtitle="Pehchaan Admin" links={superAdminLinks} onLogout={handleLogout} />
      
      {/* Sidebar Navigation */}
      <aside className="super-admin-sidebar fixed inset-y-0 left-0 z-30 hidden h-screen w-64 bg-white border-r border-[#dceae6] lg:flex flex-col justify-between">
        <div>
          {/* Tenant Title Header */}
          <div className="p-5 border-b border-[#dceae6]">
            <PehchaanBrand compact subtitle="Pehchaan Admin" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { href: "/super-admin/dashboard", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
              { href: "/super-admin/schools", label: "Schools (Tenants)", icon: <Building className="h-4 w-4" /> },
              { href: "/super-admin/applications", label: "Applications", icon: <FileText className="h-4 w-4" /> },
              { href: "/super-admin/users", label: "Global Users", icon: <Users className="h-4 w-4" /> },
              { href: "/super-admin/subscriptions", label: "Subscriptions", icon: <CreditCard className="h-4 w-4" /> },
              { href: "/super-admin/documents", label: "Document Vault", icon: <Layers className="h-4 w-4" /> },
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
              {user?.firstName?.[0] || "A"}
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#071633]">{user?.firstName} {user?.lastName}</h4>
              <span className="text-[10px] text-[#71818d] font-mono">Platform Admin</span>
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
      <main className="relative min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#f6faf8] p-4 sm:p-6 lg:ml-64 lg:h-screen lg:min-h-0 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 right-0 bg-[radial-gradient(circle_at_top_right,rgba(188,239,226,0.35),transparent_34rem)] lg:left-64" />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
