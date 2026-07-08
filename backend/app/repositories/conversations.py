from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import ChatMessageRecord, ChatSessionRecord
from app.db.session import SessionLocal
from app.schemas.chat import ChatResponse
from app.schemas.conversations import ConversationDetail, ConversationMessageSummary, ConversationSummary


class ConversationRepository:
    def save_exchange(
        self,
        *,
        user_id: str,
        question: str,
        response: ChatResponse,
        conversation_id: str | None = None,
    ) -> str:
        with SessionLocal() as session:
            record = None
            if conversation_id:
                record = session.scalar(
                    select(ChatSessionRecord).where(
                        ChatSessionRecord.id == conversation_id,
                        ChatSessionRecord.user_id == user_id,
                    )
                )

            if record is None:
                record = ChatSessionRecord(
                    id=conversation_id or f"chat-{uuid4().hex[:12]}",
                    user_id=user_id,
                    title=self._title_from_question(question),
                )
                session.add(record)

            now = datetime.now(timezone.utc)
            record.updated_at = now
            session.add_all(
                [
                    ChatMessageRecord(
                        session_id=record.id,
                        role="user",
                        content=question,
                        metadata_json={},
                    ),
                    ChatMessageRecord(
                        session_id=record.id,
                        role="assistant",
                        content=response.answer,
                        metadata_json={
                            "model": response.model,
                            "provider": response.provider,
                            "citations": [citation.model_dump() for citation in response.citations],
                            "prompt_key": response.prompt_key,
                            "prompt_version": response.prompt_version,
                            "latency_ms": response.latency_ms,
                            "estimated_cost_usd": response.estimated_cost_usd,
                            "semantic_cache_hit": response.semantic_cache_hit,
                        },
                    ),
                ]
            )
            session.commit()
            return record.id

    def list_for_user(self, user_id: str, limit: int = 20, offset: int = 0) -> list[ConversationSummary]:
        with SessionLocal() as session:
            records = session.scalars(
                select(ChatSessionRecord)
                .options(selectinload(ChatSessionRecord.messages))
                .where(ChatSessionRecord.user_id == user_id)
                .order_by(ChatSessionRecord.updated_at.desc())
                .offset(offset)
                .limit(limit)
            ).all()
            return [self._to_summary(record) for record in records]

    def get_for_user(self, conversation_id: str, user_id: str) -> ConversationDetail | None:
        with SessionLocal() as session:
            record = session.scalar(
                select(ChatSessionRecord)
                .options(selectinload(ChatSessionRecord.messages))
                .where(ChatSessionRecord.id == conversation_id, ChatSessionRecord.user_id == user_id)
            )
            if record is None:
                return None
            summary = self._to_summary(record)
            return ConversationDetail(
                **summary.model_dump(),
                messages=[
                    ConversationMessageSummary(
                        id=message.id,
                        role=message.role,
                        content=message.content,
                        metadata=message.metadata_json or {},
                        created_at=message.created_at.isoformat(),
                    )
                    for message in sorted(record.messages, key=lambda item: item.created_at)
                ],
            )

    def _to_summary(self, record: ChatSessionRecord) -> ConversationSummary:
        latest = max(record.messages, key=lambda item: item.created_at, default=None)
        return ConversationSummary(
            conversation_id=record.id,
            title=record.title,
            user_id=record.user_id,
            created_at=record.created_at.isoformat(),
            updated_at=record.updated_at.isoformat(),
            latest_message=latest.content if latest else None,
        )

    def _title_from_question(self, question: str) -> str:
        title = " ".join(question.strip().split())
        if len(title) <= 72:
            return title or "New conversation"
        return f"{title[:69].rstrip()}..."


conversation_repository = ConversationRepository()
