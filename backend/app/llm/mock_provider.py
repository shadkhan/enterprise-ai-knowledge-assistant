from app.llm.base import LLMProvider, LLMResult, TokenUsage
from app.schemas.retrieval import RetrievedChunk


class MockLLMProvider(LLMProvider):
    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        if contexts:
            citations = ", ".join(f"[{item.title}:{item.chunk_id}]" for item in contexts[:3])
            answer = (
                f"Mock answer for: {question}\n\n"
                f"Based on the retrieved enterprise sources, the likely answer is summarized from {citations}. "
                "Replace this provider with OpenAI, Anthropic, or a local model in production."
            )
        else:
            answer = (
                "I could not find authorized enterprise sources for this question. "
                "In production, this should ask a clarifying question or escalate to a curated knowledge owner."
            )

        prompt_tokens = max(20, len(question.split()) + sum(len(item.text.split()) for item in contexts))
        completion_tokens = len(answer.split())
        return LLMResult(
            answer=answer,
            usage=TokenUsage(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens),
        )

