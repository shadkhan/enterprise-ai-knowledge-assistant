"use client";

import { FormEvent, useState } from "react";
import { askQuestion, ChatResponse } from "../lib/api";

export function ChatShell() {
  const [question, setQuestion] = useState("What is the remote work policy?");
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await askQuestion(question);
      setAnswer(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl gap-6 px-6 py-6">
      <section className="flex min-w-0 flex-1 flex-col rounded border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-xl font-semibold">Enterprise AI Knowledge Assistant</h1>
          <p className="mt-1 text-sm text-slate-600">Secure RAG answer generation with citations and cost telemetry.</p>
        </header>

        <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">User</div>
            <div className="mt-1 text-sm">{question}</div>
          </div>

          {answer && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Assistant</div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6">{answer.answer}</pre>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-700 md:grid-cols-4">
                <Metric label="Model" value={answer.model} />
                <Metric label="Latency" value={`${answer.latency_ms} ms`} />
                <Metric label="Tokens" value={`${answer.prompt_tokens + answer.completion_tokens}`} />
                <Metric label="Cost" value={`$${answer.estimated_cost_usd}`} />
              </div>
            </div>
          )}

          {error && <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </div>

        <form onSubmit={onSubmit} className="border-t border-slate-200 p-4">
          <textarea
            className="h-24 w-full resize-none rounded border border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">Mock user: u-employee. Seed data through /ingest or API docs.</div>
            <button
              disabled={loading || !question.trim()}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Asking..." : "Ask"}
            </button>
          </div>
        </form>
      </section>

      <aside className="hidden w-96 rounded border border-slate-200 bg-white p-5 lg:block">
        <h2 className="text-base font-semibold">Sources</h2>
        <div className="mt-4 space-y-3">
          {answer?.citations.length ? (
            answer.citations.map((citation) => (
              <div key={citation.chunk_id} className="rounded border border-slate-200 p-3">
                <div className="text-sm font-medium">{citation.title}</div>
                <div className="mt-1 text-xs text-slate-600">{citation.document_id}</div>
                <div className="mt-2 text-xs text-slate-500">Chunk: {citation.chunk_id}</div>
                <div className="text-xs text-slate-500">Score: {citation.score}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">Citations from authorized enterprise documents appear here after a response.</p>
          )}
        </div>
      </aside>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/70 bg-white/70 p-2">
      <div className="font-medium text-slate-500">{label}</div>
      <div className="mt-1 truncate text-slate-900">{value}</div>
    </div>
  );
}

