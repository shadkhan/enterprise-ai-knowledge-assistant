import time

from app.core.config import settings
from app.llm.base import LLMProvider, LLMResult, TokenUsage
from app.llm.openai_prompt import build_openai_input
from app.schemas.retrieval import RetrievedChunk


class MockOpenAIProvider(LLMProvider):
    """OpenAI-shaped deterministic provider for tests and fallback paths."""

    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        if settings.openai_mock_latency_ms > 0:
            time.sleep(settings.openai_mock_latency_ms / 1000)

        input_messages = build_openai_input(question, contexts)
        prompt_text = "\n".join(message["content"] for message in input_messages)

        if contexts:
            sources = ", ".join(f"{item.title}:{item.chunk_id}" for item in contexts[:3])
            answer = (
                f"OpenAI-compatible mock answer for: {question}\n\n"
                f"Using the authorized enterprise context, the answer is grounded in {sources}. "
                "This path validates OpenAI request construction, routing, fallback, and cost tracking "
                "without calling the external API."
            )
        else:
            answer = (
                "I could not find enough authorized enterprise context to answer confidently. "
                "A real OpenAI call would receive the same no-context instruction."
            )

        return LLMResult(
            answer=answer,
            usage=TokenUsage(
                prompt_tokens=max(1, len(prompt_text.split())),
                completion_tokens=max(1, len(answer.split())),
            ),
        )
