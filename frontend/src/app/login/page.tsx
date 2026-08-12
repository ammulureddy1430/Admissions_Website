"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PehchaanBrand } from "@/components/pehchaan-brand";

const API = "/backend";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulateParam = searchParams.get("simulate");
  const roleParam = searchParams.get("role");
  const nextParam = searchParams.get("next");
  const isStudyAbroad = roleParam === "study-abroad";
  const initialType = roleParam === "super-admin" ? "super-admin" : roleParam === "study-abroad" ? "study-abroad" : roleParam === "parent" ? "parent" : "school";
  const [loginType, setLoginType] = useState<"school" | "parent" | "study-abroad" | "super-admin">(initialType);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSchools, setIsFetchingSchools] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setLoginType(roleParam === "super-admin" ? "super-admin" : roleParam === "study-abroad" ? "study-abroad" : roleParam === "parent" ? "parent" : "school"), [roleParam]);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const response = await fetch(`${API}/school/list`);
        if (!response.ok) throw new Error("Failed to fetch schools.");
        const data = await response.json();
        setSchools(data);
        const match = simulateParam ? data.find((school: any) => school.subdomain.toLowerCase() === simulateParam.toLowerCase()) : null;
        if (match || data[0]) setSelectedSchoolId((match || data[0]).id);
      } catch {
        setError("Schools could not be loaded. Please check that the server is running.");
      } finally { setIsFetchingSchools(false); }
    }
    fetchSchools();
  }, [simulateParam]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loginType !== "super-admin" && loginType !== "study-abroad" && !selectedSchoolId) return setError("Please select your school.");
    setIsLoading(true); setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (loginType !== "super-admin" && loginType !== "study-abroad") headers["x-tenant-id"] = selectedSchoolId;
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email, password, portal: loginType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || "Invalid credentials.");
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.accessToken);
      if (loginType !== "super-admin" && loginType !== "study-abroad") {
        const activeSchool = schools.find(school => school.id === selectedSchoolId);
        localStorage.setItem("schoolId", selectedSchoolId);
        if (activeSchool) { localStorage.setItem("schoolName", activeSchool.name); localStorage.setItem("subdomain", activeSchool.subdomain); }
      } else {
        localStorage.removeItem("schoolId"); localStorage.removeItem("schoolName"); localStorage.removeItem("subdomain");
      }
      if (isStudyAbroad) {
        if (data.user.role === "MENTOR") {
          router.push("/study-abroad/mentor/dashboard");
        } else {
          router.push(nextParam || "/study-abroad");
        }
      } else {
        const safeNext = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
        router.push(
          safeNext && (data.user.role === "SCHOOL_ADMIN" || data.user.role === "ADMISSIONS_STAFF")
            ? safeNext
            : data.user.role === "SUPER_ADMIN"
            ? "/super-admin/dashboard"
            : data.user.role === "SCHOOL_ADMIN" || data.user.role === "ADMISSIONS_STAFF"
            ? "/admin/dashboard"
            : "/parent/dashboard"
        );
      }
    } catch (err: any) { setError(err.message || "Sign in failed. Please try again."); }
    finally { setIsLoading(false); }
  };

  const selectedSchool = schools.find(school => school.id === selectedSchoolId);
  const displayInstitutionName = (school: any) => isStudyAbroad && /demo|academy|school/i.test(school.name)
    ? "Global Horizons College (Demo)"
    : school.name;
  const isSuperAdmin = loginType === "super-admin";
  const isParent = loginType === "parent";
  const portalName = isSuperAdmin ? "Pehchaan Admin" : isStudyAbroad ? "Pehchaan Study Abroad" : isParent ? "Pehchaan Parent Portal" : "Pehchaan School Portal";
  const portalHeading = isSuperAdmin ? "Platform administrator sign in" : isStudyAbroad ? "Study Abroad sign in" : isParent ? "Parent portal sign in" : "School portal sign in";
  const portalDescription = isSuperAdmin ? "Enter your authorized platform administrator credentials." : isStudyAbroad ? "Use your Pehchaan learner account to continue your overseas education journey." : isParent ? "Select your child’s school and sign in to manage applications." : "Select your school and enter your account details.";

  const buttonText = isParent
    ? "Continue to application"
    : loginType === "school"
    ? "Access school portal"
    : isStudyAbroad
    ? "Continue to study abroad"
    : "Super Admin Portal";

  return (
    <main className="register-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:flex lg:items-center lg:py-10">
      <div className="register-page__glow register-page__glow--left" />
      <div className="register-page__glow register-page__glow--right" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <Link href="/" className="register-back"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
        <div className="register-shell">
          <aside className="register-aside">
            <div className="register-aside__orb register-aside__orb--one" />
            <div className="register-aside__orb register-aside__orb--two" />
            <div className="relative">
              <PehchaanBrand inverse />
              <div className="mt-20"><span className="register-eyebrow register-eyebrow--dark">{isSuperAdmin ? "Platform administration" : isStudyAbroad ? "Higher education access" : isParent ? "Parent account access" : "Secure school access"}</span><h1 className="register-aside__title">{isSuperAdmin ? <>Your Pehchaan <span>platform workspace.</span></> : isStudyAbroad ? <>Plan your global <span>education journey.</span></> : isParent ? <>Stay connected to your child&apos;s <span>admission journey.</span></> : <>Welcome back to <span>simpler admissions.</span></>}</h1><p className="register-aside__copy">{isSuperAdmin ? "Manage school tenants, subscriptions, users, and platform performance." : isStudyAbroad ? "Explore universities, organize documents, and follow every overseas application step." : isParent ? "View applications, upload documents, make payments, and track admission updates." : "A secure workspace for school administrators and admissions teams."}</p></div>
            </div>
            <div className="relative space-y-4">{(isSuperAdmin ? ["Manage every school tenant", "Control plans and subscriptions", "Monitor platform performance"] : isStudyAbroad ? ["Search and compare universities", "Prepare applications and documents", "Track visa and admission milestones"] : isParent ? ["Manage your applications", "Upload required documents", "Track admission decisions"] : ["Role-based portal access", "Protected school information", "Real-time admission updates"]).map(item => <div key={item} className="register-benefit"><CheckCircle2 className="h-4 w-4" />{item}</div>)}</div>
          </aside>

          <section className="register-form-panel">
            <div className="mb-7 lg:hidden"><PehchaanBrand compact /></div>
            <div><span className="register-eyebrow">{isSuperAdmin ? "Super admin access" : isStudyAbroad ? "Learner access" : isParent ? "Parent access" : "School portal access"}</span><h2 className="register-form-title">{portalHeading}</h2><p className="register-form-copy">{portalDescription}</p></div>

            <div className="login-portal-note">
              {isSuperAdmin ? <ShieldCheck className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              <div><p className="text-xs font-extrabold">{portalName}</p><p className="mt-0.5 text-[10px] text-[#688078]">{isSuperAdmin ? "Restricted to platform administrators" : isStudyAbroad ? "For students planning overseas education" : isParent ? "For parents and guardians" : "For school staff and admissions teams"}</p></div>
            </div>

            {error && <div className="login-error-alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

            <form onSubmit={submit} className="mt-6 space-y-5">
              {!isSuperAdmin && !isStudyAbroad && <div className="space-y-2"><label className="text-xs font-bold text-slate-400">{isParent ? "Child’s school" : "Your school"}</label>{isFetchingSchools ? <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 py-3"><Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" /><span className="text-xs text-slate-500">Loading institutions...</span></div> : schools.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center"><p className="text-xs text-slate-400">No institutions have been onboarded yet.</p><Link href="/login?role=super-admin" className="mt-3 inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold">Register an institution</Link></div> : <><div className="relative"><Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><select required value={selectedSchoolId} onChange={event => setSelectedSchoolId(event.target.value)} className={`w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition ${isParent ? "focus:border-rose-500" : "focus:border-cyan-500"}`}><option value="" disabled>Select your institution</option>{schools.map(school => <option key={school.id} value={school.id}>{displayInstitutionName(school)}</option>)}</select></div>{selectedSchool && <p className="flex items-center gap-1.5 text-[10px] text-slate-600"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Connected to {displayInstitutionName(selectedSchool)}</p>}</>}</div>}

              <label className="block space-y-2"><span className="text-xs font-bold text-slate-400">Email address</span><span className="relative block"><Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value.trim())} placeholder="you@example.com" className="register-input w-full py-3.5 pl-9 pr-4" /></span></label>
              <label className="block space-y-2"><span className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Password</span><Link href={isStudyAbroad ? "/forgot-password?portal=study-abroad" : "/forgot-password"} className="text-[10px] font-bold text-[#008f7d] hover:text-[#006f62]">Forgot password?</Link></span><span className="relative block"><Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" className="register-input w-full py-3.5 pl-9 pr-11" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3.5 top-3.5 text-slate-600 transition hover:text-[#008f7d]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>

              <button type="submit" disabled={isLoading || (!isStudyAbroad && isFetchingSchools) || (!isSuperAdmin && !isStudyAbroad && schools.length === 0)} className="register-submit">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : <>{buttonText} <ArrowRight className="h-4 w-4" /></>}</button>
            </form>

            {isParent && <p className="mt-6 text-center text-xs text-[#6c7c88]">New parent? <Link href="/register" className="font-bold text-[#008f7d] hover:text-[#006f62]">Create an account</Link></p>}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#050816]"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>}><LoginContent /></Suspense>;
}
