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

    status              NVARCHAR(20) NOT NULL DEFAULT 'draft'
                        CONSTRAINT CHK_Events_Status
                        CHECK (status IN ('draft', 'published', 'cancelled', 'ended')),

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
WHERE e.status = 'published';
GO



-- Xem danh sách user
SELECT * FROM Vw_DanhSachTaiKhoan;
GO

-- Xem danh mục sự kiện
SELECT * FROM EventCategories;
GO