-- Một set tập đã đếm trên trình duyệt (đếm rep chạy hoàn toàn ở client, server chỉ nhận kết quả).
-- Vì số liệu đến từ trình duyệt (sửa được bằng DevTools), server tự kiểm tra lại: CHECK ở đây là
-- tầng cuối, WorkoutService chặn trước các trường hợp vô lý (nhịp quá nhanh, giờ tương lai, quá số buổi).
CREATE TABLE workout_sessions (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    exercise     VARCHAR(16) NOT NULL,
    reps         INT         NOT NULL,
    started_at   TIMESTAMPTZ NOT NULL,
    duration_sec INT         NOT NULL,
    -- Khóa chống gửi trùng: trình duyệt sinh UUID cho mỗi set; gửi lại (mạng chập chờn) vẫn chỉ 1 dòng
    client_id    UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_workout_sessions_exercise CHECK (exercise IN ('SQUAT', 'PUSH_UP')),
    CONSTRAINT ck_workout_sessions_reps     CHECK (reps BETWEEN 1 AND 500),
    CONSTRAINT ck_workout_sessions_duration CHECK (duration_sec BETWEEN 5 AND 3600),
    -- Trần nhịp: tối đa 3,5 rep/giây (client đã bỏ 2 rep cách nhau < 0,3 s, tức ~3,3 rep/giây)
    CONSTRAINT ck_workout_sessions_pace     CHECK (reps * 2 <= duration_sec * 7),
    CONSTRAINT uq_workout_sessions_client   UNIQUE (user_id, client_id)
);

-- Bảng xếp hạng: lọc theo bài + khoảng thời gian rồi SUM theo user
CREATE INDEX ix_workout_sessions_exercise_started ON workout_sessions (exercise, started_at);
-- Lịch sử, giới hạn mỗi ngày, streak của một người
CREATE INDEX ix_workout_sessions_user_started ON workout_sessions (user_id, started_at);
