-- Pork ribs by cut, each with a lean-only version (USDA SR Legacy, CC0).
-- "Sườn heo" (V5) = spareribs WITH fat, 397 kcal/100 g braised; someone who trims the fat eats far less.
-- USDA has no lean-only spareribs, so the lean rows come from the cuts it does measure that way:
--   Sườn thăn = loin country-style ribs, Sườn lưng = backribs. All values per 100 g of the edible part.
-- Numbers copied by script from food_nutrient.csv, not typed. Comment = original USDA description.
-- USDA "roasted" (oven) is stored as GRILLED: the closest state we have (XẤP XỈ cách nấu, số đo vẫn là thật).

INSERT INTO foods (name, preparation, kcal, protein_g, carb_g, fat_g, fiber_g, source) VALUES
('Sườn thăn heo',       'RAW',      189.0,  19.34,   0.00,  11.82,  0.00, 'USDA FDC 167895 (SR Legacy)'), -- Pork, fresh, loin, country-style ribs, separable lean and fat, raw
('Sườn thăn heo',       'BRAISED',  273.0,  26.49,   0.00,  17.71,  0.00, 'USDA FDC 167896 (SR Legacy)'), -- Pork, fresh, loin, country-style ribs, separable lean and fat, cooked, braised
('Sườn thăn heo',       'GRILLED',  260.0,  25.58,   0.00,  17.56,  0.00, 'USDA FDC 169200 (SR Legacy)'), -- Pork, fresh, loin, country-style ribs, separable lean and fat, bone-in, cooked, broiled
('Sườn thăn heo nạc',   'RAW',      140.0,  20.76,   0.00,   5.64,  0.00, 'USDA FDC 168305 (SR Legacy)'), -- Pork, fresh, loin, country-style ribs, separable lean only, raw
('Sườn thăn heo nạc',   'BRAISED',  247.0,  27.74,   0.00,  14.26,  0.00, 'USDA FDC 168306 (SR Legacy)'), -- Pork, fresh, loin, country-style ribs, separable lean only, cooked, braised
('Sườn thăn heo nạc',   'GRILLED',  216.0,  27.83,   0.00,  11.65,  0.00, 'USDA FDC 168378 (SR Legacy)'), -- Pork, fresh, loin, country-style ribs, separable lean only, bone-in, cooked, broiled
('Sườn lưng heo',       'RAW',      224.0,  19.07,   0.00,  16.33,  0.00, 'USDA FDC 168299 (SR Legacy)'), -- Pork, fresh, backribs, separable lean and fat, raw
('Sườn lưng heo',       'GRILLED',  292.0,  23.01,   0.00,  21.51,  0.00, 'USDA FDC 168300 (SR Legacy)'), -- Pork, fresh, backribs, separable lean and fat, cooked, roasted
('Sườn lưng heo nạc',   'RAW',      172.0,  20.85,   0.00,   9.84,  0.00, 'USDA FDC 168376 (SR Legacy)'), -- Pork loin, fresh, backribs, bone-in, raw, lean only
('Sườn lưng heo nạc',   'GRILLED',  255.0,  24.15,   0.00,  17.65,  0.00, 'USDA FDC 168377 (SR Legacy)'); -- Pork loin, fresh, backribs, bone-in, cooked-roasted, lean only

-- Everyday names (see V6). "Sườn" / "Sườn non" stay on Sườn heo: from a photo the AI cannot tell
-- lean from fatty, and the fatty row never under-counts. The user switches to a lean row with ✏️.
CREATE TEMP TABLE alias_seed (name TEXT, preparation TEXT, alias TEXT) ON COMMIT DROP;
INSERT INTO alias_seed VALUES
    ('Sườn thăn heo',     'RAW', 'Sườn thăn'),
    ('Sườn lưng heo',     'RAW', 'Sườn lưng'),
    ('Sườn thăn heo nạc', 'RAW', 'Sườn nạc'),
    ('Sườn thăn heo nạc', 'RAW', 'Sườn heo nạc');

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
SELECT f.id, s.alias, FALSE
FROM alias_seed s
JOIN foods f ON f.name = s.name AND f.preparation = s.preparation;
