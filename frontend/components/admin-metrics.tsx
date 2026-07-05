"use client";

import { useEffect, useState } from "react";
import { getCostMetrics } from "../lib/api";

export function AdminMetrics() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getCostMetrics().then(setMetrics).catch(() => setMetrics(null));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold">Admin Metrics</h1>
      <p className="mt-1 text-sm text-slate-600">Placeholder for cost, latency, model routing, and evaluation dashboards.</p>
      <pre className="mt-6 overflow-auto rounded border border-slate-200 bg-white p-4 text-sm">
        {JSON.stringify(metrics ?? { status: "No metrics yet. Ask a question first or connect observability storage." }, null, 2)}
      </pre>
    </main>
  );
}

