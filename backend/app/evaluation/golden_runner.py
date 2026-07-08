import json
from pathlib import Path
from uuid import uuid4

from app.auth.rbac import get_mock_user
from app.evaluation.service import evaluator
from app.llm.factory import get_llm_provider
from app.repositories.evaluations import evaluation_repository
from app.retrieval.service import retrieval_service
from app.routing.model_router import model_router
from app.schemas.chat import Citation
from app.schemas.evaluation import (
    EvaluationRequest,
    GoldenEvaluationCase,
    GoldenEvaluationCaseResult,
    GoldenEvaluationRunResponse,
)


class GoldenEvaluationRunner:
    def __init__(self, dataset_path: Path | None = None) -> None:
        self.dataset_path = dataset_path or Path(__file__).resolve().parents[2] / "data" / "evaluation" / "golden_questions.json"

    def run(self) -> GoldenEvaluationRunResponse:
        cases = self.load_cases()
        results = [self._run_case(case) for case in cases]
        passed = sum(1 for result in results if result.passed)
        return GoldenEvaluationRunResponse(
            run_id=f"eval-{uuid4().hex[:12]}",
            total_cases=len(results),
            passed_cases=passed,
            failed_cases=len(results) - passed,
            results=results,
        )

    def load_cases(self) -> list[GoldenEvaluationCase]:
        with self.dataset_path.open("r", encoding="utf-8") as file:
            raw_cases = json.load(file)
        return [GoldenEvaluationCase.model_validate(item) for item in raw_cases]

    def _run_case(self, case: GoldenEvaluationCase) -> GoldenEvaluationCaseResult:
        user = get_mock_user(case.user_id)
        if not user:
            raise ValueError(f"Unknown golden evaluation user: {case.user_id}")

        route = model_router.route(case.question)
        retrieved = retrieval_service.search(case.question, user, top_k=5)
        llm_result = get_llm_provider(route.provider).generate_answer(case.question, retrieved, route.model)
        citations = [
            Citation(
                document_id=item.document_id,
                title=item.title,
                chunk_id=item.chunk_id,
                score=item.score,
            )
            for item in retrieved
        ]
        request = EvaluationRequest(question=case.question, answer=llm_result.answer, citations=citations)
        evaluation = evaluator.evaluate(request)
        expected_found = self._expected_document_found(case, citations)
        forbidden_leaked = any(citation.title in set(case.forbidden_document_titles) for citation in citations)

        notes = list(evaluation.notes)
        notes.append(f"Golden expected document found: {expected_found}")
        notes.append(f"Golden forbidden document leaked: {forbidden_leaked}")

        passed = evaluation.score >= case.minimum_score and expected_found and not forbidden_leaked
        evaluation_repository.save(case.user_id, request, evaluation.model_copy(update={"notes": notes}))

        return GoldenEvaluationCaseResult(
            case_id=case.case_id,
            question=case.question,
            user_id=case.user_id,
            passed=passed,
            score=evaluation.score,
            hallucination_risk=evaluation.hallucination_risk,
            expected_document_found=expected_found,
            forbidden_document_leaked=forbidden_leaked,
            citations=citations,
            notes=notes,
        )

    def _expected_document_found(self, case: GoldenEvaluationCase, citations: list[Citation]) -> bool:
        if not case.expected_document_title:
            return True
        return any(citation.title == case.expected_document_title for citation in citations)


golden_evaluation_runner = GoldenEvaluationRunner()
