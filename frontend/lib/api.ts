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
  prompt_key: string;
  prompt_version: number;
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

export type AdminDocumentSummary = DocumentSummary & {
  chunk_count: number;
};

export type AdminDocumentDetail = {
  document: AdminDocumentSummary;
  chunks: Array<{
    chunk_id: string;
    document_id: string;
    text: string;
    has_embedding: boolean;
    embedding_dimensions: number;
  }>;
};

export type DocumentCreate = {
  title: string;
  text: string;
  source_type: string;
  department: string;
  classification: "public" | "internal" | "restricted";
  tags: string[];
};

export type SyntheticContentRequest = {
  content_type: "document" | "pdf" | "data" | "json" | "text";
  topic: string;
  department: string;
  classification: "public" | "internal" | "restricted";
  count: number;
  tags: string[];
};

export type IngestionJobStatus = {
  job_id: string;
  status: string;
  job_type: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  error?: string | null;
  result_document_ids: string[];
};

export type EvaluationRecordSummary = {
  id: number;
  user_id: string;
  question: string;
  answer: string;
  score: number;
  hallucination_risk: string;
  notes: string[];
  created_at: string;
};

export type GoldenEvaluationRunResponse = {
  run_id: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  results: Array<{
    case_id: string;
    question: string;
    user_id: string;
    passed: boolean;
    score: number;
    hallucination_risk: string;
    expected_document_found: boolean;
    forbidden_document_leaked: boolean;
    citations: Array<{
      document_id: string;
      title: string;
      chunk_id: string;
      score: number;
    }>;
    notes: string[];
  }>;
};

export type FeedbackCreate = {
  question: string;
  answer: string;
  rating: "up" | "down";
  comment?: string;
  citations: ChatResponse["citations"];
  model?: string;
  provider?: string;
};

export type FeedbackRecordSummary = {
  id: number;
  user_id: string;
  question: string;
  answer: string;
  rating: "up" | "down";
  comment?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
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
  reranking_enabled: boolean;
  reranker_provider: string;
  reranker_model: string;
  reranker_top_n: number;
  reranker_candidate_multiplier: number;
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

export type RuntimeMetrics = {
  documents: { count: number; chunk_count: number };
  cost: Record<string, unknown>;
  evaluations: { total: number; high_or_medium_risk: number; average_score: number };
  feedback: { total: number; positive: number; negative: number; positive_rate: number };
  ingestion_jobs: { retained: number; by_status: Record<string, number> };
  features: Record<string, unknown>;
};

export type PromptTemplateSummary = {
  id: number;
  key: string;
  name: string;
  prompt_type: "system" | "retrieval" | "evaluation" | "summarization" | "guardrail";
  version: number;
  status: "draft" | "active" | "archived";
  content: string;
  description?: string | null;
  owner: string;
  created_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PromptTemplateCreate = {
  key: string;
  name: string;
  prompt_type: PromptTemplateSummary["prompt_type"];
  content: string;
  description?: string;
  owner: string;
  status: PromptTemplateSummary["status"];
  metadata: Record<string, unknown>;
};

export type PromptPreviewResponse = {
  key: string;
  version: number;
  status: string;
  messages: Array<{ role: string; content: string }>;
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

export async function getAdminDocuments(): Promise<AdminDocumentSummary[]> {
  const response = await fetch(`${API_BASE_URL}/admin/documents`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Admin documents request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminDocumentDetail(documentId: string): Promise<AdminDocumentDetail> {
  const response = await fetch(`${API_BASE_URL}/admin/documents/${documentId}`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Admin document detail request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function createIngestionJob(document: DocumentCreate): Promise<IngestionJobStatus> {
  const response = await fetch(`${API_BASE_URL}/ingest/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "u-admin" },
    body: JSON.stringify({ document, generate_embeddings: true }),
  });

  if (!response.ok) {
    throw new Error(`Ingestion job request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function createSyntheticJob(synthetic: SyntheticContentRequest): Promise<IngestionJobStatus> {
  const response = await fetch(`${API_BASE_URL}/synthetic/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "u-admin" },
    body: JSON.stringify({ synthetic, generate_embeddings: true }),
  });

  if (!response.ok) {
    throw new Error(`Synthetic job request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminIngestionJobs(): Promise<IngestionJobStatus[]> {
  const response = await fetch(`${API_BASE_URL}/admin/ingest/jobs`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Ingestion jobs request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminEvaluations(): Promise<EvaluationRecordSummary[]> {
  const response = await fetch(`${API_BASE_URL}/admin/evaluations`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Evaluations request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function runGoldenEvaluations(): Promise<GoldenEvaluationRunResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/evaluations/run`, {
    method: "POST",
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Evaluation run failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function submitFeedback(payload: FeedbackCreate, userId: MockUserId = "u-employee"): Promise<FeedbackRecordSummary> {
  const response = await fetch(`${API_BASE_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Feedback request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminFeedback(): Promise<FeedbackRecordSummary[]> {
  const response = await fetch(`${API_BASE_URL}/admin/feedback`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Admin feedback request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getRuntimeMetrics(): Promise<RuntimeMetrics> {
  const response = await fetch(`${API_BASE_URL}/metrics/runtime`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Runtime metrics request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function getAdminPrompts(): Promise<PromptTemplateSummary[]> {
  const response = await fetch(`${API_BASE_URL}/admin/prompts`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Prompt library request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function createPromptVersion(payload: PromptTemplateCreate): Promise<PromptTemplateSummary> {
  const response = await fetch(`${API_BASE_URL}/admin/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "u-admin" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Prompt create request failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function activatePrompt(promptId: number): Promise<PromptTemplateSummary> {
  const response = await fetch(`${API_BASE_URL}/admin/prompts/${promptId}/activate`, {
    method: "POST",
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Prompt activation failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function archivePrompt(promptId: number): Promise<PromptTemplateSummary> {
  const response = await fetch(`${API_BASE_URL}/admin/prompts/${promptId}/archive`, {
    method: "POST",
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Prompt archive failed: ${await parseError(response)}`);
  }

  return response.json();
}

export async function previewPrompt(key: string): Promise<PromptPreviewResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/prompts/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "u-admin" },
    body: JSON.stringify({
      key,
      question: "How many days can employees work remotely?",
      contexts: ["Remote Work Policy: Employees may work remotely two days per week with manager approval."],
    }),
  });

  if (!response.ok) {
    throw new Error(`Prompt preview failed: ${await parseError(response)}`);
  }

  return response.json();
}
