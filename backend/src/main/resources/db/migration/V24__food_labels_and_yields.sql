-- Food labels used by the personal coach (meal suggestions, allergy warnings, raw/cooked weights).
-- Only the columns and tables: the values are written by the repeatable migrations
-- R__food_labels.sql (tools/food-list/food_labels.py) and
-- R__food_cooking_yields.sql (tools/usda-import/cooking_yields.py).

-- Diet labels, per food name (every preparation of a name gets the same values).
-- YES / NO / DEPENDS: DEPENDS = depends on the manufacturer (cheese made with animal rennet, wine fined
-- with egg white or fish, sandwich bread with milk). NULL = not labelled yet: treated as unknown.
-- Diet is a personal choice, not a health risk: DEPENDS foods are still suggested, with a "check the label" tag.
ALTER TABLE foods
    ADD COLUMN vegetarian VARCHAR(10),
    ADD COLUMN vegan      VARCHAR(10),
    ADD CONSTRAINT ck_foods_vegetarian CHECK (vegetarian IN ('YES', 'NO', 'DEPENDS')),
    ADD CONSTRAINT ck_foods_vegan      CHECK (vegan IN ('YES', 'NO', 'DEPENDS')),
    -- vegan implies vegetarian; not vegetarian implies not vegan
    ADD CONSTRAINT ck_foods_vegan_is_vegetarian CHECK (
        (vegan IS DISTINCT FROM 'YES' OR vegetarian = 'YES') AND (vegetarian IS DISTINCT FROM 'NO' OR vegan = 'NO'));

-- Cooking yield of a cooked row = cooked weight / raw weight, against the RAW row of the same name.
-- Below 1: meat and fish lose water and fat. Above 1: rice, pasta, dry beans absorb water.
-- cooking_yield_source says where the number comes from (USDA table, or an estimate and how).
ALTER TABLE foods
    ADD COLUMN cooking_yield        NUMERIC(4, 3),
    ADD COLUMN cooking_yield_source VARCHAR(200),
    ADD CONSTRAINT ck_foods_cooking_yield CHECK (
        cooking_yield IS NULL OR (preparation <> 'RAW' AND cooking_yield BETWEEN 0.2 AND 5)),
    ADD CONSTRAINT ck_foods_cooking_yield_source CHECK ((cooking_yield IS NULL) = (cooking_yield_source IS NULL));

-- Allergen groups: a lookup table like food_categories (V18). The profile shows them as checkboxes:
-- name is the label, examples tells the user what the group covers, sort_order is the display order.
-- Adding a group = adding a row (plus its labels in tools/food-list/food_labels.csv).
-- Only groups the food data can actually filter are offered: a checkbox that filters nothing gives a
-- false sense of safety (mustard, lupin, buckwheat wait for the dishes table).
-- WHEAT (wheat allergy) and GLUTEN (coeliac disease: wheat, barley, rye) are separate on purpose:
-- someone allergic to wheat can drink beer (barley), someone with coeliac disease cannot.
CREATE TABLE allergens (
    code       VARCHAR(20)  PRIMARY KEY,
    name       VARCHAR(60)  NOT NULL UNIQUE,
    examples   VARCHAR(200) NOT NULL,
    sort_order SMALLINT     NOT NULL UNIQUE
);

INSERT INTO allergens (code, name, examples, sort_order) VALUES
    ('MILK',       'Sữa',             'sữa tươi, sữa chua, phô mai, bơ, kem',                                      1),
    ('EGG',        'Trứng',           'trứng gà, trứng vịt, trứng cút, sốt mayonnaise',                            2),
    ('PEANUT',     'Đậu phộng',       'đậu phộng, bơ đậu phộng',                                                   3),
    ('TREE_NUT',   'Các loại hạt',    'hạnh nhân, hạt điều, óc chó; không gồm đậu phộng, dừa',                     4),
    ('SOY',        'Đậu nành',        'đậu nành, đậu phụ, sữa đậu nành, nước tương, dầu đậu nành',                 5),
    ('WHEAT',      'Lúa mì',          'bánh mì, bột mì, mì ống, mì trứng, nước tương',                             6),
    ('GLUTEN',     'Gluten (Celiac)', 'mọi món có lúa mì, lúa mạch, lúa mạch đen: bánh mì, mì ống, bia; yến mạch dễ lẫn', 7),
    ('FISH',       'Cá',              'các loại cá, nước mắm',                                                     8),
    ('CRUSTACEAN', 'Tôm cua',         'tôm, cua, ghẹ, tôm hùm',                                                    9),
    ('MOLLUSC',    'Nghêu sò mực',    'mực, bạch tuộc, nghêu, sò, hàu, ốc, dầu hào',                               10),
    ('SESAME',     'Mè (vừng)',       'mè, dầu mè',                                                                11),
    ('CELERY',     'Cần tây',         'cần tây, muối cần tây',                                                     12),
    ('SULPHITES',  'Sulfite',         'rượu vang, bia, trái cây sấy (nho khô)',                                    13);

-- Allergen groups of a food (main ingredient only: no cross-contamination, no sauces).
-- One row per (food, allergen): a food can belong to several groups (Mì trứng = WHEAT + GLUTEN + EGG).
-- level: CONTAINS = always there; MAY_CONTAIN = depends on the product (soy sauce with or without wheat,
-- refined or cold-pressed soybean oil). Allergies are a health risk: both levels hide the food from
-- suggestions, the warning text differs ("Có chứa" / "Có thể chứa, kiểm tra nhãn").
CREATE TABLE food_allergens (
    food_id  BIGINT      NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    allergen VARCHAR(20) NOT NULL REFERENCES allergens (code),
    level    VARCHAR(12) NOT NULL DEFAULT 'CONTAINS',
    PRIMARY KEY (food_id, allergen),
    CONSTRAINT ck_food_allergens_level CHECK (level IN ('CONTAINS', 'MAY_CONTAIN'))
);

-- "Which foods contain this allergen" (filtering suggestions for a user's allergies)
CREATE INDEX idx_food_allergens_allergen ON food_allergens (allergen);

COMMENT ON COLUMN foods.cooking_yield IS 'Cooked weight / raw weight vs the RAW row of the same name; NULL for RAW rows or unknown';
COMMENT ON TABLE food_allergens IS 'Allergen groups of the main ingredient only; not a guarantee (no cross-contamination data)';
