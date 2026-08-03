"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Server, AlertCircle } from "lucide-react";

export default function SuperAdminSettings() {
  const [smtp, setSmtp] = useState({ host: "smtp.resend.com", port: 587, user: "resend", pass: "re_sec_key" });
  const [minio, setMinio] = useState({ endpoint: "localhost", port: 9000, accessKey: "minioadmin", secretKey: "minioadmin" });
  const [twilio, setTwilio] = useState({ sid: "ACxxxxxxxxxxxxxxxx", token: "tw_token_val", phone: "+14155552671" });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    setTimeout(() => {
      setActionLoading(false);
      setMessage("Platform settings updated successfully!");
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">System Infrastructure Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure global platform SMTP server details, Twilio credentials, and MinIO locally.</p>
      </div>

      {message && (
        <div className="bg-emerald-950/20 border border-emerald-800/50 text-emerald-300 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 max-w-2xl">
          <ShieldCheck className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSaveConfig} className="space-y-8 max-w-2xl">
        {/* Section 1: SMTP Config */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" /> SMTP Gateway (Resend Email Service)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase">SMTP Host</label>
              <input type="text" value={smtp.host} onChange={(e) => setSmtp(prev => ({ ...prev, host: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase">SMTP Port</label>
              <input type="number" value={smtp.port} onChange={(e) => setSmtp(prev => ({ ...prev, port: Number(e.target.value) }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">SMTP User</label>
              <input type="text" value={smtp.user} onChange={(e) => setSmtp(prev => ({ ...prev, user: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">SMTP Secret Key</label>
              <input type="password" value={smtp.pass} onChange={(e) => setSmtp(prev => ({ ...prev, pass: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono" />
            </div>
          </div>
        </div>

        {/* Section 2: Local S3/MinIO Config */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" /> Storage Gateway (MinIO Local S3)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase">Endpoint</label>
              <input type="text" value={minio.endpoint} onChange={(e) => setMinio(prev => ({ ...prev, endpoint: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase">Port</label>
              <input type="number" value={minio.port} onChange={(e) => setMinio(prev => ({ ...prev, port: Number(e.target.value) }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">Access Key</label>
              <input type="text" value={minio.accessKey} onChange={(e) => setMinio(prev => ({ ...prev, accessKey: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">Secret Access Key</label>
              <input type="password" value={minio.secretKey} onChange={(e) => setMinio(prev => ({ ...prev, secretKey: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono" />
            </div>
          </div>
        </div>

        {/* Section 3: SMS/Twilio Config */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" /> Notifications Gateway (Twilio SMS Service)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">Twilio Account SID</label>
              <input type="text" value={twilio.sid} onChange={(e) => setTwilio(prev => ({ ...prev, sid: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">Twilio Auth Token</label>
              <input type="password" value={twilio.token} onChange={(e) => setTwilio(prev => ({ ...prev, token: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">Sender Phone Number</label>
              <input type="text" value={twilio.phone} onChange={(e) => setTwilio(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
          </div>
        </div>

        <button disabled={actionLoading} type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-all shadow-lg active:scale-95">
          {actionLoading ? "Saving Configurations..." : "Save Infrastructure settings"}
        </button>
      </form>
    </div>
  );
}
