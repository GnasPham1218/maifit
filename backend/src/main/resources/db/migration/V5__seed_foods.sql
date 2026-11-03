-- QUY ƯỚC
-- - Mọi số tính trên 100g phần ăn được.
-- - Thiếu số liệu -> NULL, không ghi 0.
-- - RAW = dạng mua về, chưa nấu thêm (bánh phở, bún, bánh mì, nước mắm... cũng là RAW).
-- - Nguồn: USDA FoodData Central (SR Legacy + Foundation, public domain).
--   Kiểm tra: https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients
-- - Comment cuối mỗi dòng = tên gốc trong USDA, để đối chiếu.
-- - Dòng ghi "XẤP XỈ" = dùng thực phẩm USDA gần nhất vì USDA không có đúng món Việt.
-- - Dòng ghi "ƯỚC TÍNH" = không có số đo trực tiếp, tính bằng tỉ lệ từ số đo USDA.

INSERT INTO foods (name, preparation, kcal, protein_g, carb_g, fat_g, fiber_g, source) VALUES
-- ===== Tinh bột =====
('Gạo tẻ',               'RAW',     365.0,  7.13, 80.00,  0.66,  1.30, 'USDA FDC 168877 (SR Legacy)'), -- Rice, white, long-grain, regular, raw, enriched
('Gạo tẻ',               'BOILED',  130.0,  2.69, 28.20,  0.28,  0.40, 'USDA FDC 168878 (SR Legacy)'), -- Rice, white, long-grain, regular, enriched, cooked (cơm trắng)
('Bánh phở',             'RAW',     108.0,  1.79, 24.00,  0.20,  1.00, 'USDA FDC 168914 (SR Legacy)'), -- XẤP XỈ: Rice noodles, cooked
('Bún tươi',             'RAW',     108.0,  1.79, 24.00,  0.20,  1.00, 'USDA FDC 168914 (SR Legacy)'), -- XẤP XỈ: Rice noodles, cooked
('Bánh mì',              'RAW',     272.0, 10.80, 51.90,  2.42,  2.20, 'USDA FDC 172675 (SR Legacy)'), -- XẤP XỈ: Bread, french or vienna (includes sourdough)
('Khoai lang',           'RAW',      86.0,  1.57, 20.10,  0.05,  3.00, 'USDA FDC 168482 (SR Legacy)'), -- Sweet potato, raw, unprepared
('Khoai lang',           'BOILED',   76.0,  1.37, 17.70,  0.14,  2.50, 'USDA FDC 168484 (SR Legacy)'), -- Sweet potato, cooked, boiled, without skin
('Yến mạch',             'RAW',     379.0, 13.20, 67.70,  6.52, 10.10, 'USDA FDC 173904 (SR Legacy)'), -- Cereals, oats, regular and quick, not fortified, dry

-- ===== Đạm =====
('Ức gà',                'RAW',     120.0, 22.50,  0.00,  2.62,  0.00, 'USDA FDC 171077 (SR Legacy)'), -- Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw
('Ức gà',                'BOILED',  151.0, 29.00,  0.00,  3.03,  0.00, 'USDA FDC 171478 (SR Legacy)'), -- ... breast, meat only, cooked, stewed (hầm/luộc)
('Ức gà',                'GRILLED', 165.0, 31.00,  0.00,  3.57,  0.00, 'USDA FDC 171477 (SR Legacy)'), -- ... breast, meat only, cooked, roasted (quay/nướng lò)
('Ức gà',                'FRIED',   187.0, 33.40,  0.51,  4.71,  0.00, 'USDA FDC 171078 (SR Legacy)'), -- ... breast, meat only, cooked, fried (không bột)
('Đùi gà',               'RAW',     121.0, 19.70,  0.00,  4.12,  0.00, 'USDA FDC 173627 (SR Legacy)'), -- Chicken, broilers or fryers, dark meat, thigh, meat only, raw
('Thịt heo nạc',         'RAW',     109.0, 20.90,  0.00,  2.17,  0.00, 'USDA FDC 168249 (SR Legacy)'), -- Pork, fresh, loin, tenderloin, separable lean only, raw
('Thịt heo nạc',         'GRILLED', 143.0, 26.20,  0.00,  3.51,  0.00, 'USDA FDC 168250 (SR Legacy)'), -- ... tenderloin, separable lean only, cooked, roasted
('Thịt ba chỉ',          'RAW',     518.0,  9.34,  0.00, 53.00,  0.00, 'USDA FDC 167812 (SR Legacy)'), -- Pork, fresh, belly, raw
('Thịt ba chỉ',          'BRAISED', 687.8, 17.54,  0.00, 68.63,  0.00, 'ƯỚC TÍNH: USDA FDC 167812 x tỉ lệ sống->kho của sườn heo FDC 167853/167854'),
('Sườn heo',             'RAW',     277.0, 15.50,  0.00, 23.40,  0.00, 'USDA FDC 167853 (SR Legacy)'), -- Pork, fresh, spareribs, separable lean and fat, raw
('Sườn heo',             'BRAISED', 397.0, 29.10,  0.00, 30.30,  0.00, 'USDA FDC 167854 (SR Legacy)'), -- ... spareribs, separable lean and fat, cooked, braised
('Thịt bò',              'RAW',     121.0, 23.60,  0.00,  2.94,  0.00, 'USDA FDC 171757 (SR Legacy)'), -- Beef, round, top round steak, boneless, lean only, 0" fat, all grades, raw
('Thịt bò',              'BRAISED', 190.0, 36.10,  0.00,  4.00,  0.00, 'USDA FDC 170236 (SR Legacy)'), -- Beef, round, top round, lean only, 0" fat, select, cooked, braised
('Trứng gà',             'RAW',     143.0, 12.60,  0.72,  9.51,  0.00, 'USDA FDC 171287 (SR Legacy)'), -- Egg, whole, raw, fresh
('Trứng gà',             'BOILED',  155.0, 12.60,  1.12, 10.60,  0.00, 'USDA FDC 173424 (SR Legacy)'), -- Egg, whole, cooked, hard-boiled
('Trứng gà',             'FRIED',   196.0, 13.60,  0.83, 14.80,  0.00, 'USDA FDC 173423 (SR Legacy)'), -- Egg, whole, cooked, fried
('Đậu phụ',              'RAW',      76.0,  8.08,  1.87,  4.78,  0.30, 'USDA FDC 172476 (SR Legacy)'), -- Tofu, raw, regular, prepared with calcium sulfate
('Đậu phụ',              'FRIED',   270.0, 18.80,  8.86, 20.20,  3.90, 'USDA FDC 172451 (SR Legacy)'), -- Tofu, fried
('Cá basa',              'RAW',     119.0, 15.20,  0.00,  5.94,  0.00, 'USDA FDC 175165 (SR Legacy)'), -- XẤP XỈ: Fish, catfish, channel, farmed, raw (cùng họ cá da trơn)
('Cá hồi',               'RAW',     208.0, 20.40,  0.00, 13.40,  0.00, 'USDA FDC 175167 (SR Legacy)'), -- Fish, salmon, Atlantic, farmed, raw
('Tôm',                  'RAW',      75.7, 15.60,  0.48,  0.80,  NULL, 'USDA FDC 2684443 (Foundation)'), -- Crustaceans, shrimp, farm raised, raw

-- ===== Rau =====
('Rau muống',            'RAW',      19.0,  2.60,  3.14,  0.20,  2.10, 'USDA SR Legacy NDB 11503'), -- Swamp cabbage, (skunk cabbage), raw — CẦN ĐỐI CHIẾU
('Rau muống',            'BOILED',   20.0,  2.08,  3.71,  0.24,  1.90, 'USDA SR Legacy NDB 11504'), -- Swamp cabbage, cooked, boiled, drained, without salt — CẦN ĐỐI CHIẾU
('Cải xanh',             'RAW',      27.0,  2.86,  4.67,  0.42,  3.20, 'USDA FDC 169256 (SR Legacy)'), -- Mustard greens, raw
('Bông cải xanh',        'RAW',      34.0,  2.82,  6.64,  0.37,  2.60, 'USDA FDC 170379 (SR Legacy)'), -- Broccoli, raw
('Bông cải xanh',        'BOILED',   35.0,  2.38,  7.18,  0.41,  3.30, 'USDA FDC 169967 (SR Legacy)'), -- Broccoli, cooked, boiled, drained, without salt
('Cà chua',              'RAW',      18.0,  0.88,  3.89,  0.20,  1.20, 'USDA FDC 170457 (SR Legacy)'), -- Tomatoes, red, ripe, raw, year round average
('Dưa leo',              'RAW',      15.0,  0.65,  3.63,  0.11,  0.50, 'USDA FDC 168409 (SR Legacy)'), -- Cucumber, with peel, raw
('Giá đỗ',               'RAW',      30.0,  3.04,  5.94,  0.18,  1.80, 'USDA FDC 169957 (SR Legacy)'), -- Mung beans, mature seeds, sprouted, raw

-- ===== Trái cây =====
('Chuối',                'RAW',      89.0,  1.09, 22.80,  0.33,  2.60, 'USDA FDC 173944 (SR Legacy)'), -- Bananas, raw
('Táo',                  'RAW',      52.0,  0.26, 13.80,  0.17,  2.40, 'USDA FDC 171688 (SR Legacy)'), -- Apples, raw, with skin
('Cam',                  'RAW',      47.0,  0.94, 11.80,  0.12,  2.40, 'USDA FDC 169097 (SR Legacy)'), -- Oranges, raw, all commercial varieties
('Xoài chín',            'RAW',      60.0,  0.82, 15.00,  0.38,  1.60, 'USDA FDC 169910 (SR Legacy)'), -- Mangos, raw

-- ===== Gia vị, sữa, khác =====
('Dầu ăn',               'RAW',     884.0,  0.00,  0.00,100.00,  0.00, 'USDA FDC 171411 (SR Legacy)'), -- Oil, soybean, salad or cooking
('Nước mắm',             'RAW',      35.0,  5.06,  3.64,  0.01,  0.00, 'USDA FDC 174531 (SR Legacy)'), -- Sauce, fish, ready-to-serve
('Đường',                'RAW',     385.0,  0.00, 99.60,  0.32,  NULL, 'USDA FDC 746784 (Foundation)'), -- Sugars, granulated
('Sữa tươi không đường', 'RAW',      60.0,  3.27,  4.63,  3.20,  NULL, 'USDA FDC 746782 (Foundation)'), -- Milk, whole, 3.25% milkfat, with added vitamin D
('Sữa chua không đường', 'RAW',      77.3,  3.82,  5.57,  4.48,  NULL, 'USDA FDC 2259793 (Foundation)'); -- Yogurt, plain, whole milk