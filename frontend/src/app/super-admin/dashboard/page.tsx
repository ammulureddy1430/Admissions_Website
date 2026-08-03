"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, CircleDollarSign, CreditCard, FileText, Loader2, Plus, ShieldCheck, TrendingUp, Users } from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5001/super-admin/analytics", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Platform analytics could not be loaded.");
      setStats(await response.json());
      setError(null);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    try { setUserName(JSON.parse(localStorage.getItem("user") || "{}").firstName || "Admin"); } catch {}
    fetchStats();
    const interval = window.setInterval(() => fetchStats(), 15000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") fetchStats(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [fetchStats]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  if (error) return <div className="flex items-center gap-2 rounded-2xl border border-rose-800/40 bg-rose-950/20 p-4 text-xs font-semibold text-rose-300"><AlertCircle className="h-4 w-4" />{error}</div>;

  const cards = [
    { title: "Total schools", value: stats?.schools || 0, icon: Building2, color: "cyan", note: "Registered tenants", href: "/super-admin/schools" },
    { title: "Active subscriptions", value: stats?.activeSubscriptions || 0, icon: TrendingUp, color: "blue", note: "Currently billing", href: "/super-admin/subscriptions" },
    { title: "Monthly revenue", value: `₹${(stats?.mrr || 0).toLocaleString()}`, icon: CircleDollarSign, color: "emerald", note: "Recurring revenue", href: "/super-admin/subscriptions" },
    { title: "Applications", value: stats?.totalApplications || 0, icon: FileText, color: "amber", note: "Across all schools", href: "/super-admin/applications" },
  ];
  const colorMap: Record<string, string> = {
    cyan: "super-admin-icon-primary",
    blue: "text-blue-300 bg-blue-500/10 border-blue-500/15",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/15",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/15",
  };

  return <div className="mx-auto max-w-7xl space-y-7 animate-in fade-in duration-300">
    <header className="admin-dashboard-header">
      <div><span>Platform overview</span><h1>Good to see you, {userName}.</h1><p>Here’s what’s happening across Pehchaan today.</p></div>
      <Link href="/super-admin/schools" className="admin-dashboard-action"><Plus className="h-4 w-4" /> Onboard a school</Link>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => { const Icon = card.icon; return <Link key={card.title} href={card.href} aria-label={`Open ${card.title}`} className="super-dashboard-card group relative block overflow-hidden rounded-2xl p-5 transition hover:-translate-y-0.5 focus-visible:-translate-y-0.5"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{card.title}</p><p className="mt-3 text-3xl font-black tracking-tight text-[#071633]">{card.value}</p></div><span className={`rounded-xl border p-2.5 ${colorMap[card.color]}`}><Icon className="h-5 w-5" /></span></div><div className="mt-4 flex items-center justify-between"><p className="text-[10px] font-medium text-slate-600">{card.note}</p><ArrowRight className="h-3.5 w-3.5 text-[#71818d] transition-transform group-hover:translate-x-0.5" /></div><div className={`absolute inset-x-0 bottom-0 h-0.5 opacity-60 ${card.color === "cyan" ? "bg-cyan-400" : card.color === "blue" ? "bg-blue-400" : card.color === "emerald" ? "bg-emerald-400" : "bg-amber-400"}`} /></Link>; })}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <article className="super-dashboard-card rounded-2xl p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-[#071633]">Subscription distribution</h2><p className="mt-1 text-[10px] text-slate-500">Active schools grouped by billing plan</p></div><CreditCard className="h-5 w-5 text-cyan-400" /></div>
        <div className="mt-7 space-y-6">{(stats?.plans || []).length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-xs text-slate-500">No subscription plans configured.</div> : stats.plans.map((plan: any) => { const total = stats?.activeSubscriptions || 0; const percent = total ? Math.min(100, Math.round(plan.count / total * 100)) : 0; return <div key={plan.id}><div className="mb-2.5 flex items-end justify-between"><div><p className="text-xs font-bold text-slate-200">{plan.name}</p><p className="mt-1 text-[10px] text-slate-500">₹{plan.price.toLocaleString()} per month</p></div><p className="text-xs font-bold text-cyan-300">{plan.count} <span className="font-normal text-slate-600">schools · {percent}%</span></p></div><div className="h-2 overflow-hidden rounded-full bg-slate-950"><div style={{ width: `${percent}%` }} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" /></div>{total === 0 && <p className="no-subscription-notice">No active subscriptions yet. Assign a plan to an onboarded school.</p>}</div>; })}</div>
      </article>

      <aside className="space-y-5">
        <article className="super-dashboard-card rounded-2xl p-6"><span className="super-admin-icon-primary flex h-10 w-10 items-center justify-center rounded-xl border"><ShieldCheck className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-extrabold text-[#071633]">Platform is ready</h2><p className="mt-2 text-xs leading-5 text-slate-500">Onboard schools, assign subscription plans, and monitor applications from one console.</p></article>
        <article className="super-dashboard-card rounded-2xl p-5"><h2 className="text-xs font-extrabold text-[#071633]">Quick actions</h2><div className="mt-3 space-y-1">{[
          { href: "/super-admin/schools", label: "Manage schools", icon: Building2 },
          { href: "/super-admin/subscriptions", label: "Review subscriptions", icon: CreditCard },
          { href: "/super-admin/users", label: "View global users", icon: Users },
        ].map(action => { const Icon = action.icon; return <Link key={action.href} href={action.href} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800/70 hover:text-white"><span className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-slate-600" />{action.label}</span><ArrowRight className="h-3.5 w-3.5" /></Link>; })}</div></article>
      </aside>
    </section>
  </div>;
}
