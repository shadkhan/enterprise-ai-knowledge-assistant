"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, UIEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Loader2,
  MessageSquarePlus,
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
  CitationPreview,
  ConversationSummary,
  DocumentSummary,
  getCitationPreview,
  getConversation,
  getConversations,
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

const SIDEBAR_PAGE_SIZE = 8;

export function ChatShell() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
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
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<CitationPreview | null>(null);
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsLoadingMore, setDocumentsLoadingMore] = useState(false);
  const [documentsHasMore, setDocumentsHasMore] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsLoadingMore, setConversationsLoadingMore] = useState(false);
  const [conversationsHasMore, setConversationsHasMore] = useState(true);
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
    loadDocumentsPage(true);
    loadConversationsPage(true);
    setCurrentConversationId(null);
    setSelectedCitation(null);
  }, [userId]);

  async function loadDocumentsPage(reset = false) {
    if (!reset && (!documentsHasMore || documentsLoadingMore)) {
      return;
    }
    reset ? setDocumentsLoading(true) : setDocumentsLoadingMore(true);
    const offset = reset ? 0 : documents.length;
    try {
      const page = await getDocuments(userId, { limit: SIDEBAR_PAGE_SIZE, offset });
      setDocuments((current) => (reset ? page : [...current, ...page]));
      setDocumentsHasMore(page.length === SIDEBAR_PAGE_SIZE);
    } catch {
      if (reset) {
        setDocuments([]);
      }
      setDocumentsHasMore(false);
    } finally {
      reset ? setDocumentsLoading(false) : setDocumentsLoadingMore(false);
    }
  }

  async function loadConversationsPage(reset = false) {
    if (!reset && (!conversationsHasMore || conversationsLoadingMore)) {
      return;
    }
    reset ? setConversationsLoading(true) : setConversationsLoadingMore(true);
    const offset = reset ? 0 : conversations.length;
    try {
      const page = await getConversations(userId, { limit: SIDEBAR_PAGE_SIZE, offset });
      setConversations((current) => (reset ? page : [...current, ...page]));
      setConversationsHasMore(page.length === SIDEBAR_PAGE_SIZE);
    } catch {
      if (reset) {
        setConversations([]);
      }
      setConversationsHasMore(false);
    } finally {
      reset ? setConversationsLoading(false) : setConversationsLoadingMore(false);
    }
  }

  function loadMoreOnScroll(event: UIEvent<HTMLDivElement>, callback: () => void) {
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) {
      callback();
    }
  }

  function startNewConversation() {
    setCurrentConversationId(null);
    setSelectedCitation(null);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "New conversation started. Ask a question and I will keep the thread together.",
      },
    ]);
  }

  async function loadConversation(conversationId: string) {
    setError(null);
    setLoading(true);
    try {
      const conversation = await getConversation(conversationId, userId);
      setCurrentConversationId(conversation.conversation_id);
      setSelectedCitation(null);
      setMessages(
        conversation.messages.map((message) => ({
          id: String(message.id),
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load conversation.");
    } finally {
      setLoading(false);
    }
  }

  async function openCitation(chunkId: string) {
    setCitationLoading(true);
    setCitationError(null);
    try {
      setSelectedCitation(await getCitationPreview(chunkId, userId));
    } catch (err) {
      setCitationError(err instanceof Error ? err.message : "Could not load citation source.");
    } finally {
      setCitationLoading(false);
    }
  }

  async function refreshConversations() {
    loadConversationsPage(true);
  }

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
      const response = await askQuestion(trimmedQuestion, {
        userId,
        preferredQuality: quality,
        topK: 5,
        conversationId: currentConversationId,
      });
      setCurrentConversationId(response.conversation_id ?? currentConversationId);
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
      refreshConversations();
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

  const assistantGrid = `${leftPanelOpen ? "300px" : "96px"} minmax(0,1fr) ${rightPanelOpen ? "360px" : "96px"}`;

  return (
    <main className="app-mesh app-grid min-h-screen overflow-x-hidden text-[#e8edf8] lg:h-screen lg:overflow-hidden">
      <div
        className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 gap-4 p-3 sm:p-4 lg:h-screen lg:overflow-hidden lg:[grid-template-columns:var(--assistant-grid)]"
        style={{ "--assistant-grid": assistantGrid } as React.CSSProperties}
      >
        <aside className={`glass-panel order-2 overflow-hidden rounded-2xl shadow-2xl shadow-black/20 lg:order-1 lg:h-[calc(100vh-2rem)] ${leftPanelOpen ? "px-5 py-5" : "px-3 py-4"}`}>
          <div className={`flex items-center ${leftPanelOpen ? "gap-3" : "justify-center"}`}>
            <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] text-white" aria-label="Back to platform">
              <Brain size={20} aria-hidden="true" />
            </Link>
            {leftPanelOpen && (
              <div className="min-w-0 flex-1">
                <h1 className="font-display truncate text-base font-semibold leading-tight text-white">Knowledge Assistant</h1>
                <p className="font-mono-brand text-xs text-slate-500">Secure enterprise RAG</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setLeftPanelOpen((value) => !value)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
              aria-label={leftPanelOpen ? "Collapse left panel" : "Expand left panel"}
            >
              {leftPanelOpen ? "Close" : "Expand"}
            </button>
          </div>

          {!leftPanelOpen ? (
            <div className="mt-5 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setLeftPanelOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#4f6ef7]/30 bg-[#4f6ef7]/10 px-2 text-xs font-semibold text-[#9dadff] hover:bg-[#4f6ef7]/15"
              >
                Expand
              </button>
            </div>
          ) : (
            <div className="subtle-scroll pr-1 lg:h-[calc(100%-3.25rem)] lg:overflow-y-auto">
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link href="/" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] text-xs font-semibold text-slate-300 hover:bg-white/[0.06]">
                  <ArrowLeft size={14} aria-hidden="true" />
                  Platform
                </Link>
                <Link href="/admin" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#4f6ef7]/30 bg-[#4f6ef7]/10 text-xs font-semibold text-[#9dadff] hover:bg-[#4f6ef7]/15">
                  Admin
                </Link>
              </div>

              <section className="mt-7">
                <PanelLabel>User Context</PanelLabel>
                <div className="mt-3 space-y-2">
                  {USERS.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setUserId(user.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        userId === user.id
                          ? "border-[#4f6ef7]/50 bg-[#4f6ef7]/15 text-white shadow-lg shadow-[#4f6ef7]/10"
                          : "border-white/[0.08] bg-white/[0.035] text-slate-200 hover:border-white/15 hover:bg-white/[0.055]"
                      }`}
                    >
                      <span className="block text-sm font-medium">{user.label}</span>
                      <span className={`mt-1 block text-xs ${userId === user.id ? "text-[#9dadff]" : "text-slate-500"}`}>
                        {user.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-7">
                <PanelLabel>Answer Quality</PanelLabel>
                <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                  {(["cheap", "balanced", "premium"] as PreferredQuality[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuality(item)}
                      className={`rounded-lg px-2 py-2 text-xs font-medium capitalize transition ${
                        quality === item ? "bg-white text-[#03060f] shadow-sm" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-7">
                <div className="flex items-center justify-between gap-3">
                  <PanelLabel>Conversations</PanelLabel>
                  <button
                    type="button"
                    onClick={startNewConversation}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]"
                    aria-label="Start new conversation"
                  >
                    <MessageSquarePlus size={15} aria-hidden="true" />
                  </button>
                </div>
                <div
                  className="mt-3 space-y-2"
                  onScroll={(event) => loadMoreOnScroll(event, () => loadConversationsPage(false))}
                >
                  {conversationsLoading ? (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-xs text-slate-400">
                      Loading chats...
                    </div>
                  ) : conversations.length ? (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.conversation_id}
                        type="button"
                        onClick={() => loadConversation(conversation.conversation_id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          currentConversationId === conversation.conversation_id
                            ? "border-[#4f6ef7]/50 bg-[#4f6ef7]/15 text-white"
                            : "border-white/[0.08] bg-white/[0.035] text-slate-200 hover:border-white/15"
                        }`}
                      >
                        <span className="block truncate text-xs font-medium">{conversation.title}</span>
                        <span className={`mt-1 flex items-center gap-1 text-[11px] ${currentConversationId === conversation.conversation_id ? "text-[#9dadff]" : "text-slate-500"}`}>
                          <Clock3 size={12} aria-hidden="true" />
                          {new Date(conversation.updated_at).toLocaleString()}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-xs text-slate-400">
                      Recent chats appear here.
                    </div>
                  )}
                  {conversationsLoadingMore && (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-slate-400">
                      Loading more...
                    </div>
                  )}
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
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-left text-xs leading-5 text-slate-300 hover:border-white/15 hover:bg-white/[0.055]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </aside>

        <section className="glass-panel order-1 flex h-[calc(100svh-1.5rem)] min-w-0 flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/20 sm:h-[calc(100svh-2rem)] lg:order-2 lg:h-[calc(100vh-2rem)]">
          <header className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.18em] text-[#7f95ff]">Chat</p>
                <h2 className="font-display mt-1 text-2xl font-bold tracking-normal text-white">Ask internal knowledge questions</h2>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
                <CheckCircle2 size={16} aria-hidden="true" />
                Demo source auto-seeded
              </div>
            </div>
          </header>

          <div className="subtle-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onCitationSelect={openCitation} />
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <Avatar role="assistant" />
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      Searching authorized sources and drafting an answer...
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <span className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                    {error}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="border-t border-white/[0.06] bg-[#03060f]/45 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex min-h-28 flex-col rounded-2xl border border-white/[0.1] bg-[#03060f]/70 shadow-xl shadow-black/20 focus-within:border-[#4f6ef7]/60">
                <textarea
                  className="min-h-20 flex-1 resize-none rounded-2xl bg-transparent px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Ask about a policy, SOP, source, or access-controlled document..."
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-2">
                  <div className="truncate font-mono-brand text-xs text-slate-500">
                    {USERS.find((user) => user.id === userId)?.label} - {quality} route
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] px-4 text-sm font-semibold text-white shadow-lg shadow-[#4f6ef7]/20 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <aside className={`glass-panel order-3 overflow-hidden rounded-2xl shadow-2xl shadow-black/20 lg:h-[calc(100vh-2rem)] ${rightPanelOpen ? "px-5 py-5" : "px-3 py-4"}`}>
          <div className={`mb-5 flex items-center ${rightPanelOpen ? "justify-between" : "justify-center"}`}>
            {rightPanelOpen && <PanelLabel>Evidence</PanelLabel>}
            <button
              type="button"
              onClick={() => setRightPanelOpen((value) => !value)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
              aria-label={rightPanelOpen ? "Collapse right panel" : "Expand right panel"}
            >
              {rightPanelOpen ? "Close" : "Expand"}
            </button>
          </div>
          {!rightPanelOpen ? (
            <div className="flex flex-col items-center gap-3">
              <button type="button" onClick={() => setRightPanelOpen(true)} className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#4f6ef7]/30 bg-[#4f6ef7]/10 px-2 text-xs font-semibold text-[#9dadff] hover:bg-[#4f6ef7]/15">
                Expand
              </button>
            </div>
          ) : (
          <div className="subtle-scroll pr-1 lg:h-[calc(100%-3.5rem)] lg:overflow-y-auto">
          <section>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#7f95ff]" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold text-white">Latest Sources</h2>
            </div>
            <div className="mt-3 space-y-2">
              {latestResponse?.citations.length ? (
                latestResponse.citations.map((citation) => (
                  <button
                    key={citation.chunk_id}
                    type="button"
                    onClick={() => openCitation(citation.chunk_id)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-left hover:border-white/15"
                  >
                    <div className="text-sm font-medium text-white">{citation.title}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{citation.document_id}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{citation.chunk_id}</span>
                      <span>{Math.round(citation.score * 100)}%</span>
                    </div>
                  </button>
                ))
              ) : (
                <PanelEmpty label="Citations appear after an answer." />
              )}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#7f95ff]" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold text-white">Source Preview</h2>
            </div>
            <div className="mt-3">
              {citationLoading ? (
                <PanelEmpty label="Loading source..." />
              ) : citationError ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-4 text-sm text-red-200">{citationError}</div>
              ) : selectedCitation ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
                  <div className="text-sm font-semibold text-white">{selectedCitation.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{selectedCitation.chunk_id}</div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {selectedCitation.text}
                  </p>
                </div>
              ) : (
                <PanelEmpty label="Select a citation to inspect the retrieved text." />
              )}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#7f95ff]" aria-hidden="true" />
                <h2 className="font-display text-sm font-semibold text-white">Knowledge Scope</h2>
              </div>
              <span className="text-xs text-slate-500">{documents.length} loaded</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Sources this user can access. Retrieval still uses relevance ranking; this list is only a permission-scope reference.
            </p>
            <div
              className="mt-3 space-y-2"
              onScroll={(event) => loadMoreOnScroll(event, () => loadDocumentsPage(false))}
            >
              {documentsLoading ? (
                <PanelEmpty label="Loading source scope..." />
              ) : documents.length ? (
                documents.map((document) => <DocumentCard key={document.document_id} document={document} />)
              ) : (
                <PanelEmpty label="No accessible sources for this user." />
              )}
              {documentsLoadingMore && <PanelEmpty label="Loading more sources..." />}
              {!documentsHasMore && documents.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-slate-500">End of accessible source list.</div>
              )}
            </div>
          </section>
          </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function MessageBubble({ message, onCitationSelect }: { message: ChatMessage; onCitationSelect: (chunkId: string) => void }) {
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
        className={`max-w-[min(100%,44rem)] rounded-2xl px-4 py-3 shadow-lg shadow-black/10 ${
          isUser
            ? "bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] text-white"
            : "border border-white/[0.08] bg-white/[0.045] text-slate-100"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-6">
          {displayedText}
          {shouldAnimate && !complete ? <TypingDots /> : null}
        </div>
        {message.response && complete && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 text-xs sm:grid-cols-4">
              <Metric label="Model" value={message.response.model} />
              <Metric label="Prompt" value={`${message.response.prompt_key} v${message.response.prompt_version}`} />
              <Metric label="Latency" value={`${message.response.latency_ms} ms`} />
              <Metric label="Tokens" value={`${message.response.prompt_tokens + message.response.completion_tokens}`} />
              <Metric label="Cost" value={`$${message.response.estimated_cost_usd}`} />
              {message.response.semantic_cache_hit && (
                <Metric label="Cache" value={`Semantic ${message.response.semantic_cache_score ?? ""}`} />
              )}
            </div>
            {message.response.citations.length ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                {message.response.citations.map((citation) => (
                  <button
                    key={citation.chunk_id}
                    type="button"
                    onClick={() => onCitationSelect(citation.chunk_id)}
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs text-slate-300 hover:border-white/15"
                  >
                    <FileText size={13} aria-hidden="true" />
                    <span className="truncate">{citation.title}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-xs text-slate-500">
              <span>Feedback</span>
              <button
                type="button"
                onClick={() => sendFeedback("up")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                  feedbackState === "up" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/[0.08] bg-white/[0.04] text-slate-300"
                }`}
                aria-label="Mark answer helpful"
              >
                <ThumbsUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => sendFeedback("down")}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                  feedbackState === "down" ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-white/[0.08] bg-white/[0.04] text-slate-300"
                }`}
                aria-label="Mark answer not helpful"
              >
                <ThumbsDown size={14} aria-hidden="true" />
              </button>
              {feedbackState === "error" && <span className="text-red-300">Could not save feedback</span>}
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
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        role === "assistant" ? "bg-[#4f6ef7]/15 text-[#9dadff]" : "bg-white/[0.08] text-slate-300"
      }`}
    >
      {role === "assistant" ? <Bot size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.08] bg-[#03060f]/50 px-2 py-2">
      <div className="font-mono-brand text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function DocumentCard({ document }: { document: DocumentSummary }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 shrink-0 text-[#9dadff]" size={15} aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{document.title}</div>
          <div className="mt-1 text-xs text-slate-500">
            {document.department} - {document.classification}
          </div>
          {document.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-400">
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
  return <h2 className="font-mono-brand text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</h2>;
}

function PanelEmpty({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] px-3 py-4 text-sm text-slate-500">{label}</div>;
}

