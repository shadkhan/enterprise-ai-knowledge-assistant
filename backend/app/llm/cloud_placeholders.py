from app.llm.base import LLMProvider, LLMResult
from app.schemas.retrieval import RetrievedChunk


class UnconfiguredCloudLLMProvider(LLMProvider):
    def __init__(self, provider_name: str) -> None:
        self.provider_name = provider_name

    def generate_answer(self, question: str, contexts: list[RetrievedChunk], model: str) -> LLMResult:
        raise RuntimeError(
            f"{self.provider_name} LLM provider is selected, but the cloud adapter is not implemented yet. "
            "Use DEFAULT_LLM_PROVIDER=mock/openai/openai_compatible for now, or add the cloud provider integration."
        )
