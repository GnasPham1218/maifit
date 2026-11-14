-- The accent color the user picked in the profile (buttons, selected items, charts), kept per account
-- so it follows them to every device. Only colors checked for contrast with white text are allowed.
ALTER TABLE users
    ADD COLUMN accent_color VARCHAR(16) NOT NULL DEFAULT 'BLUE',
    ADD CONSTRAINT ck_users_accent_color
        CHECK (accent_color IN ('BLUE', 'TEAL', 'GREEN', 'ORANGE', 'PURPLE', 'PINK'));

COMMENT ON COLUMN users.accent_color IS 'Màu chủ đạo của giao diện, người dùng chọn trong hồ sơ';
