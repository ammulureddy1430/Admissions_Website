"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { INDIAN_MOBILE_PATTERN, sanitizeIndianMobile } from "@/lib/phone";

export default function ParentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setProfile(JSON.parse(stored));
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    setError(null);
    try {
      const phone = String(profile.phone || "").replace(/[\s-]/g, "");
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) {
        throw new Error("Enter a valid 10-digit Indian mobile number.");
      }
      const response = await fetch("http://localhost:5001/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phone,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = Array.isArray(result?.message) ? result.message.join(" ") : result?.message;
        throw new Error(detail || "Profile details could not be saved.");
      }
      setProfile(result);
      localStorage.setItem("user", JSON.stringify(result));
      window.dispatchEvent(new CustomEvent("parent-profile-updated", { detail: result }));
      setMessage("Profile details saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile details could not be saved.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Parent Profile Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Review contact numbers, emails, and active security setups.</p>
      </div>

      {message && (
        <div className="parent-profile-success">
          <ShieldCheck className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="max-w-lg rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 max-w-lg">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-400" /> Contact Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase">First Name</label>
            <input required minLength={2} maxLength={50} type="text" value={profile.firstName} onChange={(e) => setProfile((prev: any) => ({ ...prev, firstName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase">Last Name</label>
            <input required minLength={1} maxLength={50} type="text" value={profile.lastName} onChange={(e) => setProfile((prev: any) => ({ ...prev, lastName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] text-slate-400 uppercase">Email Address (Read-only)</label>
            <input disabled type="email" value={profile.email} className="w-full bg-slate-950/40 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-500 font-semibold cursor-not-allowed" />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] text-slate-400 uppercase">Phone Number</label>
            <input required type="tel" inputMode="numeric" maxLength={13} pattern={INDIAN_MOBILE_PATTERN} title="Enter a valid 10-digit Indian mobile number" value={profile.phone || ""} onChange={(e) => setProfile((prev: any) => ({ ...prev, phone: sanitizeIndianMobile(e.target.value) }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
        </div>

        <button disabled={actionLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-colors shadow-lg shadow-indigo-600/10 active:scale-95">
          {actionLoading ? "Saving Details..." : "Save Profile Details"}
        </button>
      </form>
    </div>
  );
}
