from app.schemas.retrieval import RetrievedChunk
from app.repositories.prompts import prompt_repository


def build_openai_input(question: str, contexts: list[RetrievedChunk]) -> list[dict[str, str]]:
    system_prompt = prompt_repository.get_active("rag_chat_system")
    return [
        {"role": "developer", "content": system_prompt.content},
        {"role": "user", "content": _build_user_content(question, contexts)},
    ]


def _build_user_content(question: str, contexts: list[RetrievedChunk]) -> str:
    context_text = "\n\n".join(
        (
            f"Source {index}: title={item.title}; document_id={item.document_id}; "
            f"chunk_id={item.chunk_id}; score={item.score}\n{item.text}"
        )
        for index, item in enumerate(contexts, start=1)
    )
    if not context_text:
        context_text = "No authorized context was retrieved."

    answer_requirements = prompt_repository.get_active("rag_answer_requirements").content
    return f"""Question:
{question}

Authorized context:
{context_text}

{answer_requirements}"""
