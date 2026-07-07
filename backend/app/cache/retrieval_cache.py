import hashlib

from redis import Redis
from redis.exceptions import RedisError

from app.auth.rbac import User
from app.core.config import settings
from app.schemas.retrieval import RetrievedChunk


class RetrievalCache:
    def __init__(self) -> None:
        self.redis = Redis.from_url(settings.redis_url, decode_responses=True)

    def get(self, query: str, user: User, top_k: int) -> list[RetrievedChunk] | None:
        try:
            raw = self.redis.get(self._key(query, user, top_k))
        except RedisError:
            return None
        if not raw:
            return None
        return [RetrievedChunk.model_validate_json(item) for item in raw.splitlines() if item]

    def set(self, query: str, user: User, top_k: int, results: list[RetrievedChunk]) -> None:
        try:
            self.redis.set(
                self._key(query, user, top_k),
                "\n".join(item.model_dump_json() for item in results),
                ex=settings.retrieval_cache_ttl_seconds,
            )
        except RedisError:
            return

    def clear(self) -> None:
        try:
            keys = list(self.redis.scan_iter("retrieval_cache:*"))
            if keys:
                self.redis.delete(*keys)
        except RedisError:
            return

    def _key(self, query: str, user: User, top_k: int) -> str:
        fingerprint = hashlib.sha256(
            f"{query}|{user.user_id}|{user.department}|{user.clearance}|{','.join(sorted(user.roles))}|{top_k}".encode(
                "utf-8"
            )
        ).hexdigest()
        return f"retrieval_cache:{fingerprint}"


retrieval_cache = RetrievalCache()
