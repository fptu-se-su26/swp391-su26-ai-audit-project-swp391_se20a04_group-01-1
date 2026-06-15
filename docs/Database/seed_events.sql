-- ============================================
-- SEED DATA: EventCategories + Events (Đà Nẵng)
-- Chạy file này sau khi đã tạo bảng từ schema.sql hoặc Database_DN_Pulse.sql
-- ============================================

-- ========== 1. SEED EventCategories ==========
SET IDENTITY_INSERT EventCategories ON;

INSERT INTO EventCategories (category_id, name, icon, color_code, description) VALUES
(1, N'Lễ hội & Văn hóa', N'🎆', '#FF6B35', N'Các lễ hội, hoạt động văn hóa tại Đà Nẵng'),
(2, N'Thể thao', N'🏃', '#2ECC71', N'Các sự kiện thể thao, marathon, giải đấu'),
(3, N'Âm nhạc', N'🎵', '#9B59B6', N'Liveshow, concert, chương trình âm nhạc'),
(4, N'Ẩm thực', N'🍜', '#E67E22', N'Lễ hội ẩm thực, hội chợ ăn uống'),
(5, N'Du lịch', N'🏖️', '#0066CC', N'Hoạt động du lịch, tham quan'),
(6, N'Hội chợ', N'🛍️', '#1ABC9C', N'Hội chợ thương mại, triển lãm'),
(7, N'Cộng đồng', N'🤝', '#95A5A6', N'Hoạt động cộng đồng');

SET IDENTITY_INSERT EventCategories OFF;

-- ========== 2. SEED Events ==========
SET IDENTITY_INSERT Events ON;

INSERT INTO Events (
    event_id, category_id, created_by, title, short_description, description,
    location_name, latitude, longitude, address, district,
    start_time, end_time, banner_url, thumbnail_url, status,
    is_featured, is_free, ticket_price, created_at, updated_at
) VALUES
(
    1, 1, 1, N'Lễ hội Pháo hoa Quốc tế DIFF 2026',
    N'DIFF 2026 quy tụ 8 đội thi pháo hoa quốc tế hàng đầu bên bờ sông Hàn.',
    N'Lễ hội Pháo hoa Quốc tế Đà Nẵng - DIFF 2026 là sự kiện văn hóa du lịch quy mô lớn, thu hút hàng triệu du khách đến với Đà Nẵng. Lễ hội năm nay có chủ đề "Gắn kết toàn cầu - Rạng rỡ năm châu" với sự tham gia của các đội thi hàng đầu thế giới.',
    N'Khán đài Sông Hàn, đường Trần Hưng Đạo', 16.072200, 108.225500,
    N'Đường Trần Hưng Đạo, Quận Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-06-12 19:30:00', '2026-06-22 22:30:00',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1000',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    'approved', 1, 0, 800000, GETDATE(), GETDATE()
),
(
    2, 2, 1, N'Danang International Marathon 2026',
    N'Giải chạy marathon quốc tế lớn nhất miền Trung tại công viên Biển Đông.',
    N'Manulife Danang International Marathon là giải chạy quốc tế được chứng nhận chính thức bởi AIMS (Hiệp hội Marathon Quốc tế). Cung đường chạy tuyệt đẹp đón bình minh dọc bờ biển Đà Nẵng và đi qua những cây cầu nổi tiếng.',
    N'Công viên Biển Đông, Sơn Trà', 16.069400, 108.232500,
    N'Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-08-23 04:00:00', '2026-08-23 11:30:00',
    'https://images.unsplash.com/photo-1502224562085-639556652f33?w=1000',
    'https://images.unsplash.com/photo-1502224562085-639556652f33?w=400',
    'approved', 1, 0, 350000, GETDATE(), GETDATE()
),
(
    3, 3, 1, N'Liveshow Ca Nhạc "Music By The Sea"',
    N'Đêm nhạc acoustic lãng mạn đón hoàng hôn trên bãi biển Mỹ Khê.',
    N'Hòa mình vào không gian âm nhạc acoustic mộc mạc với tiếng sóng vỗ rì rào tại bãi biển đẹp nhất hành tinh. Đêm nhạc quy tụ nhiều ca sĩ trẻ được yêu thích và hoàn toàn miễn phí vé vào cửa.',
    N'Bãi tắm số 3, bãi biển Mỹ Khê', 16.074400, 108.244400,
    N'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-06-28 17:00:00', '2026-06-28 21:00:00',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    'approved', 0, 1, 0, GETDATE(), GETDATE()
),
(
    4, 4, 1, N'Lễ hội Ẩm thực Quốc tế Đà Nẵng 2026',
    N'Hội chợ giao lưu văn hóa ẩm thực Á - Âu tại Công viên APEC.',
    N'Khám phá hàng trăm gian hàng ẩm thực đặc sắc từ các nước trên thế giới và các món ăn truyền thống miền Trung. Nhiều màn trình diễn nấu ăn đỉnh cao từ các đầu bếp đạt sao Michelin.',
    N'Công viên APEC, Hải Châu', 16.061200, 108.223400,
    N'Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng', N'Hải Châu',
    '2026-06-14 09:00:00', '2026-06-18 22:00:00',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    'approved', 1, 1, 0, GETDATE(), GETDATE()
),
(
    5, 6, 1, N'Hội chợ Triển lãm Thương mại hè 2026',
    N'Sự kiện triển lãm thương mại, mua sắm lớn đã kết thúc vào tháng 5.',
    N'Hội chợ tụ hội hơn 300 doanh nghiệp với hàng ngàn sản phẩm khuyến mãi hè từ thời trang, gia dụng đến công nghệ. Sự kiện đã diễn ra và bế mạc tốt đẹp.',
    N'Trung tâm Hội chợ Triển lãm Đà Nẵng', 16.042200, 108.221200,
    N'Cách Mạng Tháng Tám, Khuê Trung, Cẩm Lệ, Đà Nẵng', N'Cẩm Lệ',
    '2026-05-10 08:00:00', '2026-05-15 22:00:00',
    'https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=1000',
    'https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=400',
    'approved', 0, 1, 0, GETDATE(), GETDATE()
),
(
    6, 7, 1, N'Ngày hội Trồng cây vì Biển Xanh Sơn Trà',
    N'Hoạt động cộng đồng phủ xanh bán đảo Sơn Trà đã hoàn thành đầu tháng 6.',
    N'Hơn 500 tình nguyện viên cùng chung tay dọn rác, làm sạch các bãi biển tự nhiên và trồng hơn 1000 cây xanh bản địa phủ xanh bán đảo Sơn Trà. Sự kiện ý nghĩa vì môi trường đã diễn ra thành công tốt đẹp.',
    N'Bán đảo Sơn Trà, Đà Nẵng', 16.101200, 108.256200,
    N'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-06-01 07:00:00', '2026-06-03 17:00:00',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1000',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400',
    'approved', 0, 1, 0, GETDATE(), GETDATE()
),
(
    7, 2, 1, N'Giải Bóng Đá Bãi Biển Vô Địch Đà Nẵng',
    N'Giải đấu thể thao kịch tính đang diễn ra trực tiếp ngày hôm nay.',
    N'Giải đấu quy tụ 12 đội bóng phủi bãi biển tranh tài sôi nổi trên bờ cát Mỹ Khê, đem lại bầu không khí thể thao nóng bỏng tinh thần mùa hè.',
    N'Bãi tắm Phạm Văn Đồng', 16.058800, 108.245500,
    N'Bãi tắm Phạm Văn Đồng, Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-06-15 08:00:00', '2026-06-15 18:00:00',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400',
    'approved', 0, 1, 0, GETDATE(), GETDATE()
),
(
    8, 7, 1, N'Hội thảo Phát triển Đô thị Thông minh Đà Nẵng',
    N'Hội thảo công nghệ đề xuất đô thị thông minh (Đang chờ Admin duyệt).',
    N'Các chuyên gia trong nước và quốc tế hội thảo chia sẻ giải pháp IoT và quy hoạch giao thông công cộng, chống úng lụt thông minh cho thành phố Đà Nẵng.',
    N'Trung tâm Hành chính Đà Nẵng', 16.067800, 108.220100,
    N'24 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng', N'Hải Châu',
    '2026-07-12 08:30:00', '2026-07-12 17:00:00',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    'pending', 0, 0, 200000, GETDATE(), GETDATE()
);

SET IDENTITY_INSERT Events OFF;

-- ========== VERIFY ==========
SELECT 'EventCategories' AS TableName, COUNT(*) AS TotalRows FROM EventCategories
UNION ALL
SELECT 'Events', COUNT(*) FROM Events;

PRINT N'✅ Seed Events Data thành công! (7 categories + 8 Events)';
