"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { AuthenticationSettings, getAuthenticationSettings } from "../lib/api";
import { AdminShell, ErrorBanner, StatusBadge } from "./admin-shell";

export function AdminAuthentication() {
  const [settings, setSettings] = useState<AuthenticationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuthenticationSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Authentication request failed"));
  }, []);

  return (
    <AdminShell title="Authentication" eyebrow="Admin">
      {error && <ErrorBanner message={error} />}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <KeyRound size={18} aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-950">Current Mode</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="Mode" value={settings?.mode ?? "Loading"} />
            <Row label="Provider" value={settings?.active_provider ?? "Loading"} />
            <Row label="Mock Header" value={settings?.mock_login_header ?? "Loading"} />
            <Row label="Session Timeout" value={`${settings?.session_timeout_minutes ?? "-"} minutes`} />
          </dl>
        </div>

        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-950">Controls</h2>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Admin MFA</span>
              <StatusBadge value={settings?.mfa_required_for_admins ? "active" : "planned"} />
            </div>
            <div>
              <div className="text-slate-600">Allowed Domains</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(settings?.allowed_domains ?? []).map((domain) => (
                  <span key={domain} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                    {domain}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Planned Providers</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(settings?.planned_providers ?? []).map((provider) => (
                  <span key={provider} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                    {provider}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-950">{value}</dd>
    </div>
  );
}
