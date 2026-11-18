-- Food photos are stored one folder per food: foods/<food-slug>/<preparation>-NN.webp
-- (exported by tools/food-image). V18 only allowed flat files directly under foods/.
-- The rows themselves are written by the repeatable migration R__food_images.sql.

ALTER TABLE food_images DROP CONSTRAINT food_images_path_check;

ALTER TABLE food_images
    ADD CONSTRAINT ck_food_images_path CHECK (path ~ '^foods/[a-z0-9-]+/[a-z0-9-]+\.webp$');
