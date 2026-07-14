-- ============================================
-- SEED DATA: EventCategories + Events (Đà Nẵng)
-- Chạy file này sau khi đã tạo bảng từ schema.sql hoặc Database_DN_Pulse.sql
-- ============================================

-- ========== 1. SEED EventCategories ==========
SET IDENTITY_INSERT EventCategories ON;

INSERT INTO
    EventCategories (
        category_id,
        name,
        icon,
        color_code,
        description
    )
VALUES (
        1,
        N'Lễ hội & Văn hóa',
        N'🎆',
        '#FF6B35',
        N'Các lễ hội, hoạt động văn hóa tại Đà Nẵng'
    ),
    (
        2,
        N'Thể thao',
        N'🏃',
        '#2ECC71',
        N'Các sự kiện thể thao, marathon, giải đấu'
    ),
    (
        3,
        N'Âm nhạc',
        N'🎵',
        '#9B59B6',
        N'Liveshow, concert, chương trình âm nhạc'
    ),
    (
        4,
        N'Ẩm thực',
        N'🍜',
        '#E67E22',
        N'Lễ hội ẩm thực, hội chợ ăn uống'
    ),
    (
        5,
        N'Du lịch',
        N'🏖️',
        '#0066CC',
        N'Hoạt động du lịch, tham quan'
    ),
    (
        6,
        N'Hội chợ',
        N'🛍️',
        '#1ABC9C',
        N'Hội chợ thương mại, triển lãm'
    ),
    (
        7,
        N'Cộng đồng',
        N'🤝',
        '#95A5A6',
        N'Hoạt động cộng đồng'
    );

SET IDENTITY_INSERT EventCategories OFF;

-- ========== 2. SEED Events ==========
SET IDENTITY_INSERT Events ON;

INSERT INTO
    Events (
        event_id,
        category_id,
        created_by,
        title,
        short_description,
        description,
        location_name,
        latitude,
        longitude,
        address,
        district,
        start_time,
        end_time,
        banner_url,
        thumbnail_url,
        status,
        is_featured,
        is_free,
        ticket_price,
        created_at,
        updated_at
    )
VALUES (
        1,
        1,
        1,
        N'Lễ hội Pháo hoa Quốc tế DIFF 2026',
        N'DIFF 2026 quy tụ 8 đội thi pháo hoa quốc tế hàng đầu bên bờ sông Hàn.',
        N'Lễ hội Pháo hoa Quốc tế Đà Nẵng - DIFF 2026 là sự kiện văn hóa du lịch quy mô lớn, thu hút hàng triệu du khách đến với Đà Nẵng. Lễ hội năm nay có chủ đề "Gắn kết toàn cầu - Rạng rỡ năm châu" với sự tham gia của các đội thi hàng đầu thế giới.',
        N'Khán đài Sông Hàn, đường Trần Hưng Đạo',
        16.078945077214193,
        108.22899881423052,
        N'Đường Trần Hưng Đạo, Quận Sơn Trà, Đà Nẵng',
        N'Sơn Trà',
        '2026-05-30',
        '2026-07-11',
        'https://th.bing.com/th/id/OIP.LNfywjnnvAbMycU4woqtoQHaFN?w=244&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'https://th.bing.com/th/id/OIP.KMNBO26TnBTj-yWsKl-z3QHaFJ?w=248&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'approved',
        1,
        0,
        800000,
        GETDATE(),
        GETDATE()
    ),
    (
        2,
        2,
        1,
        N'Danang International Marathon 2026',
        N'Giải chạy marathon quốc tế lớn nhất miền Trung tại công viên Biển Đông.',
        N'Manulife Danang International Marathon là giải chạy quốc tế được chứng nhận chính thức bởi AIMS (Hiệp hội Marathon Quốc tế). Cung đường chạy tuyệt đẹp đón bình minh dọc bờ biển Đà Nẵng và đi qua những cây cầu nổi tiếng.',
        N'Công viên Biển Đông, Sơn Trà',
        16.068396141921475,
        108.24603200791027,
        N'Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng',
        N'Sơn Trà',
        '2026-08-23 04:00:00',
        '2026-08-23 11:30:00',
        'https://th.bing.com/th/id/OIP.TtOSiwxPtRYX97P_Mv5kcQHaFi?w=209&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'https://th.bing.com/th/id/OIP.SJ7z8O6EkB-VeCXPB0hH7gHaEK?w=320&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'approved',
        1,
        0,
        350000,
        GETDATE(),
        GETDATE()
    ),
    (
        3,
        3,
        1,
        N'Liveshow Ca Nhạc "Music By The Sea"',
        N'Đêm nhạc acoustic lãng mạn đón hoàng hôn trên bãi biển Mỹ Khê.',
        N'Hòa mình vào không gian âm nhạc acoustic mộc mạc với tiếng sóng vỗ rì rào tại bãi biển đẹp nhất hành tinh. Đêm nhạc quy tụ nhiều ca sĩ trẻ được yêu thích và hoàn toàn miễn phí vé vào cửa.',
        N'Bãi tắm số 3, bãi biển Mỹ Khê',
        16.07038590050859,
        108.2458120667751,
        N'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
        N'Sơn Trà',
        '2026-06-28 17:00:00',
        '2026-06-28 21:00:00',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
        'approved',
        0,
        1,
        0,
        GETDATE(),
        GETDATE()
    ),
    (
        4,
        4,
        1,
        N'Lễ hội Ẩm thực Quốc tế Đà Nẵng 2026',
        N'Hội chợ giao lưu văn hóa ẩm thực Á - Âu tại Công viên APEC.',
        N'Khám phá hàng trăm gian hàng ẩm thực đặc sắc từ các nước trên thế giới và các món ăn truyền thống miền Trung. Nhiều màn trình diễn nấu ăn đỉnh cao từ các đầu bếp đạt sao Michelin.',
        N'Công viên APEC, Hải Châu',
        16.058174338973746,
        108.22326070440147,
        N'Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng',
        N'Hải Châu',
        '2026-06-14 09:00:00',
        '2026-06-18 22:00:00',
        'https://th.bing.com/th/id/OIP.Xw4I7NuR7Zi7DH858W2tVQHaE8?w=266&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'https://th.bing.com/th/id/OIP.xz2_j7fGTwMC4QItDxOnOAHaE7?w=235&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'approved',
        1,
        1,
        0,
        GETDATE(),
        GETDATE()
    ),
    (
        5,
        6,
        1,
        N'Hội chợ Triển lãm Thương mại hè 2026',
        N'Sự kiện triển lãm thương mại, mua sắm lớn đã kết thúc vào tháng 5.',
        N'Hội chợ tụ hội hơn 300 doanh nghiệp với hàng ngàn sản phẩm khuyến mãi hè từ thời trang, gia dụng đến công nghệ. Sự kiện đã diễn ra và bế mạc tốt đẹp.',
        N'Trung tâm Hội chợ Triển lãm Đà Nẵng',
        16.02337449296019,
        108.21650493688195,
        N'Cách Mạng Tháng Tám, Khuê Trung, Cẩm Lệ, Đà Nẵng',
        N'Cẩm Lệ',
        '2026-05-10 08:00:00',
        '2026-05-15 22:00:00',
        'https://lh3.googleusercontent.com/p/AF1QipPBNeF3r6jSRBofWovHTa2VPJ2fcfFS91n6CyqI=s680-w680-h510',
        'https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=400',
        'approved',
        0,
        1,
        0,
        GETDATE(),
        GETDATE()
    ),
    (
        6,
        2,
        1,
        N'Giải Bóng Đá Bãi Biển Vô Địch Đà Nẵng',
        N'Giải đấu thể thao kịch tính đang diễn ra trực tiếp ngày hôm nay.',
        N'Giải đấu quy tụ 12 đội bóng phủi bãi biển tranh tài sôi nổi trên bờ cát Mỹ Khê, đem lại bầu không khí thể thao nóng bỏng tinh thần mùa hè.',
        N'Bãi tắm Phạm Văn Đồng',
        16.07349863673413,
        108.24678330487725,
        N'Bãi tắm Phạm Văn Đồng, Sơn Trà, Đà Nẵng',
        N'Sơn Trà',
        '2026-06-15 08:00:00',
        '2026-06-15 18:00:00',
        'https://th.bing.com/th/id/OIP.Ql-C1tPEAclZ904B4_7D7AHaE8?w=298&h=199&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'https://th.bing.com/th/id/OIP.oVTXJDzv4iOWXvsqvG4WIwHaE8?w=299&h=199&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
        'approved',
        0,
        1,
        0,
        GETDATE(),
        GETDATE()
    ),
SET
IDENTITY_INSERT Events OFF;

-- ========== VERIFY ==========
SELECT 'EventCategories' AS TableName, COUNT(*) AS TotalRows
FROM EventCategories
UNION ALL
SELECT 'Events', COUNT(*)
FROM Events;

PRINT N'✅ Seed Events Data thành công! (7 categories + 8 Events)';