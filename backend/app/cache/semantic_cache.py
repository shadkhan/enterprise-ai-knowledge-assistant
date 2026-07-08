import hashlib
import json
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from app.auth.rbac import User
from app.core.config import settings
from app.schemas.chat import ChatResponse


class SemanticCache:
    def __init__(self) -> None:
        self.redis = Redis.from_url(settings.redis_url, decode_responses=True)

    def get(
        self,
        query: str,
        embedding: list[float],
        user: User,
        provider: str,
        model: str,
        top_k: int,
    ) -> ChatResponse | None:
        if not settings.semantic_cache_enabled:
            return None

        best_score = -1.0
        best_payload: dict[str, Any] | None = None
        try:
            for index, key in enumerate(self.redis.scan_iter(f"semantic_cache:{self._scope(user, provider, model, top_k)}:*")):
                if index >= settings.semantic_cache_max_scan:
                    break
                raw = self.redis.get(key)
                if not raw:
                    continue
                payload = json.loads(raw)
                score = self._cosine_similarity(embedding, payload.get("embedding", []))
                if score > best_score:
                    best_score = score
                    best_payload = payload
        except (RedisError, json.JSONDecodeError, TypeError, ValueError):
            return None

        if best_payload is None or best_score < settings.semantic_cache_similarity_threshold:
            return None

        response = ChatResponse.model_validate(best_payload["response"])
        return response.model_copy(
            update={
                "semantic_cache_hit": True,
                "semantic_cache_score": round(best_score, 4),
                "semantic_cache_source_question": best_payload.get("question"),
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "estimated_cost_usd": 0.0,
            }
        )

    def set(
        self,
        query: str,
        embedding: list[float],
        user: User,
        provider: str,
        model: str,
        top_k: int,
        response: ChatResponse,
    ) -> None:
        if not settings.semantic_cache_enabled:
            return

        payload = {
            "question": query,
            "embedding": [round(float(value), 6) for value in embedding],
            "response": response.model_copy(
                update={
                    "semantic_cache_hit": False,
                    "semantic_cache_score": None,
                    "semantic_cache_source_question": None,
                }
            ).model_dump(mode="json"),
        }
        try:
            self.redis.set(
                self._key(query, user, provider, model, top_k),
                json.dumps(payload),
                ex=settings.semantic_cache_ttl_seconds,
            )
        except RedisError:
            return

    def clear(self) -> None:
        try:
            keys = list(self.redis.scan_iter("semantic_cache:*"))
            if keys:
                self.redis.delete(*keys)
        except RedisError:
            return

    def _key(self, query: str, user: User, provider: str, model: str, top_k: int) -> str:
        fingerprint = hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()
        return f"semantic_cache:{self._scope(user, provider, model, top_k)}:{fingerprint}"

    def _scope(self, user: User, provider: str, model: str, top_k: int) -> str:
        raw_scope = (
            f"{user.user_id}|{user.department}|{user.clearance}|{','.join(sorted(user.roles))}|"
            f"{provider}|{model}|{top_k}"
        )
        return hashlib.sha256(raw_scope.encode("utf-8")).hexdigest()

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        if len(left) != len(right) or not left:
            return 0.0
        dot = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = sum(a * a for a in left) ** 0.5
        right_norm = sum(b * b for b in right) ** 0.5
        if not left_norm or not right_norm:
            return 0.0
        return dot / (left_norm * right_norm)


semantic_cache = SemanticCache()
