"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { FeedbackRecordSummary, getAdminFeedback } from "../lib/api";
import { AdminShell, EmptyState, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminFeedback() {
  const [records, setRecords] = useState<FeedbackRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getAdminFeedback()
      .then(setRecords)
      .catch((err) => setError(err instanceof Error ? err.message : "Feedback request failed"))
      .finally(() => setLoading(false));
  }

  return (
    <AdminShell title="Feedback" eyebrow="Quality Control">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400">
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {!loading && records.length === 0 && <EmptyState message="No feedback has been submitted yet." />}
      <section className="grid gap-3">
        {records.map((record) => (
          <article key={record.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {record.rating === "up" ? <ThumbsUp className="text-emerald-600" size={16} aria-hidden="true" /> : <ThumbsDown className="text-red-600" size={16} aria-hidden="true" />}
                  <h2 className="text-sm font-semibold">{record.question}</h2>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{record.answer}</p>
              </div>
              <StatusBadge value={record.rating === "up" ? "active" : "review_required"} />
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              <span>{record.user_id}</span>
              <span>{new Date(record.created_at).toLocaleString()}</span>
              <span>{String(record.metadata.model ?? "")} {String(record.metadata.provider ?? "")}</span>
            </div>
            {record.comment && <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">{record.comment}</div>}
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
