from app.core.config import settings
from app.llm.base import LLMProvider, LLMResult, TokenUsage
from app.llm.openai_mock_provider import MockOpenAIProvider
from app.llm.openai_prompt import build_openai_input
from app.schemas.retrieval import RetrievedChunk


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        self._fallback = MockOpenAIProvider()

    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        try:
            return self._generate_with_openai(question, contexts, model)
        except Exception:
            if settings.openai_fallback_to_mock:
                return self._fallback.generate_answer(question, contexts, model)
            raise

    def _generate_with_openai(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when DEFAULT_LLM_PROVIDER=openai")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("OpenAI provider requires optional dependency group: `uv sync --group llm`.") from exc

        client_kwargs = {
            "api_key": settings.openai_api_key,
            "timeout": settings.openai_timeout_seconds,
        }
        if settings.openai_base_url:
            client_kwargs["base_url"] = settings.openai_base_url

        client = OpenAI(**client_kwargs)
        response = client.responses.create(
            model=model,
            input=build_openai_input(question, contexts),
            max_output_tokens=settings.openai_max_output_tokens,
        )

        answer = getattr(response, "output_text", "") or ""
        usage = getattr(response, "usage", None)
        prompt_tokens = int(getattr(usage, "input_tokens", 0) or self._estimate_prompt_tokens(question, contexts))
        completion_tokens = int(getattr(usage, "output_tokens", 0) or max(1, len(answer.split())))

        return LLMResult(
            answer=answer or "The OpenAI provider returned an empty answer.",
            usage=TokenUsage(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens),
        )

    def _estimate_prompt_tokens(self, question: str, contexts: list[RetrievedChunk]) -> int:
        words = len(question.split()) + sum(len(item.text.split()) for item in contexts)
        return max(1, int(words * 1.3))
