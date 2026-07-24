-- DN-Pulse: Intelligent Urban Routing System Database Schema
-- DBMS: Microsoft SQL Server (MSSQL)
-- Created based on the updated ERD

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