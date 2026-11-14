<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 005</sub>

# 005. One PostgreSQL database for data and vectors

- **Status:** Accepted

## Context

The app has relational data (users, meals, foods, sessions, payments) and, for the chatbot, vector embeddings. Chatbot answers cite food rows that also live in the relational tables.

## Decision

Use PostgreSQL 17 with the pgvector extension for both. The `vector_store` table has an HNSW index with cosine distance; its schema is created by Flyway like every other table.

## Alternatives considered

- **A dedicated vector database** (Qdrant, Pinecone). Better at very large scale, but one more service to run, secure and back up, and no transactions shared with the business data.

## Consequences

- One backup, one connection pool, one migration tool for everything.
- The ingest job reads foods and writes their vectors in the same database.
- Fine for thousands of chunks; millions would call for a re-evaluation.

---
<!-- nav -->

**Related:** [MBotFit chatbot](../modules/chatbot.md) · [Architecture](../architecture.md) · [ADR 003: Self-hosted embeddings](003-self-hosted-embeddings.md)

← [ADR 004: One VPS with Docker Compose](004-single-vps-docker-compose.md) | [ADR 006: Token storage](006-token-storage.md) →
