# MAIFit documentation

<sub>[MAIFit](../README.md) / Docs</sub>

Suggested reading order: start with how to run the app and how it fits together, then read the module you care about, and finish with the decisions behind it.

## Start here

1. [Getting started](getting-started.md): run the whole app locally
2. [Architecture](architecture.md): system overview, request flow, code structure, data model

## Modules

| Module | Read this for |
|---|---|
| [Auth](modules/auth.md) | Accounts, tokens, abuse protection |
| [Nutrition](modules/nutrition.md) | Food table, meal logging, photo recognition |
| [Workout](modules/workout.md) | In-browser rep counting, leaderboards, streaks |
| [MBotFit chatbot](modules/chatbot.md) | RAG pipeline, validation, evaluation |
| [Premium and AI quotas](modules/premium.md) | Daily limits, AI cost, payments |
| [Profile](modules/profile.md) | Energy targets, weight, appearance |

## Decisions

Why the main technical choices were made and what they cost: [all decision records](decisions/README.md).

| | |
|---|---|
| [ADR 001](decisions/001-ai-never-computes-calories.md) | The AI never computes calories |
| [ADR 002](decisions/002-rep-counting-in-browser.md) | Count reps in the browser |
| [ADR 003](decisions/003-self-hosted-embeddings.md) | Self-hosted embeddings |
| [ADR 004](decisions/004-single-vps-docker-compose.md) | One VPS with Docker Compose |
| [ADR 005](decisions/005-postgres-pgvector.md) | One PostgreSQL database |
| [ADR 006](decisions/006-token-storage.md) | Token storage |
| [ADR 007](decisions/007-build-in-ci-pull-on-server.md) | Build in CI, pull on the server |

## Operations

- [Deployment](deployment.md): server, CI/CD pipeline, rollback, backups
- [Security](security.md): threats and how each is handled
- [Roadmap](roadmap.md): planned work and known limitations
