-- Tokens actually billed by Gemini, per user, day and feature (next to the call count).
-- output_tokens includes the model's "thinking" tokens: Google bills them as output.
-- Used to measure the real cost of a call before choosing prices and daily limits.
ALTER TABLE ai_usage
    ADD COLUMN input_tokens  BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN output_tokens BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_ai_usage_tokens CHECK (input_tokens >= 0 AND output_tokens >= 0);

COMMENT ON COLUMN ai_usage.input_tokens IS 'Token đầu vào Gemini tính tiền (prompt + ảnh), cộng dồn trong ngày';
COMMENT ON COLUMN ai_usage.output_tokens IS 'Token đầu ra Gemini tính tiền (câu trả lời + thinking), cộng dồn trong ngày';
