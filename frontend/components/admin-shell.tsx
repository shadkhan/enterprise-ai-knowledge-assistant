"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Brain,
  ClipboardCheck,
  Database,
  FilePlus2,
  HeartPulse,
  KeyRound,
  LibraryBig,
  ListChecks,
  MessageSquare,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/documents", label: "Documents", icon: Database },
  { href: "/admin/ingestion", label: "Ingestion", icon: FilePlus2 },
  { href: "/admin/jobs", label: "Jobs", icon: ListChecks },
  { href: "/admin/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { href: "/admin/prompts", label: "Prompts", icon: LibraryBig },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/monitoring", label: "Monitoring", icon: HeartPulse },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/authentication", label: "Authentication", icon: KeyRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/governance", label: "Governance", icon: ShieldCheck },
];

export function AdminShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="admin-surface app-mesh app-grid min-h-screen overflow-x-hidden p-3 text-[#e8edf8] sm:p-4 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 gap-4 lg:h-[calc(100vh-2rem)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-2xl px-5 py-5 shadow-2xl shadow-black/20 lg:h-[calc(100vh-2rem)]">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] text-white" aria-label="SynapseAI home">
              <Brain size={20} aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display truncate text-base font-semibold leading-tight text-white">Admin Console</h1>
              <p className="font-mono-brand text-xs text-slate-500">Control plane</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/assistant" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] text-xs font-semibold text-slate-300 hover:bg-white/[0.06]">
              <MessageSquare size={14} aria-hidden="true" />
              Assistant
            </Link>
            <Link href="/" className="inline-flex h-9 items-center justify-center rounded-lg border border-[#4f6ef7]/30 bg-[#4f6ef7]/10 px-3 text-xs font-semibold text-[#9dadff] hover:bg-[#4f6ef7]/15">
              Platform
            </Link>
          </div>

          <nav className="subtle-scroll mt-7 space-y-1 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition ${
                    active
                      ? "border-[#4f6ef7]/50 bg-[#4f6ef7]/15 text-white shadow-lg shadow-[#4f6ef7]/10"
                      : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.035] hover:text-white"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-h-0 flex-col rounded-2xl lg:h-[calc(100vh-2rem)] lg:overflow-hidden">
          <header className="glass-panel rounded-2xl p-5 shadow-2xl shadow-black/20">
            <div>
              <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.18em] text-[#7f95ff]">{eyebrow}</p>
              <h1 className="font-display mt-1 text-3xl font-bold tracking-normal text-white">{title}</h1>
            </div>
          </header>
          <div className="subtle-scroll mt-4 min-h-0 flex-1 pr-1 lg:overflow-y-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="glass-panel rounded-xl p-5 text-sm text-slate-400">{message}</div>;
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const color =
    normalized === "active"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
      : normalized === "planned"
        ? "border-slate-400/20 bg-white/[0.04] text-slate-300"
        : normalized === "prototype" || normalized === "review_required"
          ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
          : "border-white/[0.08] bg-white/[0.04] text-slate-300";

  return <span className={`inline-flex rounded-lg border px-2 py-1 font-mono-brand text-xs font-medium ${color}`}>{value}</span>;
}
