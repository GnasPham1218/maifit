<sub>[MAIFit](../README.md) / [Docs](README.md) / Getting started</sub>

# Getting started

This guide runs the whole app on your machine: database, embedding model, backend and frontend. For the production setup, see [Deployment](deployment.md).

## Requirements

| Tool | Version | Used for |
|---|---|---|
| Java | 25 | Backend |
| Node.js | 24 or newer | Frontend |
| Docker Desktop | recent | PostgreSQL + pgvector |
| [Ollama](https://ollama.com) | recent | Embeddings for the chatbot |

You also need:

- a **Gemini API key** from [Google AI Studio](https://aistudio.google.com) (photo recognition and chatbot);
- a **Gmail account with an app password** (verification and password reset emails);
- optionally, **payOS** keys to test Premium payments. payOS has no sandbox, so tests are real transfers.

## 1. Clone and configure

```bash
git clone https://github.com/GnasPham1218/maifit.git
cd maifit
cp .env.example .env
```

Fill in `.env`. It is listed in `.gitignore` and must never be committed.

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | yes | Used by Docker Compose to create the database |
| `DB_URL` | yes | `jdbc:postgresql://localhost:5432/<POSTGRES_DB>` |
| `JWT_SECRET` | yes | Base64 of at least 32 random bytes: `openssl rand -base64 32`. The backend refuses to start with a shorter key |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | yes | Gmail address and app password |
| `GEMINI_API_KEY` | yes | Google AI Studio key |
| `TURNSTILE_SECRET_KEY` | yes | Use Cloudflare's test secret from `.env.example` locally (always passes) |
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | yes | payOS keys; the backend does not start without them |
| `PREMIUM_PRICE` | no | Price in VND. Set a small value such as `2000` locally so test payments cost little |
| `GEMINI_MODEL`, `GEMINI_CHAT_MODEL` | no | Override the default models when Google retires one |

## 2. Start the database

```bash
docker compose up -d
```

PostgreSQL 17 with pgvector listens on `127.0.0.1:5432` only. Flyway creates and migrates the schema when the backend starts.

## 3. Pull the embedding model

```bash
ollama pull bge-m3
```

The chatbot embeds documents and questions with the same model. Ollama must be running whenever you use the chatbot or load its sources.

## 4. Run the backend

```bash
cd backend
./mvnw spring-boot:run
```

On Windows PowerShell, use `.\mvnw.cmd spring-boot:run`.

Check that it is up:

```bash
curl http://localhost:8080/api/actuator/health
# {"status":"UP"}
```

## 5. Load the chatbot sources

Run once, and again whenever a source document or the food table changes ([how ingest works](modules/chatbot.md#ingest)):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest
```

This splits the documents in `backend/src/main/resources/rag/` and the food table into chunks, embeds them with Ollama, stores them in pgvector, prints a retrieval check and exits. It is safe to run again: the old chunks of each source are replaced.

## 6. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend on port 8080. Locally, the CAPTCHA uses Cloudflare's test site key, so no setup is needed.

The camera needs a secure context: `localhost` works, a LAN address such as `http://192.168.x.x` does not.

## Tests

```bash
cd backend && ./mvnw test        # JUnit
cd frontend && npm test          # Vitest
cd frontend && npm run lint      # ESLint
```

### Chatbot evaluation

A fixed set of questions ([details](modules/chatbot.md#evaluation)) in `backend/src/main/resources/chat-eval/cases.txt`, each with the expected outcome (answered, refused as medical, out of scope, no information), runs through the real chat logic:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=chat-eval
```

It needs Ollama, the ingested sources and a Gemini key, and it uses real API calls. Run it after changing a prompt, a model or the retrieval settings.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Backend stops at startup with `JWT_SECRET must decode to at least 32 bytes` | The secret is not Base64 or is too short |
| Backend stops with a message about a missing variable | A required variable in `.env` is empty |
| Chatbot says it has no information for every question | Sources were not ingested, or Ollama is not running |
| Camera does not start | The page is not on `localhost` or HTTPS, or the browser blocked the permission |

---
<!-- nav -->

**Related:** [Architecture](architecture.md) · [MBotFit chatbot](modules/chatbot.md) · [Deployment](deployment.md)

[Architecture](architecture.md) →
