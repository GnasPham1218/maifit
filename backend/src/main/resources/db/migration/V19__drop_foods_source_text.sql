-- foods.source (free text, e.g. "USDA FDC 168878 (SR Legacy)") was split in V18 into source_id + source_ref
-- (+ estimated, source_note). Nothing reads it any more: the code builds labels and links from food_sources.
ALTER TABLE foods DROP COLUMN source;
