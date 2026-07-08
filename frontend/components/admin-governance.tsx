"use client";

import { useEffect, useState } from "react";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { getGovernanceSummary, GovernanceSummary } from "../lib/api";
import { AdminShell, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminGovernance() {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGovernanceSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Governance request failed"));
  }, []);

  return (
    <AdminShell title="Governance" eyebrow="Admin">
      {error && <ErrorBanner message={error} />}
      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Retention" value={`${summary?.audit_events_retention_days ?? "-"} days`} />
        <SummaryCard label="Classifications" value={(summary?.data_classifications ?? []).join(", ") || "Loading"} />
        <SummaryCard label="Approvals" value={`${summary?.approval_required_for.length ?? 0} workflows`} />
      </section>

      <section className="mt-6 grid gap-4">
        {(summary?.policies ?? []).map((policy) => (
          <article key={policy.policy_id} className="rounded border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span className="text-xs font-medium uppercase">{policy.category}</span>
                </div>
                <h2 className="mt-2 text-base font-semibold">{policy.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{policy.description}</p>
              </div>
              <StatusBadge value={policy.status} />
            </div>
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Enforcement</span>
                <div className="mt-1 font-medium">{policy.enforcement}</div>
              </div>
              <div>
                <span className="text-slate-500">Owner</span>
                <div className="mt-1 font-medium">{policy.owner}</div>
              </div>
            </div>
          </article>
        ))}
        {!summary && <div className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading governance policies...</div>}
      </section>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <FileCheck2 size={17} aria-hidden="true" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-3 text-lg font-semibold">{value}</div>
    </div>
  );
}
