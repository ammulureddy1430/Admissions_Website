"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5001/super-admin/users", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users.");
        setUsers(await res.json());
      } catch (err: any) {
        setError(err.message || "Error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/super-admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      }
    } catch (err) {
      console.error(err);
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
      <div>
        <h1 className="text-2xl font-extrabold text-white">Global User Management</h1>
        <p className="text-xs text-slate-400 mt-1">Audit credentials, user roles, associated school tenants, and access status.</p>
      </div>

      {error && (
        <div className="bg-rose-955/20 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-955 border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="p-4">User Details</th>
              <th className="p-4">Associated Tenant</th>
              <th className="p-4">Role Assigned</th>
              <th className="p-4">Status</th>
              <th className="p-4">Registered On</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/20">
                <td className="p-4 font-bold text-white">
                  {u.firstName} {u.lastName} <br />
                  <span className="text-[10px] text-slate-500 font-normal">{u.email}</span>
                </td>
                <td className="p-4 text-indigo-400 font-semibold">
                  {u.school?.name || "Global Administrator"}
                </td>
                <td className="p-4 font-mono text-[10px] capitalize text-slate-300">
                  {u.role.replace('_', ' ')}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.status === "ACTIVE" ? "bg-emerald-955/50 text-emerald-400" : "bg-rose-955/50 text-rose-450"
                  }`}>{u.status}</span>
                </td>
                <td className="p-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleToggleUserStatus(u.id, u.status)}
                    className={`user-access-button ${
                      u.status === "ACTIVE" 
                        ? "user-access-button--suspend"
                        : "user-access-button--activate"
                    }`}
                  >
                    {u.status === "ACTIVE" ? "Suspend Access" : "Activate Access"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
