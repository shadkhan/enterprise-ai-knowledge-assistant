const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type PreferredQuality = "cheap" | "balanced" | "premium";
export type MockUserId = "u-employee" | "u-hr" | "u-admin";

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
