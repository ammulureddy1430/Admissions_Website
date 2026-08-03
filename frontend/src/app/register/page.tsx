"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, FileCheck2, GraduationCap, Loader2, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { PehchaanBrand } from "@/components/pehchaan-brand";
import { INDIAN_MOBILE_PATTERN, sanitizeIndianMobile } from "@/lib/phone";

const API = "http://localhost:5001";

export default function RegisterPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSchools, setIsFetchingSchools] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const response = await fetch(`${API}/school/list`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        setSchools(data);
        if (data[0]) setSelectedSchoolId(data[0].id);
      } catch { setError("Schools could not be loaded. Please check that the server is running."); }
      finally { setIsFetchingSchools(false); }
    }
    fetchSchools();
  }, []);

  const selectedSchool = schools.find(school => school.id === selectedSchoolId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSchoolId) return setError("Please select a school.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json", "x-tenant-id": selectedSchoolId }, body: JSON.stringify({ firstName, lastName, email, password, phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || "Registration failed.");
      setSuccess(true);
      setTimeout(() => router.push(`/login?role=parent${selectedSchool ? `&simulate=${selectedSchool.subdomain}` : ""}`), 1400);
    } catch (err: any) { setError(err.message || "Registration failed."); }
    finally { setIsLoading(false); }
  };

  const inputClass = "register-input w-full py-3.5 pl-9 pr-4";

  return <main className="register-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:flex lg:items-center lg:py-10">
    <div className="register-page__glow register-page__glow--left" />
    <div className="register-page__glow register-page__glow--right" />

    <div className="relative z-10 mx-auto w-full max-w-6xl">
      <Link href="/" className="register-back"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
      <div className="register-shell">
        <aside className="register-aside">
          <div className="register-aside__orb register-aside__orb--one" /><div className="register-aside__orb register-aside__orb--two" />
          <div className="relative"><PehchaanBrand inverse /><div className="mt-16"><span className="register-eyebrow register-eyebrow--dark">Parent registration</span><h1 className="register-aside__title">A simpler start to your child&apos;s <span>school journey.</span></h1><p className="register-aside__copy">Create one secure parent account to apply, share documents, and follow admission updates.</p></div></div>
          <div className="relative space-y-4">{[
            { icon: GraduationCap, text: "Apply to your selected school" },
            { icon: FileCheck2, text: "Manage documents and applications" },
            { icon: ShieldCheck, text: "Your information stays protected" },
          ].map(item => { const Icon = item.icon; return <div key={item.text} className="register-benefit"><Icon className="h-4 w-4" />{item.text}</div>; })}</div>
        </aside>

        <section className="register-form-panel">
          <div className="mb-7 lg:hidden"><PehchaanBrand compact /></div>
          <span className="register-eyebrow">Create your account</span><h2 className="register-form-title">Parent registration</h2><p className="register-form-copy">Choose a school and add your details to continue.</p>

          {error && <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-800/40 bg-rose-950/20 p-3 text-xs font-semibold text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {success && <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Account created. Taking you to sign in...</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2"><label className="text-xs font-bold text-slate-400">Applying to</label>{isFetchingSchools ? <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 py-3"><Loader2 className="mr-2 h-4 w-4 animate-spin text-rose-400" /><span className="text-xs text-slate-500">Loading schools...</span></div> : schools.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center"><p className="text-xs text-slate-500">No schools have been onboarded yet.</p><Link href="/login?role=super-admin" className="mt-3 inline-flex rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-slate-950">Register a school</Link></div> : <><div className="relative"><Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><select required value={selectedSchoolId} onChange={event => setSelectedSchoolId(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-rose-500">{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div>{selectedSchool && <p className="flex items-center gap-1.5 text-[10px] text-slate-600"><CheckCircle2 className="h-3 w-3 text-emerald-400" />Applications will be submitted to {selectedSchool.name}</p>}</>}</div>

            <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2"><span className="block text-xs font-bold text-slate-400">First name</span><span className="relative block"><User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input required autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} placeholder="First name" className={inputClass} /></span></label><label className="block space-y-2"><span className="block text-xs font-bold text-slate-400">Last name</span><span className="relative block"><User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input required autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} placeholder="Last name" className={`${inputClass} register-input--raise`} /></span></label></div>
            <label className="block space-y-2"><span className="text-xs font-bold text-slate-400">Email address</span><span className="relative block"><Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value.trim())} placeholder="parent@example.com" className={`${inputClass} register-input--raise-more`} /></span></label>
            <label className="block space-y-2"><span className="text-xs font-bold text-slate-400">Phone number</span><span className="relative block"><Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input type="tel" required inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number" autoComplete="tel" value={phone} onChange={event => setPhone(sanitizeIndianMobile(event.target.value))} placeholder="+919876543210" className={inputClass} /></span></label>
            <label className="block space-y-2"><span className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Create password</span><span className="text-[10px] text-slate-600">Minimum 6 characters</span></span><span className="relative block"><Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" /><input type={showPassword ? "text" : "password"} required minLength={6} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Create a secure password" className={`${inputClass} pr-11`} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3.5 top-3.5 text-slate-600 transition hover:text-slate-300">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>

            <button type="submit" disabled={isLoading || isFetchingSchools || schools.length === 0 || success} className="register-submit">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account...</> : <>Create parent account <ArrowRight className="h-4 w-4" /></>}</button>
          </form>

          <p className="mt-6 text-center text-xs text-[#6c7c88]">Already registered? <Link href={`/login?role=parent${selectedSchool ? `&simulate=${selectedSchool.subdomain}` : ""}`} className="font-bold text-[#008f7d] hover:text-[#006f62]">Sign in to Parent Portal</Link></p>
        </section>
      </div>
    </div>
  </main>;
}
