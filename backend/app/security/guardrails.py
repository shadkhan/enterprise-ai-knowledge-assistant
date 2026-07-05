import re
from pydantic import BaseModel, Field


class GuardrailResult(BaseModel):
    blocked: bool
    reason: str | None = None
    flags: list[str] = Field(default_factory=list)


class Guardrails:
    INJECTION_PATTERNS = [
        "ignore previous instructions",
        "reveal system prompt",
        "developer message",
        "exfiltrate",
        "bypass access",
    ]

    def inspect(self, text: str) -> GuardrailResult:
        lowered = text.lower()
        flags = [pattern for pattern in self.INJECTION_PATTERNS if pattern in lowered]
        if "bypass access" in flags or "exfiltrate" in flags:
            return GuardrailResult(blocked=True, reason="Prompt injection risk detected", flags=flags)
        return GuardrailResult(blocked=False, flags=flags)

    def redact_pii(self, text: str) -> str:
        # TODO: Replace with enterprise DLP/PII service.
        text = re.sub(r"[\w\.-]+@[\w\.-]+\.\w+", "[redacted-email]", text)
        text = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[redacted-ssn]", text)
        return text


guardrails = Guardrails()
