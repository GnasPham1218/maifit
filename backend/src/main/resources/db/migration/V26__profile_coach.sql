-- Personal coach: richer goals and the profile details used by MBotFit and meal suggestions.

-- 1. Goals: 3 -> 6. LOSE becomes FAT_LOSS, GAIN becomes WEIGHT_GAIN (same kcal: -500 / +500), so existing
--    users keep exactly the same targets. Energy and protein rules: TdeeCalculator.
ALTER TABLE profiles DROP CONSTRAINT ck_profiles_goal;
ALTER TABLE profiles ALTER COLUMN goal TYPE VARCHAR(12);
UPDATE profiles SET goal = 'FAT_LOSS' WHERE goal = 'LOSE';
UPDATE profiles SET goal = 'WEIGHT_GAIN' WHERE goal = 'GAIN';
ALTER TABLE profiles ADD CONSTRAINT ck_profiles_goal
    CHECK (goal IN ('FAT_LOSS', 'RECOMP', 'MAINTAIN', 'LEAN_BULK', 'WEIGHT_GAIN', 'ENDURANCE'));

-- 2. Coach details. All optional: existing profiles stay valid, the app asks the user to complete them.
--    Only fixed choices and numbers, no free text: nothing a user writes here can become an instruction
--    to the chat model (prompt injection).
ALTER TABLE profiles
    ADD COLUMN training_experience VARCHAR(12),
    ADD COLUMN training_type       VARCHAR(12),
    ADD COLUMN diet_type           VARCHAR(12),
    ADD COLUMN suggestion_style    VARCHAR(10)  NOT NULL DEFAULT 'VARIETY',
    ADD COLUMN target_weight_kg    NUMERIC(5,2),
    ADD CONSTRAINT ck_profiles_training_experience
        CHECK (training_experience IN ('BEGINNER', 'UNDER_1_YEAR', 'OVER_1_YEAR')),
    ADD CONSTRAINT ck_profiles_training_type CHECK (training_type IN ('STRENGTH', 'CARDIO', 'SPORTS', 'LIGHT')),
    ADD CONSTRAINT ck_profiles_diet_type CHECK (diet_type IN ('OMNIVORE', 'VEGETARIAN', 'VEGAN')),
    ADD CONSTRAINT ck_profiles_suggestion_style CHECK (suggestion_style IN ('VARIETY', 'FAMILIAR')),
    ADD CONSTRAINT ck_profiles_target_weight CHECK (target_weight_kg IS NULL OR target_weight_kg BETWEEN 20 AND 400);

-- 3. Allergies of the user: groups from the allergens table (V24). Health data: only the owner sees it,
--    it is never sent to an AI model (filtering is done in code), deleted with the account
--    (users -> profiles -> here, ON DELETE CASCADE).
CREATE TABLE profile_allergies (
    user_id  BIGINT      NOT NULL REFERENCES profiles (user_id) ON DELETE CASCADE,
    allergen VARCHAR(20) NOT NULL REFERENCES allergens (code),
    PRIMARY KEY (user_id, allergen)
);

-- 4. Foods the user cannot or does not want to eat (rare allergies, dislikes). One row per food name,
--    stored as the id of its RAW row (every food has one); ids survive renames. All preparations of
--    that name are excluded from suggestions.
CREATE TABLE profile_excluded_foods (
    user_id BIGINT NOT NULL REFERENCES profiles (user_id) ON DELETE CASCADE,
    food_id BIGINT NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, food_id)
);

COMMENT ON TABLE profile_allergies IS 'Health data: owner only, never sent to an AI model';
COMMENT ON COLUMN profiles.suggestion_style IS 'VARIETY = rotate foods, avoid the last 3 days; FAMILIAR = prefer foods the user often logs';
