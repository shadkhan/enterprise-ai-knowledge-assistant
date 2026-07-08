from app.core.config import settings
from app.llm.base import LLMProvider, LLMResult, TokenUsage
from app.llm.openai_mock_provider import MockOpenAIProvider
from app.llm.openai_prompt import build_openai_input
from app.schemas.retrieval import RetrievedChunk


class OpenAICompatibleProvider(LLMProvider):
    """Chat Completions provider for OpenAI-compatible hosted or local models."""

    def __init__(self) -> None:
        self._fallback = MockOpenAIProvider()

    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        try:
            return self._generate_with_chat_completions(question, contexts, model)
        except Exception:
            if settings.openai_fallback_to_mock:
                return self._fallback.generate_answer(question, contexts, model)
            raise

    def _generate_with_chat_completions(
        self,
        question: str,
        contexts: list[RetrievedChunk],
        model: str,
    ) -> LLMResult:
        api_key = settings.openai_compatible_api_key or settings.openai_api_key
        base_url = settings.openai_compatible_base_url or settings.openai_base_url
        if not api_key:
            raise RuntimeError(
                "OPENAI_COMPATIBLE_API_KEY or OPENAI_API_KEY is required "
                "when DEFAULT_LLM_PROVIDER=openai_compatible"
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("OpenAI-compatible provider requires optional dependency group: `uv sync --group llm`.") from exc

        client_kwargs = {
            "api_key": api_key,
            "timeout": settings.openai_timeout_seconds,
        }
        if base_url:
            client_kwargs["base_url"] = base_url

        messages = [
            {"role": "system" if message["role"] == "developer" else message["role"], "content": message["content"]}
            for message in build_openai_input(question, contexts)
        ]

        response = OpenAI(**client_kwargs).chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=settings.openai_max_output_tokens,
        )
        answer = response.choices[0].message.content or ""
        usage = response.usage

        return LLMResult(
            answer=answer or "The OpenAI-compatible provider returned an empty answer.",
            usage=TokenUsage(
                prompt_tokens=int(getattr(usage, "prompt_tokens", 0) or self._estimate_prompt_tokens(question, contexts)),
                completion_tokens=int(getattr(usage, "completion_tokens", 0) or max(1, len(answer.split()))),
            ),
        )

    def _estimate_prompt_tokens(self, question: str, contexts: list[RetrievedChunk]) -> int:
        words = len(question.split()) + sum(len(item.text.split()) for item in contexts)
        return max(1, int(words * 1.3))
