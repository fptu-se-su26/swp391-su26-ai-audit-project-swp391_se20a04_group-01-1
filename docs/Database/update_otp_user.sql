ALTER TABLE Users ADD otp NVARCHAR(6) NULL;
ALTER TABLE Users ADD otp_expires DATETIME NULL;
ALTER TABLE Users ADD is_email_verified BIT DEFAULT 0;
-- Cập nhật dữ liệu cho các user cũ (nếu bạn muốn họ đăng nhập được ngay mà không cần xác thực)
UPDATE Users SET is_email_verified = 1 WHERE is_email_verified IS NULL;