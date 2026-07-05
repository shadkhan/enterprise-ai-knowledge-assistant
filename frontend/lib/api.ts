const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

export async function askQuestion(question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": "u-employee",
    },
    body: JSON.stringify({ question, preferred_quality: "balanced", top_k: 5 }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

export async function getCostMetrics(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/metrics/cost`, {
    headers: { "X-User-Id": "u-admin" },
  });

  if (!response.ok) {
    throw new Error(`Metrics request failed: ${response.status}`);
  }

  return response.json();
}

