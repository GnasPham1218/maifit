-- "Báo thiếu món": names users (and the AI) looked for but the foods table does not have.
-- The dev reads this list (most requested first), adds the food + aliases by migration, then marks it ADDED.
-- No calories here: a request is only a name; numbers still come from a cited source.

CREATE TABLE food_requests (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    display_name      VARCHAR(60)  NOT NULL,  -- as first typed, e.g. "Bún mọc"
    -- Same key for "Bún  Mọc", "bun moc", "BÚN MỌC": the UNIQUE index below turns a duplicate report
    -- into an UPDATE of the same row (ON CONFLICT), even when two users send it at the same moment
    normalized_name   VARCHAR(60)  GENERATED ALWAYS AS (f_unaccent(lower(regexp_replace(btrim(display_name), '\s+', ' ', 'g')))) STORED,
    source            VARCHAR(8)   NOT NULL,  -- who reported it first
    user_count        INT          NOT NULL DEFAULT 0, -- distinct users (one vote each, see food_request_votes)
    ai_count          INT          NOT NULL DEFAULT 0, -- times the photo AI saw it and found no food
    status            VARCHAR(16)  NOT NULL DEFAULT 'OPEN',
    food_id           BIGINT       REFERENCES foods (id) ON DELETE SET NULL, -- set when the food is added
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_requested_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_food_requests_name UNIQUE (normalized_name),
    CONSTRAINT ck_food_requests_source CHECK (source IN ('USER', 'AI')),
    CONSTRAINT ck_food_requests_status CHECK (status IN ('OPEN', 'ADDED', 'REJECTED')),
    CONSTRAINT ck_food_requests_name   CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60)
);

-- One vote per user per name: pressing the button 100 times still counts once.
-- Also the daily limit: a user's votes created today (Vietnam time).
CREATE TABLE food_request_votes (
    request_id BIGINT      NOT NULL REFERENCES food_requests (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (request_id, user_id)
);

CREATE INDEX ix_food_request_votes_user_created ON food_request_votes (user_id, created_at);
