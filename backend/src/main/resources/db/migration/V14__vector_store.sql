-- RAG chatbot: one row per chunk of a source document.
-- Columns follow Spring AI's PgVectorStore defaults (table and column names are fixed by the library).
-- The schema is owned by Flyway: spring.ai.vectorstore.pgvector.initialize-schema stays false.
-- The "vector" extension already exists (V1). gen_random_uuid() is built into PostgreSQL 13+,
-- so the uuid-ossp and hstore extensions of the library's default script are not needed.
CREATE TABLE vector_store (
    id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content   TEXT,
    -- Source of the chunk (document title, URL, access date): citations are read from here,
    -- never written by the model
    metadata  JSON,
    -- 1024 = output size of the bge-m3 embedding model. Changing the model means a new
    -- migration and embedding every document again
    embedding VECTOR(1024)
);

-- Approximate nearest-neighbour search by cosine distance (the store's default distance type).
-- HNSW supports at most 2000 dimensions
CREATE INDEX ix_vector_store_embedding ON vector_store USING hnsw (embedding vector_cosine_ops);
