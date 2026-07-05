Redis is included for production-style caching, rate limits, distributed locks, and Celery broker/result storage.

The reference backend does not require Redis to run locally yet. Add cache and queue clients behind interfaces before wiring production workloads directly into request handlers.

