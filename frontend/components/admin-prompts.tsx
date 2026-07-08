"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Eye, LibraryBig, PlusCircle, RefreshCcw } from "lucide-react";
import {
  activatePrompt,
  archivePrompt,
  createPromptVersion,
  getAdminPrompts,
  previewPrompt,
  PromptPreviewResponse,
  PromptTemplateCreate,
  PromptTemplateSummary,
} from "../lib/api";
import { AdminShell, EmptyState, ErrorBanner, StatusBadge } from "./admin-shell";

const PROMPT_TYPES: PromptTemplateSummary["prompt_type"][] = [
  "system",
  "retrieval",
  "evaluation",
  "summarization",
  "guardrail",
];

const DEFAULT_FORM: PromptTemplateCreate = {
  key: "rag_chat_system",
  name: "RAG Chat System Prompt",
  prompt_type: "system",
  owner: "AI Platform",
  status: "draft",
  description: "New governed prompt version.",
  content: "You are an enterprise knowledge assistant.\nAnswer only from authorized context and cite sources.",
  metadata: { runtime: "chat", risk: "medium" },
};

export function AdminPrompts() {
  const [prompts, setPrompts] = useState<PromptTemplateSummary[]>([]);
  const [selected, setSelected] = useState<PromptTemplateSummary | null>(null);
  const [preview, setPreview] = useState<PromptPreviewResponse | null>(null);
  const [form, setForm] = useState<PromptTemplateCreate>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activePrompts = useMemo(() => prompts.filter((prompt) => prompt.status === "active"), [prompts]);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminPrompts();
      setPrompts(data);
      setSelected((current) => current ?? data.find((prompt) => prompt.key === "rag_chat_system") ?? data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt library request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const created = await createPromptVersion(form);
      setMessage(`Created ${created.key} v${created.version}`);
      setForm({ ...form, status: "draft" });
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt create request failed");
    }
  }

  async function handleActivate(prompt: PromptTemplateSummary) {
    setError(null);
    setMessage(null);
    try {
      const updated = await activatePrompt(prompt.id);
      setMessage(`Activated ${updated.key} v${updated.version}`);
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt activation failed");
    }
  }

  async function handleArchive(prompt: PromptTemplateSummary) {
    setError(null);
    setMessage(null);
    try {
      const updated = await archivePrompt(prompt.id);
      setMessage(`Archived ${updated.key} v${updated.version}`);
      await loadPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt archive failed");
    }
  }

  async function handlePreview(prompt: PromptTemplateSummary) {
    setError(null);
    setPreview(null);
    setSelected(prompt);
    try {
      setPreview(await previewPrompt(prompt.key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt preview failed");
    }
  }

  function clonePrompt(prompt: PromptTemplateSummary) {
    setForm({
      key: prompt.key,
      name: prompt.name,
      prompt_type: prompt.prompt_type,
      owner: prompt.owner,
      status: "draft",
      description: prompt.description ?? "",
      content: prompt.content,
      metadata: prompt.metadata,
    });
    setSelected(prompt);
  }

  return (
    <AdminShell title="Prompt Library" eyebrow="Governance">
      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Templates" value={String(prompts.length)} />
        <SummaryCard label="Active" value={String(activePrompts.length)} />
        <SummaryCard label="System" value={String(prompts.filter((prompt) => prompt.prompt_type === "system").length)} />
        <SummaryCard label="Evaluation" value={String(prompts.filter((prompt) => prompt.prompt_type === "evaluation").length)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="rounded border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <LibraryBig size={18} aria-hidden="true" className="text-slate-500" />
              <h2 className="text-sm font-semibold">Governed Prompt Versions</h2>
            </div>
            <button
              type="button"
              onClick={loadPrompts}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              <RefreshCcw size={15} aria-hidden="true" />
              Refresh
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {prompts.map((prompt) => (
              <article key={prompt.id} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{prompt.name}</h3>
                      <StatusBadge value={prompt.status} />
                      <span className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500">
                        {prompt.prompt_type}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {prompt.key} v{prompt.version}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{prompt.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreview(prompt)}
                      className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
                    >
                      <Eye size={15} aria-hidden="true" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => clonePrompt(prompt)}
                      className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
                    >
                      <PlusCircle size={15} aria-hidden="true" />
                      New Version
                    </button>
                    {prompt.status !== "active" && (
                      <button
                        type="button"
                        onClick={() => handleActivate(prompt)}
                        className="inline-flex h-9 items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700"
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Activate
                      </button>
                    )}
                    {prompt.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchive(prompt)}
                        className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
                      >
                        <Archive size={15} aria-hidden="true" />
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {loading && <EmptyState message="Loading prompt library..." />}
            {!loading && prompts.length === 0 && <EmptyState message="No prompt templates found." />}
          </div>
        </section>

        <aside className="grid gap-6">
          {error && <ErrorBanner message={error} />}
          {message && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <section className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Create Prompt Version</h2>
            <form onSubmit={handleCreate} className="mt-4 grid gap-3">
              <TextInput label="Key" value={form.key} onChange={(value) => setForm({ ...form, key: value })} />
              <TextInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Type</span>
                  <select
                    value={form.prompt_type}
                    onChange={(event) => setForm({ ...form, prompt_type: event.target.value as PromptTemplateSummary["prompt_type"] })}
                    className="h-10 rounded border border-slate-200 bg-white px-3 text-sm"
                  >
                    {PROMPT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value as PromptTemplateSummary["status"] })}
                    className="h-10 rounded border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                  </select>
                </label>
              </div>
              <TextInput label="Owner" value={form.owner} onChange={(value) => setForm({ ...form, owner: value })} />
              <TextInput label="Description" value={form.description ?? ""} onChange={(value) => setForm({ ...form, description: value })} />
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Content</span>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  rows={8}
                  className="rounded border border-slate-200 px-3 py-2 font-mono text-sm leading-6"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white"
              >
                <PlusCircle size={16} aria-hidden="true" />
                Create Version
              </button>
            </form>
          </section>

          <section className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Preview</h2>
            {selected && (
              <p className="mt-2 font-mono text-xs text-slate-500">
                {selected.key} v{preview?.version ?? selected.version}
              </p>
            )}
            <div className="mt-4 grid gap-3">
              {(preview?.messages ?? []).map((message) => (
                <div key={`${message.role}-${message.content.slice(0, 20)}`} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase text-slate-500">{message.role}</div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{message.content}</pre>
                </div>
              ))}
              {!preview && <EmptyState message="Select Preview on a prompt to inspect the runtime message shape." />}
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded border border-slate-200 px-3 text-sm" />
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
