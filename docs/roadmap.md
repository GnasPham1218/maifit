<sub>[MAIFit](../README.md) / [Docs](README.md) / Roadmap</sub>

# Roadmap

## Planned

- **Mobile app (React Native)** sharing the same API; needs a body-based refresh flow ([ADR 006](decisions/006-token-storage.md)) with secure device storage instead of the cookie.
- **Run tests in CI** on every pull request (backend JUnit with a PostgreSQL service container, frontend Vitest and ESLint).
- **Google sign-in**, linked to existing accounts only when Google has verified the email.
- **Friends and challenges:** find friends, private leaderboards, then asynchronous one-on-one challenges.
- **Dishes** ([nutrition](modules/nutrition.md#trade-offs-and-limits)): common Vietnamese dishes with default recipes, so a photo of phở can be logged as one dish and adjusted.
- **More food sources:** the Vietnamese food composition table for local ingredients.
- **More chatbot sources:** dietary and physical activity guidelines from public health agencies.
- **Semantic food search** with the chatbot's embeddings, so "thịt kho tàu" finds braised pork belly without an alias.
- **Code splitting:** load the camera and pose model only on the workout page.
- **Off-site encrypted backups** of the database on a schedule.
- **Profile photos.**

## Known limitations

- Reps are counted on the device, so a modified client can submit fake sets within the server's limits.
- Gram estimates from photos are rough and must be reviewed.
- The food table is USDA-based; some Vietnamese ingredients use the closest match.
- The chatbot covers a small set of sources and up to 10 foods per question.
- One server: no high availability; rate limit counters reset on restart.

---
<!-- nav -->

**Related:** [Modules](modules/README.md) · [Decisions](decisions/README.md)

← [Security](security.md)
