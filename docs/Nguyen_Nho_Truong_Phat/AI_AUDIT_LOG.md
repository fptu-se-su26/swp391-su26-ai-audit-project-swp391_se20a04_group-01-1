# AI Audit Log

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học |SWP|
| Mã môn học |391|
| Lớp |SE20A04|
| Học kỳ |SU26|
| Tên bài tập / Project |DN-Pulse: Intelligent Urban Routing System|
| Tên sinh viên / Nhóm |Nguyễn Nho Trường Phát|
| MSSV / Danh sách MSSV |DE190716|
| Giảng viên hướng dẫn |QuangLTN3|
| Ngày bắt đầu |2026-05-26|
| Ngày hoàn thành |  |

---

## 2. Công cụ AI đã sử dụng

Đánh dấu các công cụ AI đã sử dụng trong quá trình thực hiện bài tập/project.

- [x] ChatGPT
- [x] Gemini
- [x] Claude
- [ ] GitHub Copilot
- [ ] Cursor
- [x] Antigravity
- [ ] Perplexity
- [ ] Microsoft Copilot
- [ ] Công cụ khác: ....................................

---

## 3. Mục tiêu sử dụng AI

Mô tả ngắn gọn sinh viên/nhóm đã sử dụng AI để hỗ trợ những công việc nào.

Ví dụ:

- Phân tích yêu cầu bài toán
- Gợi ý ý tưởng giải pháp
- Thiết kế database
- Thiết kế giao diện
- Viết code mẫu
- Debug lỗi
- Tối ưu code
- Viết test case
- Kiểm tra bảo mật
- Viết báo cáo
- Chuẩn bị slide thuyết trình
- Tìm hiểu công nghệ mới

### Mô tả mục tiêu sử dụng AI

```
- Gợi ý ý tưởng giải pháp
- Thiết kế database
- Thiết kế giao diện
- Viết code mẫu
- Debug lỗi
- Tối ưu code
- Viết test case
- Viết báo cáo
- Tìm hiểu các cách làm và triển khai
...

## 4. Nhật ký sử dụng AI chi tiết

> Mỗi lần sử dụng AI cho một phần quan trọng của bài tập/project, sinh viên cần ghi lại theo mẫu bên dưới.  
> Sinh viên/nhóm có thể nhân bản mẫu “Lần sử dụng AI” nhiều lần tùy theo số lần sử dụng AI thực tế.

---

### Lần sử dụng AI số 1

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng |2026-05-26|
| Công cụ AI | ChatGPT / Gemini / Claude / Antigravity |
| Mục đích sử dụng |Thiết kế Database|
| Phần việc liên quan | Database |
| Mức độ sử dụng | Hỗ trợ ý tưởng |

#### 4.1. Prompt đã sử dụng

```1. Tối ưu kiểu dữ liệu không gian (Spatial Data) Bạn đang sử dụng SQL Server, một hệ quản trị hỗ trợ cực kỳ mạnh mẽ kiểu dữ liệu GEOGRAPHY. Lỗi ở các thuộc tính: Trong các bảng FloodZones và EventRoads, bạn đang để các trường như polygon_coordinates, polyline_encoded, và geojson_coords. Trong thực tế, bạn không nên lưu tọa độ dưới dạng chuỗi văn bản (như VARCHAR hay JSON text). Gợi ý sửa: Hãy gộp chung lại thành một thuộc tính duy nhất mang tên geography_data (hoặc affected_area) và set cứng kiểu dữ liệu là GEOGRAPHY. Backend của bạn sẽ gọi thẳng hàm STDistance hoặc STIntersects của SQL Server để xử lý. Với bảng Events & POIs: Bạn đang tách rời latitude và longitude. Điều này ổn định cho truy vấn cơ bản, nhưng để tối ưu hóa việc tìm các sự kiện "trong bán kính 2-5km", bạn nên thêm một trường location_point (kiểu GEOGRAPHY) để SQL Server có thể đánh index không gian (Spatial Index). 2. Chuẩn hóa mối quan hệ Nhiều-Nhiều (M:N) Lỗi ở UserFavoriteEvents: Trên sơ đồ, bạn đang biểu diễn UserFavoriteEvents (với thuộc tính saved_at) như một thuộc tính của đường liên kết (relationship diamond) giữa User và Events. Gợi ý sửa: Trong cơ sở dữ liệu quan hệ, bạn không thể code một đường liên kết. Bạn bắt buộc phải chuyển nó thành một bảng trung gian (Associative Entity). Bảng này sẽ có tên là UserFavoriteEvents gồm các cột: user_id (FK), event_id (FK), và saved_at. Khóa chính của bảng này sẽ là khóa ghép (user_id, event_id). 3. Nguy cơ phình to (Bloat) ở bảng Notifications Lỗi logic hệ thống: Bảng Notifications của bạn đang trỏ trực tiếp bằng user_id. Như mình đã từng lưu ý trước đây, nếu có một sự kiện cấm đường lớn ảnh hưởng đến 10.000 người dùng, việc backend tạo ra 10.000 dòng dữ liệu INSERT vào bảng này cùng một lúc sẽ làm sập hoặc phình to Database một cách lãng phí. Gợi ý sửa: Hãy tách thành 2 bảng: NotificationTemplates (Lưu nội dung thông báo gốc: id, title, message, type, created_at). UserNotifications (Chỉ lưu trạng thái đọc của người dùng: user_id, notification_template_id, is_read). (Thậm chí trong thực tế, các thông báo mang tính Real-time thường được đẩy thẳng qua Firebase Push Notification chứ không lưu cứng toàn bộ vào SQL DB ). 4. Tinh chỉnh bảng TrafficAlerts và EventRoads Lỗi dư thừa khóa ngoại: Bảng TrafficAlerts đang có liên kết khóa ngoại event_id. Nếu một sự cố giao thông (tai nạn, tắc đường đột xuất) không liên quan đến sự kiện nào cả, trường này sẽ bị Null. Đồng thời, bạn đã có bảng EventRoads chuyên xử lý các tuyến đường bị cấm do sự kiện. Gợi ý sửa: Giữ nguyên EventRoads để quản lý các tuyến đường phục vụ sự kiện. Đối với TrafficAlerts, hãy đảm bảo trường event_id là tùy chọn (Nullable) hoặc tốt nhất là loại bỏ nó nếu bạn muốn bảng này chỉ thuần túy lưu trữ dữ liệu kẹt xe/tai nạn ngẫu nhiên, tách biệt hoàn toàn với logic sự kiện. 5. Quản lý Route Data trong SavedRoutes Lưu ý thiết kế: Bảng SavedRoutes của bạn có trường route_data. Khi Mapbox API trả về một tuyến đường, dữ liệu JSON của tuyến đường đó rất lớn (chứa hàng ngàn điểm tọa độ để vẽ Polyline). Gợi ý sửa: Nếu bạn lưu toàn bộ file JSON đó vào SQL Server, hãy sử dụng kiểu dữ liệu NVARCHAR(MAX) hoặc lưu nó ở một dịch vụ lưu trữ ngoài (như AWS S3/Firebase Storage) và chỉ lưu route_data_url trong Database. Nếu bạn chỉ cần điểm đầu và cuối (origin_lat, destination_lat), khi người dùng mở lại, hãy gọi lại Mapbox API để xin đường mới nhất, như vậy sẽ đảm bảo tuyến đường luôn được cập nhật tình trạng giao thông thực tế.
```

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.

```
Được, mình sẽ phân tích thẳng vào phần bạn gửi. Nhìn chung SQL hiện tại của bạn đã làm được project, không sai nghiêm trọng. Các góp ý bạn liệt kê phía dưới là đúng theo hướng “nâng cấp chuyên nghiệp”, nhưng không phải cái nào cũng nên sửa ngay, vì nếu sửa quá sâu sẽ làm bạn khó code backend/frontend hơn.

Theo thiết kế ban đầu trong file DN-Pulse, database của bạn gồm 11 bảng, trong đó Users, Events, TrafficAlerts, EventRoads, POIs, SavedRoutes, UserFavoriteEvents, Notifications là các bảng chính để phục vụ sự kiện, giao thông, bản đồ và trải nghiệm người dùng.

Kết luận nhanh

Bạn có thể giữ gần như nguyên bản SQL hiện tại, chỉ nên chỉnh một số điểm sau:

Vấn đề	Có nên sửa ngay không?	Mức độ
Đổi password thành password_hash	Có	Bắt buộc nên sửa
UserFavoriteEvents	Không cần sửa	Bạn đã làm đúng
Notifications tách 2 bảng	Nên sửa nếu muốn chuẩn hơn	Khá quan trọng
Spatial Data GEOGRAPHY	Có thể thêm, không bắt buộc thay hết	Nâng cao
TrafficAlerts.event_id	Giữ nullable như hiện tại	Đúng rồi
SavedRoutes.route_data	Giữ NVARCHAR(MAX) được	Đủ dùng cho project
Thêm updated_at cho vài bảng	Nên thêm	Tốt hơn

Sau đó AI đưa ra các code mẫu và giải thích
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

```
-- ============================================================================
-- PROJECT: DN-Pulse (Ứng dụng bản đồ thông minh quảng bá sự kiện & cảnh báo giao thông Đà Nẵng)
-- DATABASE ENGINE: Microsoft SQL Server (Express Edition)
-- SCHEMA VERSION: 2.0 (Cập nhật Usecase & Google OAuth Bảo mật)
-- ============================================================================
-- 1. TẠO CƠ SỞ DỮ LIỆU (Chạy độc lập nếu chưa có DB)

CREATE DATABASE DN_Pulse;
GO
USE DN_Pulse;
GO

-- ============================================================================
-- PHẦN I: XÓA CÁC BẢNG NẾU ĐÃ TỒN TẠI (Dành cho việc Reset Database khi phát triển)
-- ============================================================================
-- Xóa Foreign Key tự tham chiếu của bảng Users trước để tránh xung đột khi xóa bảng
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_BannedBy' AND parent_object_id = OBJECT_ID('dbo.Users'))
    ALTER TABLE dbo.Users DROP CONSTRAINT FK_Users_BannedBy;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.UserFavoriteEvents', 'U') IS NOT NULL DROP TABLE dbo.UserFavoriteEvents;
IF OBJECT_ID('dbo.SavedRoutes', 'U') IS NOT NULL DROP TABLE dbo.SavedRoutes;
IF OBJECT_ID('dbo.POIs', 'U') IS NOT NULL DROP TABLE dbo.POIs;
IF OBJECT_ID('dbo.FloodZones', 'U') IS NOT NULL DROP TABLE dbo.FloodZones;
IF OBJECT_ID('dbo.TrafficAlerts', 'U') IS NOT NULL DROP TABLE dbo.TrafficAlerts;
IF OBJECT_ID('dbo.EventRoads', 'U') IS NOT NULL DROP TABLE dbo.EventRoads;
IF OBJECT_ID('dbo.EventImages', 'U') IS NOT NULL DROP TABLE dbo.EventImages;
IF OBJECT_ID('dbo.Events', 'U') IS NOT NULL DROP TABLE dbo.Events;
IF OBJECT_ID('dbo.LiveLocationShares', 'U') IS NOT NULL DROP TABLE dbo.LiveLocationShares;
IF OBJECT_ID('dbo.UserPreferences', 'U') IS NOT NULL DROP TABLE dbo.UserPreferences;
IF OBJECT_ID('dbo.OTPCodes', 'U') IS NOT NULL DROP TABLE dbo.OTPCodes;
IF OBJECT_ID('dbo.UserSocialAccounts', 'U') IS NOT NULL DROP TABLE dbo.UserSocialAccounts;
IF OBJECT_ID('dbo.EventCategories', 'U') IS NOT NULL DROP TABLE dbo.EventCategories;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
-- ============================================================================
-- PHẦN II: TẠO CÁC BẢNG VÀ RÀNG BUỘC (CONSTRAINTS)
-- ============================================================================
-- 1. BẢNG USERS (Người dùng hệ thống)
CREATE TABLE Users (
    user_id           INT IDENTITY(1,1) PRIMARY KEY,
    username          NVARCHAR(50)  NOT NULL UNIQUE,
    email             NVARCHAR(100) NOT NULL UNIQUE,
    password_hash     NVARCHAR(255) NULL,          -- NULL đối với các tài khoản đăng ký thuần qua Google OAuth
    full_name         NVARCHAR(100),
    avatar_url        NVARCHAR(500),
    role              NVARCHAR(20)  NOT NULL DEFAULT 'user'
                      CONSTRAINT CHK_Users_Role CHECK (role IN ('user', 'admin')),
    is_active         BIT           NOT NULL DEFAULT 1,
    -- Xác thực tài khoản & Bảo mật 2 lớp (2FA)
    is_email_verified BIT           NOT NULL DEFAULT 0,
    is_2fa_enabled    BIT           NOT NULL DEFAULT 0,
    -- Quản lý khóa tài khoản (Ban Account)
    ban_reason        NVARCHAR(500) NULL,
    banned_at         DATETIME2     NULL,
    banned_by         INT           NULL, -- Khóa ngoại tự liên kết (sẽ thêm CONSTRAINT ở cuối file)
    created_at        DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2     NOT NULL DEFAULT GETDATE(),
    last_login_at     DATETIME2     NULL
);
-- Chỉ mục hỗ trợ tìm kiếm người dùng
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Role  ON Users(role);
-- 2. BẢNG EVENTCATEGORIES (Danh mục sự kiện)
CREATE TABLE EventCategories (
    category_id  INT IDENTITY(1,1) PRIMARY KEY,
    name         NVARCHAR(100) NOT NULL UNIQUE,
    icon         NVARCHAR(50)  NOT NULL DEFAULT '🎪',
    color_code   NVARCHAR(7)   NOT NULL DEFAULT '#0066CC', -- Mã HEX dùng hiển thị màu trên bản đồ
    description  NVARCHAR(500) NULL
);
-- 3. BẢNG USERSOCIALACCOUNTS (Tài khoản mạng xã hội liên kết - Google OAuth)
CREATE TABLE UserSocialAccounts (
    social_id         INT IDENTITY(1,1) PRIMARY KEY,
    user_id           INT           NOT NULL
                      CONSTRAINT FK_UserSocialAccounts_User
                      FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    provider          NVARCHAR(20)  NOT NULL
                      CONSTRAINT CHK_UserSocialAccounts_Provider
                      CHECK (provider IN ('google')), -- Có thể mở rộng 'facebook', 'apple' sau này
    provider_id       NVARCHAR(100) NOT NULL, -- ID người dùng do Google cung cấp (google_id)
    linked_at         DATETIME2     NOT NULL DEFAULT GETDATE(),
    -- Ràng buộc bảo mật
    CONSTRAINT UQ_UserSocialAccounts_Provider_ProviderId UNIQUE (provider, provider_id), -- 1 tài khoản google chỉ liên kết 1 user hệ thống
    CONSTRAINT UQ_UserSocialAccounts_User_Provider UNIQUE (user_id, provider)            -- 1 user chỉ liên kết tối đa 1 tài khoản google
);
CREATE INDEX IX_UserSocialAccounts_UserId ON UserSocialAccounts(user_id);
-- 4. BẢNG OTPCODES (Quản lý mã OTP xác thực email, đổi mật khẩu và 2FA)
CREATE TABLE OTPCodes (
    otp_id     INT IDENTITY(1,1) PRIMARY KEY,
    user_id    INT          NOT NULL
               CONSTRAINT FK_OTPCodes_User
               FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    otp_code   NVARCHAR(10) NOT NULL, -- Mã OTP (thường là 6 chữ số)
    otp_type   NVARCHAR(30) NOT NULL
               CONSTRAINT CHK_OTP_Type
               CHECK (otp_type IN (
                   'email_verification', -- Kích hoạt tài khoản khi đăng ký
                   'two_factor_auth',    -- OTP bảo mật 2 lớp cho Admin
                   'password_reset'      -- OTP khôi phục mật khẩu
               )),
    expires_at DATETIME2    NOT NULL,
    is_used    BIT          NOT NULL DEFAULT 0,
    created_at DATETIME2    NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_OTPCodes_UserId ON OTPCodes(user_id);
CREATE INDEX IX_OTPCodes_Type   ON OTPCodes(otp_type);
-- 5. BẢNG USERPREFERENCES (Cấu hình cá nhân của người dùng)
CREATE TABLE UserPreferences (
    user_id                 INT PRIMARY KEY
                            CONSTRAINT FK_UserPrefs_User
                            FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    -- Tùy chọn định tuyến (Routing settings)
    avoid_floods            BIT NOT NULL DEFAULT 0, -- Tránh các vùng ngập lụt
    avoid_congestion        BIT NOT NULL DEFAULT 0, -- Tránh các đoạn đường kẹt xe
    -- Tùy chọn hiển thị bản đồ
    show_traffic_layer      BIT NOT NULL DEFAULT 1, -- Bật/Tắt trạng thái giao thông
    show_restricted_roads   BIT NOT NULL DEFAULT 1, -- Bật/Tắt hiển thị các đoạn đường bị cấm
    -- Cấu hình thông báo
    enable_buffer_alerts    BIT NOT NULL DEFAULT 1, -- Bật/Tắt cảnh báo khi gần đi vào vùng ngập/kẹt xe
    -- Phương tiện di chuyển mặc định
    default_travel_mode     NVARCHAR(20) NOT NULL DEFAULT 'driving'
                            CONSTRAINT CHK_Prefs_TravelMode
                            CHECK (default_travel_mode IN ('driving','walking','cycling')),
    updated_at              DATETIME2    NOT NULL DEFAULT GETDATE()
);
-- 6. BẢNG LIVELOCATIONSHARES (Chia sẻ vị trí trực tiếp realtime)
CREATE TABLE LiveLocationShares (
    share_id    INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT           NOT NULL
                CONSTRAINT FK_LiveLocation_User
                FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    share_token NVARCHAR(100) NOT NULL UNIQUE,  -- Token bảo mật đính kèm trên URL để người khác xem
    current_lat DECIMAL(10,8) NULL,             -- Cập nhật tọa độ realtime
    current_lng DECIMAL(11,8) NULL,
    is_active   BIT           NOT NULL DEFAULT 1,
    expires_at  DATETIME2     NOT NULL,          -- Thời hạn hết hạn chia sẻ (Ví dụ: sau 2 giờ)
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_LiveLocation_UserId     ON LiveLocationShares(user_id);
CREATE INDEX IX_LiveLocation_ShareToken ON LiveLocationShares(share_token);
CREATE INDEX IX_LiveLocation_IsActive   ON LiveLocationShares(is_active);
-- 7. BẢNG EVENTS (Thông tin sự kiện thành phố Đà Nẵng)
CREATE TABLE Events (
    event_id            INT IDENTITY(1,1) PRIMARY KEY,
    category_id         INT           NOT NULL
                        CONSTRAINT FK_Events_Category
                        FOREIGN KEY REFERENCES EventCategories(category_id),
    created_by          INT           NOT NULL
                        CONSTRAINT FK_Events_CreatedBy
                        FOREIGN KEY REFERENCES Users(user_id),
    -- Thông tin cơ bản
    title               NVARCHAR(200) NOT NULL,
    short_description   NVARCHAR(500) NULL,
    description         NVARCHAR(MAX) NULL,
    -- Vị trí diễn ra sự kiện
    location_name       NVARCHAR(200) NOT NULL,
    latitude            DECIMAL(10,8) NOT NULL,
    longitude           DECIMAL(11,8) NOT NULL,
    address             NVARCHAR(300) NULL,
    district            NVARCHAR(100) NULL,
    -- Thời gian diễn ra
    start_time          DATETIME2     NOT NULL,
    end_time            DATETIME2     NOT NULL,
    -- Hình ảnh đại diện
    banner_url          NVARCHAR(500) NULL,
    thumbnail_url       NVARCHAR(500) NULL,
    -- Trạng thái kiểm duyệt / vận hành
    status              NVARCHAR(20)  NOT NULL DEFAULT 'draft'
                        CONSTRAINT CHK_Events_Status
                        CHECK (status IN ('draft','published','cancelled','ended')),
    -- Thông tin chi tiết bổ sung
    expected_attendance INT           NULL,
    website_url         NVARCHAR(300) NULL,
    organizer_name      NVARCHAR(200) NULL,
    contact_phone       NVARCHAR(20)  NULL,
    is_featured         BIT           NOT NULL DEFAULT 0, -- Sự kiện nổi bật hiển thị ở Banner chính
    is_free             BIT           NOT NULL DEFAULT 1,
    ticket_price        DECIMAL(12,2) NULL,
    -- Thống kê
    view_count          INT           NOT NULL DEFAULT 0,
    favorite_count      INT           NOT NULL DEFAULT 0,
    created_at          DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2     NOT NULL DEFAULT GETDATE(),
    -- Ràng buộc logic thời gian
    CONSTRAINT CHK_Events_Time CHECK (end_time > start_time)
);
CREATE INDEX IX_Events_Status     ON Events(status);
CREATE INDEX IX_Events_StartTime  ON Events(start_time);
CREATE INDEX IX_Events_Category   ON Events(category_id);
CREATE INDEX IX_Events_Featured   ON Events(is_featured);
CREATE INDEX IX_Events_Location   ON Events(latitude, longitude);
-- 8. BẢNG EVENTIMAGES (Bộ sưu tập ảnh chi tiết của sự kiện)
CREATE TABLE EventImages (
    image_id      INT IDENTITY(1,1) PRIMARY KEY,
    event_id      INT           NOT NULL
                  CONSTRAINT FK_EventImages_Event
                  FOREIGN KEY REFERENCES Events(event_id) ON DELETE CASCADE,
    image_url     NVARCHAR(500) NOT NULL,
    caption       NVARCHAR(200) NULL,
    display_order INT           NOT NULL DEFAULT 0, -- Thứ tự sắp xếp ảnh trong carousel
    uploaded_at   DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_EventImages_EventId ON EventImages(event_id);
-- 9. BẢNG EVENTROADS (Các tuyến đường bị ảnh hưởng / bị cấm do sự kiện)
CREATE TABLE EventRoads (
    road_id            INT IDENTITY(1,1) PRIMARY KEY,
    event_id           INT           NOT NULL
                       CONSTRAINT FK_EventRoads_Event
                       FOREIGN KEY REFERENCES Events(event_id) ON DELETE CASCADE,
    road_name          NVARCHAR(200) NOT NULL,
    restriction_type   NVARCHAR(30)  NOT NULL
                       CONSTRAINT CHK_EventRoads_Restriction
                       CHECK (restriction_type IN ('closed','limited','one_way','no_parking')),
    restriction_start  DATETIME2     NOT NULL,
    restriction_end    DATETIME2     NOT NULL,
    polyline_encoded   NVARCHAR(MAX) NULL, -- Chuỗi polyline đường vẽ trên MapBox
    geojson_coords     NVARCHAR(MAX) NULL, -- Tọa độ chi tiết định dạng GeoJSON
    description        NVARCHAR(500) NULL,
    created_at         DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_EventRoads_EventId ON EventRoads(event_id);
CREATE INDEX IX_EventRoads_Time    ON EventRoads(restriction_start, restriction_end);
-- 10. BẢNG TRAFFIC_ALERTS (Cảnh báo giao thông thời gian thực - kẹt xe, sự cố, ngập lụt tạm thời)
CREATE TABLE TrafficAlerts (
    alert_id              INT IDENTITY(1,1) PRIMARY KEY,
    created_by            INT           NOT NULL
                          CONSTRAINT FK_TrafficAlerts_CreatedBy
                          FOREIGN KEY REFERENCES Users(user_id),
    event_id              INT           NULL
                          CONSTRAINT FK_TrafficAlerts_Event
                          FOREIGN KEY REFERENCES Events(event_id) ON DELETE SET NULL,
    alert_type            NVARCHAR(30)  NOT NULL
                          CONSTRAINT CHK_Alerts_Type
                          CHECK (alert_type IN (
                              'flood','congestion','accident',
                              'event_closure','construction','weather'
                          )),
    title                 NVARCHAR(200) NOT NULL,
    description           NVARCHAR(1000) NULL,
    location_name         NVARCHAR(200) NULL,
    latitude              DECIMAL(10,8) NULL,
    longitude             DECIMAL(11,8) NULL,
    severity              NVARCHAR(20)  NOT NULL DEFAULT 'medium'
                          CONSTRAINT CHK_Alerts_Severity
                          CHECK (severity IN ('low','medium','high','critical')),
    affected_area_polygon NVARCHAR(MAX) NULL, -- Tọa độ vùng ảnh hưởng vẽ đa giác trên bản đồ
    start_time            DATETIME2     NOT NULL DEFAULT GETDATE(),
    end_time              DATETIME2     NULL,
    is_active             BIT           NOT NULL DEFAULT 1,
    created_at            DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at            DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_TrafficAlerts_IsActive ON TrafficAlerts(is_active);
CREATE INDEX IX_TrafficAlerts_Type     ON TrafficAlerts(alert_type);
CREATE INDEX IX_TrafficAlerts_Severity ON TrafficAlerts(severity);
CREATE INDEX IX_TrafficAlerts_Location ON TrafficAlerts(latitude, longitude);
-- 11. BẢNG FLOODZONES (Khu vực ngập lụt cố định / điểm đen ngập lụt khi mưa lớn)
CREATE TABLE FloodZones (
    zone_id               INT IDENTITY(1,1) PRIMARY KEY,
    zone_name             NVARCHAR(200) NOT NULL,
    district              NVARCHAR(100) NOT NULL,
    risk_level            NVARCHAR(20)  NOT NULL
                          CONSTRAINT CHK_FloodZones_Risk
                          CHECK (risk_level IN ('low','medium','high')),
    polygon_coordinates   NVARCHAR(MAX) NOT NULL, -- Định dạng GeoJSON / Danh sách tọa độ đa giác điểm ngập
    description           NVARCHAR(500) NULL,
    typical_flood_months  NVARCHAR(100) NULL, -- Các tháng hay xảy ra ngập lụt (ví dụ: '10,11,12')
    is_active             BIT           NOT NULL DEFAULT 1,
    last_updated          DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_by            INT           NULL
                          CONSTRAINT FK_FloodZones_UpdatedBy
                          FOREIGN KEY REFERENCES Users(user_id)
);
-- 12. BẢNG POIS (Điểm quan tâm / Địa điểm du lịch, tiện ích nổi bật)
CREATE TABLE POIs (
    poi_id       INT IDENTITY(1,1) PRIMARY KEY,
    created_by   INT           NULL
                 CONSTRAINT FK_POIs_CreatedBy
                 FOREIGN KEY REFERENCES Users(user_id),
    name         NVARCHAR(200) NOT NULL,
    category     NVARCHAR(50)  NOT NULL
                 CONSTRAINT CHK_POIs_Category
                 CHECK (category IN (
                     'tourist_attraction','restaurant','hotel',
                     'hospital','gas_station','parking','shopping','beach'
                 )),
    latitude     DECIMAL(10,8) NOT NULL,
    longitude    DECIMAL(11,8) NOT NULL,
    address      NVARCHAR(300) NULL,
    description  NVARCHAR(1000) NULL,
    image_url    NVARCHAR(500) NULL,
    website_url  NVARCHAR(300) NULL,
    phone_number NVARCHAR(20)  NULL,
    rating       DECIMAL(3,1)  NULL
                 CONSTRAINT CHK_POIs_Rating CHECK (rating BETWEEN 0 AND 5),
    is_featured  BIT           NOT NULL DEFAULT 0,
    is_active    BIT           NOT NULL DEFAULT 1,
    created_at   DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_POIs_Category ON POIs(category);
CREATE INDEX IX_POIs_Location ON POIs(latitude, longitude);
CREATE INDEX IX_POIs_Featured ON POIs(is_featured);
-- 13. BẢNG SAVEDROUTES (Lịch sử định tuyến và Tuyến đường yêu thích)
CREATE TABLE SavedRoutes (
    route_id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id           INT           NOT NULL
                      CONSTRAINT FK_SavedRoutes_User
                      FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    origin_name       NVARCHAR(300) NOT NULL,
    origin_lat        DECIMAL(10,8) NOT NULL,
    origin_lng        DECIMAL(11,8) NOT NULL,
    destination_name  NVARCHAR(300) NOT NULL,
    destination_lat   DECIMAL(10,8) NOT NULL,
    destination_lng   DECIMAL(11,8) NOT NULL,
    route_name        NVARCHAR(200) NULL,
    route_data        NVARCHAR(MAX) NULL, -- Dữ liệu lộ trình chi tiết lưu dạng JSON (nhận từ MapBox Directions API)
    distance_meters   INT           NULL,
    duration_seconds  INT           NULL,
    profile           NVARCHAR(20)  NOT NULL DEFAULT 'driving'
                      CONSTRAINT CHK_SavedRoutes_Profile
                      CHECK (profile IN ('driving','walking','cycling')),
    -- Phân loại lộ trình
    route_type        NVARCHAR(20)  NOT NULL DEFAULT 'history'
                      CONSTRAINT CHK_SavedRoutes_Type
                      CHECK (route_type IN ('history', 'saved')),
    -- Chia sẻ lộ trình
    share_token       NVARCHAR(100) NULL, -- Token ngẫu nhiên để gửi link chia sẻ
    is_shared         BIT           NOT NULL DEFAULT 0,
    -- Tuyến đường khẩn cấp
    is_emergency      BIT           NOT NULL DEFAULT 0, -- 1 = Tuyến đường thoát hiểm khẩn cấp
    created_at        DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_SavedRoutes_UserId    ON SavedRoutes(user_id);
CREATE INDEX IX_SavedRoutes_RouteType ON SavedRoutes(route_type);
CREATE UNIQUE INDEX IX_SavedRoutes_ShareToken 
    ON SavedRoutes(share_token) WHERE share_token IS NOT NULL;
-- 14. BẢNG USERFAVORITEEVENTS (Lưu trữ quan hệ nhiều-nhiều giữa Users và Events đã thích)
CREATE TABLE UserFavoriteEvents (
    user_id  INT       NOT NULL
             CONSTRAINT FK_FavEvents_User
             FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    event_id INT       NOT NULL
             CONSTRAINT FK_FavEvents_Event
             FOREIGN KEY REFERENCES Events(event_id),
    saved_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT PK_UserFavoriteEvents PRIMARY KEY (user_id, event_id)
);
-- 15. BẢNG NOTIFICATIONS (Thông báo hệ thống đến người dùng)
CREATE TABLE Notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT           NULL -- NULL đại diện cho thông báo chung gửi đến mọi người (Broadcast)
                    CONSTRAINT FK_Notifications_User
                    FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
    event_id        INT           NULL
                    CONSTRAINT FK_Notifications_Event
                    FOREIGN KEY REFERENCES Events(event_id),
    alert_id        INT           NULL
                    CONSTRAINT FK_Notifications_Alert
                    FOREIGN KEY REFERENCES TrafficAlerts(alert_id),
    type            NVARCHAR(30)  NOT NULL
                    CONSTRAINT CHK_Notifications_Type
                    CHECK (type IN (
                        'event_reminder','traffic_alert','event_update','system'
                    )),
    title           NVARCHAR(200) NOT NULL,
    message         NVARCHAR(1000) NULL,
    is_read         BIT           NOT NULL DEFAULT 0,
    created_at      DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_Notifications_UserId ON Notifications(user_id);
CREATE INDEX IX_Notifications_IsRead ON Notifications(is_read);
-- ============================================================================
-- PHẦN III: THÊM CÁC RÀNG BUỘC KHÓA NGOẠI PHÁT SINH SAU (SELF-REFERENCING)
-- ============================================================================
-- Thêm Foreign Key tự liên kết cho cột banned_by trong bảng Users sau khi bảng đã được tạo
ALTER TABLE Users ADD CONSTRAINT FK_Users_BannedBy
    FOREIGN KEY (banned_by) REFERENCES Users(user_id);
GO
-- ============================================================================
-- PHẦN IV: SEED DATA MẪU CHO DANH MỤC SỰ KIỆN (EVENTCATEGORIES)
-- ============================================================================
INSERT INTO EventCategories (name, icon, color_code, description) VALUES
(N'Lễ hội & Văn hóa', N'🎆', N'#FF6B35', N'Các lễ hội văn hóa đặc sắc như Lễ hội pháo hoa quốc tế DIFF, lễ hội Cầu Rồng phun lửa...'),
(N'Thể thao', N'🏃', N'#2ECC71', N'Giải Marathon quốc tế Đà Nẵng, Ironman 70.3, các sự kiện thể thao cộng đồng...'),
(N'Âm nhạc & Nghệ thuật', N'🎵', N'#9B59B6', N'Đại nhạc hội bãi biển, biểu diễn nghệ thuật tuồng cổ, ca nhạc phòng trà...'),
(N'Ẩm thực', N'🍜', N'#E67E22', N'Hội chợ ẩm thực miền Trung, lễ hội bia, các tuyến phố ẩm thực đêm Đà Nẵng...'),
(N'Du lịch & Tham quan', N'🏖️', N'#0066CC', N'Các tour tham quan Bà Nà Hills, Bán đảo Sơn Trà, Ngũ Hành Sơn, Phố cổ Hội An...'),
(N'Hội chợ & Triển lãm', N'🎪', N'#1ABC9C', N'Triển lãm công nghệ, hội chợ thương mại quốc tế, triển lãm tranh ảnh Đà Nẵng xưa và nay...'),
(N'Cộng đồng & Xã hội', N'🤝', N'#95A5A6', N'Sự kiện tình nguyện dọn rác bãi biển Sơn Trà, các ngày hội hiến máu nhân đạo...');
GO

-- Xóa bảng cũ nếu tồn tại
DROP TABLE IF EXISTS PasswordReset;

-- Tạo lại bảng với độ dài email giống Users
-- Nếu Users.email là NVARCHAR(255), thì PasswordReset.email cũng là NVARCHAR(255)
-- Nếu Users.email là NVARCHAR(100), thì PasswordReset.email cũng là NVARCHAR(100)

CREATE TABLE PasswordReset (
    reset_id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(255) NOT NULL UNIQUE,
    otp NVARCHAR(6) NOT NULL,
    expiresAt DATETIME NOT NULL,
    isVerified BIT DEFAULT 0,
    createdAt DATETIME DEFAULT GETDATE()
);

-- Nếu muốn thêm Foreign Key sau (tùy chọn):
-- ALTER TABLE PasswordReset
-- ADD CONSTRAINT FK_PasswordReset_Users 
-- FOREIGN KEY (email) REFERENCES Users(email);
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

```text
Viết tại đây...
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit |  |
| File liên quan |  |
| Screenshot |<img width="1231" height="840" alt="image" src="https://github.com/user-attachments/assets/8144ca25-4828-4e9b-8cd6-daf38900fad5" />
<img width="1105" height="863" alt="image" src="https://github.com/user-attachments/assets/7d146b6f-0ad2-4449-a0be-7d306104ba0d" />
<img width="915" height="828" alt="image" src="https://github.com/user-attachments/assets/8e57352f-ba6b-4c2c-a75c-d46488af99b6" />
<img width="975" height="838" alt="image" src="https://github.com/user-attachments/assets/c0ac0794-3c09-4f64-9ad7-3295bc722a59" />

|
| Kết quả chạy/test |  |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

```
có được databse để test hệ thống 
```

---

### Lần sử dụng AI số 2

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng |2026-06-01|
| Công cụ AI | ChatGPT / Claude / Antigravity  |
| Mục đích sử dụng | Presentation |
| Phần việc liên quan | Presentation |
| Mức độ sử dụng | Hỗ trợ ý tưởng / Hỗ trợ một phần |

#### 4.1. Prompt đã sử dụng

```
<img width="626" height="751" alt="image" src="https://github.com/user-attachments/assets/e9c67267-2cbc-4764-aee7-ffd69fec41a4" />
1. Bây giờ tôi mới soạn lời và slide để thuyết trình nên không có để gửi cho bạn đọc
2. Sơ đồ Use case như hình 1 và 2 tôi cung cấp cho bạn
3. Ảnh màn hình bản đồ như hình 3 tôi gửi cho bạn
4. Code backend là 8 files tiếp theo tôi gửi cho bạn đọc
5. Tên dự án là : "DN-Pulse: Intelligent Urban Routing System" và mục tiêu là Kết hợp bản đồ + sự kiện + cảnh báo giao thông
```

#### 4.2. Kết quả AI gợi ý

```text
Phần của bạn sẽ xoay quanh:

DN-Pulse: Intelligent Urban Routing System
→ Mục tiêu: Kết hợp bản đồ + sự kiện + cảnh báo giao thông.

Vai trò Người 3 sẽ nói về:

Use Case chính của hệ thống
Member xem bản đồ.
Tìm kiếm địa điểm POI.
Định vị vị trí hiện tại.
Định tuyến thông minh.
Bật/tắt cảnh báo đoạn đường cấm, trạng thái giao thông.
Chia sẻ lộ trình, lưu/xóa lộ trình.
Xem sự kiện theo thời gian hoặc danh mục.
Admin cập nhật POI, phát hành cảnh báo giao thông, xử lý tài khoản vi phạm.
Tích hợp Mapbox API
Giao diện bản đồ hiển thị khu vực Đà Nẵng.
Có marker, danh sách sự kiện, thanh tìm kiếm, các nút layer bên phải.
Bản đồ phục vụ việc hiển thị điểm, tuyến đường, sự kiện và cảnh báo theo thời gian thực.
Liên kết với backend
Backend hiện bạn gửi là Node.js + Express.
Dùng SQL Server thông qua thư viện mssql và cấu hình database DN_Pulse.
Có các API xác thực như đăng ký, đăng nhập, profile, quên mật khẩu, xác thực OTP, reset password.
Đăng nhập dùng bcrypt để kiểm tra mật khẩu và tạo JWT token có thời hạn 1 ngày.
Có middleware kiểm tra token và phân quyền role.
Backend cũng có phần quản lý sự kiện /api/events, liên quan trực tiếp đến danh sách sự kiện hiển thị trên bản đồ.

Tuy nhiên, để mình viết kịch bản thuyết trình Người 3 thật đúng và không bị nói sai kỹ thuật, bạn cần gửi thêm cho mình mấy phần này:

1. File frontend bản đồ

Bạn gửi các file liên quan đến màn hình bản đồ, ví dụ:

Home.tsx
Map.tsx
MapView.tsx
mapService.ts
navigationService.ts
api.ts / axios.ts

Phần này rất quan trọng vì bạn đang nói về Mapbox API, nhưng các file backend hiện tại mình đọc được chủ yếu là auth, user, password reset, events, chưa thấy rõ API định tuyến /navigation/route.

2. File xử lý route/định tuyến

Bạn cần gửi file nào có đoạn gọi hoặc xử lý:

/navigation/route

hoặc những hàm kiểu:

getRoute()
calculateRoute()
fetchRoute()
findRoute()
drawRoute()

Vì trong kịch bản bạn nói frontend gửi startLat, startLng, endLat, endLng xuống backend, nên mình cần xem chính xác project của bạn đang làm như vậy chưa.

3. File dữ liệu hoặc API sự kiện

Bạn gửi file nào đang hiển thị danh sách sự kiện như trong ảnh bản đồ:

Cầu Rồng Phun Lửa & Phun Nước
Lễ hội Ẩm thực Đà Nẵng 2026
DIFF 2026
Giải chạy Biển Mỹ Khê 2026
Triển lãm Công nghệ FPT University

Có thể là file:

events.ts
eventData.ts
eventService.ts

hoặc API backend lấy sự kiện.

4. Bạn muốn thuyết trình theo phong cách nào?

Chọn một kiểu để mình viết lời cho đúng giọng của bạn:

Kiểu 1: Dễ hiểu, sinh viên nói tự nhiên.
Kiểu 2: Chuyên nghiệp, giống báo cáo trước hội đồng.
Kiểu 3: Ngắn gọn, dễ học thuộc, đúng 5 phút.

Theo mình, bạn nên chọn Kiểu 3, vì phần Người 3 chỉ có 5 phút, nói quá kỹ sẽ bị lố thời gian.

Một lưu ý quan trọng: bạn đã gửi file .env, trong đó có thông tin cấu hình nhạy cảm như database, JWT, email. Khi làm slide hoặc demo, không đưa file .env lên slide, không chiếu màn hình có file này, và nếu project từng đẩy lên GitHub public thì nên đổi lại mật khẩu/app password/JWT secret.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```
Slide 1 — Use Case tổng quan hệ thống

“Trước tiên là sơ đồ Use Case tổng quan của hệ thống.

Dự án DN-Pulse được xây dựng với mục tiêu kết hợp ba nhóm chức năng chính: bản đồ đô thị, sự kiện tại Đà Nẵng, và cảnh báo giao thông theo ngữ cảnh.

Trong hệ thống, nhóm em chia người dùng thành các actor chính gồm: Guest, Member, Admin và hệ thống ngoài là Mapbox API.

Với Guest, người dùng chưa đăng nhập vẫn có thể tiếp cận hệ thống ở mức cơ bản, ví dụ như đăng ký tài khoản hoặc đăng nhập.

Với Member, đây là nhóm người dùng chính của hệ thống. Member có thể xem bản đồ, định vị vị trí hiện tại, tìm kiếm địa điểm POI, xem sự kiện, bật tắt các lớp cảnh báo giao thông, xem hoặc lưu lộ trình di chuyển.

Còn với Admin, hệ thống cho phép quản trị dữ liệu quan trọng như cập nhật POI, phát hành cảnh báo giao thông, truy xuất báo cáo thống kê và xử lý tài khoản vi phạm.

Điểm quan trọng của sơ đồ này là Mapbox API không phải người dùng, mà là một hệ thống ngoài hỗ trợ bản đồ. Frontend của nhóm sẽ tương tác với Mapbox để hiển thị bản đồ, marker, layer và tuyến đường.”

Slide 2 — Luồng nghiệp vụ người dùng trên bản đồ

“Tiếp theo là luồng nghiệp vụ chính của người dùng khi thao tác với bản đồ.

Khi Member truy cập vào trang chính, hệ thống sẽ hiển thị bản đồ khu vực Đà Nẵng. Trong code frontend, bản đồ được khởi tạo tại vị trí trung tâm Đà Nẵng với kinh độ khoảng 108.2022, vĩ độ khoảng 16.0544 và mức zoom ban đầu là 13.

Trên giao diện, người dùng có thể thực hiện các thao tác như:

Thứ nhất, xem bản đồ và quan sát các điểm sự kiện đang diễn ra.

Thứ hai, lọc theo danh mục, ví dụ điểm tham quan, nhà hàng, khách sạn, giải trí, sự kiện, bảo tàng hoặc ATM. Các danh mục này được khai báo trực tiếp trong frontend để phục vụ thanh lọc nhanh trên giao diện.

Thứ ba, nhận cảnh báo giao thông, ví dụ khu vực ngập lụt, đoạn đường cấm, hoặc những sự kiện có thể ảnh hưởng đến việc di chuyển. Trong prototype hiện tại, nhóm em đã mô phỏng các cảnh báo như ngập lụt tại Nguyễn Văn Linh, cấm đường Trần Hưng Đạo do sự kiện DIFF, và cảnh báo ngập khu vực cầu Tuyên Sơn.

Thứ tư, người dùng có thể chọn vị trí hiện tại và chọn điểm đến để hệ thống hiển thị lộ trình di chuyển.”

Slide 3 — Tích hợp Mapbox API và hiển thị bản đồ

“Về phần tích hợp Mapbox API, nhóm em sử dụng thư viện react-map-gl kết hợp với mapbox-gl để đưa bản đồ vào giao diện React.

Trong Home.tsx, nhóm em import các thành phần chính như Map, NavigationControl, Marker, Source, và Layer. Đây là các thành phần cốt lõi để hiển thị bản đồ, thêm marker, thêm control điều hướng và vẽ tuyến đường lên bản đồ.

Bản đồ sử dụng style mapbox://styles/mapbox/streets-v12, phù hợp với bài toán bản đồ đô thị vì nó hiển thị rõ đường, khu vực dân cư, địa danh và các tuyến giao thông. Token Mapbox được đọc từ biến môi trường VITE_MAPBOX_ACCESS_TOKEN, giúp tránh việc hard-code token trực tiếp trong component.

Trên bản đồ, nhóm em xử lý hai loại marker chính:

Một là marker vị trí hiện tại của người dùng. Khi người dùng cấp quyền vị trí, hệ thống lấy tọa độ từ Geolocation API của trình duyệt và hiển thị một marker màu xanh.

Hai là marker điểm đến. Khi người dùng click vào một vị trí trên bản đồ, hệ thống lưu lại tọa độ điểm đến và hiển thị marker màu đỏ tại vị trí đó. ”

Slide 4 — Luồng định tuyến từ frontend đến backend

“Phần quan trọng nhất trong màn hình bản đồ là luồng định tuyến.

Khi người dùng đã có vị trí hiện tại và click chọn điểm đến, frontend sẽ tự động gọi API định tuyến. Cụ thể, hệ thống gửi request POST đến endpoint:

http://localhost:5001/api/navigation/route

Trong body của request, frontend gửi bốn thông tin tọa độ gồm:

startLat, startLng, endLat, endLng.

Điều này có nghĩa là frontend không tự tính toán toàn bộ đường đi, mà chỉ thu thập dữ liệu đầu vào từ thao tác người dùng, sau đó chuyển cho backend xử lý.

Sau khi backend trả kết quả, frontend lưu dữ liệu vào routeData. Dữ liệu tuyến đường bao gồm tổng khoảng cách, thời gian dự kiến và danh sách tọa độ của tuyến đường.

Từ danh sách tọa độ này, frontend dựng lại dữ liệu theo chuẩn GeoJSON, cụ thể là dạng LineString. Đây là định dạng rất phổ biến trong các hệ thống bản đồ vì nó biểu diễn một đường đi bằng chuỗi các cặp tọa độ.

Sau đó, frontend dùng Source và Layer của Mapbox để vẽ tuyến đường lên bản đồ. Tuyến đường được cấu hình với màu xanh, độ rộng 6 pixel và độ mờ 0.85 để người dùng dễ quan sát trên nền bản đồ. ”

Slide 5 — Giao diện sự kiện và cảnh báo

“Bên cạnh định tuyến, hệ thống còn kết hợp lớp dữ liệu sự kiện và cảnh báo.

Ở panel bên trái, nhóm em hiển thị danh sách sự kiện tại Đà Nẵng như Cầu Rồng phun lửa, lễ hội ẩm thực, DIFF 2026, giải chạy biển Mỹ Khê và triển lãm công nghệ. Mỗi sự kiện có tên, thời gian, địa điểm và trạng thái như LIVE hoặc Sắp diễn ra.

Ở góc phải, nhóm em xây dựng các nút điều khiển lớp bản đồ. Các trạng thái như layers, traffic, flood được quản lý bằng state trong React. Điều này giúp hệ thống có khả năng bật tắt các lớp hiển thị như lớp giao thông hoặc lớp cảnh báo ngập.

Về mặt trải nghiệm người dùng, cách thiết kế này giúp người dùng không chỉ nhìn thấy đường đi, mà còn hiểu được bối cảnh xung quanh tuyến đường. Ví dụ, nếu tuyến đường đi qua khu vực đang có sự kiện hoặc cảnh báo ngập, hệ thống có thể hiển thị cảnh báo để người dùng cân nhắc lộ trình khác.”

Slide 6 — Liên kết với xác thực và bảo mật

“Một điểm nữa trong luồng nghiệp vụ là các chức năng chính được đặt sau bước đăng nhập.

Trong frontend, route /dashboard được bảo vệ bằng ProtectedRoute. Nếu chưa có token trong localStorage, người dùng sẽ bị chuyển về trang đăng nhập. Với route admin, hệ thống còn kiểm tra thêm role admin.

Ở backend, hệ thống sử dụng JWT để xác thực request. Middleware sẽ kiểm tra token từ header Authorization. Nếu thiếu token, token hết hạn hoặc token không hợp lệ, hệ thống sẽ trả về lỗi tương ứng.

Điều này giúp các chức năng cá nhân hóa như hồ sơ người dùng, lưu lộ trình hoặc các chức năng quản trị không bị truy cập tự do.”

Kết luận phần Người 3

“Tóm lại, ở phần Use Case và Mapbox API, nhóm em đã xây dựng được luồng tương tác chính cho người dùng: từ xem bản đồ, định vị, chọn điểm đến, gửi tọa độ xuống backend, nhận kết quả tuyến đường và hiển thị lại trên bản đồ bằng GeoJSON.

Điểm khác biệt của DN-Pulse so với một bản đồ thông thường là hệ thống không chỉ hiển thị đường đi, mà còn kết hợp thêm dữ liệu sự kiện và cảnh báo giao thông. Nhờ vậy, người dùng có thể ra quyết định di chuyển phù hợp hơn trong bối cảnh đô thị thực tế tại Đà Nẵng.

Phần tiếp theo, bạn của em sẽ trình bày sâu hơn về kiến trúc dữ liệu, bảo mật và các thành phần backend hỗ trợ cho hệ thống. Em xin cảm ơn quý thầy cô đã lắng nghe.”
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```
Kịch bản Người 3 — 5 phút

“Kính thưa quý thầy cô, em xin trình bày phần thứ ba của nhóm, đó là Use Case và tích hợp Mapbox API trong dự án DN-Pulse: Intelligent Urban Routing System.

Mục tiêu chính của phần này là giải thích cách người dùng tương tác với hệ thống bản đồ, đồng thời trình bày cách nhóm em tích hợp Mapbox để hiển thị bản đồ, sự kiện và cảnh báo giao thông.”

1. Nói về Use Case

“Trước tiên là về sơ đồ Use Case.

Trong hệ thống DN-Pulse, nhóm em chia thành các actor chính gồm Guest, Member, Admin và một hệ thống ngoài là Mapbox API.

Với Guest, người dùng chưa đăng nhập có thể đăng ký tài khoản hoặc đăng nhập vào hệ thống.

Với Member, đây là nhóm người dùng chính. Member có thể xem bản đồ, tìm kiếm địa điểm, định vị vị trí hiện tại, xem sự kiện, nhận cảnh báo giao thông và sử dụng chức năng định tuyến thông minh.

Ngoài ra, Member cũng có thể lưu lộ trình, xem lịch sử di chuyển hoặc chia sẻ vị trí trực tiếp.

Với Admin, hệ thống hỗ trợ các chức năng quản trị như cập nhật dữ liệu địa điểm POI, phát hành cảnh báo giao thông, truy xuất báo cáo thống kê và xử lý tài khoản vi phạm.

Còn Mapbox API đóng vai trò là hệ thống bản đồ bên ngoài, hỗ trợ hiển thị bản đồ, marker, layer và dữ liệu tuyến đường.”

2. Nói về màn hình bản đồ

“Tiếp theo là giao diện bản đồ chính của hệ thống.

Ở màn hình này, bản đồ được hiển thị tại khu vực Đà Nẵng. Bên trái là danh sách các sự kiện, ví dụ như Cầu Rồng phun lửa, lễ hội ẩm thực, DIFF 2026 hoặc các sự kiện sắp diễn ra.

Phía trên giao diện có thanh tìm kiếm và các bộ lọc nhanh như điểm tham quan, nhà hàng, khách sạn, giải trí, sự kiện, bảo tàng và ATM.

Phía bên phải là nhóm nút điều khiển bản đồ, ví dụ như định vị, bật tắt layer, xem cảnh báo giao thông hoặc cảnh báo ngập lụt.

Điểm quan trọng ở đây là hệ thống không chỉ hiển thị bản đồ đơn thuần, mà còn kết hợp thêm dữ liệu sự kiện và cảnh báo để hỗ trợ người dùng ra quyết định di chuyển tốt hơn.”

3. Nói về tích hợp Mapbox API

“Về mặt kỹ thuật, nhóm em sử dụng React, TypeScript và thư viện react-map-gl để tích hợp Mapbox vào frontend.

Trong màn hình bản đồ, hệ thống sử dụng các thành phần như Map, Marker, NavigationControl, Source và Layer.

Map dùng để hiển thị bản đồ chính.
Marker dùng để đánh dấu vị trí người dùng hoặc điểm đến.
NavigationControl hỗ trợ các nút phóng to, thu nhỏ và điều hướng bản đồ.
Còn Source và Layer được dùng để vẽ tuyến đường lên bản đồ.

Khi người dùng bấm lấy vị trí hiện tại, trình duyệt sẽ dùng Geolocation API để lấy tọa độ của người dùng. Sau đó, khi người dùng click chọn điểm đến trên bản đồ, hệ thống sẽ lưu lại tọa độ điểm đến.”

4. Nói về luồng định tuyến

“Luồng định tuyến hoạt động như sau:

Đầu tiên, người dùng lấy vị trí hiện tại.

Tiếp theo, người dùng chọn điểm đến trên bản đồ.

Sau đó, frontend gửi bốn thông tin tọa độ gồm startLat, startLng, endLat, endLng xuống API định tuyến của backend.

Backend xử lý yêu cầu và trả về kết quả tuyến đường, gồm khoảng cách, thời gian dự kiến và danh sách tọa độ của tuyến đường.

Frontend nhận dữ liệu này, chuyển thành định dạng GeoJSON LineString, sau đó dùng Mapbox để vẽ tuyến đường trực tiếp lên bản đồ.

Nhờ vậy, người dùng có thể nhìn thấy trực quan đường đi từ vị trí hiện tại đến điểm đến.”

5. Kết luận phần Người 3

“Tóm lại, phần Use Case và Mapbox API giúp thể hiện rõ cách người dùng tương tác với DN-Pulse.

Hệ thống cho phép người dùng xem bản đồ, tìm kiếm địa điểm, xem sự kiện, nhận cảnh báo giao thông và định tuyến thông minh.

Điểm nổi bật của DN-Pulse là không chỉ hiển thị đường đi, mà còn kết hợp thêm bối cảnh đô thị như sự kiện, cảnh báo cấm đường và cảnh báo ngập lụt. Đây là yếu tố giúp hệ thống phù hợp hơn với nhu cầu di chuyển thực tế tại Đà Nẵng.

Em xin kết thúc phần trình bày của mình tại đây. Sau đây, em xin chuyển sang phần tiếp theo của nhóm.”
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit |  |
| File liên quan |  |
| Screenshot | <img width="693" height="851" alt="image" src="https://github.com/user-attachments/assets/0235ca53-1e42-4757-89f6-d4a17fbafc33" />
<img width="840" height="744" alt="image" src="https://github.com/user-attachments/assets/56c1449f-fc92-430d-8fc7-7919e55cc7a2" />

 |
| Kết quả chạy/test |  |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
Viết tại đây...
```

---

### Lần sử dụng AI số 3

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 15/06/2026 |
| Công cụ AI | ChatGPT / Gemini |
| Mục đích sử dụng | Thêm chức năng hiển thị và né vùng ngập lụt |
| Phần việc liên quan | Design / Database / Frontend / Backend |
| Mức độ sử dụng | Hỗ trợ ý tưởng / Hỗ trợ một phần / Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```
Hiện tại đã hiện lên được cùng ngập lụt nhưng không bấm vào để dẫn đường được Yêu cầu: 
1. Bấm vào vùng ngập dưới 10cm thì đề xuất đường bình thường 
2. Bấm vào vùng ngập trên 10cm thì hiện thông báo hỏi ý kiến người dùng có chắc chắn muốn vào vùng nguy hiểm không? Nếu ok thì chỉ đường còn không thì trở lại màn hình chỉnh để chọn địa điểm khác 
3. Nếu chọn đi vào vùng nguy hiểm nhưng trên đường đến thì cũng có 1 vùng ngập 10cm khác thì phải đề xuất đường tránh vùng ngập đó
```

#### 4.2. Kết quả AI gợi ý

```text
Viết tại đây...
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```
Đúng rồi, hiện tại bạn bấm vào vùng ngập chỉ mở popup, vì trong handleMapClick của bạn đang có đoạn:

setSelectedFloodZone({
    lng: event.lngLat.lng,
    lat: event.lngLat.lat,
    properties: zone.properties
});
return;

Dòng return; làm cho code dừng lại, nên nó không set destination, không dẫn đường.

Bạn sửa theo hướng sau.

1. Thay toàn bộ handleMapClick hiện tại

Tìm đoạn:

const handleMapClick = (event: any) => {
    if (selectedPOI) return;

    if (mapRef.current) {
        const features = mapRef.current.queryRenderedFeatures(event.point, {
            layers: ['flood-zones-fill']
        });
        if (features && features.length > 0) {
            const zone = features[0];
            setSelectedFloodZone({
                lng: event.lngLat.lng,
                lat: event.lngLat.lat,
                properties: zone.properties
            });
            return; 
        }
    }
    const { lng, lat } = event.lngLat;
    setDestination({ lng, lat, label: `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}` });
    setDestinationQuery(`Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`);
};

Thay bằng đoạn này:

const handleMapClick = (event: any) => {
    if (selectedPOI) return;

    const { lng, lat } = event.lngLat;

    if (mapRef.current && mapControls.flood) {
        const features = mapRef.current.queryRenderedFeatures(event.point, {
            layers: ['flood-zones-fill']
        });

        if (features && features.length > 0) {
            const feature = features[0];
            const props = feature.properties || {};

            const zoneId = String(props.id);
            const zoneName = props.name || 'Vùng ngập';
            const depthCm = Number(props.depthCm || 0);
            const label = `${zoneName} - ngập ${depthCm}cm`;

            setSelectedFloodZone({
                lng,
                lat,
                properties: props
            });

            // Vùng ngập <= 10cm: cho chọn điểm đến bình thường
            if (depthCm <= 10) {
                setDestination({ lng, lat, label });
                setDestinationQuery(label);

                if (userLocation) {
                    setOrigin({
                        lng: userLocation.lng,
                        lat: userLocation.lat,
                        label: 'Vị trí của bạn'
                    });
                    setOriginQuery('Vị trí của bạn');
                }

                return;
            }

            // Vùng ngập > 10cm: hỏi xác nhận
            const confirmed = window.confirm(
                `Khu vực này đang ngập ${depthCm}cm, có thể nguy hiểm.\n\nBạn có chắc chắn muốn đi vào vùng ngập này không?`
            );

            if (confirmed) {
                // Cho phép đi vào đúng vùng ngập user đã chọn
                setConfirmedFloodZoneIds((prev) => {
                    if (prev.includes(zoneId)) return prev;
                    return [...prev, zoneId];
                });

                setDestination({ lng, lat, label });
                setDestinationQuery(label);

                if (userLocation) {
                    setOrigin({
                        lng: userLocation.lng,
                        lat: userLocation.lat,
                        label: 'Vị trí của bạn'
                    });
                    setOriginQuery('Vị trí của bạn');
                }
            } else {
                // Không chọn điểm đến, để user chọn lại
                setDestination(null);
                setDestinationQuery('');
                setRouteData(null);
                setRouteAlertMessage(null);
            }

            return;
        }
    }

    const label = `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;

    validateLocation(
        lng,
        lat,
        label,
        'destination',
        () => {
            setDestination({ lng, lat, label });
            setDestinationQuery(label);

            if (userLocation) {
                setOrigin({
                    lng: userLocation.lng,
                    lat: userLocation.lat,
                    label: 'Vị trí của bạn'
                });
                setOriginQuery('Vị trí của bạn');
            }
        },
        () => {
            setDestination(null);
            setDestinationQuery('');
        }
    );
};

Đoạn này đáp ứng:

<= 10cm  → chọn làm điểm đến và chỉ đường bình thường
> 10cm   → hỏi xác nhận
OK       → đặt điểm đến và chỉ đường
Cancel   → không đặt điểm đến, cho chọn lại
2. Sửa render layer để có depthCm trong properties

Trong floodGeoJSON, đảm bảo properties có dòng này:

depthCm: zone.depthCm,

Đoạn đúng phải giống như này:

properties: {
    id: zone.id,
    zone_id: zone.zone_id,
    name: zone.name,
    district: zone.district,
    risk_level: zone.risk_level,
    depthCm: zone.depthCm,
    level: zone.level,
    description: zone.description,
    typical_flood_months: zone.typical_flood_months,
    color:
        zone.level === 'high'
            ? '#ef4444'
            : zone.level === 'medium'
                ? '#f97316'
                : '#eab308'
},

Nếu thiếu depthCm, khi click vào vùng ngập thì depthCm sẽ thành 0, điều kiện nguy hiểm sẽ không chạy đúng.

3. Sửa useEffect tìm đường để chạy lại khi floodZones thay đổi

Hiện tại effect tìm đường của bạn đang thiếu floodZones trong dependency.

Tìm dòng cuối của effect tìm đường:

}, [origin, destination, travelMode, mapControls.flood, confirmedFloodZoneIds]);

Thay bằng:

}, [origin, destination, travelMode, mapControls.flood, confirmedFloodZoneIds, floodZones]);

Việc này giúp khi dữ liệu vùng ngập từ SQL Server tải xong, thuật toán né vùng ngập có dữ liệu mới để xử lý.

4. Yêu cầu số 3 phụ thuộc vào findSafeRouteZone

Yêu cầu của bạn:

Nếu chọn đi vào vùng nguy hiểm nhưng trên đường đến còn có vùng ngập >10cm khác thì phải đề xuất đường tránh vùng đó.

Logic này phải nằm trong file:

src/frontend/src/utils/floodZoneRouteUtils.ts

Nguyên tắc đúng là:

- Vùng ngập user đã xác nhận đi vào: được phép đi vào
- Các vùng ngập khác > 10cm: vẫn phải né
- Vùng ngập <= 10cm: không cần né

Trong findSafeRouteZone, khi kiểm tra vùng cần né, điều kiện phải kiểu như này:

const dangerousZones = floodZones.filter((zone) => {
    const isDangerous = zone.depthCm > 10;
    const isConfirmed = confirmedFloodZoneIds.includes(String(zone.id));

    return isDangerous && !isConfirmed;
});

Nghĩa là nếu user chọn vùng ngập id = 3 và đã OK, thì vùng đó được phép là điểm đến. Nhưng nếu tuyến đường đi ngang vùng ngập id = 1 hoặc id = 2 cũng >10cm mà chưa xác nhận, hệ thống vẫn phải tìm đường tránh.

5. Sau khi sửa, test theo 3 case

Test nhanh như sau:

Case 1:
Bấm vùng vàng 8cm
→ Không hiện confirm
→ Tự đặt điểm đến
→ Chỉ đường bình thường

Case 2:
Bấm vùng cam/đỏ 15cm, 25cm, 55cm, 80cm
→ Hiện confirm
→ Bấm Cancel
→ Không tạo đường, vẫn ở màn hình map

Case 3:
Bấm vùng cam/đỏ
→ Bấm OK
→ Có route tới vùng đó
→ Nếu route đi qua vùng ngập >10cm khác thì route phải né vùng đó

Tóm lại: bạn sửa chính ở handleMapClick. Hiện tại nó chỉ mở popup rồi return, nên không dẫn đường. Sau khi thay đoạn trên, click vùng ngập sẽ vừa hiện popup vừa đặt điểm đến theo đúng điều kiện ngập.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```
AI đưa ra đáp án hướng đi chuẩn hoàn toàn đối với yêu cầu nóm tôi nên không cần cải tiến hay cân chỉnh gì thêm
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit |  |
| File liên quan |  |
| Screenshot | <img width="807" height="776" alt="image" src="https://github.com/user-attachments/assets/629fa50d-4310-464c-8a1d-11901047173a" />
<img width="822" height="870" alt="image" src="https://github.com/user-attachments/assets/a2fd5132-ed68-4219-8410-6457b7a67ac2" />
<img width="887" height="857" alt="image" src="https://github.com/user-attachments/assets/d67e5395-209a-4e34-83a8-814c6678dcfe" />
<img width="911" height="891" alt="image" src="https://github.com/user-attachments/assets/e90930c5-3306-449e-9170-7925c6623848" />
<img width="923" height="882" alt="image" src="https://github.com/user-attachments/assets/e1031b7d-8846-4080-9766-fddb0437fa5f" />
<img width="882" height="887" alt="image" src="https://github.com/user-attachments/assets/61244ce7-d0b2-43af-ace7-a01909d0b832" />
<img width="823" height="833" alt="image" src="https://github.com/user-attachments/assets/a05edcf3-c755-4ed0-b68e-2ce7b8dc2a33" />
<img width="606" height="802" alt="image" src="https://github.com/user-attachments/assets/ba4d231c-b879-4ef5-86d3-cb0d1b40b16c" />


 |
| Kết quả chạy/test | Thành công|
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```
Vì đã đưa prompt có yeeucaauf cụ thể rõ ràng nên AI đã làm đúng theo ý của người viết prompt
```

---

## 5. Bảng tổng hợp mức độ sử dụng AI

Đánh dấu mức độ AI hỗ trợ ở từng hạng mục.

| Hạng mục | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh chính | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Phân tích yêu cầu |  |  | x |  |  |
| Viết user story/use case |  |  | x |  |  |
| Thiết kế database |  |  | x |  |  |
| Thiết kế kiến trúc hệ thống |  |  | x |  |  |
| Thiết kế giao diện |  |  |  | x |  |
| Code frontend |  |  |  | x |  |
| Code backend |  |  |  | x |  |
| Debug lỗi |  |  |  | x |  |
| Viết test case |  |  | x |  |  |
| Kiểm thử sản phẩm |  |  | x |  |  |
| Tối ưu code |  |  |  | x |  |
| Viết báo cáo |  |  |  | x |  |
| Làm slide thuyết trình |  |  |  | x |  |

---

## 6. Các lỗi hoặc hạn chế từ AI

Ghi lại các trường hợp AI trả lời sai, thiếu, chưa phù hợp hoặc sinh code không chạy.

| STT | Lỗi/hạn chế từ AI | Cách phát hiện | Cách xử lý/cải tiến |
|---:|---|---|---|
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |

---

## 7. Kiểm chứng kết quả AI

Mô tả cách sinh viên/nhóm kiểm tra lại kết quả do AI gợi ý.

Có thể bao gồm:

- Chạy thử chương trình
- Viết test case
- So sánh với yêu cầu đề bài
- Kiểm tra output
- Đối chiếu tài liệu môn học
- Hỏi lại giảng viên
- Review cùng thành viên nhóm
- Kiểm tra lỗi bảo mật
- Kiểm tra bằng dữ liệu mẫu
- So sánh trước và sau khi dùng AI

### Nội dung kiểm chứng

```text
Viết tại đây...
```

---

## 8. Đóng góp cá nhân hoặc đóng góp nhóm

### 8.1. Đối với bài cá nhân

Mô tả phần sinh viên tự làm, phần AI hỗ trợ và phần đã tự cải tiến.

```text
Viết tại đây...
```

### 8.2. Đối với bài nhóm

| Thành viên | MSSV | Nhiệm vụ chính | Có sử dụng AI không? | Minh chứng đóng góp |
|---|---|---|---|---|
|  |  |  | Có / Không |  |
|  |  |  | Có / Không |  |
|  |  |  | Có / Không |  |
|  |  |  | Có / Không |  |

---

## 9. Reflection cuối bài

### 9.1. AI đã hỗ trợ em/nhóm ở điểm nào?

```text
Viết tại đây...
```

### 9.2. Phần nào em/nhóm không sử dụng theo gợi ý của AI? Vì sao?

```text
Viết tại đây...
```

### 9.3. Em/nhóm đã kiểm tra tính đúng đắn của kết quả AI như thế nào?

```text
Viết tại đây...
```

### 9.4. Nếu không có AI, phần nào sẽ khó khăn nhất?

```text
Viết tại đây...
```

### 9.5. Sau bài tập/project này, em/nhóm học được gì về môn học?

```text
Viết tại đây...
```

### 9.6. Sau bài tập/project này, em/nhóm học được gì về cách sử dụng AI có trách nhiệm?

```text
Viết tại đây...
```

---

## 10. Cam kết học thuật

Sinh viên/nhóm cam kết rằng:

- Nội dung AI hỗ trợ đã được ghi nhận trung thực.
- Không nộp nguyên văn kết quả AI mà không kiểm tra.
- Có khả năng giải thích các phần đã nộp.
- Chịu trách nhiệm về tính đúng đắn của sản phẩm cuối cùng.
- Hiểu rằng việc sử dụng AI không khai báo có thể ảnh hưởng đến kết quả đánh giá.

| Đại diện sinh viên/nhóm | Ngày xác nhận |
|---|---|
|  |  |
