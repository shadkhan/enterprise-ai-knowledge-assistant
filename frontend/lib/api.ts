const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type PreferredQuality = "cheap" | "balanced" | "premium";
export type MockUserId = "u-employee" | "u-hr" | "u-admin" | "u-finance" | "u-legal";

export type UserProfile = {
  user_id: MockUserId | string;
  name: string;
  email: string;
  roles: string[];
  department: string;
  clearance: string;
  status: string;
  auth_provider: string;
  last_login: string;
};

export type ChatResponse = {
  answer: string;
  citations: Array<{
    document_id: string;
    title: string;
    chunk_id: string;
    score: number;
  }>;
  model: string;
  provider: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  guardrail_flags: string[];
  semantic_cache_hit: boolean;
  semantic_cache_score?: number | null;
  semantic_cache_source_question?: string | null;
};

export type DocumentSummary = {
  document_id: string;
  title: string;
  source_type: string;
  department: string;
  classification: string;
  tags: string[];
  owner_id: string;
  metadata: Record<string, unknown>;
};

export type AuthenticationSettings = {
  mode: string;
  active_provider: string;
  session_timeout_minutes: number;
  mfa_required_for_admins: boolean;
  allowed_domains: string[];
  mock_login_header: string;
  planned_providers: string[];
};

export type AdminSettings = {
  default_llm_provider: string;
  default_embedding_provider: string;
  retrieval_mode: string;
  semantic_cache_enabled: boolean;
  semantic_cache_ttl_seconds: number;
  semantic_cache_similarity_threshold: number;
  retrieval_cache_ttl_seconds: number;
  ingestion_job_ttl_seconds: number;
  openai_fallback_to_mock: boolean;
};

export type GovernanceSummary = {
  policies: Array<{
    policy_id: string;
    name: string;
    category: string;
    status: string;
    enforcement: string;
    owner: string;
    description: string;
  }>;
  audit_events_retention_days: number;
  data_classifications: string[];
  approval_required_for: string[];
};

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Keep the fallback below when the API returns non-JSON errors.
  }
  return `${response.status} ${response.statusText}`.trim();
}

export async function askQuestion(
  question: string,
  options: { userId?: MockUserId; preferredQuality?: PreferredQuality; topK?: number } = {},
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": options.userId ?? "u-employee",
    },
    body: JSON.stringify({
      question,
      preferred_quality: options.preferredQuality ?? "balanced",
      top_k: options.topK ?? 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getDocuments(userId: MockUserId = "u-employee"): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    headers: { "X-User-Id": userId },
  });

  if (!response.ok) {
    throw new Error(`Documents request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getCostMetrics(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/metrics/cost`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Metrics request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getCurrentUser(userId: MockUserId = "u-employee"): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { "X-User-Id": userId },
  });

  if (!response.ok) {
    throw new Error(`Current user request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Admin users request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAuthenticationSettings(): Promise<AuthenticationSettings> {
  const response = await fetch(`${API_BASE_URL}/admin/authentication`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Authentication settings request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const response = await fetch(`${API_BASE_URL}/admin/settings`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Admin settings request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getGovernanceSummary(): Promise<GovernanceSummary> {
  const response = await fetch(`${API_BASE_URL}/admin/governance`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Governance request failed: ${await parseError(response)}`);
  }

  return response.json();
}
