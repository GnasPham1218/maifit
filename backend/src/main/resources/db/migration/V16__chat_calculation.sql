-- Portions calculated by code under a chatbot answer ("200 g cơm + 1 quả trứng").
-- The model only names the foods and the grams; the numbers come from the foods table (NutritionCalculator).
-- ASSISTANT + ANSWERED only: {"items": [{food, preparation, options, grams, estimated, nutrition}], "total"}.
-- Updated when the user picks a preparation the model left open (no AI call, no quota).
ALTER TABLE chat_messages ADD COLUMN calculation JSONB;
