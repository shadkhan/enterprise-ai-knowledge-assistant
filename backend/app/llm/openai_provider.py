from app.llm.base import LLMProvider, LLMResult
from app.llm.mock_provider import MockLLMProvider
from app.schemas.retrieval import RetrievedChunk


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        self._fallback = MockLLMProvider()

    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        # TODO: Integrate the official OpenAI SDK, pass retrieved context, and enable tracing.
        # The mock fallback keeps the skeleton runnable without API keys.
        return self._fallback.generate_answer(question, contexts, model)

