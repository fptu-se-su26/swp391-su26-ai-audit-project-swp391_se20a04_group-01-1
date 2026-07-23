-- Migration: thêm cột save_type để phân biệt "Lưu lộ trình" (manual) và "Lịch sử di chuyển" (history)
-- Chạy 1 lần trên SQL Server (SSMS / sqlcmd). An toàn để chạy lại nhiều lần (idempotent).

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.SavedRoutes') AND name = 'save_type'
)
BEGIN
    ALTER TABLE dbo.SavedRoutes
    ADD save_type NVARCHAR(20) NOT NULL CONSTRAINT DF_SavedRoutes_save_type DEFAULT ('manual');
END
GO

-- Backfill dữ liệu cũ: các dòng do "Bắt đầu chuyến đi" tạo ra trước đây có tên bắt đầu bằng "Lịch sử: "
-- (xem handleNavigationCompleted trong Home.tsx) -> đánh dấu lại là 'history' để không bị dedupe/update nhầm.
UPDATE dbo.SavedRoutes
SET save_type = 'history'
WHERE route_name LIKE N'Lịch sử:%' AND save_type = 'manual';
GO

-- Khuyến nghị: thêm index hỗ trợ truy vấn dedupe (user_id + save_type + profile)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.SavedRoutes') AND name = 'IX_SavedRoutes_user_savetype_profile'
)
BEGIN
    CREATE INDEX IX_SavedRoutes_user_savetype_profile
    ON dbo.SavedRoutes (user_id, save_type, profile);
END
GO