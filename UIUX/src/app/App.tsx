import { useState, useRef, useEffect } from "react";
import {
  Brain, Search, Database, Users, Settings, MessageSquare, Send, Plus,
  Zap, Shield, Globe, BarChart3, FileText, ArrowRight, Check, Bell,
  Layers, TrendingUp, Activity, Server, Lock, Clock, Sparkles,
  BookOpen, Filter, MoreHorizontal, Trash2, RefreshCw, ChevronRight,
  X, Eye, Download, AlertCircle, Star, GitBranch, Hash, Workflow,
  ChevronDown, Menu, Cpu, CircleDot, Boxes, ScanLine, Radio,
  SquareStack, Lightbulb, BarChart2, PieChart, LineChart, Table,
  UserCheck, KeyRound, Webhook, FolderSync, Gauge, Network
} from "lucide-react";
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from "recharts";

type Page = "landing" | "assistant" | "admin";
type AdminTab = "overview" | "sources" | "users" | "settings";

// ─── Data ────────────────────────────────────────────────────────────────────

const queryVolumeData = [
  { day: "Mon", queries: 1240, resolved: 1180 },
  { day: "Tue", queries: 1890, resolved: 1750 },
  { day: "Wed", queries: 2340, resolved: 2200 },
  { day: "Thu", queries: 1980, resolved: 1860 },
  { day: "Fri", queries: 2780, resolved: 2650 },
  { day: "Sat", queries: 890, resolved: 840 },
  { day: "Sun", queries: 650, resolved: 610 },
];

const sourceHealthData = [
  { name: "Salesforce", docs: 48200, status: "synced", lastSync: "2 min ago", icon: "SF", color: "#00A1E0" },
  { name: "Confluence", docs: 31500, status: "synced", lastSync: "5 min ago", icon: "CF", color: "#0052CC" },
  { name: "GitHub", docs: 22800, status: "synced", lastSync: "1 min ago", icon: "GH", color: "#6e40c9" },
  { name: "Slack", docs: 189400, status: "synced", lastSync: "Real-time", icon: "SL", color: "#4A154B" },
  { name: "Notion", docs: 8700, status: "indexing", lastSync: "Syncing…", icon: "NT", color: "#000000" },
  { name: "SharePoint", docs: 54300, status: "synced", lastSync: "12 min ago", icon: "SP", color: "#0078D4" },
  { name: "Jira", docs: 29100, status: "synced", lastSync: "3 min ago", icon: "JR", color: "#0052CC" },
  { name: "HubSpot", docs: 14600, status: "error", lastSync: "Failed 1h ago", icon: "HS", color: "#FF7A59" },
];

const recentUsers = [
  { name: "Priya Sharma", role: "VP of Sales", queries: 342, status: "active", avatar: "PS" },
  { name: "Marcus Chen", role: "Engineering Lead", queries: 289, status: "active", avatar: "MC" },
  { name: "Elena Kowalski", role: "Product Manager", queries: 215, status: "active", avatar: "EK" },
  { name: "James Okafor", role: "Data Analyst", queries: 198, status: "active", avatar: "JO" },
  { name: "Sofia Reyes", role: "Customer Success", queries: 176, status: "inactive", avatar: "SR" },
  { name: "David Park", role: "Legal Counsel", queries: 143, status: "active", avatar: "DP" },
];

const recentQueries = [
  { query: "What are the Q3 revenue targets for APAC?", user: "Priya S.", source: "Salesforce", time: "2m ago", status: "answered" },
  { query: "Summarize last sprint's engineering velocity", user: "Marcus C.", source: "Jira", time: "8m ago", status: "answered" },
  { query: "What is our NPS score for enterprise accounts?", user: "Elena K.", source: "HubSpot", time: "15m ago", status: "answered" },
  { query: "Find all open P0 incidents in the past 30 days", user: "James O.", source: "GitHub", time: "23m ago", status: "answered" },
  { query: "Draft a compliance report for SOC2 audit", user: "David P.", source: "Confluence", time: "41m ago", status: "answered" },
];

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: { name: string; icon: string; excerpt: string }[];
  ts: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "user",
    content: "What were our top 3 enterprise deals closed in Q2, and what were the key factors that led to winning them?",
    ts: "10:24 AM",
  },
  {
    id: 2,
    role: "assistant",
    content: `Based on Salesforce CRM data, Confluence deal notes, and Slack conversations, here are your top 3 Q2 enterprise closes:

**1. GlobalDynamics Inc. — $2.4M ARR**
Closed June 14. Key factors: personalized executive briefing by CRO, POC completed in under 10 days, security review fast-tracked via shared SOC2 report. Champion was VP of IT Infrastructure.

**2. NovaTech Solutions — $1.8M ARR**
Closed May 29. Won on product capability (multi-source ingestion vs. competitor's single-source), and 3-year pricing lock-in. Slack logs show competitor displacement from Glean.

**3. Meridian Financial Group — $1.5M ARR**
Closed June 28. Regulated industry win driven by on-prem deployment option and data residency guarantees. Legal review took 6 weeks but was resolved via redlined MSA template.

**Common winning patterns:** All three had executive sponsors engaged before technical evaluation, proof-of-concept within first 2 weeks, and security documentation shared proactively.`,
    sources: [
      { name: "Salesforce", icon: "SF", excerpt: "Q2 Closed Won · Enterprise Segment · 3 records" },
      { name: "Confluence", icon: "CF", excerpt: "Deal Win Analysis · Q2 2025 · Sales Playbook" },
      { name: "Slack #sales-wins", icon: "SL", excerpt: "14 relevant messages · Jun 2025" },
    ],
    ts: "10:24 AM",
  },
];

const conversations = [
  { id: 1, title: "Q2 Enterprise Deal Analysis", preview: "Top 3 closes and key factors…", time: "10:24 AM", active: true },
  { id: 2, title: "Engineering Sprint Velocity", preview: "Last sprint summary and blockers…", time: "Yesterday" },
  { id: 3, title: "SOC2 Compliance Report Draft", preview: "Evidence gathering and gaps…", time: "Yesterday" },
  { id: 4, title: "APAC Revenue Forecast", preview: "Q3 targets and pipeline health…", time: "Mon" },
  { id: 5, title: "Incident Post-Mortem P0-2391", preview: "Root cause and action items…", time: "Mon" },
  { id: 6, title: "Customer Churn Risk Analysis", preview: "At-risk accounts for CSM review…", time: "Jun 28" },
];

const features = [
  {
    icon: Layers,
    title: "Unified Knowledge Graph",
    desc: "Connects every data silo — CRM, docs, code, messages — into a single queryable intelligence layer that understands context across sources.",
    accent: "#4f6ef7",
  },
  {
    icon: ScanLine,
    title: "Semantic Retrieval",
    desc: "Vector embeddings + BM25 hybrid search surfaces the exact information you need, not just keyword matches. Understands intent, not just tokens.",
    accent: "#7c3aed",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    desc: "Row-level permission inheritance from source systems. Users only see what they're authorized to see — enforced at query time, not ingestion.",
    accent: "#10b981",
  },
  {
    icon: Workflow,
    title: "Real-Time Sync Engine",
    desc: "Continuous ingestion with incremental indexing. Changes in Salesforce, Jira, or Slack appear in the knowledge base within seconds.",
    accent: "#f59e0b",
  },
  {
    icon: Sparkles,
    title: "Cited AI Answers",
    desc: "Every response includes traceable citations with source, document, and excerpt — so your team trusts answers and can verify them instantly.",
    accent: "#ec4899",
  },
  {
    icon: BarChart2,
    title: "Usage Intelligence",
    desc: "Analytics on what your team is searching for, what goes unanswered, and which knowledge gaps need filling — to improve over time.",
    accent: "#06b6d4",
  },
];

const integrations = [
  { name: "Salesforce", color: "#00A1E0" },
  { name: "Confluence", color: "#0052CC" },
  { name: "GitHub", color: "#a78bfa" },
  { name: "Slack", color: "#4A154B" },
  { name: "Notion", color: "#e2e8f0" },
  { name: "SharePoint", color: "#0078D4" },
  { name: "Jira", color: "#0052CC" },
  { name: "HubSpot", color: "#FF7A59" },
  { name: "Google Drive", color: "#34A853" },
  { name: "Zendesk", color: "#03363D" },
  { name: "ServiceNow", color: "#62D84E" },
  { name: "Snowflake", color: "#29B5E8" },
];

// ─── Shared Components ────────────────────────────────────────────────────────

function Badge({ children, color = "#4f6ef7" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {children}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    synced: "#10b981",
    indexing: "#f59e0b",
    error: "#ef4444",
    active: "#10b981",
    inactive: "#64748b",
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: colors[status] ?? "#64748b", boxShadow: `0 0 6px ${colors[status] ?? "#64748b"}88` }}
    />
  );
}

function SourceAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ backgroundColor: color, fontFamily: "'JetBrains Mono', monospace" }}
    >
      {initials}
    </div>
  );
}

// ─── Top Navigation ───────────────────────────────────────────────────────────

function TopNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-16"
      style={{
        background: "rgba(3, 6, 15, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <button
        onClick={() => setPage("landing")}
        className="flex items-center gap-2.5 group"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)" }}
        >
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
        >
          Synapse<span style={{ color: "#4f6ef7" }}>AI</span>
        </span>
      </button>

      {/* Center nav */}
      <nav className="hidden md:flex items-center gap-1">
        {[
          { label: "Platform", page: "landing" as Page },
          { label: "Assistant", page: "assistant" as Page },
          { label: "Admin", page: "admin" as Page },
        ].map((item) => (
          <button
            key={item.page}
            onClick={() => setPage(item.page)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              color: page === item.page ? "#4f6ef7" : "#94a3b8",
              background: page === item.page ? "rgba(79, 110, 247, 0.1)" : "transparent",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5"
          style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPage("assistant")}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI
        </button>
        <button
          className="md:hidden p-2 rounded-lg"
          style={{ color: "#94a3b8" }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="absolute top-16 left-0 right-0 p-4 flex flex-col gap-2 md:hidden"
          style={{ background: "#070d1c", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(["landing", "assistant", "admin"] as Page[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPage(p); setMobileOpen(false); }}
              className="px-4 py-3 rounded-lg text-left text-sm font-medium capitalize"
              style={{
                color: page === p ? "#4f6ef7" : "#94a3b8",
                background: page === p ? "rgba(79,110,247,0.1)" : "transparent",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {p === "landing" ? "Platform" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

function LandingPage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="overflow-x-hidden">
      <style>{`
        @keyframes mesh-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-med {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 0.9; }
          100% { opacity: 0.4; }
        }
        @keyframes scroll-x {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-mesh-a { animation: mesh-drift 12s ease-in-out infinite; }
        .animate-mesh-b { animation: mesh-drift 16s ease-in-out infinite reverse; }
        .animate-mesh-c { animation: mesh-drift 20s ease-in-out infinite 4s; }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-med { animation: float-med 4.5s ease-in-out infinite 1s; }
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
        .animate-scroll-x { animation: scroll-x 30s linear infinite; }
        .glass-card {
          background: rgba(11, 17, 32, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .gradient-text {
          background: linear-gradient(135deg, #e8edf8 0%, #4f6ef7 50%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-blue {
          background: linear-gradient(135deg, #4f6ef7, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Mesh orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[600px] h-[600px] rounded-full animate-mesh-a"
            style={{
              top: "10%", left: "10%",
              background: "radial-gradient(circle, rgba(79,110,247,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full animate-mesh-b"
            style={{
              top: "20%", right: "10%",
              background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full animate-mesh-c"
            style={{
              bottom: "10%", left: "35%",
              background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Eyebrow */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-shimmer"
          style={{
            background: "rgba(79,110,247,0.1)",
            border: "1px solid rgba(79,110,247,0.25)",
          }}
        >
          <CircleDot className="w-3.5 h-3.5" style={{ color: "#4f6ef7" }} />
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "#4f6ef7", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Enterprise AI · Now Generally Available
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-center max-w-4xl leading-[1.05] mb-6"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(48px, 8vw, 88px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          <span className="gradient-text">The Intelligence Layer</span>
          <br />
          <span style={{ color: "#e8edf8" }}>Your Enterprise Deserves</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-center max-w-2xl mb-12 leading-relaxed"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "#64748b",
            fontWeight: 300,
          }}
        >
          Synapse AI ingests every data source — CRM, docs, code, messages — and gives your
          entire organization a single, trusted AI that answers from your own knowledge.
          No hallucinations. Full citations. Permission-aware.
        </p>

        {/* Demo query box */}
        <div
          className="w-full max-w-2xl mb-8 rounded-2xl p-1"
          style={{
            background: "linear-gradient(135deg, rgba(79,110,247,0.4), rgba(124,58,237,0.4))",
          }}
        >
          <div
            className="rounded-xl px-5 py-4 flex items-center gap-4"
            style={{ background: "#070d1c" }}
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: "#4f6ef7" }} />
            <span
              className="flex-1 text-base"
              style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
            >
              "What are the top churn risks in our enterprise accounts this quarter?"
            </span>
            <button
              onClick={() => setPage("assistant")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Ask <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button
            onClick={() => setPage("assistant")}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 40px rgba(79,110,247,0.3)",
            }}
          >
            <Sparkles className="w-4 h-4" />
            Start for Free
          </button>
          <button
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-all duration-200 hover:bg-white/5"
            style={{
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Watch Demo <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Floating source cards */}
        <div className="relative w-full max-w-3xl h-32 hidden lg:block">
          {[
            { label: "Salesforce", color: "#00A1E0", left: "0%", delay: "0s" },
            { label: "GitHub", color: "#a78bfa", left: "18%", delay: "0.8s" },
            { label: "Confluence", color: "#0052CC", left: "38%", delay: "0.4s" },
            { label: "Slack", color: "#E01E5A", left: "58%", delay: "1.2s" },
            { label: "Jira", color: "#0052CC", left: "76%", delay: "0.2s" },
          ].map((s) => (
            <div
              key={s.label}
              className="absolute bottom-0 flex items-center gap-2 px-3 py-2 rounded-xl animate-float-slow"
              style={{
                left: s.left,
                animationDelay: s.delay,
                background: "rgba(11,17,32,0.8)",
                border: `1px solid ${s.color}30`,
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <span className="text-xs font-medium" style={{ color: "#e8edf8", fontFamily: "'DM Sans', sans-serif" }}>
                {s.label}
              </span>
              <span className="text-xs" style={{ color: "#4f6ef7", fontFamily: "'JetBrains Mono', monospace" }}>●</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div
          className="flex flex-wrap justify-center gap-8 mt-16 pt-10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { value: "500+", label: "Enterprise Customers" },
            { value: "2.4B+", label: "Documents Indexed" },
            { value: "99.97%", label: "Uptime SLA" },
            { value: "<200ms", label: "Median Latency" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-2xl font-bold mb-1 gradient-text-blue"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs uppercase tracking-wider"
                style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations scroll bar */}
      <section className="py-10 overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex gap-4 animate-scroll-x" style={{ width: "max-content" }}>
          {[...integrations, ...integrations].map((intg, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: intg.color }} />
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                {intg.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-block text-xs font-medium tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{
              color: "#7c3aed",
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.2)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Core Capabilities
          </div>
          <h2
            className="text-4xl lg:text-5xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8", letterSpacing: "-0.02em" }}
          >
            Built for enterprise, not startups
          </h2>
          <p
            className="max-w-xl mx-auto text-base leading-relaxed"
            style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
          >
            Every feature is designed for the complexity of real enterprise environments —
            not simplified demos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="glass-card rounded-2xl p-6 group cursor-default transition-all duration-300 hover:border-opacity-20"
                style={{ transition: "border-color 0.3s, box-shadow 0.3s" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 40px ${feat.accent}15`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${feat.accent}25`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${feat.accent}18`, border: `1px solid ${feat.accent}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: feat.accent }} />
                </div>
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section
        className="px-6 py-24"
        style={{ background: "rgba(11,17,32,0.4)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl lg:text-5xl font-bold mb-4 leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8", letterSpacing: "-0.02em" }}
            >
              From raw data to trusted answers
            </h2>
            <p className="text-base" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
              Three steps. Fully automated. Zero prompt engineering required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {[
              {
                step: "01",
                title: "Connect Your Sources",
                desc: "OAuth-based connectors to 50+ enterprise systems. Your data never leaves your cloud. Incremental sync every 60 seconds.",
                icon: Network,
                color: "#4f6ef7",
              },
              {
                step: "02",
                title: "Intelligent Indexing",
                desc: "Chunking, embedding, and metadata extraction. Permission graph captured at ingestion. Hybrid vector + BM25 index built automatically.",
                icon: Cpu,
                color: "#7c3aed",
              },
              {
                step: "03",
                title: "Ask Anything",
                desc: "Natural language queries return grounded answers with citations. Accessible via chat UI, API, Slack bot, or browser extension.",
                icon: Sparkles,
                color: "#10b981",
              },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative flex flex-col">
                  <div
                    className="glass-card rounded-2xl p-7 flex-1"
                  >
                    <div
                      className="text-xs font-bold mb-5"
                      style={{ color: step.color, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {step.step}
                    </div>
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: step.color }} />
                    </div>
                    <h3
                      className="text-xl font-bold mb-3"
                      style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                      {step.desc}
                    </p>
                  </div>
                  {i < 2 && (
                    <div
                      className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full items-center justify-center z-10"
                      style={{ background: "#0b1120", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <ArrowRight className="w-4 h-4" style={{ color: "#4f6ef7" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="px-6 py-28 max-w-4xl mx-auto text-center">
        <div
          className="rounded-3xl p-12 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(79,110,247,0.15) 0%, rgba(124,58,237,0.15) 100%)",
            border: "1px solid rgba(79,110,247,0.2)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(79,110,247,0.3) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <h2
              className="text-4xl lg:text-5xl font-bold mb-4 leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8", letterSpacing: "-0.02em" }}
            >
              Ready to unify your enterprise knowledge?
            </h2>
            <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
              Join 500+ enterprises that have eliminated knowledge silos and empowered
              every employee with instant, trusted AI answers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setPage("assistant")}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 0 40px rgba(79,110,247,0.4)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Start Free Trial
              </button>
              <button
                onClick={() => setPage("admin")}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium hover:bg-white/5 transition-all duration-200"
                style={{
                  color: "#94a3b8",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                View Admin Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)" }}
          >
            <Brain className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#64748b" }}>
            SynapseAI
          </span>
        </div>
        <p className="text-xs" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
          © 2025 Synapse Intelligence Corp. SOC2 Type II · ISO 27001 · GDPR Ready
        </p>
      </footer>
    </div>
  );
}

// ─── AI Assistant Page ────────────────────────────────────────────────────────

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(1);
  const [showSources, setShowSources] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: input, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Based on your connected data sources, I found relevant information across Confluence, Salesforce, and Slack.\n\nThe data indicates strong performance in the APAC region with Q3 pipeline at **127% of target**. Key enterprise accounts including Meridian Financial and TechCorp Asia have expanded contracts this quarter.\n\n**Key insights:**\n- Enterprise NRR is at 118% driven by product expansion\n- 3 strategic accounts flagged as expansion opportunities by CSM team\n- Engineering capacity is the primary constraint on enterprise delivery timelines\n\nWould you like me to drill deeper into any specific account or metric?`,
        sources: [
          { name: "Salesforce", icon: "SF", excerpt: "Q3 Pipeline · Enterprise APAC · Updated 4h ago" },
          { name: "Confluence", icon: "CF", excerpt: "QBR Deck · APAC Revenue Review · Jun 2025" },
        ],
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1800);
  };

  const lastAiMsg = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex h-screen pt-16 overflow-hidden" style={{ background: "#03060f" }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .msg-appear { animation: msg-in 0.3s ease-out; }
        @keyframes msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes typing-pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .typing-dot { animation: typing-pulse 1.4s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .prose-ai h3 { font-size: 0.9rem; font-weight: 600; color: #e8edf8; margin-bottom: 8px; margin-top: 12px; }
        .prose-ai strong { color: #e8edf8; font-weight: 600; }
        .prose-ai ul { padding-left: 16px; list-style: disc; }
        .prose-ai li { margin-bottom: 4px; }
      `}</style>

      {/* Conversation Sidebar */}
      {sidebarOpen && (
        <aside
          className="w-64 flex-shrink-0 flex flex-col border-r overflow-hidden"
          style={{ background: "#070d1c", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>
          <div className="px-4 py-3 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#475569" }} />
              <input
                type="text"
                placeholder="Search conversations…"
                className="bg-transparent text-sm outline-none flex-1 min-w-0"
                style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar px-3 pb-4">
            <p className="text-xs px-2 mb-2 uppercase tracking-widest" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
              Recent
            </p>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className="w-full text-left px-3 py-3 rounded-xl mb-1 transition-all duration-150"
                style={{
                  background: activeConv === conv.id ? "rgba(79,110,247,0.12)" : "transparent",
                  border: activeConv === conv.id ? "1px solid rgba(79,110,247,0.2)" : "1px solid transparent",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p
                    className="text-xs font-medium leading-snug"
                    style={{
                      color: activeConv === conv.id ? "#e8edf8" : "#94a3b8",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {conv.title}
                  </p>
                </div>
                <p className="text-xs truncate" style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}>
                  {conv.preview}
                </p>
                <p className="text-xs mt-1" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                  {conv.time}
                </p>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Main Chat */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Chat toolbar */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(7,13,28,0.5)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: "#475569" }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#e8edf8", fontFamily: "'DM Sans', sans-serif" }}>
                Q2 Enterprise Deal Analysis
              </p>
              <p className="text-xs" style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                Salesforce · Confluence · Slack
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: showSources ? "#4f6ef7" : "#64748b", fontFamily: "'JetBrains Mono', monospace" }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Sources
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#475569" }}>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 lg:px-10 py-8 space-y-8">
          {messages.map((msg) => (
            <div key={msg.id} className="msg-appear">
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-xl">
                    <div
                      className="px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                      style={{
                        background: "linear-gradient(135deg, rgba(79,110,247,0.2), rgba(124,58,237,0.2))",
                        border: "1px solid rgba(79,110,247,0.25)",
                        color: "#e8edf8",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {msg.content}
                    </div>
                    <p className="text-right text-xs mt-1" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                      {msg.ts}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 max-w-3xl">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)" }}
                  >
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="prose-ai rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed"
                      style={{
                        background: "#0b1120",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#94a3b8",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/^- (.+)$/gm, "<li>$1</li>")
                          .replace(/<li>/g, "<ul><li>")
                          .replace(/<\/li>\n/g, "</li></ul>\n")
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                    {msg.sources && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.sources.map((src) => (
                          <div
                            key={src.name}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:border-opacity-30 transition-all"
                            style={{
                              background: "rgba(11,17,32,0.8)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <span
                              className="text-xs font-bold"
                              style={{ color: "#4f6ef7", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {src.icon}
                            </span>
                            <div>
                              <p className="text-xs font-medium" style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
                                {src.name}
                              </p>
                              <p className="text-xs" style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}>
                                {src.excerpt}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs mt-2" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                      {msg.ts} · Synapse AI
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-3xl msg-appear">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)" }}
              >
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div
                className="px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2"
                style={{ background: "#0b1120", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="typing-dot w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#4f6ef7", animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-4 lg:px-10 pb-6 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="flex items-end gap-3 rounded-2xl px-4 py-3"
            style={{ background: "#0b1120", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything across your connected sources…"
              className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
              style={{
                color: "#e8edf8",
                fontFamily: "'DM Sans', sans-serif",
                maxHeight: "160px",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-200 disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)", color: "#fff" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
            Grounded responses · Permission-aware · Cited sources
          </p>
        </div>
      </main>

      {/* Sources Panel */}
      {showSources && (
        <aside
          className="w-72 flex-shrink-0 border-l overflow-y-auto hide-scrollbar"
          style={{ background: "#070d1c", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="p-5">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Knowledge Sources
            </p>
            <div className="space-y-2 mb-6">
              {sourceHealthData.slice(0, 5).map((src) => (
                <div
                  key={src.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <SourceAvatar initials={src.icon} color={src.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate" style={{ color: "#e8edf8", fontFamily: "'DM Sans', sans-serif" }}>
                        {src.name}
                      </p>
                      <StatusDot status={src.status} />
                    </div>
                    <p className="text-xs" style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                      {src.docs.toLocaleString()} docs
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {lastAiMsg?.sources && (
              <>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Last Response Citations
                </p>
                <div className="space-y-2">
                  {lastAiMsg.sources.map((src, i) => (
                    <div
                      key={i}
                      className="px-3 py-3 rounded-xl cursor-pointer hover:border-opacity-20 transition-all"
                      style={{
                        background: "rgba(79,110,247,0.05)",
                        border: "1px solid rgba(79,110,247,0.15)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold" style={{ color: "#4f6ef7", fontFamily: "'JetBrains Mono', monospace" }}>
                          [{i + 1}]
                        </span>
                        <p className="text-xs font-medium" style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
                          {src.name}
                        </p>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}>
                        {src.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems: { label: string; tab: AdminTab; icon: React.ElementType }[] = [
    { label: "Overview", tab: "overview", icon: Gauge },
    { label: "Data Sources", tab: "sources", icon: Database },
    { label: "Users", tab: "users", icon: Users },
    { label: "Settings", tab: "settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen pt-16 overflow-hidden" style={{ background: "#03060f" }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .admin-card {
          background: #0b1120;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 1rem;
        }
        .recharts-tooltip-wrapper .custom-tooltip {
          background: #111827 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px;
          padding: 8px 12px;
        }
      `}</style>

      {/* Admin sidebar */}
      {sidebarOpen && (
        <aside
          className="w-56 flex-shrink-0 flex flex-col border-r overflow-hidden"
          style={{ background: "#070d1c", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Admin Console
            </p>
          </div>
          <nav className="flex-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  onClick={() => setTab(item.tab)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all duration-150"
                  style={{
                    color: tab === item.tab ? "#4f6ef7" : "#64748b",
                    background: tab === item.tab ? "rgba(79,110,247,0.1)" : "transparent",
                    border: tab === item.tab ? "1px solid rgba(79,110,247,0.2)" : "1px solid transparent",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>
                  All Systems
                </p>
                <p className="text-xs" style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                  Operational
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Admin main */}
      <main className="flex-1 overflow-y-auto hide-scrollbar min-w-0">
        {/* Admin toolbar */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 flex-shrink-0"
          style={{
            background: "rgba(3,6,15,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-white/5"
              style={{ color: "#475569" }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1
              className="text-lg font-bold"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
            >
              {navItems.find((n) => n.tab === tab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs"
              style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Acme Corporation · Enterprise Plan
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #4f6ef7, #7c3aed)", color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}
            >
              AC
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Queries (7d)", value: "11,770", delta: "+18.4%", color: "#4f6ef7", icon: MessageSquare },
                  { label: "Knowledge Items", value: "398,600", delta: "+2.3k today", color: "#7c3aed", icon: BookOpen },
                  { label: "Connected Sources", value: "8 / 12", delta: "1 indexing", color: "#10b981", icon: Database },
                  { label: "Active Users", value: "247", delta: "+12 this week", color: "#f59e0b", icon: Users },
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={kpi.label} className="admin-card p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `${kpi.color}18`, border: `1px solid ${kpi.color}25` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            color: "#10b981",
                            background: "rgba(16,185,129,0.1)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {kpi.delta}
                        </span>
                      </div>
                      <p
                        className="text-2xl font-bold mb-1"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
                      >
                        {kpi.value}
                      </p>
                      <p className="text-xs" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                        {kpi.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Chart + Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Query Volume Chart */}
                <div className="admin-card p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
                      >
                        Query Volume
                      </h3>
                      <p className="text-xs" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                        Last 7 days — queries vs. resolved
                      </p>
                    </div>
                    <select
                      className="text-xs px-2 py-1 rounded-lg bg-transparent outline-none"
                      style={{ color: "#64748b", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <option>7 days</option>
                      <option>30 days</option>
                    </select>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={queryVolumeData}>
                      <defs>
                        <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#475569", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "#94a3b8" }}
                        itemStyle={{ color: "#e8edf8" }}
                      />
                      <Area type="monotone" dataKey="queries" stroke="#4f6ef7" strokeWidth={2} fill="url(#colorQueries)" name="Total Queries" />
                      <Area type="monotone" dataKey="resolved" stroke="#7c3aed" strokeWidth={2} fill="url(#colorResolved)" name="Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent queries */}
                <div className="admin-card p-5">
                  <h3
                    className="text-sm font-semibold mb-4"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
                  >
                    Recent Queries
                  </h3>
                  <div className="space-y-3">
                    {recentQueries.map((q, i) => (
                      <div key={i} className="group">
                        <p
                          className="text-xs leading-snug mb-1"
                          style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {q.query}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                            {q.user}
                          </span>
                          <span className="text-xs" style={{ color: "#4f6ef7", fontFamily: "'JetBrains Mono', monospace" }}>
                            {q.source}
                          </span>
                          <span className="text-xs ml-auto" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                            {q.time}
                          </span>
                        </div>
                        {i < recentQueries.length - 1 && (
                          <div className="mt-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Data Sources ── */}
          {tab === "sources" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                    {sourceHealthData.filter((s) => s.status === "synced").length} of {sourceHealthData.length} sources healthy
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Source
                </button>
              </div>

              <div className="admin-card overflow-hidden">
                <div
                  className="grid px-5 py-3 text-xs uppercase tracking-widest"
                  style={{
                    color: "#374151",
                    fontFamily: "'JetBrains Mono', monospace",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span>Source</span>
                  <span>Documents</span>
                  <span>Status</span>
                  <span>Last Sync</span>
                  <span></span>
                </div>
                {sourceHealthData.map((src, i) => (
                  <div
                    key={src.name}
                    className="grid px-5 py-4 items-center hover:bg-white/[0.02] transition-colors group"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                      borderBottom: i < sourceHealthData.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <SourceAvatar initials={src.icon} color={src.color} />
                      <span className="text-sm font-medium" style={{ color: "#e8edf8", fontFamily: "'DM Sans', sans-serif" }}>
                        {src.name}
                      </span>
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {src.docs.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusDot status={src.status} />
                      <span
                        className="text-xs capitalize"
                        style={{
                          color: src.status === "synced" ? "#10b981" : src.status === "indexing" ? "#f59e0b" : "#ef4444",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {src.status}
                      </span>
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {src.lastSync}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded-lg hover:bg-white/5"
                        style={{ color: "#475569" }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-white/5"
                        style={{ color: "#475569" }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-500/10"
                        style={{ color: "#475569" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Source error alert */}
              <div
                className="flex items-start gap-3 px-5 py-4 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
                    HubSpot sync failed 1 hour ago
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#7f1d1d", fontFamily: "'DM Sans', sans-serif" }}>
                    OAuth token expired. Reconnect your HubSpot account to resume syncing 14,600 documents.
                  </p>
                </div>
                <button
                  className="ml-auto text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === "users" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <Search className="w-4 h-4" style={{ color: "#475569" }} />
                  <input
                    type="text"
                    placeholder="Search users…"
                    className="bg-transparent text-sm outline-none"
                    style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif", width: "180px" }}
                  />
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Invite User
                </button>
              </div>

              <div className="admin-card overflow-hidden">
                <div
                  className="grid px-5 py-3 text-xs uppercase tracking-widest"
                  style={{
                    color: "#374151",
                    fontFamily: "'JetBrains Mono', monospace",
                    gridTemplateColumns: "2fr 1.5fr 1fr 1fr 80px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span>User</span>
                  <span>Role</span>
                  <span>Queries (30d)</span>
                  <span>Status</span>
                  <span></span>
                </div>
                {recentUsers.map((user, i) => (
                  <div
                    key={user.name}
                    className="grid px-5 py-4 items-center hover:bg-white/[0.02] transition-colors group"
                    style={{
                      gridTemplateColumns: "2fr 1.5fr 1fr 1fr 80px",
                      borderBottom: i < recentUsers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: "linear-gradient(135deg, rgba(79,110,247,0.3), rgba(124,58,237,0.3))",
                          color: "#4f6ef7",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {user.avatar}
                      </div>
                      <span className="text-sm font-medium" style={{ color: "#e8edf8", fontFamily: "'DM Sans', sans-serif" }}>
                        {user.name}
                      </span>
                    </div>
                    <span className="text-sm" style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                      {user.role}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {user.queries}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusDot status={user.status} />
                      <span
                        className="text-xs capitalize"
                        style={{
                          color: user.status === "active" ? "#10b981" : "#64748b",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {user.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#475569" }}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "#475569" }}>
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          {tab === "settings" && (
            <div className="max-w-2xl space-y-6">
              {[
                {
                  title: "Organization",
                  fields: [
                    { label: "Organization Name", value: "Acme Corporation", type: "text" },
                    { label: "Primary Domain", value: "acmecorp.com", type: "text" },
                    { label: "Data Region", value: "US-East (AWS)", type: "text" },
                  ],
                },
                {
                  title: "Security & Access",
                  fields: [
                    { label: "SSO Provider", value: "Okta", type: "text" },
                    { label: "Session Timeout", value: "8 hours", type: "text" },
                    { label: "MFA Required", value: "Enabled", type: "text" },
                  ],
                },
                {
                  title: "AI Configuration",
                  fields: [
                    { label: "LLM Model", value: "claude-sonnet-4-6", type: "text" },
                    { label: "Max Context Window", value: "200k tokens", type: "text" },
                    { label: "Response Language", value: "Auto-detect", type: "text" },
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="admin-card p-6">
                  <h3
                    className="text-sm font-semibold mb-5"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "#e8edf8" }}
                  >
                    {section.title}
                  </h3>
                  <div className="space-y-4">
                    {section.fields.map((field) => (
                      <div key={field.label} className="flex items-center justify-between">
                        <label
                          className="text-sm"
                          style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {field.label}
                        </label>
                        <input
                          type="text"
                          defaultValue={field.value}
                          className="px-3 py-1.5 rounded-lg text-sm outline-none text-right"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#94a3b8",
                            fontFamily: "'JetBrains Mono', monospace",
                            width: "200px",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("landing");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <TopNav page={page} setPage={setPage} />
      {page === "landing" && <LandingPage setPage={setPage} />}
      {page === "assistant" && <AssistantPage />}
      {page === "admin" && <AdminPage />}
    </div>
  );
}
