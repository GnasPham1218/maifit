-- RAG chatbot history. Ownership is checked through chat_conversations.user_id only:
-- messages have no user_id, every query goes through a conversation owned by the caller (IDOR).
CREATE TABLE chat_conversations (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Start of the first question, cut in ChatConversation; never written by the AI (saves a call)
    title      VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Moved forward on every new message: the list shows the latest conversation first
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_chat_conversations_user_updated ON chat_conversations (user_id, updated_at);

CREATE TABLE chat_messages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Deleting a conversation (or the user) deletes its messages
    conversation_id BIGINT      NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
    role            VARCHAR(16) NOT NULL,
    -- USER: the question. ASSISTANT: the answer, or '' when the bot declined (outcome says why,
    -- the frontend shows its own fixed text for each outcome)
    content         TEXT        NOT NULL,
    outcome         VARCHAR(16),
    -- ASSISTANT + ANSWERED only: [{title, section, url}] copied from the chunks the answer cited.
    -- A snapshot on purpose: an old answer keeps its sources even after the documents are re-ingested
    sources         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_chat_messages_role         CHECK (role IN ('USER', 'ASSISTANT')),
    CONSTRAINT ck_chat_messages_outcome      CHECK (outcome IN ('ANSWERED', 'NO_INFO', 'MEDICAL', 'OUT_OF_SCOPE')),
    -- Every ASSISTANT message has an outcome, no USER message has one
    CONSTRAINT ck_chat_messages_outcome_role CHECK ((role = 'ASSISTANT') = (outcome IS NOT NULL)),
    CONSTRAINT ck_chat_messages_sources      CHECK (sources IS NULL OR outcome = 'ANSWERED'),
    -- Questions are capped at 500 characters in the service; this is the last line of defence
    CONSTRAINT ck_chat_messages_content_len  CHECK (char_length(content) <= 8000)
);

-- Messages of one conversation in order, and the last few sent back to the model as context
CREATE INDEX ix_chat_messages_conversation_created ON chat_messages (conversation_id, created_at);
