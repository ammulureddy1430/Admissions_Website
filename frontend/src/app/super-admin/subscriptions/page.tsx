"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, PlusCircle, Check } from "lucide-react";

export default function SuperAdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [newPlan, setNewPlan] = useState({ name: "", price: 99, billingCycle: "MONTHLY", maxApplications: 1000, maxLeads: 5000 });
  const [newSub, setNewSub] = useState({ schoolId: "", planId: "", endDate: "" });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        const [subsRes, plansRes, schoolsRes] = await Promise.all([
          fetch("http://localhost:5001/super-admin/subscriptions", { headers }),
          fetch("http://localhost:5001/super-admin/plans", { headers }),
          fetch("http://localhost:5001/super-admin/schools", { headers }),
        ]);

        if (subsRes.ok) setSubs(await subsRes.json());
        if (plansRes.ok) setPlans(await plansRes.json());
        if (schoolsRes.ok) setSchools(await schoolsRes.json());
      } catch (err: any) {
        setError(err.message || "Error loading subscription details.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/super-admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newPlan,
          price: Number(newPlan.price),
          maxApplications: Number(newPlan.maxApplications),
          maxLeads: Number(newPlan.maxLeads),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setPlans(prev => [...prev, created]);
        setIsPlanOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/super-admin/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(newSub),
      });
      if (res.ok) {
        const created = await res.json();
        // Reload list to get complete joins
        const subRes = await fetch("http://localhost:5001/super-admin/subscriptions", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (subRes.ok) setSubs(await subRes.json());
        setIsSubOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#071633]">School Subscriptions & Billing Plans</h1>
          <p className="text-xs text-slate-500 mt-1">Configure multi-tenant plan pricing, limits, and active subscription logs.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPlanOpen(true)}
            className="bg-white border border-[#009b87] hover:bg-[#e6f7f2] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
          >
            <PlusCircle className="h-4 w-4 text-[#009b87] shrink-0" />
            <span className="text-[#071633]">New Plan</span>
          </button>
          <button 
            onClick={() => setIsSubOpen(true)}
            className="bg-[#009b87] hover:bg-[#007f70] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
          >
            <PlusCircle className="h-4 w-4 text-white shrink-0" />
            <span>Link Subscription</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-955/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Left 2 Columns Active Subscriptions, Right Column Plan Config Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Active Subscriptions list table */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
          <h4 className="font-bold text-sm text-white">Tenant Subscription Matrix</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="pb-3">School</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Expiration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td className="py-4 font-bold text-white">
                      {s.school?.name} <br />
                      <span className="text-[10px] text-slate-500 font-normal font-mono">{s.school?.subdomain}.localhost</span>
                    </td>
                    <td className="py-4 font-semibold text-slate-300">{s.plan?.name}</td>
                    <td className="py-4">
                      <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 px-2.5 py-0.5 rounded text-[10px] font-bold">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-slate-400">{new Date(s.endDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan Config Cards */}
        <div className="space-y-6">
          <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Available Subscription Plans</h4>
          <div className="space-y-4">
            {plans.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-white">{p.name}</h5>
                    <span className="text-xl font-extrabold text-indigo-400">₹{p.price}/mo</span>
                  </div>
                  <span className="subscription-cycle-badge">
                    {p.billingCycle}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-850 pt-3">
                  <div className="flex justify-between">
                    <span>Max Admissions Apps:</span>
                    <span className="font-bold text-white">{p.maxApplications.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Parent Enquiries:</span>
                    <span className="font-bold text-white">{p.maxLeads.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan creation overlay */}
      {isPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreatePlan} className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white">Create School Subscription Plan</h3>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Plan Name *</label>
              <input required type="text" placeholder="e.g. Enterprise Tier" value={newPlan.name} onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Pricing (INR/mo) *</label>
                <input required type="number" value={newPlan.price} onChange={(e) => setNewPlan(prev => ({ ...prev, price: Number(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Billing Cycle</label>
                <select value={newPlan.billingCycle} onChange={(e) => setNewPlan(prev => ({ ...prev, billingCycle: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Max Applications</label>
                <input required type="number" value={newPlan.maxApplications} onChange={(e) => setNewPlan(prev => ({ ...prev, maxApplications: Number(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Max Leads</label>
                <input required type="number" value={newPlan.maxLeads} onChange={(e) => setNewPlan(prev => ({ ...prev, maxLeads: Number(e.target.value) }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsPlanOpen(false)} className="flex-1 bg-transparent border border-slate-800 hover:bg-slate-800 py-2 rounded-lg text-xs text-slate-400">
                Cancel
              </button>
              <button disabled={actionLoading} type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-xs font-bold text-white">
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subscription linking overlay */}
      {isSubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateSubscription} className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white">Subscribe School Tenant</h3>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Select School *</label>
              <select required value={newSub.schoolId} onChange={(e) => setNewSub(prev => ({ ...prev, schoolId: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="">-- Select --</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.subdomain})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Select Plan *</label>
              <select required value={newSub.planId} onChange={(e) => setNewSub(prev => ({ ...prev, planId: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="">-- Select --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Expiration Date *</label>
              <input required type="date" value={newSub.endDate} onChange={(e) => setNewSub(prev => ({ ...prev, endDate: e.target.value }))} className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsSubOpen(false)} className="flex-1 bg-transparent border border-slate-800 hover:bg-slate-800 py-2 rounded-lg text-xs text-slate-400">
                Cancel
              </button>
              <button disabled={actionLoading} type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-xs font-bold text-white">
                Activate Subscription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
