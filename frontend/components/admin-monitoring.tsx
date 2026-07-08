"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getRuntimeMetrics, RuntimeMetrics } from "../lib/api";
import { AdminShell, ErrorBanner } from "./admin-shell";

export function AdminMonitoring() {
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getRuntimeMetrics()
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Runtime metrics request failed"))
      .finally(() => setLoading(false));
  }

  return (
    <AdminShell title="Monitoring" eyebrow="Runtime">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400">
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Documents" value={String(metrics?.documents.count ?? 0)} detail={`${metrics?.documents.chunk_count ?? 0} chunks`} />
        <MetricCard label="Evaluations" value={String(metrics?.evaluations.total ?? 0)} detail={`avg ${metrics?.evaluations.average_score ?? 0}`} />
        <MetricCard label="Feedback" value={String(metrics?.feedback.total ?? 0)} detail={`${Math.round((metrics?.feedback.positive_rate ?? 0) * 100)}% positive`} />
        <MetricCard label="Jobs" value={String(metrics?.ingestion_jobs.retained ?? 0)} detail="retained in Redis" />
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Feature Flags" data={metrics?.features ?? { status: loading ? "Loading..." : "No metrics" }} />
        <Panel title="Job Status" data={metrics?.ingestion_jobs.by_status ?? {}} />
        <Panel title="Cost Summary" data={metrics?.cost ?? {}} />
        <Panel title="Raw Runtime Metrics" data={metrics ?? {}} />
      </section>
    </AdminShell>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function Panel({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">{title}</div>
      <pre className="max-h-80 overflow-auto p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
