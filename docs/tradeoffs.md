# Tradeoffs

## RAG vs fine-tuning

RAG is better for enterprise knowledge that changes often and requires permissions. It retrieves current, authorized context at request time and can cite sources. Fine-tuning is better for style, format, or task behavior, but it is a poor fit for fast-changing policies and document-level access control.

Best default: use RAG for knowledge and consider fine-tuning only for repeated task patterns or response style.

## pgvector vs dedicated vector DB

pgvector keeps metadata, permissions, chunks, and vectors in one database. It simplifies operations and is often enough for MVP and moderate enterprise scale.

Dedicated vector databases can offer better high-scale vector performance, advanced indexing, managed hybrid search, and operational features. They add another system to secure, monitor, and keep consistent.

Best default: start with PostgreSQL + pgvector, move to a dedicated vector DB when scale or retrieval features justify it.

## Rules-based routing vs adaptive routing

Rules-based routing is transparent, easy to explain, and safe for an MVP. It can route by query length, keywords, user tier, or requested quality.

Adaptive routing can improve cost-quality tradeoffs using telemetry and feedback, but it is harder to debug and govern.

Best default: start rules-based, log enough telemetry to train or tune adaptive routing later.

## Cloud LLM vs local LLM

Cloud LLMs usually provide stronger reasoning, managed scaling, and faster model improvements. They raise data residency, privacy, vendor, and cost concerns.

Local LLMs improve control, isolation, and predictable deployment, but require GPU operations and may underperform on complex tasks.

Best default: abstract providers. Use approved cloud models for high-value reasoning and local models for low-risk, privacy-sensitive, or high-volume tasks where quality is sufficient.

## Single-agent vs multi-agent

A single orchestrated RAG flow is simpler, cheaper, easier to test, and easier to govern. Multi-agent systems help when tasks require planning, tool use, multi-step research, or workflow actions.

Multi-agent systems also add latency, cost, nondeterminism, and debugging complexity.

Best default: build a strong single-agent RAG system first. Add agents only when workflows require decomposition or specialized tool use.

