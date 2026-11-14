<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 004</sub>

# 004. One VPS with Docker Compose

- **Status:** Accepted

## Context

MAIFit is built and run by one person, with a small budget and a portfolio goal: it must be really deployed, secure and cheap to keep online.

## Decision

Run everything on one VPS with Docker Compose: frontend, backend, PostgreSQL and Ollama containers, with Nginx on the host for TLS. Only ports 22, 80 and 443 are open; containers listen on `127.0.0.1` or the internal Docker network.

## Alternatives considered

- **Kubernetes.** Scaling and self-healing that one instance does not need, at a large cost in complexity and RAM.
- **Platform services (managed database, serverless backend).** Less to operate, but higher monthly cost, pgvector support varies, and the infrastructure skills would be hidden.

## Consequences

- About 9 USD per month for 1 vCPU, 4 GB RAM and 30 GB disk.
- Full control over the network, the firewall and security headers.
- **Single point of failure.** Each deploy restarts the containers briefly; a server failure means restoring from a snapshot and a database dump.
- In-memory state (rate limit counters) is fine for one backend instance; running several would need Redis.

---
<!-- nav -->

**Related:** [Deployment](../deployment.md) · [Security](../security.md) · [ADR 007: Build in CI, pull on the server](007-build-in-ci-pull-on-server.md)

← [ADR 003: Self-hosted embeddings](003-self-hosted-embeddings.md) | [ADR 005: One PostgreSQL database](005-postgres-pgvector.md) →
