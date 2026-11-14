<sub>[MAIFit](../../README.md) / [Docs](../README.md) / [Decisions](README.md) / ADR 002</sub>

# 002. Count reps in the browser

- **Status:** Accepted

## Context

Rep counting needs pose detection on every camera frame. Doing it on a server means streaming video from the user's home, which is sensitive data, needs a GPU or a lot of CPU, and adds network latency to feedback that must feel instant.

## Decision

Run MediaPipe Pose Landmarker in the browser (WebAssembly, GPU through WebGL when available) and count reps on the device. The server receives only the result of a set: exercise, reps, start time, duration and a client-generated id.

## Alternatives considered

- **Server-side pose detection.** Harder to cheat, but privacy-invasive, expensive and slow.
- **A native mobile app.** Better camera access and performance, but a second code base; planned later with React Native.

## Consequences

- No video ever leaves the device; server cost does not grow with training time.
- Feedback is immediate, including on phones (the `lite` model is used on slow devices).
- **The client can be modified**, so the server cannot prove a set happened. It bounds abuse instead: maximum pace, daily caps, time window and idempotent submissions.
- Model files and WASM are served from the app's origin to keep the strict CSP.

---
<!-- nav -->

**Related:** [Workout](../modules/workout.md) · [Security](../security.md)

← [ADR 001: The AI never computes calories](001-ai-never-computes-calories.md) | [ADR 003: Self-hosted embeddings](003-self-hosted-embeddings.md) →
