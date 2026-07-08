import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  CircleDot,
  Database,
  FileText,
  GitBranch,
  Globe,
  Layers,
  Lock,
  MessageSquare,
  Radio,
  ScanLine,
  Search,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Unified Knowledge Graph",
    text: "Connect CRM, docs, code, tickets, and messages into one permission-aware intelligence layer.",
    accent: "#4f6ef7",
  },
  {
    icon: ScanLine,
    title: "Hybrid Retrieval",
    text: "Vector search, keyword recall, reranking, and citations work together for answers your team can verify.",
    accent: "#7c3aed",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    text: "Role-aware access controls keep retrieved context aligned with each user's source permissions.",
    accent: "#10b981",
  },
  {
    icon: Workflow,
    title: "Operational Admin",
    text: "Manage ingestion, prompts, evaluation, feedback, governance, and monitoring from one control plane.",
    accent: "#f59e0b",
  },
];

const integrations = [
  "Salesforce",
  "Confluence",
  "GitHub",
  "Slack",
  "Notion",
  "SharePoint",
  "Jira",
  "HubSpot",
  "Google Drive",
  "Zendesk",
  "ServiceNow",
  "Snowflake",
];

const metrics = [
  { label: "Sources Indexed", value: "348K", icon: Database },
  { label: "Avg Latency", value: "940ms", icon: Zap },
  { label: "Cited Answers", value: "99.2%", icon: FileText },
  { label: "Policy Checks", value: "100%", icon: Lock },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#03060f] text-[#e8edf8]">
      <SiteNav />
      <Hero />
      <LogoStrip />
      <Features />
      <Operations />
      <Cta />
    </main>
  );
}

function SiteNav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#03060f]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="SynapseAI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed]">
            <Brain className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold tracking-normal">
            Synapse<span className="text-[#7f95ff]">AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#platform" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            Platform
          </a>
          <a href="#operations" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            Operations
          </a>
          <Link href="/admin" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            Admin
          </Link>
        </nav>
        <Link
          href="/assistant"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] px-4 text-sm font-semibold text-white shadow-lg shadow-[#4f6ef7]/20 transition hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Ask AI
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[92vh] flex-col justify-center px-5 pb-16 pt-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-mesh-a absolute left-[8%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[#4f6ef7]/20 blur-3xl" />
        <div className="animate-mesh-b absolute right-[7%] top-[22%] h-[30rem] w-[30rem] rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:60px_60px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_480px]">
        <div className="max-w-4xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#4f6ef7]/30 bg-[#4f6ef7]/10 px-4 py-2">
            <CircleDot className="h-3.5 w-3.5 text-[#7f95ff]" aria-hidden="true" />
            <span className="font-mono-brand text-xs font-medium uppercase tracking-[0.18em] text-[#7f95ff]">
              Enterprise AI knowledge layer
            </span>
          </div>
          <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">
            Ask every enterprise system. <span className="gradient-text">Trust every answer.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            A secure RAG assistant for internal knowledge, with cited answers, policy-aware retrieval, ingestion workflows, and admin-grade observability.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/assistant"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] px-6 text-sm font-semibold text-white shadow-xl shadow-[#4f6ef7]/20 transition hover:opacity-90"
            >
              Launch Assistant
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
            >
              View Admin Console
            </Link>
          </div>
        </div>

        <div className="animate-float-panel glass-panel relative rounded-2xl p-4 shadow-2xl shadow-black/30">
          <div className="rounded-xl border border-white/[0.06] bg-[#070d1c] p-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4f6ef7]/15 text-[#7f95ff]">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Executive query</p>
                  <p className="font-mono-brand text-xs text-slate-500">Policy checked</p>
                </div>
              </div>
              <span className="rounded-full border border-[#10b981]/30 bg-[#10b981]/10 px-2.5 py-1 font-mono-brand text-xs text-[#10b981]">
                live
              </span>
            </div>
            <div className="space-y-4 py-5">
              <div className="rounded-lg bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
                What changed in our enterprise renewal risk this month?
              </div>
              <div className="rounded-lg border border-[#4f6ef7]/20 bg-[#4f6ef7]/10 p-4">
                <p className="text-sm leading-6 text-slate-200">
                  Renewal risk improved in healthcare and dipped in financial services. The largest driver is unresolved implementation tickets across three strategic accounts.
                </p>
                <div className="mt-4 grid gap-2">
                  {["Salesforce opportunity notes", "Jira escalation queue", "Confluence renewal playbook"].map((source) => (
                    <div key={source} className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-[#03060f]/70 px-3 py-2">
                      <Check className="h-3.5 w-3.5 text-[#10b981]" aria-hidden="true" />
                      <span className="truncate text-xs text-slate-400">{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <metric.icon className="mb-3 h-4 w-4 text-[#7f95ff]" aria-hidden="true" />
                  <p className="font-display text-xl font-bold text-white">{metric.value}</p>
                  <p className="font-mono-brand mt-1 text-[11px] uppercase tracking-wider text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoStrip() {
  const repeated = [...integrations, ...integrations];
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.025] py-5">
      <div className="mx-auto max-w-7xl overflow-hidden px-5">
        <div className="animate-marquee flex w-max gap-3">
          {repeated.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="inline-flex h-10 items-center rounded-lg border border-white/[0.08] bg-[#0b1120] px-4 font-mono-brand text-xs text-slate-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="platform" className="px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.18em] text-[#7f95ff]">Platform</p>
          <h2 className="font-display mt-4 text-4xl font-bold tracking-normal text-white sm:text-5xl">Built for answers that survive scrutiny.</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="glass-panel rounded-xl p-5 transition hover:-translate-y-1 hover:border-white/15">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: `${feature.accent}18`, color: feature.accent }}>
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Operations() {
  const rows: Array<{ title: string; text: string; icon: LucideIcon }> = [
    { title: "Ingestion", text: "Folder scans, file parsing, chunking, metadata normalization", icon: Radio },
    { title: "Retrieval", text: "Semantic cache, hybrid retrieval, reranking, access filtering", icon: Search },
    { title: "Evaluation", text: "Golden question runs, feedback capture, prompt versioning", icon: BarChart3 },
    { title: "Governance", text: "RBAC, guardrails, citations, audit-friendly source previews", icon: GitBranch },
  ];

  return (
    <section id="operations" className="border-y border-white/[0.06] bg-[#070d1c] px-5 py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.18em] text-[#10b981]">Operations</p>
          <h2 className="font-display mt-4 text-4xl font-bold tracking-normal text-white sm:text-5xl">A control plane for the whole knowledge lifecycle.</h2>
          <p className="mt-5 text-base leading-7 text-slate-400">
            The admin experience is designed for repeated operational work: source health, jobs, prompt controls, monitoring, authentication, and governance.
          </p>
        </div>
        <div className="glass-panel overflow-hidden rounded-xl">
          {rows.map(({ title, text, icon: Icon }, index) => (
            <div key={title} className="grid gap-4 border-white/[0.06] p-5 sm:grid-cols-[44px_1fr_auto] sm:items-center" style={{ borderBottomWidth: index === rows.length - 1 ? 0 : 1 }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] text-[#7f95ff]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
              </div>
              <Globe className="hidden h-4 w-4 text-slate-600 sm:block" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#4f6ef7]/18 via-[#7c3aed]/12 to-[#10b981]/10 p-8 sm:p-10 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-normal text-white">Start with a cited answer.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Try the assistant with the seeded enterprise knowledge base, then tune sources, prompts, and evaluations from the admin console.
          </p>
        </div>
        <Link href="/assistant" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#03060f] transition hover:bg-slate-200">
          Open Assistant
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
