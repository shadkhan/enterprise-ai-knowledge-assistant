"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { getAdminUsers, UserProfile } from "../lib/api";
import { AdminShell, EmptyState, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Users request failed"))
      .finally(() => setLoading(false));
  }

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }
    return users.filter((user) =>
      [user.name, user.email, user.department, user.clearance, user.roles.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, users]);

  return (
    <AdminShell title="Users" eyebrow="Admin">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-500"
            placeholder="Search users"
          />
        </label>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400"
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {!error && !loading && filteredUsers.length === 0 && <EmptyState message="No users match the current search." />}

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Clearance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(loading ? [] : filteredUsers).map((user) => (
                <tr key={user.user_id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.roles.join(", ")}</td>
                  <td className="px-4 py-3 text-slate-600">{user.department}</td>
                  <td className="px-4 py-3 text-slate-600">{user.clearance}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={user.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(user.last_login).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-sm text-slate-500">Loading users...</div>}
      </section>
    </AdminShell>
  );
}
