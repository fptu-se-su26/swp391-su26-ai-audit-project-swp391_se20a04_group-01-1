-- ============================================================================
-- DN-Pulse: Intelligent Urban Routing System Database Script
-- CONSOLIDATED DATABASE SCRIPT (SCHEMA + SEED DATA)
-- DBMS: Microsoft SQL Server (MSSQL)
-- File gộp duy nhất chứa đầy đủ Schema, Bảng bổ sung, Patch & Dữ liệu Seed mẫu
-- ============================================================================

-- ============================================================================
-- PHẦN 1: TẠO BẢNG VÀ RÀNG BUỘC (FULL SCHEMA)
-- ============================================================================

-- 1. Create EventCategories Table
CREATE TABLE EventCategories (
    category_id INT IDENTITY(1, 1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    icon NVARCHAR(50) NULL,
    color_code NVARCHAR(20) NULL,
    description NVARCHAR(255) NULL
);

-- 2. Create POIsCategories Table
CREATE TABLE POIsCategories (
    id INT IDENTITY(1, 1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    icon NVARCHAR(50) NULL,
    color_code NVARCHAR(20) NULL,
    description NVARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 3. Create Users Table
CREATE TABLE Users (
    user_id INT IDENTITY(1, 1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NULL, -- Nullable to allow Google OAuth login
    full_name NVARCHAR(100) NULL,
    avatar_url NVARCHAR(255) NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'user', -- e.g., 'user', 'admin'
    is_active BIT NOT NULL DEFAULT 1,
    is_email_verified BIT NOT NULL DEFAULT 0,
    is_2fa_enabled BIT NOT NULL DEFAULT 0,
    two_factor_secret NVARCHAR(255) NULL,
    otp NVARCHAR(6) NULL,
    otp_expires DATETIME NULL,
    ban_reason NVARCHAR(255) NULL,
    banned_at DATETIME NULL,
    banned_by INT NULL FOREIGN KEY REFERENCES Users (user_id),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    last_login_at DATETIME NULL
);

-- 4. Create UserSocialAccount Table
CREATE TABLE UserSocialAccount (
    social_id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    provider NVARCHAR(50) NOT NULL, -- e.g., 'google'
    provider_id NVARCHAR(100) NOT NULL,
    linked_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 5. Create UsersPreferences Table (1-to-1 relationship with Users)
CREATE TABLE UsersPreferences (
    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    avoid_floods BIT NOT NULL DEFAULT 0,
    avoid_congestion BIT NOT NULL DEFAULT 0,
    show_traffic_layer BIT NOT NULL DEFAULT 1,
    show_restricted_roads BIT NOT NULL DEFAULT 1,
    enable_buffer_alerts BIT NOT NULL DEFAULT 1,
    default_travel_mode NVARCHAR(20) NOT NULL DEFAULT 'driving', -- e.g., 'driving', 'walking', 'cycling'
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 6. Create VerificationCodes Table (Merged OTP and Password Reset functionality)
CREATE TABLE VerificationCodes (
    otp_id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE SET NULL,
    otp_code NVARCHAR(10) NOT NULL,
    otp_type NVARCHAR(50) NOT NULL, -- e.g., 'EMAIL_VERIFICATION', 'RESET_PASSWORD', '2FA'
    email NVARCHAR(100) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BIT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 7. Create RefreshTokens Table
CREATE TABLE RefreshTokens (
    token_id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    token NVARCHAR(500) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    is_revoked BIT DEFAULT 0
);

-- 8. Create POIs Table
CREATE TABLE POIs (
    poi_id INT IDENTITY(1, 1) PRIMARY KEY,
    created_by INT NOT NULL FOREIGN KEY REFERENCES Users (user_id),
    category_id INT NULL FOREIGN KEY REFERENCES POIsCategories (id) ON DELETE SET NULL,
    name NVARCHAR(150) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    address NVARCHAR(255) NULL,
    description NVARCHAR(MAX) NULL,
    image_url NVARCHAR(255) NULL,
    website_url NVARCHAR(255) NULL,
    phone_number NVARCHAR(20) NULL,
    rating DECIMAL(2, 1) NULL,
    is_featured BIT NOT NULL DEFAULT 0,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'approved', 'rejected'
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 9. Create UserFavoritePOIs Table (Junction Table for POIs Favoriting)
CREATE TABLE UserFavoritePOIs (
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    poi_id INT NOT NULL FOREIGN KEY REFERENCES POIs (poi_id) ON DELETE CASCADE,
    saved_at DATETIME NOT NULL DEFAULT GETDATE(),
    PRIMARY KEY (user_id, poi_id)
);

-- 10. Create FloodZones Table
CREATE TABLE FloodZones (
    zone_id INT IDENTITY(1, 1) PRIMARY KEY,
    zone_name NVARCHAR(100) NOT NULL,
    district NVARCHAR(50) NULL,
    risk_level NVARCHAR(20) NOT NULL, -- e.g., 'LOW', 'MEDIUM', 'HIGH'
    polygon_coordinates NVARCHAR(MAX) NOT NULL, -- Stores GeoJSON boundary polygon coordinates
    description NVARCHAR(MAX) NULL,
    typical_flood_months NVARCHAR(50) NULL,
    depth_cm INT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    last_updated DATETIME NOT NULL DEFAULT GETDATE(),
    updated_by INT NOT NULL FOREIGN KEY REFERENCES Users (user_id)
);

-- 11. Create Events Table
CREATE TABLE Events (
    event_id INT IDENTITY(1, 1) PRIMARY KEY,
    category_id INT NOT NULL FOREIGN KEY REFERENCES EventCategories (category_id),
    created_by INT NOT NULL FOREIGN KEY REFERENCES Users (user_id),
    title NVARCHAR(200) NOT NULL,
    short_description NVARCHAR(500) NULL,
    description NVARCHAR(MAX) NULL,
    location_name NVARCHAR(255) NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    address NVARCHAR(255) NULL,
    district NVARCHAR(50) NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    banner_url NVARCHAR(255) NULL,
    thumbnail_url NVARCHAR(255) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'approved', 'cancelled'
    expected_attendance INT NULL,
    website_url NVARCHAR(255) NULL,
    organizer_name NVARCHAR(100) NULL,
    contact_phone NVARCHAR(20) NULL,
    is_featured BIT NOT NULL DEFAULT 0,
    is_free BIT NOT NULL DEFAULT 1,
    ticket_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    favorite_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 12. Create EventImages Table (For multiple event images gallery)
CREATE TABLE EventImages (
    image_id INT IDENTITY(1, 1) PRIMARY KEY,
    event_id INT NOT NULL FOREIGN KEY REFERENCES Events (event_id) ON DELETE CASCADE,
    image_url NVARCHAR(255) NOT NULL,
    caption NVARCHAR(255) NULL,
    display_order INT NOT NULL DEFAULT 0,
    uploaded_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 13. Create UserFavoriteEvents Table (Junction Table for Events Favoriting)
CREATE TABLE UserFavoriteEvents (
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id),
    event_id INT NOT NULL FOREIGN KEY REFERENCES Events (event_id),
    saved_at DATETIME NOT NULL DEFAULT GETDATE(),
    PRIMARY KEY (user_id, event_id)
);

-- 14. Create EventRoad Table (Roads blocked/affected by Events)
CREATE TABLE EventRoad (
    road_id INT IDENTITY(1, 1) PRIMARY KEY,
    event_id INT NOT NULL FOREIGN KEY REFERENCES Events (event_id) ON DELETE CASCADE,
    road_name NVARCHAR(150) NOT NULL,
    restriction_type NVARCHAR(50) NOT NULL, -- e.g., 'CLOSED', 'ONE_WAY', 'SPEED_LIMIT'
    restriction_start DATETIME NOT NULL,
    restriction_end DATETIME NOT NULL,
    polyline_encoded NVARCHAR(MAX) NULL, -- Polyline representation
    geojson_coords NVARCHAR(MAX) NULL, -- GeoJSON representation
    description NVARCHAR(MAX) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    bypass_coords NVARCHAR(MAX) NULL,
    days_of_week NVARCHAR(50) NULL,
    start_time_of_day TIME NULL,
    end_time_of_day TIME NULL
);

-- 15. Create TrafficAlerts Table
CREATE TABLE TrafficAlerts (
    alert_id INT IDENTITY(1, 1) PRIMARY KEY,
    created_by INT NOT NULL FOREIGN KEY REFERENCES Users (user_id),
    event_id INT NULL FOREIGN KEY REFERENCES Events (event_id) ON DELETE SET NULL, -- Event that causes this alert
    alert_type NVARCHAR(50) NOT NULL, -- e.g., 'CONGESTION', 'ACCIDENT', 'CONSTRUCTION'
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    location_name NVARCHAR(255) NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    severity NVARCHAR(20) NOT NULL, -- e.g., 'LOW', 'MEDIUM', 'HIGH'
    affected_area_polygon NVARCHAR(MAX) NULL, -- GeoJSON area affected
    start_time DATETIME NOT NULL DEFAULT GETDATE(),
    end_time DATETIME NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 16. Create Notifications Table
CREATE TABLE Notifications (
    notification_id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    event_id INT NULL FOREIGN KEY REFERENCES Events (event_id),
    alert_id INT NULL FOREIGN KEY REFERENCES TrafficAlerts (alert_id),
    zone_id INT NULL FOREIGN KEY REFERENCES FloodZones (zone_id), -- Linked to flood warning
    title NVARCHAR(200) NULL,
    message NVARCHAR(MAX) NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    type NVARCHAR(30) NOT NULL DEFAULT 'system',
    CONSTRAINT CHK_Notifications_Type CHECK (type IN ('event_reminder', 'traffic_alert', 'event_update', 'system'))
);

-- 17. Create LiveLocationShares Table
CREATE TABLE LiveLocationShares (
    share_id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    share_token NVARCHAR(100) NOT NULL UNIQUE,
    current_lat DECIMAL(9, 6) NULL,
    current_lng DECIMAL(9, 6) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- 18. Create SavedRoutes Table
CREATE TABLE SavedRoutes (
    route_id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    origin_name NVARCHAR(255) NULL,
    origin_lat DECIMAL(9, 6) NOT NULL,
    origin_lng DECIMAL(9, 6) NOT NULL,
    destination_name NVARCHAR(255) NULL,
    destination_lat DECIMAL(9, 6) NOT NULL,
    destination_lng DECIMAL(9, 6) NOT NULL,
    route_name NVARCHAR(150) NULL,
    route_data NVARCHAR(MAX) NOT NULL, -- Stores Mapbox encoded polyline or GeoJSON path geometry
    distance_meters INT NOT NULL,
    duration_seconds INT NOT NULL,
    profile NVARCHAR(20) NOT NULL, -- e.g., 'driving', 'walking', 'cycling'
    route_type NVARCHAR(50) NULL,
    share_token NVARCHAR(100) NULL,
    is_shared BIT NOT NULL DEFAULT 0,
    is_emergency BIT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================================
-- PHẦN 2: SEED DATA MẪU (ADMIN USER, CATEGORIES, POIS, EVENTS & EVENT ROADS)
-- ============================================================================

-- 2.1 Default Admin User (user_id = 1)
SET IDENTITY_INSERT Users ON;
IF NOT EXISTS (SELECT * FROM Users WHERE user_id = 1)
BEGIN
    INSERT INTO Users (user_id, username, email, password_hash, full_name, role, is_active, is_email_verified)
    VALUES (1, N'admin', N'admin@dnpulse.vn', N'$2b$10$pL3hW/8zTjYy4fR6R9GZ0u.8Gk.sP2d4E5F6G7H8I9J0K1L2M3N4O', N'System Administrator', N'admin', 1, 1);
END;
SET IDENTITY_INSERT Users OFF;
GO

-- 2.2 Seed POIsCategories
SET IDENTITY_INSERT POIsCategories ON;
INSERT INTO POIsCategories (id, name, icon, color_code, description) VALUES
(1, N'Điểm tham quan', 'compass', '#10B981', N'Các danh lam thắng cảnh, địa điểm du lịch nổi bật'),
(2, N'Nhà hàng', 'utensils', '#F59E0B', N'Nhà hàng, quán ăn, ẩm thực đặc sản'),
(3, N'Khách sạn', 'hotel', '#8B5CF6', N'Khách sạn, resort, nhà nghỉ lưu trú'),
(4, N'Giải trí', 'gamepad-2', '#EC4899', N'Khu vui chơi, giải trí, công viên'),
(5, N'Bảo tàng', 'landmark', '#6366F1', N'Bảo tàng, di tích lịch sử, văn hóa'),
(6, N'ATM', 'dollar-sign', '#14B8A6', N'Cây ATM, ngân hàng, điểm rút tiền'),
(7, N'Trạm xăng', 'fuel', '#F59E0B', N'Trạm xăng dầu'),
(8, N'Quán cà phê', 'coffee', '#8B4513', N'Cà phê & Đồ uống'),
(9, N'Bệnh viện', 'hospital', '#EF4444', N'Cơ sở y tế'),
(10, N'Khu mua sắm', 'shopping-bag', '#F59E0B', N'Trung tâm thương mại, siêu thị, khu mua sắm');
SET IDENTITY_INSERT POIsCategories OFF;
GO

-- 2.3 Seed EventCategories
SET IDENTITY_INSERT EventCategories ON;
INSERT INTO EventCategories (category_id, name, icon, color_code, description) VALUES
(1, N'Lễ hội & Văn hóa', N'🎆', '#FF6B35', N'Các lễ hội, hoạt động văn hóa tại Đà Nẵng'),
(2, N'Thể thao', N'🏃', '#2ECC71', N'Các sự kiện thể thao, marathon, giải đấu'),
(3, N'Âm nhạc', N'🎵', '#9B59B6', N'Liveshow, concert, chương trình âm nhạc'),
(4, N'Ẩm thực', N'🍜', '#F1C40F', N'Hội chợ ẩm thực, lễ hội món ngon'),
(5, N'Triển lãm', N'🎨', '#3498DB', N'Triển lãm nghệ thuật, hội chợ thương mại'),
(6, N'Khác', N'📌', '#95A5A6', N'Các sự kiện cộng đồng khác');
SET IDENTITY_INSERT EventCategories OFF;
GO

-- 2.4 Seed Events
SET IDENTITY_INSERT Events ON;
INSERT INTO Events (
    event_id, category_id, created_by, title, short_description, description,
    location_name, latitude, longitude, address, district, start_time, end_time,
    banner_url, thumbnail_url, status, is_featured, is_free, ticket_price, created_at, updated_at
) VALUES 
(
    1, 1, 1,
    N'Lễ hội Pháo hoa Quốc tế DIFF 2026',
    N'DIFF 2026 quy tụ 8 đội thi pháo hoa quốc tế hàng đầu bên bờ sông Hàn.',
    N'Lễ hội Pháo hoa Quốc tế Đà Nẵng - DIFF 2026 là sự kiện văn hóa du lịch quy mô lớn.',
    N'Khán đài Sông Hàn, đường Trần Hưng Đạo', 16.078945, 108.228998, N'Đường Trần Hưng Đạo, Quận Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-05-30 19:00:00', '2026-07-11 23:00:00',
    'https://th.bing.com/th/id/OIP.LNfywjnnvAbMycU4woqtoQHaFN?w=244&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    'https://th.bing.com/th/id/OIP.KMNBO26TnBTj-yWsKl-z3QHaFJ?w=248&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    'approved', 1, 0, 800000, GETDATE(), GETDATE()
),
(
    2, 2, 1,
    N'Danang International Marathon 2026',
    N'Giải chạy marathon quốc tế lớn nhất miền Trung tại công viên Biển Đông.',
    N'Giải chạy được chứng nhận bởi AIMS. Cung đường dọc bờ biển và qua các cây cầu nổi tiếng.',
    N'Công viên Biển Đông, Sơn Trà', 16.068396, 108.246032, N'Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-08-23 04:00:00', '2026-08-23 11:30:00',
    'https://th.bing.com/th/id/OIP.TtOSiwxPtRYX97P_Mv5kcQHaFi?w=209&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    'https://th.bing.com/th/id/OIP.SJ7z8O6EkB-VeCXPB0hH7gHaEK?w=320&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    'approved', 1, 0, 350000, GETDATE(), GETDATE()
),
(
    3, 3, 1,
    N'Liveshow Ca Nhạc "Music By The Sea"',
    N'Đêm nhạc acoustic lãng mạn đón hoàng hôn trên bãi biển Mỹ Khê.',
    N'Hòa mình vào không gian âm nhạc acoustic mộc mạc với tiếng sóng vỗ rì rào tại bãi biển Mỹ Khê.',
    N'Bãi tắm số 3, bãi biển Mỹ Khê', 16.070385, 108.245812, N'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng', N'Sơn Trà',
    '2026-06-28 17:00:00', '2026-06-28 21:00:00',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    'approved', 0, 1, 0, GETDATE(), GETDATE()
),
(
    4, 4, 1,
    N'Lễ hội Ẩm thực Quốc tế Đà Nẵng 2026',
    N'Hội chợ giao lưu văn hóa ẩm thực Á - Âu tại Công viên APEC.',
    N'Khám phá hàng trăm gian hàng ẩm thực đặc sắc từ các nước trên thế giới và các món ăn truyền thống miền Trung.',
    N'Công viên APEC, Hải Châu', 16.058174, 108.223260, N'Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng', N'Hải Châu',
    '2026-06-14 09:00:00', '2026-06-18 22:00:00',
    'https://th.bing.com/th/id/OIP.Xw4I7NuR7Zi7DH858W2tVQHaE8?w=266&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    'https://th.bing.com/th/id/OIP.xz2_j7fGTwMC4QItDxOnOAHaE7?w=235&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',
    'approved', 1, 1, 0, GETDATE(), GETDATE()
);
SET IDENTITY_INSERT Events OFF;
GO

-- 2.5 Seed EventRoad
INSERT INTO EventRoad (
    event_id, road_name, restriction_type, restriction_start, restriction_end,
    polyline_encoded, geojson_coords, description, created_at, bypass_coords, days_of_week, start_time_of_day, end_time_of_day
) VALUES 
(
    1, N'Đường Trần Hưng Đạo (đoạn từ Cầu Rồng đến Cầu Sông Hàn)', 'CLOSED',
    '2026-05-30 00:00:00', '2026-07-11 23:59:59', NULL,
    '[[108.228028,16.07231],[108.229424,16.072493],[108.230904,16.071463],[108.232033,16.068644],[108.233009,16.065763]]',
    N'Cấm toàn bộ phương tiện lưu thông phục vụ khán đài DIFF.', GETDATE(),
    '[[108.2325, 16.0682]]', '1,6', '18:00:00', '23:00:00'
);
GO

-- ============================================================================
-- VERIFY CREATED TABLES & SEED COUNTS
-- ============================================================================
SELECT 'EventCategories' AS TableName, COUNT(*) AS TotalRows FROM EventCategories
UNION ALL SELECT 'POIsCategories', COUNT(*) FROM POIsCategories
UNION ALL SELECT 'Users', COUNT(*) FROM Users
UNION ALL SELECT 'Events', COUNT(*) FROM Events
UNION ALL SELECT 'EventRoad', COUNT(*) FROM EventRoad;

PRINT N'✅ Đã khởi tạo hoàn tất toàn bộ Database DN-Pulse Schema & Seed Data!';
