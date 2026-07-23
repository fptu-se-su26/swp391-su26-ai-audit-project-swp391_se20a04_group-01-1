ALTER TABLE EventImages
ADD approval_status NVARCHAR(20) NOT NULL
    CONSTRAINT DF_EventImages_Approval DEFAULT 'pending';

ALTER TABLE EventImages
ADD reviewed_by INT NULL;

ALTER TABLE EventImages
ADD reviewed_at DATETIME NULL;

ALTER TABLE EventImages
ADD rejection_reason NVARCHAR(500) NULL;