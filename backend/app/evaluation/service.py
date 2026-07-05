from app.schemas.evaluation import EvaluationRequest, EvaluationResponse


class Evaluator:
    def evaluate(self, payload: EvaluationRequest) -> EvaluationResponse:
        # TODO: Add LLM-as-judge, citation coverage checks, groundedness scoring, and regression datasets.
        has_citations = bool(payload.citations)
        mentions_uncertainty = "could not find" in payload.answer.lower()
        score = 0.75 if has_citations else 0.45
        hallucination_risk = "low" if has_citations or mentions_uncertainty else "medium"

        return EvaluationResponse(
            score=score,
            hallucination_risk=hallucination_risk,
            notes=[
                "Placeholder evaluator: checks citation presence and uncertainty language.",
                "Replace with dataset-backed automated evaluation before production.",
            ],
        )


evaluator = Evaluator()

