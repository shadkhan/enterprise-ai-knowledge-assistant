"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, ClipboardCheck, Database, FilePlus2, HeartPulse, KeyRound, ListChecks, MessageSquare, Settings, ShieldCheck, UsersRound } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/documents", label: "Documents", icon: Database },
  { href: "/admin/ingestion", label: "Ingestion", icon: FilePlus2 },
  { href: "/admin/jobs", label: "Jobs", icon: ListChecks },
  { href: "/admin/evaluations", label: "Evaluations", icon: ClipboardCheck },
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
    <main className="min-h-screen bg-slate-100 px-5 py-6 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-10 items-center gap-2 rounded border px-3 text-sm font-medium ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-500">{message}</div>;
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const color =
    normalized === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "planned"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : normalized === "prototype" || normalized === "review_required"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-600";

  return <span className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${color}`}>{value}</span>;
}
