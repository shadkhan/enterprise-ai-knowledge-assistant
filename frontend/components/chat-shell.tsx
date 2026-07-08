"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import {
  askQuestion,
  ChatResponse,
  DocumentSummary,
  getDocuments,
  MockUserId,
  PreferredQuality,
  submitFeedback,
} from "../lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  question?: string;
  userId?: MockUserId;
  animate?: boolean;
};

const USERS: Array<{ id: MockUserId; label: string; detail: string }> = [
  { id: "u-employee", label: "Employee", detail: "Engineering, internal" },
  { id: "u-hr", label: "HR Manager", detail: "HR, internal" },
  { id: "u-admin", label: "Admin", detail: "IT, restricted" },
  { id: "u-finance", label: "Finance", detail: "Finance, restricted" },
  { id: "u-legal", label: "Legal", detail: "Legal, restricted" },
];

const SUGGESTIONS = [
  "What is the remote work policy?",
  "Summarize the policy and include source citations.",
  "What information can I access as this user?",
];

export function ChatShell() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask a question about the seeded enterprise knowledge base. I will answer with citations, model details, and cost telemetry.",
    },
  ]);
  const [userId, setUserId] = useState<MockUserId>("u-employee");
  const [quality, setQuality] = useState<PreferredQuality>("balanced");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const latestResponse = useMemo(
    () => [...messages].reverse().find((message) => message.response)?.response,
    [messages],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    setDocumentsLoading(true);
    getDocuments(userId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocumentsLoading(false));
  }, [userId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };

    setQuestion("");
    setError(null);
    setLoading(true);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await askQuestion(trimmedQuestion, { userId, preferredQuality: quality, topK: 5 });
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          response,
          question: trimmedQuestion,
          userId,
          animate: true,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The chat request failed.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `The assistant API request failed: ${message}`,
          animate: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function useSuggestion(value: string) {
    setQuestion(value);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-0 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-400 text-slate-950">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Knowledge Assistant</h1>
              <p className="text-xs text-slate-300">Secure enterprise RAG</p>
            </div>
          </div>

          <section className="mt-7">
            <PanelLabel>User Context</PanelLabel>
            <div className="mt-3 space-y-2">
              {USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setUserId(user.id)}
                  className={`w-full rounded border px-3 py-3 text-left transition ${
                    userId === user.id
                      ? "border-emerald-300 bg-emerald-300 text-slate-950"
                      : "border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500"
                  }`}
                >
                  <span className="block text-sm font-medium">{user.label}</span>
                  <span className={`mt-1 block text-xs ${userId === user.id ? "text-slate-700" : "text-slate-400"}`}>
                    {user.detail}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <PanelLabel>Answer Quality</PanelLabel>
            <div className="mt-3 grid grid-cols-3 overflow-hidden rounded border border-slate-700">
              {(["cheap", "balanced", "premium"] as PreferredQuality[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuality(item)}
                  className={`px-2 py-2 text-xs font-medium capitalize ${
                    quality === item ? "bg-white text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <PanelLabel>Try These</PanelLabel>
            <div className="mt-3 space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => useSuggestion(suggestion)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs leading-5 text-slate-200 hover:border-slate-500"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex min-h-screen min-w-0 flex-col bg-white">
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Chat</p>
                <h2 className="mt-1 text-xl font-semibold">Ask internal knowledge questions</h2>
              </div>
              <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 size={16} aria-hidden="true" />
                Demo source auto-seeded
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <Avatar role="assistant" />
                  <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      Searching authorized sources and drafting an answer...
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                    {error}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex min-h-28 flex-col rounded border border-slate-300 bg-white focus-within:border-slate-500">
                <textarea
                  className="min-h-20 flex-1 resize-none rounded bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-slate-400"
                  placeholder="Ask about a policy, SOP, source, or access-controlled document..."
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
                  <div className="truncate text-xs text-slate-500">
                    {USERS.find((user) => user.id === userId)?.label} - {quality} route
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="inline-flex h-9 items-center gap-2 rounded bg-slate-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <aside className="border-t border-slate-200 bg-slate-50 px-5 py-5 lg:border-l lg:border-t-0">
          <section>
            <div className="flex items-center gap-2">
              <Database size={18} className="text-slate-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Visible Documents</h2>
            </div>
            <div className="mt-3 space-y-2">
              {documentsLoading ? (
                <PanelEmpty label="Loading documents..." />
              ) : documents.length ? (
                documents.map((document) => <DocumentCard key={document.document_id} document={document} />)
              ) : (
                <PanelEmpty label="No documents visible for this user." />
              )}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Latest Sources</h2>
            </div>
            <div className="mt-3 space-y-2">
              {latestResponse?.citations.length ? (
                latestResponse.citations.map((citation) => (
                  <div key={citation.chunk_id} className="rounded border border-slate-200 bg-white p-3">
                    <div className="text-sm font-medium text-slate-950">{citation.title}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{citation.document_id}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{citation.chunk_id}</span>
                      <span>{Math.round(citation.score * 100)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <PanelEmpty label="Citations appear after an answer." />
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const shouldAnimate = Boolean(message.animate && !isUser);
  const { displayedText, complete } = useTypewriter(message.content, shouldAnimate);
  const [feedbackState, setFeedbackState] = useState<"idle" | "up" | "down" | "error">("idle");

  async function sendFeedback(rating: "up" | "down") {
    if (!message.response || !message.question || !message.userId) {
      return;
    }
    try {
      await submitFeedback(
        {
          question: message.question,
          answer: message.response.answer,
          rating,
          citations: message.response.citations,
          model: message.response.model,
          provider: message.response.provider,
        },
        message.userId,
      );
      setFeedbackState(rating);
    } catch {
      setFeedbackState("error");
    }
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && <Avatar role="assistant" />}
      <div
        className={`max-w-[min(100%,44rem)] rounded px-4 py-3 ${
          isUser ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-900"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-6">
          {displayedText}
          {shouldAnimate && !complete ? <TypingDots /> : null}
        </div>
        {message.response && complete && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-4">
              <Metric label="Model" value={message.response.model} />
              <Metric label="Prompt" value={`${message.response.prompt_key} v${message.response.prompt_version}`} />
              <Metric label="Latency" value={`${message.response.latency_ms} ms`} />
              <Metric label="Tokens" value={`${message.response.prompt_tokens + message.response.completion_tokens}`} />
              <Metric label="Cost" value={`$${message.response.estimated_cost_usd}`} />
              {message.response.semantic_cache_hit && (
                <Metric label="Cache" value={`Semantic ${message.response.semantic_cache_score ?? ""}`} />
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
              <span>Feedback</span>
              <button
                type="button"
                onClick={() => sendFeedback("up")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
                  feedbackState === "up" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"
                }`}
                aria-label="Mark answer helpful"
              >
                <ThumbsUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => sendFeedback("down")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
                  feedbackState === "down" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-600"
                }`}
                aria-label="Mark answer not helpful"
              >
                <ThumbsDown size={14} aria-hidden="true" />
              </button>
              {feedbackState === "error" && <span className="text-red-600">Could not save feedback</span>}
              {feedbackState === "up" || feedbackState === "down" ? <span>Saved</span> : null}
            </div>
          </>
            )}
      </div>
      {isUser && <Avatar role="user" />}
    </div>
  );
}

function useTypewriter(text: string, active: boolean) {
  const [displayedText, setDisplayedText] = useState(active ? "" : text);
  const [complete, setComplete] = useState(!active);

  useEffect(() => {
    if (!active) {
      setDisplayedText(text);
      setComplete(true);
      return;
    }

    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    setDisplayedText("");
    setComplete(false);

    function tick() {
      index += 1;
      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        setComplete(true);
        return;
      }

      const currentCharacter = text[index - 1];
      const delay = currentCharacter === "." || currentCharacter === "?" || currentCharacter === "!" ? 130 : currentCharacter === "\n" ? 180 : 18;
      timeoutId = setTimeout(tick, delay);
    }

    timeoutId = setTimeout(tick, 180);
    return () => clearTimeout(timeoutId);
  }, [active, text]);

  return { displayedText, complete };
}

function TypingDots() {
  return (
    <span className="ml-1 inline-flex translate-y-0.5 items-center gap-0.5" aria-label="Typing">
      <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-400" />
      <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-400 [animation-delay:140ms]" />
      <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-400 [animation-delay:280ms]" />
    </span>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${
        role === "assistant" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      {role === "assistant" ? <Bot size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-200 bg-white px-2 py-2">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DocumentCard({ document }: { document: DocumentSummary }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 shrink-0 text-emerald-600" size={15} aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-950">{document.title}</div>
          <div className="mt-1 text-xs text-slate-500">
            {document.department} - {document.classification}
          </div>
          {document.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PanelLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase text-slate-400">{children}</h2>;
}

function PanelEmpty({ label }: { label: string }) {
  return <div className="rounded border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">{label}</div>;
}

