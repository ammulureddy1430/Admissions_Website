"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return setError("This reset link is invalid.");
    if (password.length < 8) return setError("Password must contain at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message || "Password reset failed.");
      setComplete(true);
    } catch (err: any) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] p-4">
    <section className="w-full max-w-md rounded-2xl border border-[#dceae6] bg-white p-7 shadow-xl">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f7f2] text-[#007f70]"><LockKeyhole className="h-5 w-5" /></div>
      <h1 className="mt-4 text-center text-xl font-extrabold text-[#071633]">Create a new password</h1>
      <p className="mt-2 text-center text-xs text-[#71818d]">Choose a secure password containing at least 8 characters.</p>
      {complete ? <div className="mt-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
        <p className="mt-3 text-sm font-bold text-[#071633]">Password reset successfully</p>
        <p className="mt-1 text-xs text-[#71818d]">You can now sign in using your new password.</p>
        <Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#007f70] px-5 py-2.5 text-xs font-bold text-white">Back to Login</Link>
      </div> : <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        <label className="block text-xs font-bold text-[#344054]">New Password<div className="relative mt-1.5"><input type={showPassword ? "text" : "password"} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-[#dceae6] p-3 pr-10 text-xs" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-3 text-[#71818d]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
        <label className="block text-xs font-bold text-[#344054]">Confirm Password<input type={showPassword ? "text" : "password"} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dceae6] p-3 text-xs" /></label>
        <button type="submit" disabled={loading || !token} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] py-3 text-xs font-bold text-white disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Resetting..." : "Reset Password"}</button>
      </form>}
    </section>
  </main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#007f70]" /></div>}><ResetPasswordForm /></Suspense>;
}
