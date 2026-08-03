"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogOut, Menu, X, GraduationCap, Compass, BookOpen, Search, UserCheck, MessageSquare, Award, FileText, Settings, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { PehchaanBrand } from "@/components/pehchaan-brand";

export default function HigherEducationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
    setReady(true);
  }, [pathname]);

  const logout = () => {
    localStorage.clear();
    setUser(null);
    router.push("/login?role=parent&next=/higher-education/mentorship");
  };

  if (!ready) {
    return (
      <div className="study-auth-loading">
        <Loader2 className="animate-spin text-[#008f7d]" />
        <p>Loading Mentorship & Career Guidance Platform...</p>
      </div>
    );
  }

  return (
    <div className="study-shell bg-[#f6faf8] text-[#071633] min-h-screen">
      {/* Mobile Header */}
      <header className="study-mobile-header flex items-center justify-between px-5 py-4 border-b border-[#dbe9e5] bg-white lg:hidden">
        <PehchaanBrand compact subtitle="Mentorship" />
        <button type="button" onClick={() => setOpen(value => !value)} aria-label="Toggle navigation" className="text-[#007f70]">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar navigation */}
      <aside className={`study-sidebar fixed inset-y-0 left-0 z-50 flex flex-col justify-between w-68 border-r border-[#d9e9e4] bg-white transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div>
          <div className="study-sidebar__brand p-5 border-b border-[#dfece8]">
            <PehchaanBrand compact subtitle="Higher Ed Hub" />
          </div>
          
          <nav className="p-4 space-y-1">
            <Link 
              href="/higher-education/mentorship" 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${pathname === "/higher-education/mentorship" ? "bg-[#e6f7f2] text-[#007f70]" : "text-[#607080] hover:bg-[#f1f8f5] hover:text-[#007f70]"}`}
              onClick={() => setOpen(false)}
            >
              <Compass className="h-4 w-4" /> Mentorship Landing
            </Link>

            {user ? (
              <>
                <Link 
                  href="/higher-education/mentorship?tab=discover" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#607080] hover:bg-[#f1f8f5] hover:text-[#007f70]"
                  onClick={() => setOpen(false)}
                >
                  <Search className="h-4 w-4" /> Discover Mentors
                </Link>

                <Link 
                  href="/higher-education/mentorship?tab=student-dashboard" 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#607080] hover:bg-[#f1f8f5] hover:text-[#007f70]"
                  onClick={() => setOpen(false)}
                >
                  <GraduationCap className="h-4 w-4" /> Student Dashboard
                </Link>

                {user.role === 'SUPER_ADMIN' && (
                  <Link 
                    href="/higher-education/mentorship?tab=admin" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    onClick={() => setOpen(false)}
                  >
                    <ShieldAlert className="h-4 w-4" /> Verification Admin
                  </Link>
                )}
              </>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[10px] text-amber-800 font-semibold space-y-2">
                <p>Sign in to unlock bookings, resume reviews, messaging, and project builders.</p>
                <Link href="/login?role=parent&next=/higher-education/mentorship" className="block text-center bg-[#008f7d] text-white py-1.5 rounded-lg font-bold">
                  Sign In
                </Link>
              </div>
            )}
          </nav>
        </div>

        {user && (
          <div className="p-4 border-t border-[#dceae6] space-y-2">
            <div className="flex items-center gap-3 bg-[#f4faf7] p-2.5 rounded-xl border border-[#dceae6]">
              <div className="h-8 w-8 rounded-lg bg-[#e1f6f0] border border-[#cceae3] flex items-center justify-center text-xs font-extrabold text-[#008f7d] uppercase">
                {user.firstName[0]}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#071633] truncate">{user.firstName} {user.lastName}</h4>
                <span className="text-[9px] text-[#71818d] font-mono">{user.role}</span>
              </div>
            </div>
            <button type="button" className="w-full flex items-center justify-center gap-2 border border-[#dceae6] hover:border-rose-200 hover:bg-rose-50 text-[#607080] hover:text-rose-600 py-2 rounded-lg text-xs font-bold transition-colors" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Sidebar Overlay */}
      {open && <button type="button" className="study-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      
      {/* Main Content Area */}
      <main className="lg:pl-68 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
