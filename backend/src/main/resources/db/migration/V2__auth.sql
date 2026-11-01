-- Auth: users, refresh_tokens, email_tokens
-- user_identities (Google login) thuộc ưu tiên 2, sẽ là migration riêng.

CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(254) NOT NULL,
    username        VARCHAR(30)  NOT NULL,
    password_hash   VARCHAR(100),               -- NULL: tài khoản chỉ dùng Google
    display_name    VARCHAR(50)  NOT NULL,
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email           UNIQUE (email),
    CONSTRAINT uq_users_username        UNIQUE (username),
    CONSTRAINT ck_users_email_lower     CHECK (email = lower(email)),
    CONSTRAINT ck_users_username_format CHECK (username ~ '^[a-z0-9_]{3,30}$'),
    CONSTRAINT ck_users_role            CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE refresh_tokens (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,                    -- giữ lại để phát hiện tái sử dụng
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

CREATE TABLE email_tokens (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    type        VARCHAR(10) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_email_tokens_hash UNIQUE (token_hash),
    CONSTRAINT ck_email_tokens_type CHECK (type IN ('VERIFY', 'RESET'))
);
CREATE INDEX idx_email_tokens_user_type ON email_tokens (user_id, type);

COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hex của token gốc; token gốc không bao giờ lưu';
COMMENT ON COLUMN email_tokens.token_hash   IS 'SHA-256 hex của token gốc; token gốc không bao giờ lưu';