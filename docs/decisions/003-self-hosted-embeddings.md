<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 003</sub>

# 003. Self-hosted embeddings, hosted model for answers

- **Status:** Accepted

## Context

The chatbot needs two kinds of model: an embedding model to find relevant chunks for every question, and a generative model to write the answer. Questions are in Vietnamese; sources are in English.

## Decision

- **Embeddings:** `bge-m3` on Ollama, in a container on the same server, reachable only from the backend.
- **Answers:** Google Gemini Flash-Lite, with a per-user daily limit.

`bge-m3` was chosen by measurement on Vietnamese questions against the real sources: 6/6 correct top results against 5/6 for `embeddinggemma`, and a wider gap between relevant and off-topic scores, which makes the "nothing relevant" threshold reliable.

## Alternatives considered

- **Hosted embeddings (Gemini).** No container to run, but every question would leave the server and cost a call; retrieval quality would depend on a provider's model changes.
- **A local generative model.** On a CPU-only VPS it would need 2–3 GB more RAM, take over 30 seconds for a 3,000-token prompt and handle Vietnamese, JSON and citations poorly.
- **Smaller embedding model.** Less RAM (about 0.7 GB instead of 1.2 GB), but lower accuracy on Vietnamese.

## Consequences

- Retrieval is free per question and stable over time; the model version is pinned.
- The server needed 4 GB of RAM instead of 2 GB.
- Documents and questions must use the same model: changing it means a migration for the vector size and a full re-ingest.
- Bulk ingest on a 1-vCPU server is slow (minutes), but it runs only when sources change.

---
<!-- nav -->

**Related:** [MBotFit chatbot](../modules/chatbot.md) · [Deployment](../deployment.md) · [ADR 005: One PostgreSQL database](005-postgres-pgvector.md)

← [ADR 002: Count reps in the browser](002-rep-counting-in-browser.md) | [ADR 004: One VPS with Docker Compose](004-single-vps-docker-compose.md) →
