"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  School as SchoolIcon, 
  ArrowRight, 
  Lock, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  UserCheck,
  Check,
  ChevronLeft,
} from "lucide-react";

export default function StudentAssessmentLogin() {
  const router = useRouter();
  
  // App State
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [authStep, setAuthStep] = useState<"SELECT_SCHOOL" | "VERIFY">("SELECT_SCHOOL");
  const [code, setCode] = useState("");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const hasSchoolChoice = schools.length > 1;

  // Load available schools on mount
  useEffect(() => {
    async function loadSchools() {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:5001/school/list");
        if (res.ok) {
          const data = await res.json();
          setSchools(data);
          // If there's only one school, pre-select it
          if (data.length === 1) {
            setSelectedSchool(data[0]);
            setAuthStep("VERIFY");
          }
        } else {
          setError("Failed to fetch school listings from server.");
        }
      } catch (err) {
        console.error(err);
        setError("Could not connect to school registry database.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSchools();
  }, []);

  const handleSelectSchool = (school: any) => {
    setSelectedSchool(school);
    setError(null);
    setAuthStep("VERIFY");
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:5001/assessments/student/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          code: code.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification failed.");
      }

      // Login success! Save token
      localStorage.setItem("studentToken", data.accessToken);
      localStorage.setItem("studentSchoolId", selectedSchool.id);
      localStorage.setItem("studentName", `${data.student.firstName} ${data.student.lastName}`);
      localStorage.setItem("studentAppId", data.student.id);

      setSuccessMsg("Logged in successfully! Redirecting...");
      setTimeout(() => {
        router.push("/student-assessment/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Something went wrong during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white font-sans text-[#102a43] lg:grid-cols-[44%_56%]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#063b37] p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <SchoolIcon className="h-6 w-6 text-[#8de1d2]" />
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight !text-white">Admissions OS</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#92c9c1]">Student assessments</p>
          </div>
        </div>

        <div className="max-w-[500px]">
          <span className="inline-flex rounded-full bg-white/8 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9fe6da] ring-1 ring-white/10">
            Secure student access
          </span>
          <h2 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] !text-white xl:text-[48px]">
            Focus on the assessment. We&apos;ll handle the rest.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-7 !text-[#b4d4cf]">
            Use the access code issued by your school to securely open your assessment.
          </p>
          <div className="mt-9 space-y-4">
            {["School-verified sign in", "Protected assessment access", "Your progress stays secure"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#e4f4f1]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0d766b]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 pt-6 text-xs text-[#91beb8]">
          <ShieldCheck className="h-4 w-4" />
          Protected and managed by your school
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-14">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#008f80] lg:hidden" />
        <div className="w-full max-w-[470px] space-y-4">
        {/* Logo / Header Area */}
        <div className="text-left">
          <div className="flex items-center gap-3.5">
            {selectedSchool?.logo ? (
              <img 
                src={selectedSchool.logo} 
                alt={selectedSchool.name} 
                className="h-12 w-12 shrink-0 rounded-xl border border-[#cfe3de] bg-white object-contain p-1.5 shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e5f6f2] text-[#008f80] ring-1 ring-[#c8e9e2]">
                <SchoolIcon className="h-5 w-5" strokeWidth={1.8} />
              </div>
            )}
            <h1 className="min-w-0 text-xl font-extrabold leading-tight tracking-[-0.03em] text-[#0b1f33] sm:text-[22px]">
              {selectedSchool ? selectedSchool.name : "Admissions OS"}
            </h1>
          </div>
          {authStep === "SELECT_SCHOOL" && (
            <div className="mt-4 flex items-center gap-2 border-t border-[#dcebe7] pt-3.5 text-sm font-medium leading-5 text-[#607586]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#008f80]" />
              <p>Choose your school to continue</p>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#f1c7ca] bg-[#fff5f5] p-3.5 text-xs leading-5 text-[#a8323a]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-[#bfe6dc] bg-[#f0faf7] p-3.5 text-xs leading-5 text-[#087366]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Select School */}
        {authStep === "SELECT_SCHOOL" && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#516477]">Available schools</h2>
              <p className="text-xs text-[#7b8997]">Select the campus managing your assessment</p>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-7 w-7 animate-spin text-[#008f80]" />
              </div>
            ) : (
              <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                {schools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-[#dfe9e7] bg-white p-4 text-left transition hover:border-[#7fc9be] hover:bg-[#f4fbf9] focus-visible:ring-4 focus-visible:ring-[#ccece6]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f5f2] text-xs font-extrabold uppercase text-[#087a70]">
                        {school.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#183047]">{school.name}</div>
                        <div className="mt-0.5 text-[11px] text-[#748495]">{school.city}, {school.state}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#8ba09d] transition group-hover:translate-x-0.5 group-hover:text-[#008f80]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Verify school-issued access code */}
        {authStep === "VERIFY" && (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <div className="relative">
                <input
                  id="student-code"
                  required
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  maxLength={20}
                  placeholder="Enter access code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-14 w-full rounded-xl border border-[#ccdcda] bg-[#fbfdfc] pl-12 pr-4 text-[15px] font-semibold tracking-[0.12em] text-[#152b40] placeholder:font-normal placeholder:tracking-normal placeholder:text-[#92a0ad] focus:border-[#008f80] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d9f2ed]"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#718697]">
                  <Lock className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {hasSchoolChoice && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("SELECT_SCHOOL");
                    setCode("");
                  }}
                  className="flex h-13 items-center justify-center gap-2 rounded-xl border border-[#ccdcda] px-5 text-sm font-bold text-[#52697a] transition hover:bg-[#f4f8f7]"
                >
                  <ChevronLeft className="h-4 w-4" /> School
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-[#008f80] px-5 text-sm font-extrabold !text-white shadow-[0_10px_24px_rgba(0,143,128,0.22)] transition hover:bg-[#007d70] disabled:cursor-not-allowed disabled:bg-[#a5c9c3] disabled:!text-[#315d58] disabled:shadow-none"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                ) : (
                  <>
                    Continue to Assessment <UserCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        </div>
      </section>
    </main>
  );
}
