-- Premium: paid plan that raises the daily photo-recognition limit.
-- NULL or a time in the past = free plan. Each paid order pushes this forward by premium_days
-- (buying again while still Premium adds on top of the remaining time).
ALTER TABLE users ADD COLUMN premium_until TIMESTAMPTZ;

-- One row per payment attempt. The row is created BEFORE the user pays (status PENDING) and is
-- the only source of truth for "how much must be paid for what": the amount reported by the
-- payment gateway is compared with it, never trusted on its own.
CREATE TABLE payment_orders (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Which gateway handles this order (PaymentProvider implementation)
    provider       VARCHAR(16)   NOT NULL,
    -- Number sent to the gateway and echoed back in its webhook; not the id, so a fresh database
    -- (local, restored backup) can never reuse a code the gateway has already seen
    order_code     BIGINT        NOT NULL,
    amount         INT           NOT NULL,   -- VND
    premium_days   INT           NOT NULL,   -- what this order buys, fixed when it is created
    status         VARCHAR(16)   NOT NULL,
    provider_ref   VARCHAR(64),              -- the gateway's own id for this payment
    -- What the user needs to pay by bank transfer, shown on our own page
    qr_code        VARCHAR(1024),            -- VietQR payload (text), rendered as an image on read
    bank_bin       VARCHAR(16),
    account_number VARCHAR(32),
    account_name   VARCHAR(128),
    description    VARCHAR(64),              -- transfer content the gateway uses to match the payment
    expires_at     TIMESTAMPTZ   NOT NULL,   -- after this the QR is no longer shown or payable
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_payment_orders_provider CHECK (provider IN ('PAYOS')),
    CONSTRAINT ck_payment_orders_status   CHECK (status IN ('PENDING', 'PAID')),
    CONSTRAINT ck_payment_orders_amount   CHECK (amount > 0),
    CONSTRAINT ck_payment_orders_days     CHECK (premium_days > 0),
    CONSTRAINT ck_payment_orders_paid_at  CHECK ((status = 'PAID') = (paid_at IS NOT NULL)),
    CONSTRAINT uq_payment_orders_code     UNIQUE (provider, order_code)
);

-- Pending order of one user, orders created today (daily cap)
CREATE INDEX ix_payment_orders_user_created ON payment_orders (user_id, created_at);
