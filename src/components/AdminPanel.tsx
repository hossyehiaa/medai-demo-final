"use client";

// Admin panel — all users + all queries (admin role only).
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Users, MessagesSquare } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { queries: number };
}

interface AdminQuery {
  id: string;
  query: string;
  status: string;
  createdAt: string;
  user: { email: string; name: string | null };
}

export default function AdminPanel() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [tab, setTab] = useState<"users" | "queries">("users");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin?type=users").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin?type=queries").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, q]) => {
        setUsers(u);
        setQueries(q);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("users")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "users" ? "bg-teal text-white" : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          <Users className="h-4 w-4" /> {t("adminUsers")} ({users.length})
        </button>
        <button
          onClick={() => setTab("queries")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "queries" ? "bg-teal text-white" : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          <MessagesSquare className="h-4 w-4" /> {t("adminQueries")} ({queries.length})
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">…</p>
      ) : tab === "users" ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-start text-xs uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 text-start">Email</th>
                <th className="px-4 py-3 text-start">Name</th>
                <th className="px-4 py-3 text-start">Role</th>
                <th className="px-4 py-3 text-start">Queries</th>
                <th className="px-4 py-3 text-start">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        u.role === "admin"
                          ? "bg-cta/10 text-cta"
                          : u.role === "guest"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-teal-light text-teal-dark"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u._count.queries}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {queries.map((q) => (
            <div key={q.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    q.status === "CRISIS"
                      ? "bg-red-100 text-red-700"
                      : q.status === "SUCCESS"
                      ? "bg-teal-light text-teal-dark"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {q.status}
                </span>
                <span className="text-gray-400">{q.user.email}</span>
                <span className="text-gray-300">{new Date(q.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-800">{q.query}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
