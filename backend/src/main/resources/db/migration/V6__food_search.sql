-- Food search for the photo flow: the AI returns everyday names ("cơm", "trứng ốp la"),
-- the backend finds the matching foods row. Fuzzy and accent-insensitive, all inside Postgres.

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram similarity: similarity(), the % operator, GIN index
CREATE EXTENSION IF NOT EXISTS unaccent;  -- "Cơm trắng" -> "Com trang" (also đ -> d)

-- unaccent() is only STABLE (its dictionary could change), and an index expression must be IMMUTABLE.
-- Standard workaround: a wrapper that pins the dictionary and is declared IMMUTABLE.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Everyday names for a food row.
-- locks_preparation = the name already says how it is cooked ("cơm" is always cooked rice,
-- "trứng ốp la" is always fried). Otherwise the preparation returned by the AI picks the variant.
CREATE TABLE food_aliases (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    food_id           BIGINT       NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    alias             VARCHAR(150) NOT NULL,
    locks_preparation BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One alias = one meaning, compared without accents and case
CREATE UNIQUE INDEX uq_food_aliases_alias ON food_aliases (f_unaccent(lower(alias)));
CREATE INDEX ix_food_aliases_food_id ON food_aliases (food_id);

-- Trigram indexes: the "%" operator can use them once the tables grow
CREATE INDEX ix_foods_name_trgm        ON foods        USING gin (f_unaccent(lower(name))  gin_trgm_ops);
CREATE INDEX ix_food_aliases_alias_trgm ON food_aliases USING gin (f_unaccent(lower(alias)) gin_trgm_ops);

-- Seed: (food name, preparation of the target row, alias, locks_preparation).
-- Aliases that equal a food name are not needed: names are searched too.
CREATE TEMP TABLE alias_seed (name TEXT, preparation TEXT, alias TEXT, locks BOOLEAN) ON COMMIT DROP;
INSERT INTO alias_seed VALUES
    ('Gạo tẻ',               'BOILED',  'Cơm',               TRUE),
    ('Gạo tẻ',               'BOILED',  'Cơm trắng',         TRUE),
    ('Gạo tẻ',               'RAW',     'Gạo',               TRUE),
    ('Bánh phở',             'RAW',     'Phở',               FALSE),
    ('Bún tươi',             'RAW',     'Bún',               FALSE),
    ('Bánh mì',              'RAW',     'Ổ bánh mì',         FALSE),
    ('Khoai lang',           'RAW',     'Khoai',             FALSE),
    ('Yến mạch',             'RAW',     'Cháo yến mạch',     FALSE),
    ('Ức gà',                'RAW',     'Gà',                FALSE),
    ('Ức gà',                'RAW',     'Thịt gà',           FALSE),
    ('Ức gà',                'RAW',     'Lườn gà',           FALSE),
    ('Đùi gà',               'RAW',     'Má đùi gà',         FALSE),
    ('Thịt heo nạc',         'RAW',     'Thịt heo',          FALSE),
    ('Thịt heo nạc',         'RAW',     'Thịt lợn',          FALSE),
    ('Thịt heo nạc',         'RAW',     'Thịt nạc',          FALSE),
    ('Thịt heo nạc',         'RAW',     'Thăn heo',          FALSE),
    ('Thịt ba chỉ',          'RAW',     'Ba chỉ',            FALSE),
    ('Thịt ba chỉ',          'RAW',     'Thịt ba rọi',       FALSE),
    ('Thịt ba chỉ',          'BRAISED', 'Thịt kho',          TRUE),
    ('Thịt ba chỉ',          'BRAISED', 'Thịt kho tàu',      TRUE),
    ('Sườn heo',             'RAW',     'Sườn',              FALSE),
    ('Sườn heo',             'RAW',     'Sườn non',          FALSE),
    ('Sườn heo',             'RAW',     'Sườn lợn',          FALSE),
    ('Thịt bò',              'RAW',     'Bò',                FALSE),
    ('Thịt bò',              'BRAISED', 'Bò kho',            TRUE),
    ('Trứng gà',             'RAW',     'Trứng',             FALSE),
    ('Trứng gà',             'FRIED',   'Trứng ốp la',       TRUE),
    ('Trứng gà',             'FRIED',   'Trứng chiên',       TRUE),
    ('Trứng gà',             'FRIED',   'Trứng rán',         TRUE),
    ('Trứng gà',             'BOILED',  'Trứng luộc',        TRUE),
    ('Đậu phụ',              'RAW',     'Đậu hũ',            FALSE),
    ('Đậu phụ',              'RAW',     'Tàu hũ',            FALSE),
    ('Đậu phụ',              'FRIED',   'Đậu rán',           TRUE),
    ('Cá basa',              'RAW',     'Cá',                FALSE),
    ('Cá basa',              'RAW',     'Cá tra',            FALSE),
    ('Tôm',                  'RAW',     'Tôm sú',            FALSE),
    ('Tôm',                  'RAW',     'Tôm thẻ',           FALSE),
    ('Cải xanh',             'RAW',     'Rau cải',           FALSE),
    ('Cải xanh',             'RAW',     'Cải ngọt',          FALSE),
    ('Bông cải xanh',        'RAW',     'Súp lơ xanh',       FALSE),
    ('Bông cải xanh',        'RAW',     'Súp lơ',            FALSE),
    ('Dưa leo',              'RAW',     'Dưa chuột',         FALSE),
    ('Giá đỗ',               'RAW',     'Giá',               FALSE),
    ('Xoài chín',            'RAW',     'Xoài',              FALSE),
    ('Dầu ăn',               'RAW',     'Dầu',               FALSE),
    ('Dầu ăn',               'RAW',     'Dầu thực vật',      FALSE),
    ('Nước mắm',             'RAW',     'Nước chấm',         FALSE),
    ('Sữa tươi không đường', 'RAW',     'Sữa',               FALSE),
    ('Sữa tươi không đường', 'RAW',     'Sữa tươi',          FALSE),
    ('Sữa chua không đường', 'RAW',     'Sữa chua',          FALSE),
    ('Sữa chua không đường', 'RAW',     'Da ua',             FALSE)
;

-- Fail the migration if an alias points to a food that does not exist (typo in name/preparation)
DO $$
DECLARE missing TEXT;
BEGIN
    SELECT string_agg(s.alias, ', ') INTO missing
    FROM alias_seed s
    LEFT JOIN foods f ON f.name = s.name AND f.preparation = s.preparation
    WHERE f.id IS NULL;
    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'food_aliases seed: no foods row for %', missing;
    END IF;
END $$;

INSERT INTO food_aliases (food_id, alias, locks_preparation)
SELECT f.id, s.alias, s.locks
FROM alias_seed s
JOIN foods f ON f.name = s.name AND f.preparation = s.preparation;
