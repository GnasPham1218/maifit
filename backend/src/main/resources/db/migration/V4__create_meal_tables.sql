-- =====================================================================
-- foods: bảng nguyên liệu, chỉ dev sửa qua migration
-- =====================================================================
CREATE TABLE foods (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL,
    preparation VARCHAR(16)   NOT NULL,
    kcal        NUMERIC(5, 1) NOT NULL,
    protein_g   NUMERIC(5, 2),
    carb_g      NUMERIC(5, 2),
    fat_g       NUMERIC(5, 2),
    fiber_g     NUMERIC(5, 2),
    source      VARCHAR(255)  NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_foods_name_preparation UNIQUE (name, preparation),
    CONSTRAINT ck_foods_preparation CHECK (preparation IN ('RAW', 'BOILED', 'STEAMED', 'FRIED', 'BRAISED', 'GRILLED')),
    -- 100g chất béo nguyên chất ~ 884 kcal nên không nguyên liệu nào vượt 900
    CONSTRAINT ck_foods_kcal    CHECK (kcal BETWEEN 0 AND 900),
    CONSTRAINT ck_foods_protein CHECK (protein_g BETWEEN 0 AND 100),
    CONSTRAINT ck_foods_carb    CHECK (carb_g    BETWEEN 0 AND 100),
    CONSTRAINT ck_foods_fat     CHECK (fat_g     BETWEEN 0 AND 100),
    CONSTRAINT ck_foods_fiber   CHECK (fiber_g   BETWEEN 0 AND 100)
);

COMMENT ON TABLE foods IS
    'Nguyên liệu. MỌI giá trị dinh dưỡng tính trên 100g. Nguồn khác khẩu phần phải quy đổi về 100g trước khi lưu. Thiếu số liệu thì NULL, không ghi 0.';
COMMENT ON COLUMN foods.source IS
    'Nguồn tra lại được, vd. "USDA FDC 171477" hoặc "Viện Dinh dưỡng – BTPTP VN, mã ..."';

-- =====================================================================
-- meal_logs: một lần ăn ("phần đầu hóa đơn")
-- =====================================================================
CREATE TABLE meal_logs (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    eaten_at   TIMESTAMPTZ  NOT NULL,
    meal_type  VARCHAR(16)  NOT NULL,
    photo_key  VARCHAR(64),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_meal_logs_meal_type CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
    CONSTRAINT uq_meal_logs_photo_key UNIQUE (photo_key)
);

CREATE INDEX ix_meal_logs_user_eaten_at ON meal_logs (user_id, eaten_at);

-- =====================================================================
-- meal_items: từng nguyên liệu của lần ăn ("dòng hàng")
-- =====================================================================
CREATE TABLE meal_items (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    meal_log_id BIGINT        NOT NULL REFERENCES meal_logs (id) ON DELETE CASCADE,
    food_id     BIGINT        NOT NULL REFERENCES foods (id) ON DELETE RESTRICT,
    grams       NUMERIC(6, 1) NOT NULL,
    ai_grams    NUMERIC(6, 1),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_meal_items_grams    CHECK (grams > 0 AND grams <= 5000),
    CONSTRAINT ck_meal_items_ai_grams CHECK (ai_grams > 0 AND ai_grams <= 5000)
);

CREATE INDEX ix_meal_items_meal_log_id ON meal_items (meal_log_id);
CREATE INDEX ix_meal_items_food_id     ON meal_items (food_id);

-- =====================================================================
-- ai_usage: đếm lượt gọi AI mỗi người mỗi ngày (cũng là trần chi phí)
-- Ngoại lệ: không có id, dùng khóa chính ghép
-- =====================================================================
CREATE TABLE ai_usage (
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    usage_date DATE        NOT NULL,
    feature    VARCHAR(32) NOT NULL,
    count      INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_ai_usage PRIMARY KEY (user_id, usage_date, feature),
    CONSTRAINT ck_ai_usage_feature CHECK (feature IN ('FOOD_VISION', 'CHAT')),
    CONSTRAINT ck_ai_usage_count   CHECK (count >= 0)
);

COMMENT ON COLUMN ai_usage.usage_date IS 'Ngày theo giờ Việt Nam (Asia/Ho_Chi_Minh), service tính rồi truyền vào';