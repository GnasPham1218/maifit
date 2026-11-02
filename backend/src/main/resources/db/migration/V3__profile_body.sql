-- Hồ sơ (1–1 với users) và lịch sử số đo cơ thể.
-- Cân nặng KHÔNG nằm trong profiles: cân nặng hiện tại = lần check-in mới nhất.

CREATE TABLE profiles (
    user_id          BIGINT       PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    sex              VARCHAR(10)  NOT NULL,
    birth_date       DATE         NOT NULL,
    height_cm        NUMERIC(4,1) NOT NULL,
    activity_level   VARCHAR(20)  NOT NULL,
    goal             VARCHAR(10)  NOT NULL,
    target_kcal      INTEGER,                    -- NULL: dùng mức gợi ý tính từ TDEE
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_profiles_sex      CHECK (sex IN ('MALE', 'FEMALE')),
    CONSTRAINT ck_profiles_height   CHECK (height_cm BETWEEN 100 AND 250),
    CONSTRAINT ck_profiles_activity CHECK (activity_level IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE')),
    CONSTRAINT ck_profiles_goal     CHECK (goal IN ('LOSE', 'MAINTAIN', 'GAIN')),
    CONSTRAINT ck_profiles_target   CHECK (target_kcal IS NULL OR target_kcal BETWEEN 1000 AND 6000)
);

CREATE TABLE body_checkins (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    checked_at    TIMESTAMPTZ  NOT NULL,
    weight_kg     NUMERIC(5,2) NOT NULL,
    body_fat_pct  NUMERIC(4,1),
    waist_cm      NUMERIC(4,1),
    note          VARCHAR(500),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_body_checkins_weight CHECK (weight_kg BETWEEN 20 AND 400),
    CONSTRAINT ck_body_checkins_fat    CHECK (body_fat_pct IS NULL OR body_fat_pct BETWEEN 2 AND 75),
    CONSTRAINT ck_body_checkins_waist  CHECK (waist_cm IS NULL OR waist_cm BETWEEN 30 AND 250)
);
-- Lấy lần đo mới nhất + vẽ biểu đồ theo thời gian
CREATE INDEX idx_body_checkins_user_time ON body_checkins (user_id, checked_at);

COMMENT ON COLUMN profiles.target_kcal IS 'Mục tiêu calo người dùng tự đặt; NULL = dùng gợi ý từ TDEE';
