"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle, ChevronLeft, ChevronRight, Edit, Eye, EyeOff, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";

const API = "http://localhost:5001";
const EMPTY_FORM = {
  name: "", schoolCode: "", schoolType: "School", board: "CBSE", logo: "",
  address: "", city: "", state: "", country: "India", contactPerson: "", email: "", phone: "", website: "", principalName: "",
  primaryBrandColor: "#3b82f6", secondaryBrandColor: "#8b5cf6",
  adminFirstName: "School", adminLastName: "Admin", adminEmail: "school.admin@gmail.com", adminPassword: "Password123!",
};

type FormState = typeof EMPTY_FORM;

function Field({ label, name, form, onChange, type = "text", placeholder, required = true }: {
  label: string; name: keyof FormState; form: FormState; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  const isPhone = name === "phone";
  const isGmail = name === "email" || name === "adminEmail";
  return <label className="space-y-1 text-[11px] text-slate-400 font-medium">
    <span>{label}{required ? " *" : ""}</span>
    <input name={name} type={type} required={required} value={form[name]} onChange={onChange} placeholder={placeholder}
      inputMode={isPhone ? "numeric" : undefined}
      maxLength={isPhone ? 10 : undefined}
      pattern={isPhone ? "[0-9]{10}" : isGmail ? "[^@\\s]+@gmail\\.com" : undefined}
      title={isPhone ? "Enter exactly 10 digits" : isGmail ? "Enter a Gmail address ending with @gmail.com" : undefined}
      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500" />
  </label>;
}

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editSchool, setEditSchool] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<{ name: string; adminEmail: string; adminPassword?: string; schoolId: string; subdomain: string } | null>(null);

  const fetchSchools = async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/super-admin/schools`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!res.ok) throw new Error("Failed to fetch schools.");
      setSchools(await res.json());
    } catch (err: any) { setError(err.message || "Could not load schools."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchSchools(); }, []);

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const normalizedValue = name === "schoolCode"
        ? value.replace(/[^a-zA-Z0-9-]/g, "")
        : name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value;
      const updated = { ...prev, [name]: normalizedValue };
      if (name === "schoolCode" && value.trim()) {
        const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (clean) {
          if (!prev.email || prev.email.includes("@school.edu")) updated.email = `${clean}@gmail.com`;
          if (!prev.adminEmail || prev.adminEmail === "school.admin@gmail.com" || prev.adminEmail.includes("@school.edu")) updated.adminEmail = `${clean}.admin@gmail.com`;
        }
      }
      return updated;
    });
  };

  const fileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setOnboardError("Logo must be an image file.");
    if (file.size > 75 * 1024) return setOnboardError("Logo must be smaller than 75 KB.");
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const [affiliationCert, setAffiliationCert] = useState<File | null>(null);
  const [registrationProof, setRegistrationProof] = useState<File | null>(null);

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.schoolCode.trim()) {
        setOnboardError("Please complete School Name and School Code before continuing.");
        return false;
      }
    } else if (step === 2) {
      const missing2 = ["address", "city", "state", "country", "contactPerson", "email", "phone", "principalName"].filter(k => !form[k as keyof FormState].trim());
      if (missing2.length > 0) {
        setOnboardError("Please complete all required contact details before continuing.");
        return false;
      }
      const emailRegex = /^[^\s@]+@gmail\.com$/i;
      if (!emailRegex.test(form.email.trim())) {
        setOnboardError("School email must be a valid Gmail address ending with @gmail.com.");
        return false;
      }
      if (!/^\d{10}$/.test(form.phone)) {
        setOnboardError("Phone number must contain exactly 10 digits.");
        return false;
      }
    } else if (step === 3) {
      const missing3 = ["adminFirstName", "adminLastName", "adminEmail", "adminPassword"].filter(k => !form[k as keyof FormState].trim());
      if (missing3.length > 0) {
        setOnboardError("Please fill in Admin First Name, Admin Last Name, Admin Email, and Admin Password to proceed to Step 4.");
        return false;
      }
      const emailRegex = /^[^\s@]+@gmail\.com$/i;
      if (!emailRegex.test(form.adminEmail.trim())) {
        setOnboardError("Admin email must be a valid Gmail address ending with @gmail.com.");
        return false;
      }
      if (form.adminPassword.length < 6) {
        setOnboardError("Admin password must be at least 6 characters.");
        return false;
      }
    } else if (step === 4) {
      if (!affiliationCert || !registrationProof) {
        setOnboardError("Please select both Board Affiliation Certificate and School Registration Proof before submitting.");
        return false;
      }
    }
    setOnboardError(null);
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(4, s + 1)); };
  const close = () => { setIsOnboardOpen(false); setStep(1); setOnboardError(null); setAffiliationCert(null); setRegistrationProof(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      next();
      return;
    }
    if (!validateStep()) return;
    setOnboardLoading(true); setOnboardError(null);
    try {
      const payload = { ...form, website: form.website || undefined, logo: form.logo || undefined };
      const response = await fetch(`${API}/school/onboard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || "Failed to onboard school.");
      setSuccess({ name: data.school.name, adminEmail: data.admin.email, adminPassword: form.adminPassword, schoolId: data.school.id, subdomain: data.school.subdomain });
      setForm(EMPTY_FORM); close(); await fetchSchools();
    } catch (err: any) {
      const errMsg = err.message || "Something went wrong.";
      setOnboardError(errMsg);
      const lower = errMsg.toLowerCase();
      if (lower.includes("admin email") || lower.includes("password")) {
        setStep(3);
      } else if (lower.includes("school email") || lower.includes("email")) {
        setStep(2);
      } else if (lower.includes("code") || lower.includes("name")) {
        setStep(1);
      }
    } finally { setOnboardLoading(false); }
  };

  const updateSchool = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      const res = await fetch(`${API}/super-admin/schools/${editSchool.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ name: editSchool.name, customDomain: editSchool.customDomain || null }) });
      if (!res.ok) throw new Error("Failed to update school.");
      setEditSchool(null); await fetchSchools();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const deleteSchool = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action will permanently remove the school instance and its associated records.`)) return;
    try {
      const res = await fetch(`${API}/super-admin/schools/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Failed to delete school.");
      await fetchSchools();
    } catch (err: any) {
      setError(err.message || "Failed to delete school.");
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return <div className="space-y-8 animate-in fade-in duration-200">
    <div className="flex justify-between items-center">
      <div><h1 className="text-2xl font-extrabold text-[#071633]">Multi-Tenant School Listings</h1><p className="text-xs text-slate-500 mt-1">Manage tenant configurations, domains, and brand settings.</p></div>
      <button onClick={() => { setSuccess(null); setIsOnboardOpen(true); }} className="bg-[#009b87] hover:bg-[#007f70] text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition"><Building2 className="h-4 w-4" /> Onboard New School Instance</button>
    </div>

    {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex gap-2"><AlertCircle className="h-4 w-4 text-rose-600" />{error}</div>}
    {success && <div className="bg-[#e6f7f2] border border-[#b2e5d9] text-[#006054] p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xs font-medium">
      <CheckCircle className="h-5 w-5 text-[#008f7d] shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-extrabold text-[#071633] text-sm">{success.name} was onboarded successfully!</p>
        <p className="text-slate-600 font-medium">Admin email: <strong className="text-[#071633]">{success.adminEmail}</strong> · Password: <code className="bg-[#d2ebe3] text-[#006054] px-1.5 py-0.5 rounded font-bold font-mono">{success.adminPassword || "Password123!"}</code> · Tenant subdomain: <code className="bg-[#d2ebe3] text-[#006054] px-1.5 py-0.5 rounded font-bold">{success.subdomain}.localhost</code></p>
        <Link className="inline-block text-[#008f7d] hover:text-[#006054] font-bold underline mt-1.5" href={`/login?simulate=${success.subdomain}`}>Open School Login →</Link>
      </div>
    </div>}

    <div className="bg-white border border-[#dceae6] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(28,65,56,.03)] text-slate-700">
      <table className="w-full text-left text-xs"><thead><tr className="bg-[#f6faf8] border-b border-[#dceae6] text-[#71818d] font-bold uppercase text-[9px]"><th className="p-4">School</th><th className="p-4">Code / Domain</th><th className="p-4">Type & Board</th><th className="p-4">Logo</th><th className="p-4">Created</th><th className="p-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-[#f0f6f4]">{schools.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic"><Building2 className="h-10 w-10 mx-auto mb-3 text-slate-300" /><p>No schools registered yet.</p></td></tr> : schools.map(s => <tr key={s.id} className="hover:bg-[#fcfefe]"><td className="p-4 font-bold text-[#071633]">{s.name}<span className="block text-[10px] text-slate-500 font-normal">{s.city}{s.state ? `, ${s.state}` : ""}</span></td><td className="p-4"><span className="block font-mono text-slate-500">{s.code}</span><span className="text-[#008f7d] font-mono font-bold">{s.subdomain}.localhost</span></td><td className="p-4 text-slate-600 font-medium">{s.type || "—"} · {s.board || "—"}</td><td className="p-4">{s.logo ? <img src={s.logo} alt={`${s.name} logo`} className="h-10 w-10 rounded-xl object-contain bg-white border border-[#dceae6] p-1 shadow-sm" /> : <span style={{ backgroundColor: s.themeColor || "#3b82f6" }} className="inline-block h-4 w-4 rounded-full border border-slate-300 shadow-xs" />}</td><td className="p-4 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-4 text-right flex items-center justify-end gap-2"><button onClick={() => setEditSchool(s)} title="Edit Settings" className="bg-[#009b87] hover:bg-[#007f70] text-white p-2 rounded-full shadow-xs transition flex items-center justify-center"><Edit className="h-3.5 w-3.5 text-white" /></button><button onClick={() => deleteSchool(s.id, s.name)} title="Delete School" className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-full shadow-xs transition flex items-center justify-center"><Trash2 className="h-3.5 w-3.5 text-white" /></button></td></tr>)}</tbody>
      </table>
    </div>

    {editSchool && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={updateSchool} className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4"><h3 className="font-bold text-white">Edit School Settings</h3>{["name", "customDomain"].map(key => <label key={key} className="block text-xs text-slate-400 capitalize">{key}<input value={editSchool[key] || ""} onChange={e => setEditSchool({ ...editSchool, [key]: e.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" /></label>)}<div className="flex gap-3"><button type="button" onClick={() => setEditSchool(null)} className="flex-1 border border-slate-800 py-2 rounded-lg">Cancel</button><button disabled={actionLoading} className="flex-1 bg-indigo-600 py-2 rounded-lg font-bold">Save</button></div></form></div>}

    {isOnboardOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 overflow-y-auto"><div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl">
      <button onClick={close} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
      <div className="mb-6"><h3 className="text-lg font-bold text-white">Onboard New School Instance</h3><p className="text-xs text-slate-400 mt-1">Step {step} of 4 · {step === 1 ? "School identity" : step === 2 ? "Contact details" : step === 3 ? "Administrator" : "Verification & Compliance Documents"}</p></div>
      <div className="grid grid-cols-4 gap-2 mb-6">{[1,2,3,4].map(i => <div key={i} className={`h-1 rounded ${i <= step ? "bg-indigo-500" : "bg-slate-800"}`} />)}</div>
      {onboardError && <div className="bg-rose-950/30 border border-rose-800/50 text-rose-300 p-3 rounded-lg text-xs mb-4 flex gap-2"><AlertCircle className="h-4 w-4" />{onboardError}</div>}
      <form onSubmit={submit}>
        {step === 1 && <div className="grid md:grid-cols-2 gap-4">
          <Field label="School Name" name="name" form={form} onChange={change} placeholder="Greenwood Academy" /><Field label="School Code" name="schoolCode" form={form} onChange={change} placeholder="GREENWOOD" />
          <label className="space-y-1 text-[11px] text-slate-400">School Type *<select value={form.schoolType} onChange={e => setForm({ ...form, schoolType: e.target.value })} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white">{["Preschool","School","College"].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="space-y-1 text-[11px] text-slate-400">Board *<select value={form.board} onChange={e => setForm({ ...form, board: e.target.value })} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white">{["CBSE","ICSE","State","IB","Cambridge"].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="md:col-span-2 space-y-1 text-[11px] text-slate-400">Logo (image, max 75 KB)<input type="file" accept="image/*" onChange={fileChange} className="block w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs" /></label>
          <p className="md:col-span-2 text-[10px] text-slate-500">Tenant subdomain: <span className="font-mono text-indigo-400">{form.schoolCode.toLowerCase() || "school-code"}.localhost</span></p>
        </div>}
        {step === 2 && <div className="grid md:grid-cols-2 gap-4"><div className="md:col-span-2"><Field label="Address" name="address" form={form} onChange={change} /></div><Field label="City" name="city" form={form} onChange={change} /><Field label="State" name="state" form={form} onChange={change} /><Field label="Country" name="country" form={form} onChange={change} /><Field label="Contact Person" name="contactPerson" form={form} onChange={change} /><Field label="School Email" name="email" type="email" form={form} onChange={change} placeholder="schoolname@gmail.com" /><Field label="Phone" name="phone" type="tel" form={form} onChange={change} placeholder="10-digit phone number" /><Field label="Website" name="website" type="url" required={false} form={form} onChange={change} placeholder="https://school.edu" /><Field label="Principal Name" name="principalName" form={form} onChange={change} /></div>}
        {step === 3 && <div className="grid md:grid-cols-2 gap-4">
          <Field label="Admin First Name" name="adminFirstName" form={form} onChange={change} />
          <Field label="Admin Last Name" name="adminLastName" form={form} onChange={change} />
          <Field label="Admin Email" name="adminEmail" type="email" form={form} onChange={change} placeholder="admin@gmail.com" />
          <div className="space-y-1 text-[11px] text-slate-400">
            <span>Admin Password *</span>
            <div className="relative">
              <input
                name="adminPassword"
                type={showPassword ? "text" : "password"}
                required
                value={form.adminPassword}
                onChange={change}
                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>}
        {step === 4 && <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 border-b border-slate-800 pb-2">
            <p className="text-xs font-bold text-white">Compliance & Onboarding Documents</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Upload school verification certificates for Pehchaan Super Admin compliance auditing:</p>
          </div>
          <label className="space-y-1 text-[11px] text-slate-400">Board Affiliation Certificate (PDF/Image) *<input required type="file" onChange={e => setAffiliationCert(e.target.files?.[0] || null)} className="block w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs" /></label>
          <label className="space-y-1 text-[11px] text-slate-400">School Registration Proof (PDF/Image) *<input required type="file" onChange={e => setRegistrationProof(e.target.files?.[0] || null)} className="block w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs" /></label>
          <label className="space-y-1 text-[11px] text-slate-400">Tax Exemption / Trust Deed (Optional)<input type="file" className="block w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs" /></label>
          <label className="space-y-1 text-[11px] text-slate-400">Accreditation Certificate (Optional)<input type="file" className="block w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs" /></label>
        </div>}
        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-800"><button type="button" onClick={step === 1 ? close : () => { setOnboardError(null); setStep(s => s - 1); }} className="flex-1 border border-slate-800 py-2.5 rounded-lg text-xs text-slate-400 flex justify-center gap-1"><ChevronLeft className="h-4 w-4" />{step === 1 ? "Cancel" : "Back"}</button>{step < 4 ? <button type="button" onClick={next} className="flex-1 bg-indigo-600 py-2.5 rounded-lg text-xs font-bold flex justify-center gap-1">Continue<ChevronRight className="h-4 w-4" /></button> : <button disabled={onboardLoading} type="submit" className="flex-1 bg-indigo-600 py-2.5 rounded-lg text-xs font-bold flex justify-center gap-2">{onboardLoading && <Loader2 className="h-4 w-4 animate-spin" />}Create School Instance & Submit</button>}</div>
      </form>
    </div></div>}
  </div>;
}
