USE YourDatabaseName;
GO

IF COL_LENGTH('dbo.TrafficAlerts', 'last_verified_at') IS NULL
BEGIN
    ALTER TABLE dbo.TrafficAlerts
    ADD last_verified_at DATETIME2 NULL;
END;
GO

IF COL_LENGTH('dbo.TrafficAlerts', 'expire_after_minutes') IS NULL
BEGIN
    ALTER TABLE dbo.TrafficAlerts
    ADD expire_after_minutes INT NULL;
END;
GO

IF COL_LENGTH('dbo.TrafficAlerts', 'expire_at') IS NULL
BEGIN
    ALTER TABLE dbo.TrafficAlerts
    ADD expire_at DATETIME2 NULL;
END;
GO

IF COL_LENGTH('dbo.TrafficAlerts', 'like_count') IS NULL
BEGIN
    ALTER TABLE dbo.TrafficAlerts
    ADD like_count INT NOT NULL
        CONSTRAINT DF_TrafficAlerts_like_count DEFAULT 0;
END;
GO

IF COL_LENGTH('dbo.TrafficAlerts', 'dislike_count') IS NULL
BEGIN
    ALTER TABLE dbo.TrafficAlerts
    ADD dislike_count INT NOT NULL
        CONSTRAINT DF_TrafficAlerts_dislike_count DEFAULT 0;
END;
GO



///chạy cái này sau
UPDATE dbo.TrafficAlerts
SET expire_after_minutes =
    CASE
        WHEN UPPER(alert_type) = 'FLOOD'
             AND UPPER(severity) IN ('LOW', 'LIGHT', N'NHẸ')
            THEN 30

        WHEN UPPER(alert_type) = 'FLOOD'
             AND UPPER(severity) IN ('MEDIUM', 'MODERATE', N'TRUNG BÌNH')
            THEN 60

        WHEN UPPER(alert_type) = 'FLOOD'
             AND UPPER(severity) IN ('HIGH', 'SEVERE', N'NẶNG')
            THEN 90

        WHEN UPPER(alert_type) IN ('CONGESTION', 'TRAFFIC_JAM')
             AND UPPER(severity) IN ('LOW', 'LIGHT', N'NHẸ')
            THEN 20

        WHEN UPPER(alert_type) IN ('CONGESTION', 'TRAFFIC_JAM')
             AND UPPER(severity) IN ('MEDIUM', 'MODERATE', N'TRUNG BÌNH')
            THEN 30

        WHEN UPPER(alert_type) IN ('CONGESTION', 'TRAFFIC_JAM')
             AND UPPER(severity) IN ('HIGH', 'SEVERE', N'NẶNG')
            THEN 45

        WHEN UPPER(alert_type) = 'ACCIDENT'
            THEN 90

        ELSE 30
    END
WHERE expire_after_minutes IS NULL;
GO

UPDATE dbo.TrafficAlerts
SET last_verified_at = ISNULL(created_at, SYSDATETIME())
WHERE last_verified_at IS NULL;
GO

UPDATE dbo.TrafficAlerts
SET expire_at = DATEADD(
    MINUTE,
    expire_after_minutes,
    last_verified_at
)
WHERE expire_at IS NULL;
GO


//tạo bảng vote
IF OBJECT_ID('dbo.TrafficAlertVotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrafficAlertVotes
    (
        vote_id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_TrafficAlertVotes PRIMARY KEY,

        alert_id INT NOT NULL,

        user_id INT NOT NULL,

        vote_type VARCHAR(10) NOT NULL,

        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_TrafficAlertVotes_created_at
            DEFAULT SYSDATETIME(),

        updated_at DATETIME2 NOT NULL
            CONSTRAINT DF_TrafficAlertVotes_updated_at
            DEFAULT SYSDATETIME(),

        CONSTRAINT FK_TrafficAlertVotes_TrafficAlerts
            FOREIGN KEY (alert_id)
            REFERENCES dbo.TrafficAlerts(alert_id)
            ON DELETE CASCADE,

        CONSTRAINT FK_TrafficAlertVotes_Users
            FOREIGN KEY (user_id)
            REFERENCES dbo.Users(user_id)
            ON DELETE CASCADE,

        CONSTRAINT CK_TrafficAlertVotes_vote_type
            CHECK (vote_type IN ('LIKE', 'DISLIKE')),

        CONSTRAINT UQ_TrafficAlertVotes_alert_user
            UNIQUE (alert_id, user_id)
    );
END;
GO

//tạo INDEX
IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TrafficAlertVotes_alert_id'
      AND object_id = OBJECT_ID('dbo.TrafficAlertVotes')
)
BEGIN
    CREATE INDEX IX_TrafficAlertVotes_alert_id
    ON dbo.TrafficAlertVotes(alert_id);
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TrafficAlertVotes_user_id'
      AND object_id = OBJECT_ID('dbo.TrafficAlertVotes')
)
BEGIN
    CREATE INDEX IX_TrafficAlertVotes_user_id
    ON dbo.TrafficAlertVotes(user_id);
END;
GO