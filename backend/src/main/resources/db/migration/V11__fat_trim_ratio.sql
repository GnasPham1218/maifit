-- Cho người dùng kéo thanh "giữ lại bao nhiêu % phần mỡ nhìn thấy" giữa bản "có mỡ" (mua về,
-- chưa lọc) và bản "nạc" (lọc sạch mỡ) của CÙNG một miếng thịt, cùng cách chế biến.
-- Hai đầu mút của thanh kéo là hai số đo USDA thật đã có trong bảng foods (V10); ở giữa chỉ
-- là nội suy tuyến tính, không bày thêm số liệu mới. Chỉ 2 loại thịt có đủ cặp dữ liệu thật
-- cho tới nay: Sườn thăn heo và Sườn lưng heo. "Sườn heo" (sườn non) không có bản nạc trong
-- USDA nên không áp dụng được thanh này.

ALTER TABLE foods ADD COLUMN lean_version_id BIGINT REFERENCES foods (id);

UPDATE foods f
SET lean_version_id = lean.id
FROM foods lean
WHERE lean.preparation = f.preparation
  AND (
    (f.name = 'Sườn thăn heo' AND lean.name = 'Sườn thăn heo nạc') OR
    (f.name = 'Sườn lưng heo' AND lean.name = 'Sườn lưng heo nạc')
  );

-- Chốt lại đúng 5 cặp mong đợi (3 cách chế biến của thăn + 2 của lưng), không thiếu không dư.
DO $$
DECLARE
    linked INT;
BEGIN
    SELECT COUNT(*) INTO linked FROM foods WHERE lean_version_id IS NOT NULL;
    IF linked <> 5 THEN
        RAISE EXCEPTION 'Mong đợi 5 foods có lean_version_id, thực tế %', linked;
    END IF;
END $$;

ALTER TABLE meal_items ADD COLUMN fat_percent SMALLINT;
ALTER TABLE meal_items
    ADD CONSTRAINT ck_meal_items_fat_percent CHECK (fat_percent IS NULL OR fat_percent BETWEEN 0 AND 100);
COMMENT ON COLUMN meal_items.fat_percent IS
    'NULL = tính đúng như food đã chọn. 0-100 = % lượng mỡ của food đó còn giữ lại so với bản '
    '"có mỡ" nguyên bản; chỉ có nghĩa khi foods.lean_version_id của food này khác NULL.';
