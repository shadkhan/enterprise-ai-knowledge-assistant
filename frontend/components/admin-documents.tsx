"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { AdminDocumentDetail, AdminDocumentSummary, getAdminDocumentDetail, getAdminDocuments } from "../lib/api";
import { AdminShell, EmptyState, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminDocuments() {
  const [documents, setDocuments] = useState<AdminDocumentSummary[]>([]);
  const [selected, setSelected] = useState<AdminDocumentDetail | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [classification, setClassification] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    getAdminDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof Error ? err.message : "Documents request failed"))
      .finally(() => setLoading(false));
  }

  function openDocument(documentId: string) {
    getAdminDocumentDetail(documentId)
      .then(setSelected)
      .catch((err) => setError(err instanceof Error ? err.message : "Document detail request failed"));
  }

  const departments = useMemo(() => ["all", ...Array.from(new Set(documents.map((doc) => doc.department)))], [documents]);
  const filtered = documents.filter((doc) => {
    const text = [doc.title, doc.source_type, doc.department, doc.classification, doc.tags.join(" ")].join(" ").toLowerCase();
    return (
      text.includes(query.toLowerCase()) &&
      (department === "all" || doc.department === department) &&
      (classification === "all" || doc.classification === classification)
    );
  });

  return (
    <AdminShell title="Documents" eyebrow="Knowledge Operations">
      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <section>
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative block w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-500"
                placeholder="Search documents"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm">
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All departments" : item}
                  </option>
                ))}
              </select>
              <select value={classification} onChange={(event) => setClassification(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm">
                <option value="all">All classifications</option>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="restricted">Restricted</option>
              </select>
              <button type="button" onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white" disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} size={16} aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}
          {!loading && filtered.length === 0 && <EmptyState message="No documents match the current filters." />}

          <div className="grid gap-3">
            {filtered.map((doc) => (
              <button
                key={doc.document_id}
                type="button"
                onClick={() => openDocument(doc.document_id)}
                className="rounded border border-slate-200 bg-white p-4 text-left hover:border-slate-400"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{doc.title}</h2>
                    <div className="mt-1 text-sm text-slate-500">
                      {doc.source_type} · {doc.department} · {doc.chunk_count} chunks
                    </div>
                  </div>
                  <StatusBadge value={doc.classification} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Document Detail</h2>
          {!selected ? (
            <p className="mt-3 text-sm leading-6 text-slate-500">Select a document to inspect chunks, embedding coverage, and metadata.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <div className="font-medium">{selected.document.title}</div>
                <div className="mt-1 text-xs text-slate-500">{selected.document.document_id}</div>
              </div>
              <dl className="grid gap-2 text-sm">
                <Row label="Owner" value={selected.document.owner_id} />
                <Row label="Department" value={selected.document.department} />
                <Row label="Chunks" value={String(selected.document.chunk_count)} />
              </dl>
              <div className="max-h-[32rem] space-y-3 overflow-auto">
                {selected.chunks.map((chunk) => (
                  <div key={chunk.chunk_id} className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{chunk.chunk_id}</span>
                      <span>{chunk.has_embedding ? `${chunk.embedding_dimensions} dims` : "no embedding"}</span>
                    </div>
                    <p className="mt-2 line-clamp-6 text-sm leading-6">{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
