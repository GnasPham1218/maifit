<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 006</sub>

# 006. Access token in memory, refresh token in an HttpOnly cookie

- **Status:** Accepted

## Context

A single-page app needs to stay signed in across reloads without exposing a long-lived credential to JavaScript, where a cross-site scripting bug could steal it.

## Decision

- A short-lived **access token** (JWT, 15 minutes) is returned in the response body and kept only in memory.
- A long-lived **refresh token** (7 days) is a random value sent only as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. The database stores its hash.
- Every refresh **rotates** the token; a revoked token presented again revokes every session of that user.

## Alternatives considered

- **Both tokens in `localStorage`.** Simple, but any script running on the page can read them.
- **Server-side sessions.** Easy to revoke, but stateful; a mobile app would still need tokens.

## Consequences

- A script injected into the page cannot read the refresh token, and a stolen access token expires quickly.
- Each page load calls `/auth/refresh` once; Nginx rate limits deliberately exclude that endpoint so reloading does not sign users out.
- The planned React Native app cannot use cookies the same way; it will need a body-based refresh flow with secure device storage.

---
<!-- nav -->

**Related:** [Auth](../modules/auth.md) · [Security](../security.md)

← [ADR 005: One PostgreSQL database](005-postgres-pgvector.md) | [ADR 007: Build in CI, pull on the server](007-build-in-ci-pull-on-server.md) →
