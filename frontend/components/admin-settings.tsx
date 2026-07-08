"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AdminSettings as SettingsData, getAdminSettings } from "../lib/api";
import { AdminShell, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminSettings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Settings request failed"));
  }, []);

  const rows = settings
    ? [
        ["LLM provider", settings.default_llm_provider],
        ["Embedding provider", settings.default_embedding_provider],
        ["Retrieval mode", settings.retrieval_mode],
        ["Reranking", settings.reranking_enabled ? "active" : "disabled"],
        ["Reranker provider", settings.reranker_provider],
        ["Reranker model", settings.reranker_model],
        ["Reranker top N", String(settings.reranker_top_n)],
        ["Reranker candidates", `${settings.reranker_candidate_multiplier}x top_k`],
        ["Semantic cache", settings.semantic_cache_enabled ? "active" : "disabled"],
        ["Semantic cache TTL", `${settings.semantic_cache_ttl_seconds}s`],
        ["Semantic threshold", String(settings.semantic_cache_similarity_threshold)],
        ["Retrieval cache TTL", `${settings.retrieval_cache_ttl_seconds}s`],
        ["Ingestion job TTL", `${settings.ingestion_job_ttl_seconds}s`],
        ["OpenAI fallback", settings.openai_fallback_to_mock ? "active" : "disabled"],
      ]
    : [];

  return (
    <AdminShell title="Settings" eyebrow="Admin">
      {error && <ErrorBanner message={error} />}
      <section className="rounded border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <SlidersHorizontal size={18} aria-hidden="true" className="text-slate-500" />
          <h2 className="text-sm font-semibold">Runtime Configuration</h2>
        </div>
        <div className="grid gap-0 divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">{label}</div>
              {value === "active" || value === "disabled" ? (
                <StatusBadge value={value} />
              ) : (
                <div className="font-mono text-sm text-slate-950">{value}</div>
              )}
            </div>
          ))}
          {!settings && <div className="px-5 py-4 text-sm text-slate-500">Loading settings...</div>}
        </div>
      </section>
    </AdminShell>
  );
}
