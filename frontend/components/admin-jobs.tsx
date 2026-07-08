"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAdminIngestionJobs, IngestionJobStatus } from "../lib/api";
import { AdminShell, EmptyState, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminJobs() {
  const [jobs, setJobs] = useState<IngestionJobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getAdminIngestionJobs()
      .then(setJobs)
      .catch((err) => setError(err instanceof Error ? err.message : "Jobs request failed"))
      .finally(() => setLoading(false));
  }

  return (
    <AdminShell title="Ingestion Jobs" eyebrow="Knowledge Operations">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400">
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {!loading && jobs.length === 0 && <EmptyState message="No ingestion jobs are currently retained in Redis." />}
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Documents</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td className="px-4 py-3 font-mono text-xs">{job.job_id}</td>
                  <td className="px-4 py-3 text-slate-600">{job.job_type}</td>
                  <td className="px-4 py-3"><StatusBadge value={job.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{job.document_count}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(job.updated_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{job.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-sm text-slate-500">Loading jobs...</div>}
      </section>
    </AdminShell>
  );
}
