<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 007</sub>

# 007. Build images in CI, the server only pulls

- **Status:** Accepted

## Context

Building Java and Node projects needs more RAM and CPU than the production server has, and a server that builds code needs the source, the build tools and access to the repository.

## Decision

GitHub Actions builds both images, scans them with Trivy (a critical vulnerability with a fix blocks the deploy), pushes them to GitHub Container Registry tagged with the commit SHA, then connects to the server with an SSH key restricted to one command: the deploy script with that SHA. The script pulls the images, restarts the containers, waits for the health check and prunes old images.

## Alternatives considered

- **Build on the server** (`git pull && docker compose build`). No registry needed, but slow, memory-hungry and puts build tools on the production machine.
- **A full deploy agent or GitOps tool.** More than one server needs.

## Consequences

- The server holds no source build tools; the CI key cannot open a shell.
- Every deploy is traceable to a commit, and rolling back means running the script with an older SHA.
- The same build and scan run on every pull request, so a broken image is caught before merge.

---
<!-- nav -->

**Related:** [Deployment](../deployment.md) · [Security](../security.md) · [ADR 004: One VPS with Docker Compose](004-single-vps-docker-compose.md)

← [ADR 006: Token storage](006-token-storage.md) | [Deployment](../deployment.md) →
