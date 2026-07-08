"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, DollarSign, Gauge, RefreshCw } from "lucide-react";
import { getCostMetrics } from "../lib/api";
import { AdminShell } from "./admin-shell";

export function AdminMetrics() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getCostMetrics()
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Metrics request failed"))
      .finally(() => setLoading(false));
  }

  const requestCount = Number(metrics?.request_count ?? 0);
  const totalTokens = Number(metrics?.total_tokens ?? 0);
  const estimatedCost = Number(metrics?.estimated_cost_usd ?? 0);

  return (
    <AdminShell title="Usage Metrics" eyebrow="Admin">
      <div className="flex justify-end">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400"
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error && <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard icon={<Activity size={18} aria-hidden="true" />} label="Requests" value={String(requestCount)} />
          <MetricCard icon={<Gauge size={18} aria-hidden="true" />} label="Tokens" value={totalTokens.toLocaleString()} />
          <MetricCard icon={<DollarSign size={18} aria-hidden="true" />} label="Estimated Cost" value={`$${estimatedCost.toFixed(6)}`} />
        </section>

        <section className="mt-6 rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Raw Summary</h2>
          </div>
          <pre className="max-h-[34rem] overflow-auto p-4 text-sm">
            {JSON.stringify(metrics ?? { status: loading ? "Loading metrics..." : "No metrics yet." }, null, 2)}
          </pre>
        </section>
    </AdminShell>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}
