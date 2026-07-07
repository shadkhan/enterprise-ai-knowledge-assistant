import json
from datetime import date

from app.schemas.documents import DocumentCreate, SyntheticContentRequest


class SyntheticContentFactory:
    def build(self, payload: SyntheticContentRequest) -> list[DocumentCreate]:
        return [self._build_one(payload, index + 1) for index in range(payload.count)]

    def _build_one(self, payload: SyntheticContentRequest, sequence: int) -> DocumentCreate:
        builders = {
            "document": self._document,
            "pdf": self._pdf,
            "data": self._data,
            "json": self._json,
            "text": self._text,
        }
        text = builders[payload.content_type](payload, sequence)
        title = f"Synthetic {payload.content_type.upper()} - {payload.topic} #{sequence}"
        return DocumentCreate(
            title=title,
            text=text,
            source_type=f"synthetic_{payload.content_type}",
            department=payload.department,
            classification=payload.classification,
            tags=["synthetic", payload.content_type, *payload.tags],
        )

    def _document(self, payload: SyntheticContentRequest, sequence: int) -> str:
        return "\n\n".join(
            [
                f"Policy: {payload.topic}",
                f"Version: {sequence}.0",
                "Purpose: This synthetic enterprise document is used to test ingestion, chunking, retrieval, and citations.",
                f"Scope: Applies to the {payload.department} department and related cross-functional teams.",
                "Procedure: Employees should review the policy, confirm ownership, document exceptions, and escalate unresolved questions.",
                "Controls: Managers should verify compliance monthly and report exceptions to the knowledge owner.",
                "FAQ: If the policy does not answer a question, employees should ask a knowledge manager for clarification.",
            ]
        )

    def _pdf(self, payload: SyntheticContentRequest, sequence: int) -> str:
        pages = [
            [
                f"PDF Page 1 - {payload.topic}",
                "Executive Summary",
                "This synthetic PDF-like content mimics extracted text from a multi-page enterprise document.",
                "The assistant should preserve page-oriented language and cite retrieved chunks.",
            ],
            [
                "PDF Page 2 - Operating Details",
                f"Department: {payload.department}",
                "Key Requirements: complete onboarding, maintain records, follow approval workflows, and review exceptions.",
            ],
            [
                "PDF Page 3 - Review Checklist",
                "Checklist: owner assigned, source verified, policy date reviewed, and escalation path documented.",
            ],
        ]
        return "\n\n".join("\n".join(page) for page in pages) + f"\n\nSynthetic PDF batch item: {sequence}"

    def _data(self, payload: SyntheticContentRequest, sequence: int) -> str:
        rows = [
            ["metric", "owner", "target", "current", "status"],
            ["response_time_hours", payload.department, "24", "18", "green"],
            ["policy_review_days", payload.department, "90", "76", "green"],
            ["open_exceptions", payload.department, "5", str(sequence), "watch"],
        ]
        csv = "\n".join(",".join(row) for row in rows)
        dictionary = "\n".join(
            [
                "Data Dictionary:",
                "metric: operational measurement name",
                "owner: accountable team",
                "target: expected threshold",
                "current: latest synthetic value",
                "status: synthetic health indicator",
            ]
        )
        return f"Dataset: {payload.topic}\nGenerated: {date.today().isoformat()}\n\n{csv}\n\n{dictionary}"

    def _json(self, payload: SyntheticContentRequest, sequence: int) -> str:
        body = {
            "topic": payload.topic,
            "department": payload.department,
            "classification": payload.classification,
            "sequence": sequence,
            "generated_for": "retrieval and citation testing",
            "controls": [
                {"name": "owner_review", "frequency": "monthly", "required": True},
                {"name": "exception_tracking", "frequency": "weekly", "required": True},
            ],
            "questions": [
                "Who owns this process?",
                "What controls must be reviewed?",
                "When should exceptions be escalated?",
            ],
        }
        return json.dumps(body, indent=2)

    def _text(self, payload: SyntheticContentRequest, sequence: int) -> str:
        return (
            f"{payload.topic} synthetic knowledge note {sequence}. "
            f"This text note belongs to {payload.department} and is marked {payload.classification}. "
            "It contains plain-language guidance, ownership hints, operational expectations, and escalation language. "
            "Use it to test simple text ingestion, chunking, retrieval, and answer grounding."
        )


synthetic_content_factory = SyntheticContentFactory()
