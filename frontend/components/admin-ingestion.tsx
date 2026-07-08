"use client";

import { FormEvent, useState } from "react";
import { FilePlus2, Wand2 } from "lucide-react";
import { createIngestionJob, createSyntheticJob, IngestionJobStatus } from "../lib/api";
import { AdminShell, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminIngestion() {
  const [mode, setMode] = useState<"document" | "synthetic">("document");
  const [title, setTitle] = useState("New Security Policy");
  const [text, setText] = useState("Security reviews are required before production deployment.");
  const [topic, setTopic] = useState("Access Review Controls");
  const [contentType, setContentType] = useState<"document" | "pdf" | "data" | "json" | "text">("document");
  const [department, setDepartment] = useState("Global");
  const [classification, setClassification] = useState<"public" | "internal" | "restricted">("internal");
  const [tags, setTags] = useState("policy,controls");
  const [count, setCount] = useState(3);
  const [job, setJob] = useState<IngestionJobStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setJob(null);
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    try {
      const created =
        mode === "document"
          ? await createIngestionJob({ title, text, source_type: "manual", department, classification, tags: tagList })
          : await createSyntheticJob({ content_type: contentType, topic, department, classification, count, tags: tagList });
      setJob(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell title="Ingestion" eyebrow="Knowledge Operations">
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="rounded border border-slate-200 bg-white p-5">
          <div className="mb-5 inline-flex rounded border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setMode("document")} className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${mode === "document" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
              <FilePlus2 size={16} aria-hidden="true" />
              Text
            </button>
            <button type="button" onClick={() => setMode("synthetic")} className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${mode === "synthetic" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
              <Wand2 size={16} aria-hidden="true" />
              Synthetic
            </button>
          </div>

          <div className="grid gap-4">
            {mode === "document" ? (
              <>
                <Field label="Title" value={title} onChange={setTitle} />
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Text</span>
                  <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} className="rounded border border-slate-200 p-3 outline-none focus:border-slate-500" />
                </label>
              </>
            ) : (
              <>
                <Field label="Topic" value={topic} onChange={setTopic} />
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Content Type</span>
                  <select value={contentType} onChange={(event) => setContentType(event.target.value as typeof contentType)} className="h-10 rounded border border-slate-200 bg-white px-3">
                    <option value="document">Document</option>
                    <option value="pdf">PDF-like</option>
                    <option value="data">Data</option>
                    <option value="json">JSON</option>
                    <option value="text">Text</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Count</span>
                  <input type="number" min={1} max={25} value={count} onChange={(event) => setCount(Number(event.target.value))} className="h-10 rounded border border-slate-200 px-3" />
                </label>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" value={department} onChange={setDepartment} />
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Classification</span>
                <select value={classification} onChange={(event) => setClassification(event.target.value as typeof classification)} className="h-10 rounded border border-slate-200 bg-white px-3">
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="restricted">Restricted</option>
                </select>
              </label>
            </div>
            <Field label="Tags" value={tags} onChange={setTags} />
          </div>
        </section>

        <aside className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Submit Job</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Creates an async ingestion job. The worker parses, chunks, embeds, persists, and clears retrieval caches.</p>
          {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
          {job && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{job.job_id}</span>
                <StatusBadge value={job.status} />
              </div>
              <div className="mt-2 text-slate-500">{job.job_type} · {new Date(job.created_at).toLocaleString()}</div>
            </div>
          )}
          <button type="submit" disabled={submitting} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-400">
            {submitting ? "Submitting..." : "Create ingestion job"}
          </button>
        </aside>
      </form>
    </AdminShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded border border-slate-200 px-3 outline-none focus:border-slate-500" />
    </label>
  );
}
