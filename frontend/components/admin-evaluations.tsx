"use client";

import { useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { EvaluationRecordSummary, getAdminEvaluations, GoldenEvaluationRunResponse, runGoldenEvaluations } from "../lib/api";
import { AdminShell, EmptyState, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminEvaluations() {
  const [records, setRecords] = useState<EvaluationRecordSummary[]>([]);
  const [runResult, setRunResult] = useState<GoldenEvaluationRunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getAdminEvaluations()
      .then(setRecords)
      .catch((err) => setError(err instanceof Error ? err.message : "Evaluations request failed"))
      .finally(() => setLoading(false));
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const result = await runGoldenEvaluations();
      setRunResult(result);
      await getAdminEvaluations().then(setRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AdminShell title="Evaluations" eyebrow="Quality Control">
      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Golden Evaluation Runner</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Runs in-repo golden questions against retrieval, citations, access-control leakage checks, and the evaluator.
          </p>
          {runResult && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Total" value={String(runResult.total_cases)} />
              <Metric label="Passed" value={String(runResult.passed_cases)} />
              <Metric label="Failed" value={String(runResult.failed_cases)} />
            </div>
          )}
        </div>
        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="grid gap-2">
            <button type="button" onClick={run} disabled={running} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400">
              <Play size={16} aria-hidden="true" />
              {running ? "Running..." : "Run golden evals"}
            </button>
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 disabled:text-slate-400">
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
              Refresh records
            </button>
          </div>
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {runResult && (
        <section className="mb-5 grid gap-3">
          {runResult.results.map((result) => (
            <article key={result.case_id} className="rounded border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold">{result.case_id}</h2>
                  <p className="mt-1 text-sm text-slate-600">{result.question}</p>
                </div>
                <StatusBadge value={result.passed ? "active" : "failed"} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <Metric label="Score" value={result.score.toFixed(2)} />
                <Metric label="Expected doc" value={result.expected_document_found ? "found" : "missing"} />
                <Metric label="Leakage" value={result.forbidden_document_leaked ? "detected" : "none"} />
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Recent Evaluation Records</h2>
        </div>
        {!loading && records.length === 0 && <EmptyState message="No evaluation records yet. Run golden evals or call /evaluate." />}
        <div className="divide-y divide-slate-100">
          {records.map((record) => (
            <article key={record.id} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">{record.question}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {record.user_id} · {new Date(record.created_at).toLocaleString()}
                  </div>
                </div>
                <StatusBadge value={record.hallucination_risk} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
                <div className="font-medium">Score {record.score.toFixed(2)}</div>
                <div className="text-slate-600">{record.notes.join(" ")}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
