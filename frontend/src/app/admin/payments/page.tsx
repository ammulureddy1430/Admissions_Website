"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";

export default function AdminPayments() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("schoolId");
    const tok = localStorage.getItem("token");
    if (!id || !tok) {
      router.push("/login");
      return;
    }
    setSchoolId(id);
    setToken(tok);
  }, [router]);

  useEffect(() => {
    if (!schoolId || !token) return;

    async function fetchPayments(showLoader = true) {
      if (showLoader) setIsLoading(true);
      try {
        const res = await fetch("http://localhost:5001/payment", {
          headers: { 
            "x-tenant-id": schoolId,
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) setPayments(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        if (showLoader) setIsLoading(false);
      }
    }
    fetchPayments();
    const refreshInterval = window.setInterval(() => fetchPayments(false), 10000);
    return () => window.clearInterval(refreshInterval);
  }, [schoolId, token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Razorpay Transactions & Invoicing</h1>
        <p className="text-xs text-slate-400 mt-1">Audit billing logs, order processing checks, and transaction status logs.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-indigo-400" /> Platform Billing Ledger
        </h3>
        
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="pb-3">Receipt Order ID</th>
              <th className="pb-3">Applicant Name</th>
              <th className="pb-3">Amount Charged</th>
              <th className="pb-3">Razorpay Payment ID</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {payments.map((pay) => (
              <tr key={pay.id}>
                <td className="py-4 font-mono font-bold text-white">{pay.razorpayOrderId}</td>
                <td className="py-4">{pay.application?.studentFirstName} {pay.application?.studentLastName}</td>
                <td className="py-4 font-semibold text-slate-200">₹{pay.amount.toLocaleString()}</td>
                <td className="py-4 font-mono text-slate-400">{pay.razorpayPaymentId || "--"}</td>
                <td className="py-4">
                  <span className={`border px-2 py-0.5 rounded text-[10px] font-bold ${
                    pay.status === "SUCCESS"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : pay.status === "FAILED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {pay.status}
                  </span>
                </td>
                <td className="py-4 text-slate-500 font-mono">{new Date(pay.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
