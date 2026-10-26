# MAIFit

A fitness web app with AI-powered meal calorie tracking from photos, in-browser rep counting,
a nutrition and training chatbot with cited sources, and weekly leaderboards.

> 🚧 Work in progress.

## Tech stack

- **Backend:** Spring Boot 4, Java 25, Spring Security, Spring Data JPA, Flyway
- **Database:** PostgreSQL 17 + pgvector
- **Infrastructure:** Docker Compose

## Run locally

### Prerequisites

- Java 25
- Docker Desktop (running)

### Steps

1. Clone the repository

   ```bash
   git clone https://github.com/GnasPham1218/maifit.git
   cd maifit
   ```

2. Create your environment file from the template, then fill in the values

   ```bash
   cp .env.example .env
   ```

3. Start the database

   ```bash
   docker compose up -d
   ```

4. Run the backend

   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

   On Windows PowerShell, use `.\mvnw.cmd spring-boot:run`.

5. Check that it is running

   ```bash
   curl http://localhost:8080/actuator/health
   ```

   Expected response: `{"status":"UP"}`
