"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";

const mockParentPayments = [
  {
    id: "mock-pay-aarav",
    amount: 500.00,
    razorpayOrderId: "order_mock_123",
    razorpayPaymentId: "pay_mock_aarav",
    status: "SUCCESS",
    createdAt: "2026-07-15T10:00:00.000Z",
    application: {
      studentFirstName: "Aarav",
      studentLastName: "Reddy",
      grade: "Grade 5"
    }
  }
];

export default function ParentPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const schoolId = localStorage.getItem("schoolId");
    const token = localStorage.getItem("token");
    if (!schoolId || !token) {
      setIsLoading(false);
      return;
    }

    async function fetchPayments() {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:5001/payment/parent", {
          headers: { 
            "x-tenant-id": schoolId || "",
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) setPayments(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPayments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const paymentsList = payments.length > 0 ? payments : mockParentPayments;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Billing & Payments</h1>
        <p className="text-xs text-slate-400 mt-1">Review registration fee transaction logs and download tax invoices.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-indigo-400" /> Payment Transaction Log
        </h3>
        
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="pb-3">Receipt Order ID</th>
              <th className="pb-3">Applicant Name</th>
              <th className="pb-3">Fee Amount</th>
              <th className="pb-3">Razorpay Payment ID</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Transaction Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {paymentsList.map((pay) => (
              <tr key={pay.id}>
                <td className="py-4 font-mono font-bold text-white">{pay.razorpayOrderId}</td>
                <td className="py-4">{pay.application?.studentFirstName} {pay.application?.studentLastName}</td>
                <td className="py-4 font-semibold text-slate-200">₹{pay.amount.toLocaleString()}</td>
                <td className="py-4 font-mono text-slate-400">{pay.razorpayPaymentId || "--"}</td>
                <td className="py-4">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
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
