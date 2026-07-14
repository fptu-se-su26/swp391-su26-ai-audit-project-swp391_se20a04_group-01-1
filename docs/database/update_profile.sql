-- ============================================================
-- EMAIL VERIFICATION FEATURE - SQL MIGRATION
-- ============================================================
-- Dùng script này nếu muốn chạy SQL trực tiếp thay vì db_patch.js
-- Chạy trên SQL Server Management Studio hoặc Azure Data Studio
-- ============================================================

-- 1. Thêm cột is_email_verified vào bảng Users
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Users') AND name = 'is_email_verified'
)
BEGIN
    ALTER TABLE Users ADD is_email_verified BIT NOT NULL DEFAULT 0;
    PRINT 'Added is_email_verified column to Users table';
END
ELSE
BEGIN
    PRINT 'is_email_verified column already exists';
END
GO

-- 2. Kiểm tra cột otp và otp_expires (nếu chưa có)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Users') AND name = 'otp'
)
BEGIN
    ALTER TABLE Users ADD otp NVARCHAR(6) NULL;
    PRINT 'Added otp column to Users table';
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Users') AND name = 'otp_expires'
)
BEGIN
    ALTER TABLE Users ADD otp_expires DATETIME NULL;
    PRINT 'Added otp_expires column to Users table';
END
GO

-- 3. (Tùy chọn) Cập nhật tất cả users hiện tại thành verified = 1
-- Bỏ comment nếu muốn không làm phiền users cũ
-- UPDATE Users SET is_email_verified = 1 WHERE is_email_verified = 0;

-- 4. Kiểm tra bảng Users
SELECT TOP 5
    user_id,
    email,
    username,
    is_email_verified,
    otp,
    otp_expires,
    created_at
FROM Users
ORDER BY created_at DESC;

PRINT ' Migration completed successfully!';