/* =========================================================
   DN-PULSE DATABASE DESIGN
   SQL Server
   11 bảng chính
   ========================================================= */


CREATE DATABASE DNPulse;
GO
USE DNPulse;
GO


/* =========================================================
   1. BẢNG USERS - Người dùng
   ========================================================= */
CREATE TABLE Users (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(50)  NOT NULL UNIQUE,
    email         NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name     NVARCHAR(100),
    avatar_url    NVARCHAR(500),

    role          NVARCHAR(20) NOT NULL DEFAULT 'user'
                  CONSTRAINT CHK_Users_Role 
                  CHECK (role IN ('user', 'admin')),

    is_active     BIT NOT NULL DEFAULT 1,
    created_at    DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_login_at DATETIME2
);
GO

CREATE INDEX IX_Users_Email ON Users(email);
GO

CREATE INDEX IX_Users_Role ON Users(role);
GO


/* =========================================================
   2. BẢNG EVENTCATEGORIES - Danh mục sự kiện
   ========================================================= */
CREATE TABLE EventCategories (
    category_id  INT IDENTITY(1,1) PRIMARY KEY,
    name         NVARCHAR(100) NOT NULL UNIQUE,
    icon         NVARCHAR(50)  NOT NULL DEFAULT N'🎪',
    color_code   NVARCHAR(7)   NOT NULL DEFAULT '#0066CC',
    description  NVARCHAR(500)
);
GO


/* =========================================================
   3. BẢNG EVENTS - Sự kiện
   ========================================================= */
CREATE TABLE Events (
    event_id            INT IDENTITY(1,1) PRIMARY KEY,

    category_id         INT NOT NULL
                        CONSTRAINT FK_Events_Category
                        FOREIGN KEY REFERENCES EventCategories(category_id),

    created_by          INT NOT NULL
                        CONSTRAINT FK_Events_CreatedBy
                        FOREIGN KEY REFERENCES Users(user_id),

    title               NVARCHAR(200) NOT NULL,
    short_description   NVARCHAR(500),
    description         NVARCHAR(MAX),

    location_name       NVARCHAR(200) NOT NULL,
    latitude            DECIMAL(10,8) NOT NULL,
    longitude           DECIMAL(11,8) NOT NULL,
    address             NVARCHAR(300),
    district            NVARCHAR(100),

    start_time          DATETIME2 NOT NULL,
    end_time            DATETIME2 NOT NULL,

    banner_url          NVARCHAR(500),
    thumbnail_url       NVARCHAR(500),

    status              NVARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT CHK_Events_Status
                        CHECK (status IN ('pending', 'approved', 'cancelled')),

    expected_attendance INT,
    website_url         NVARCHAR(300),
    organizer_name      NVARCHAR(200),
    contact_phone       NVARCHAR(20),

    is_featured         BIT NOT NULL DEFAULT 0,
    is_free             BIT NOT NULL DEFAULT 1,
    ticket_price        DECIMAL(12,2),

    view_count          INT NOT NULL DEFAULT 0,
    favorite_count      INT NOT NULL DEFAULT 0,

    created_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CHK_Events_Time 
    CHECK (end_time > start_time),

    CONSTRAINT CHK_Events_TicketPrice 
    CHECK (
        (is_free = 1 AND (ticket_price IS NULL OR ticket_price = 0))
        OR
        (is_free = 0 AND ticket_price >= 0)
    ),

    CONSTRAINT CHK_Events_Attendance
    CHECK (expected_attendance IS NULL OR expected_attendance >= 0),

    CONSTRAINT CHK_Events_ViewCount
    CHECK (view_count >= 0),

    CONSTRAINT CHK_Events_FavoriteCount
    CHECK (favorite_count >= 0)
);
GO

CREATE INDEX IX_Events_Status ON Events(status);
GO

CREATE INDEX IX_Events_StartTime ON Events(start_time);
GO

CREATE INDEX IX_Events_Category ON Events(category_id);
GO

CREATE INDEX IX_Events_Featured ON Events(is_featured);
GO

CREATE INDEX IX_Events_Location ON Events(latitude, longitude);
GO


/* =========================================================
   4. BẢNG EVENTIMAGES - Ảnh sự kiện
   ========================================================= */
CREATE TABLE EventImages (
    image_id      INT IDENTITY(1,1) PRIMARY KEY,

    event_id      INT NOT NULL
                  CONSTRAINT FK_EventImages_Event
                  FOREIGN KEY REFERENCES Events(event_id) ON DELETE CASCADE,

    image_url     NVARCHAR(500) NOT NULL,
    caption       NVARCHAR(200),
    display_order INT NOT NULL DEFAULT 0,
    uploaded_at   DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_EventImages_EventId ON EventImages(event_id);
GO


/* =========================================================
   5. BẢNG EVENTROADS - Tuyến đường bị ảnh hưởng
   ========================================================= */
CREATE TABLE EventRoads (
    road_id            INT IDENTITY(1,1) PRIMARY KEY,

    event_id           INT NOT NULL
                       CONSTRAINT FK_EventRoads_Event
                       FOREIGN KEY REFERENCES Events(event_id) ON DELETE CASCADE,

    road_name          NVARCHAR(200) NOT NULL,

    restriction_type   NVARCHAR(30) NOT NULL
                       CONSTRAINT CHK_EventRoads_Restriction
                       CHECK (restriction_type IN ('closed', 'limited', 'one_way', 'no_parking')),

    restriction_start  DATETIME2 NOT NULL,
    restriction_end    DATETIME2 NOT NULL,

    polyline_encoded   NVARCHAR(MAX),
    geojson_coords     NVARCHAR(MAX),
    description        NVARCHAR(500),

    created_at         DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CHK_EventRoads_Time 
    CHECK (restriction_end > restriction_start)
);
GO

CREATE INDEX IX_EventRoads_EventId ON EventRoads(event_id);
GO

CREATE INDEX IX_EventRoads_Time ON EventRoads(restriction_start, restriction_end);
GO


/* =========================================================
   6. BẢNG TRAFFICALERTS - Cảnh báo giao thông
   ========================================================= */
CREATE TABLE TrafficAlerts (
    alert_id              INT IDENTITY(1,1) PRIMARY KEY,

    created_by            INT NOT NULL
                          CONSTRAINT FK_TrafficAlerts_CreatedBy
                          FOREIGN KEY REFERENCES Users(user_id),

    event_id              INT
                          CONSTRAINT FK_TrafficAlerts_Event
                          FOREIGN KEY REFERENCES Events(event_id) ON DELETE SET NULL,

    alert_type            NVARCHAR(30) NOT NULL
                          CONSTRAINT CHK_Alerts_Type
                          CHECK (alert_type IN (
                              'flood',
                              'congestion',
                              'accident',
                              'event_closure',
                              'construction',
                              'weather'
                          )),

    title                 NVARCHAR(200) NOT NULL,
    description           NVARCHAR(1000),
    location_name         NVARCHAR(200),

    latitude              DECIMAL(10,8),
    longitude             DECIMAL(11,8),

    severity              NVARCHAR(20) NOT NULL DEFAULT 'medium'
                          CONSTRAINT CHK_Alerts_Severity
                          CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    affected_area_polygon NVARCHAR(MAX),

    start_time            DATETIME2 NOT NULL DEFAULT GETDATE(),
    end_time              DATETIME2,

    is_active             BIT NOT NULL DEFAULT 1,
    created_at            DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at            DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CHK_TrafficAlerts_Time 
    CHECK (end_time IS NULL OR end_time > start_time)
);
GO

CREATE INDEX IX_TrafficAlerts_IsActive ON TrafficAlerts(is_active);
GO

CREATE INDEX IX_TrafficAlerts_Type ON TrafficAlerts(alert_type);
GO

CREATE INDEX IX_TrafficAlerts_Severity ON TrafficAlerts(severity);
GO

CREATE INDEX IX_TrafficAlerts_Location ON TrafficAlerts(latitude, longitude);
GO


/* =========================================================
   7. BẢNG FLOODZONES - Vùng ngập lụt cố định
   ========================================================= */
CREATE TABLE FloodZones (
    zone_id               INT IDENTITY(1,1) PRIMARY KEY,

    zone_name             NVARCHAR(200) NOT NULL,
    district              NVARCHAR(100) NOT NULL,

    risk_level            NVARCHAR(20) NOT NULL
                          CONSTRAINT CHK_FloodZones_Risk
                          CHECK (risk_level IN ('low', 'medium', 'high')),

    polygon_coordinates   NVARCHAR(MAX) NOT NULL,
    description           NVARCHAR(500),
    typical_flood_months  NVARCHAR(100),

    is_active             BIT NOT NULL DEFAULT 1,
    last_updated          DATETIME2 NOT NULL DEFAULT GETDATE(),

    updated_by            INT
                          CONSTRAINT FK_FloodZones_UpdatedBy
                          FOREIGN KEY REFERENCES Users(user_id)
);
GO


/* =========================================================
   8. BẢNG POIS - Điểm nổi bật ở Đà Nẵng
   ========================================================= */
CREATE TABLE POIs (
    poi_id       INT IDENTITY(1,1) PRIMARY KEY,

    created_by   INT
                 CONSTRAINT FK_POIs_CreatedBy
                 FOREIGN KEY REFERENCES Users(user_id),

    name         NVARCHAR(200) NOT NULL,

    category     NVARCHAR(50) NOT NULL
                 CONSTRAINT CHK_POIs_Category
                 CHECK (category IN (
                     'tourist_attraction',
                     'restaurant',
                     'hotel',
                     'hospital',
                     'gas_station',
                     'parking',
                     'shopping',
                     'beach'
                 )),

    latitude     DECIMAL(10,8) NOT NULL,
    longitude    DECIMAL(11,8) NOT NULL,

    address      NVARCHAR(300),
    description  NVARCHAR(1000),
    image_url    NVARCHAR(500),
    website_url  NVARCHAR(300),
    phone_number NVARCHAR(20),

    rating       DECIMAL(3,1)
                 CONSTRAINT CHK_POIs_Rating 
                 CHECK (rating BETWEEN 0 AND 5),

    is_featured  BIT NOT NULL DEFAULT 0,
    is_active    BIT NOT NULL DEFAULT 1,

    created_at   DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_POIs_Category ON POIs(category);
GO

CREATE INDEX IX_POIs_Location ON POIs(latitude, longitude);
GO

CREATE INDEX IX_POIs_Featured ON POIs(is_featured);
GO


/* =========================================================
   9. BẢNG SAVEDROUTES - Tuyến đường đã lưu
   ========================================================= */
CREATE TABLE SavedRoutes (
    route_id          INT IDENTITY(1,1) PRIMARY KEY,

    user_id           INT NOT NULL
                      CONSTRAINT FK_SavedRoutes_User
                      FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,

    origin_name       NVARCHAR(300) NOT NULL,
    origin_lat        DECIMAL(10,8) NOT NULL,
    origin_lng        DECIMAL(11,8) NOT NULL,

    destination_name  NVARCHAR(300) NOT NULL,
    destination_lat   DECIMAL(10,8) NOT NULL,
    destination_lng   DECIMAL(11,8) NOT NULL,

    route_name        NVARCHAR(200),
    route_data        NVARCHAR(MAX),

    distance_meters   INT,
    duration_seconds  INT,

    profile           NVARCHAR(20) NOT NULL DEFAULT 'driving'
                      CONSTRAINT CHK_SavedRoutes_Profile
                      CHECK (profile IN ('driving', 'walking', 'cycling')),

    created_at        DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CHK_SavedRoutes_Distance
    CHECK (distance_meters IS NULL OR distance_meters >= 0),

    CONSTRAINT CHK_SavedRoutes_Duration
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);
GO

CREATE INDEX IX_SavedRoutes_UserId ON SavedRoutes(user_id);
GO


/* =========================================================
   10. BẢNG USERFAVORITEEVENTS - Sự kiện yêu thích
   ========================================================= */
CREATE TABLE UserFavoriteEvents (
    user_id  INT NOT NULL
             CONSTRAINT FK_FavEvents_User
             FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,

    event_id INT NOT NULL
             CONSTRAINT FK_FavEvents_Event
             FOREIGN KEY REFERENCES Events(event_id) ON DELETE CASCADE,

    saved_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_UserFavoriteEvents PRIMARY KEY (user_id, event_id)
);
GO

CREATE INDEX IX_UserFavoriteEvents_EventId ON UserFavoriteEvents(event_id);
GO


/* =========================================================
   11. BẢNG NOTIFICATIONS - Thông báo
   ========================================================= */
CREATE TABLE Notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,

    user_id         INT
                    CONSTRAINT FK_Notifications_User
                    FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,

    event_id        INT
                    CONSTRAINT FK_Notifications_Event
                    FOREIGN KEY REFERENCES Events(event_id),

    alert_id        INT
                    CONSTRAINT FK_Notifications_Alert
                    FOREIGN KEY REFERENCES TrafficAlerts(alert_id),

    type            NVARCHAR(30) NOT NULL
                    CONSTRAINT CHK_Notifications_Type
                    CHECK (type IN (
                        'event_reminder',
                        'traffic_alert',
                        'event_update',
                        'system'
                    )),

    title           NVARCHAR(200) NOT NULL,
    message         NVARCHAR(1000),

    is_read         BIT NOT NULL DEFAULT 0,
    created_at      DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Notifications_UserId ON Notifications(user_id);
GO

CREATE INDEX IX_Notifications_IsRead ON Notifications(is_read);
GO

CREATE INDEX IX_Notifications_CreatedAt ON Notifications(created_at);
GO


/* =========================================================
   TRIGGER CẬP NHẬT updated_at
   ========================================================= */

CREATE TRIGGER TRG_Users_UpdateTime
ON Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET updated_at = GETDATE()
    FROM Users u
    INNER JOIN inserted i ON u.user_id = i.user_id;
END;
GO


CREATE TRIGGER TRG_Events_UpdateTime
ON Events
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Events
    SET updated_at = GETDATE()
    FROM Events e
    INNER JOIN inserted i ON e.event_id = i.event_id;
END;
GO


CREATE TRIGGER TRG_TrafficAlerts_UpdateTime
ON TrafficAlerts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE TrafficAlerts
    SET updated_at = GETDATE()
    FROM TrafficAlerts t
    INNER JOIN inserted i ON t.alert_id = i.alert_id;
END;
GO


/* =========================================================
   DỮ LIỆU MẪU CƠ BẢN
   Lưu ý: password_hash chỉ là mẫu.
   Khi code backend, phải hash bằng BCrypt.
   ========================================================= */

INSERT INTO Users (
    username,
    email,
    password_hash,
    full_name,
    role,
    is_active
)
VALUES
(
    'admin',
    'admin@dnpulse.vn',
    '$2a$10$example_admin_password_hash',
    N'Quản trị viên DN-Pulse',
    'admin',
    1
),
(
    'user01',
    'user01@gmail.com',
    '$2a$10$example_user_password_hash',
    N'Người dùng mẫu',
    'user',
    1
);
GO


INSERT INTO EventCategories (
    name,
    icon,
    color_code,
    description
)
VALUES
(N'Lễ hội & Văn hóa', N'🎆', '#FF6B35', N'Các lễ hội, hoạt động văn hóa tại Đà Nẵng'),
(N'Thể thao', N'🏃', '#2ECC71', N'Các sự kiện thể thao, marathon, giải đấu'),
(N'Âm nhạc', N'🎵', '#9B59B6', N'Liveshow, concert, chương trình âm nhạc'),
(N'Ẩm thực', N'🍜', '#E67E22', N'Lễ hội ẩm thực, hội chợ ăn uống'),
(N'Du lịch', N'🏖️', '#0066CC', N'Hoạt động du lịch, tham quan'),
(N'Hội chợ', N'🛍️', '#1ABC9C', N'Hội chợ thương mại, triển lãm'),
(N'Cộng đồng', N'🤝', '#95A5A6', N'Hoạt động cộng đồng');
GO


/* =========================================================
   VIEW HỖ TRỢ KIỂM TRA NHANH
   ========================================================= */

CREATE VIEW Vw_DanhSachTaiKhoan
AS
SELECT
    user_id,
    username,
    email,
    full_name,
    avatar_url,
    role,
    is_active,
    created_at,
    updated_at,
    last_login_at
FROM Users;
GO


CREATE VIEW Vw_SuKienCongKhai
AS
SELECT
    e.event_id,
    e.title,
    e.short_description,
    e.location_name,
    e.latitude,
    e.longitude,
    e.address,
    e.district,
    e.start_time,
    e.end_time,
    e.banner_url,
    e.thumbnail_url,
    e.status,
    e.is_featured,
    e.is_free,
    e.ticket_price,
    e.view_count,
    e.favorite_count,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color_code AS category_color
FROM Events e
INNER JOIN EventCategories c ON e.category_id = c.category_id
WHERE e.status = 'approved';
GO


-- =========================================================
-- CHÈN MOCK DATA SỰ KIỆN (MẪU)
-- =========================================================
INSERT INTO Events (
    category_id, created_by, title, short_description, description,
    location_name, latitude, longitude, address, district,
    start_time, end_time, banner_url, thumbnail_url, status,
    is_featured, is_free, ticket_price, created_at, updated_at
)
VALUES
(
    1, 1, N'Lễ hội Pháo hoa Quốc tế DIFF 2026',
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
    2, 1, N'Danang International Marathon 2026',
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
    3, 1, N'Liveshow Ca Nhạc "Music By The Sea"',
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
    4, 1, N'Lễ hội Ẩm thực Quốc tế Đà Nẵng 2026',
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
    6, 1, N'Hội chợ Triển lãm Thương mại hè 2026',
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
    7, 1, N'Ngày hội Trồng cây vì Biển Xanh Sơn Trà',
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
    2, 1, N'Giải Bóng Đá Bãi Biển Vô Địch Đà Nẵng',
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
    7, 1, N'Hội thảo Phát triển Đô thị Thông minh Đà Nẵng',
    N'Hội thảo công nghệ đề xuất đô thị thông minh (Đang chờ Admin duyệt).',
    N'Các chuyên gia trong nước và quốc tế hội thảo chia sẻ giải pháp IoT và quy hoạch giao thông công cộng, chống úng lụt thông minh cho thành phố Đà Nẵng.',
    N'Trung tâm Hành chính Đà Nẵng', 16.067800, 108.220100,
    N'24 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng', N'Hải Châu',
    '2026-07-12 08:30:00', '2026-07-12 17:00:00',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    'pending', 0, 0, 200000, GETDATE(), GETDATE()
);
GO


-- Xem danh sách user
SELECT * FROM Vw_DanhSachTaiKhoan;
GO

-- Xem danh mục sự kiện
SELECT * FROM EventCategories;
GO