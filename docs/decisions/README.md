<sub>[MAIFit](../../README.md) / [Docs](../README.md) / Decisions</sub>

# Architecture decisions

Each record explains one important choice: the context, what was decided, the options that were rejected and what the decision costs. Records are not edited after the fact; a changed decision gets a new record that supersedes the old one.

| # | Decision | Status |
|---|---|---|
| [001](001-ai-never-computes-calories.md) | The AI never computes calories | Accepted |
| [002](002-rep-counting-in-browser.md) | Count reps in the browser | Accepted |
| [003](003-self-hosted-embeddings.md) | Self-hosted embeddings, hosted model for answers | Accepted |
| [004](004-single-vps-docker-compose.md) | One VPS with Docker Compose | Accepted |
| [005](005-postgres-pgvector.md) | One PostgreSQL database for data and vectors | Accepted |
| [006](006-token-storage.md) | Access token in memory, refresh token in an HttpOnly cookie | Accepted |
| [007](007-build-in-ci-pull-on-server.md) | Build images in CI, the server only pulls | Accepted |

---
<!-- nav -->

**Related:** [Architecture](../architecture.md) · [Modules](../modules/README.md)

← [Profile](../modules/profile.md) | [ADR 001: The AI never computes calories](001-ai-never-computes-calories.md) →
