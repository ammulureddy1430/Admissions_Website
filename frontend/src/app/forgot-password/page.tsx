"use client";

import { Suspense, useEffect, useState } from "react";
import { School, Loader2, Mail, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const isHigherEducation = searchParams.get("portal") === "study-abroad";
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSchools, setIsFetchingSchools] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [developmentResetUrl, setDevelopmentResetUrl] = useState<string | null>(null);

  // Fetch all schools for the tenant dropdown
  useEffect(() => {
    if (isHigherEducation) {
      setIsFetchingSchools(false);
      return;
    }
    async function fetchSchools() {
      try {
        const response = await fetch("http://localhost:5001/school/list");
        if (!response.ok) throw new Error("Failed to fetch tenants.");
        const data = await response.json();
        setSchools(data);
        if (data.length > 0) {
          setSelectedSchoolId(data[0].id);
        }
      } catch (err) {
        console.error("Error loading schools list:", err);
      } finally {
        setIsFetchingSchools(false);
      }
    }
    fetchSchools();
  }, [isHigherEducation]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5001/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          portal: isHigherEducation ? "study-abroad" : "school",
          ...(!isHigherEducation ? { schoolId: selectedSchoolId } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message || "Unable to send the reset link.");
      setDevelopmentResetUrl(payload.developmentResetUrl || null);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Unable to send the reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-page min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="forgot-password-page__decoration pointer-events-none absolute inset-0" />

      <div className="relative z-10 w-full max-w-md">
        
        {/* Back Link */}
        <Link 
          href={isHigherEducation ? "/login?role=study-abroad" : "/login"}
          className="forgot-password-back group mb-6 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to login
        </Link>

        {/* Card */}
        <div className="forgot-password-card rounded-2xl p-6 md:p-8">
          <div className="forgot-password-brand mb-6 flex items-center justify-center gap-3">
            <div className="forgot-password-brand__icon p-2.5 rounded-xl">
              <School className="h-5 w-5" />
            </div>
            <div><span className="block text-sm font-extrabold text-[#071633]">Password Recovery</span><span className="mt-0.5 block text-[10px] font-semibold text-[#009b87]">Secure account access</span></div>
          </div>

          <h2 className="text-xl font-extrabold text-center text-[#071633] mb-2">Forgot Password?</h2>
          <p className="text-xs text-[#71818d] text-center mb-7">
            Enter your email to receive recovery instructions.
          </p>

          {error && (
            <div className="bg-rose-955/30 border border-rose-800/50 text-rose-300 p-3 rounded-lg text-xs font-semibold mb-6 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="forgot-password-success p-5 rounded-xl text-xs font-semibold space-y-2 text-center">
              <ShieldCheck className="h-8 w-8 mx-auto" />
              <h5 className="font-bold">Reset Email Dispatched!</h5>
              <p className="forgot-password-success__copy text-[10px] leading-normal">Check your email inbox for the password recovery link. Remember to check your spam folder.</p>
              {developmentResetUrl && <Link href={developmentResetUrl} className="block break-all rounded-lg border border-emerald-300 bg-white p-2 text-[10px] font-bold text-emerald-800">Open development reset link</Link>}
              <Link href="/login" className="forgot-password-success__action keep-white inline-block font-semibold py-2 px-4 rounded-lg text-[10px] transition-colors mt-2">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              
              {/* School Selector */}
              {!isHigherEducation && <div className="space-y-1">
                <label className="text-xs text-[#344054] font-bold">Select School *</label>
                {isFetchingSchools ? (
                  <div className="flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400 mr-2" />
                    <span className="text-xs text-slate-500 font-medium">Loading tenants...</span>
                  </div>
                ) : (
                  <select 
                    required
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                  >
                    <option value="" disabled>-- Select School --</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
                  <input 
                    type="email" 
                    required 
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                disabled={isLoading || (!isHigherEducation && isFetchingSchools)}
                className="forgot-password-submit keep-white w-full font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending link...
                  </>
                ) : (
                  "Send Recovery Link"
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#009b87]" /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
