-- Create enums for AI ingestion tracking (if they don't exist)
DO $$ BEGIN
    CREATE TYPE processing_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY_NEEDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE admin_review_status AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'CORRECTED', 'DISMISSED', 'ESCALATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create AI ingestion tracking table
CREATE TABLE IF NOT EXISTS ai_ingest_checks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "brokerCsvFormatId" TEXT NOT NULL,
    "csvUploadLogId" TEXT UNIQUE NOT NULL,
    "importBatchId" TEXT UNIQUE NOT NULL,
    
    -- Processing tracking
    "processingStatus" processing_status DEFAULT 'PENDING',
    "orderIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "processingTimeMs" INTEGER,
    
    -- User feedback
    "userIndicatedError" BOOLEAN DEFAULT false,
    "userReviewedAt" TIMESTAMP(3),
    
    -- Admin review
    "adminReviewStatus" admin_review_status DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "adminReviewedAt" TIMESTAMP(3),
    "adminReviewedBy" TEXT,
    
    -- Quality metrics
    "aiConfidence" REAL NOT NULL,
    "mappingAccuracy" REAL,
    "dataQualityScore" REAL,
    
    -- Metadata
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_broker_csv_format FOREIGN KEY ("brokerCsvFormatId") REFERENCES broker_csv_formats(id),
    CONSTRAINT fk_csv_upload_log FOREIGN KEY ("csvUploadLogId") REFERENCES csv_upload_logs(id),
    CONSTRAINT fk_import_batch FOREIGN KEY ("importBatchId") REFERENCES import_batches(id),
    CONSTRAINT fk_admin_reviewer FOREIGN KEY ("adminReviewedBy") REFERENCES users(id)
);

-- Create indexes for ai_ingest_checks
CREATE INDEX IF NOT EXISTS idx_ai_ingest_checks_user_flagged ON ai_ingest_checks("userId", "userIndicatedError", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_ai_ingest_checks_admin_queue ON ai_ingest_checks("adminReviewStatus", "createdAt");
CREATE INDEX IF NOT EXISTS idx_ai_ingest_checks_user_recent ON ai_ingest_checks("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_ai_ingest_checks_confidence ON ai_ingest_checks("aiConfidence");
CREATE INDEX IF NOT EXISTS idx_ai_ingest_checks_priority ON ai_ingest_checks("userIndicatedError", "adminReviewStatus");
CREATE INDEX IF NOT EXISTS idx_ai_ingest_checks_broker_format ON ai_ingest_checks("brokerCsvFormatId");

-- Create feedback items table
CREATE TABLE IF NOT EXISTS ai_ingest_feedback_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "aiIngestCheckId" TEXT NOT NULL,
    "csvHeader" VARCHAR(255) NOT NULL,
    "aiMapping" VARCHAR(255) NOT NULL,
    "suggestedMapping" VARCHAR(255),
    "issueType" TEXT,
    "comment" TEXT,
    "confidence" REAL,
    
    -- Audit fields
    "isCorrect" BOOLEAN,
    "correctedBy" TEXT,
    "correctedAt" TIMESTAMP(3),
    "originalValue" TEXT,
    
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_ai_ingest_check FOREIGN KEY ("aiIngestCheckId") REFERENCES ai_ingest_checks(id) ON DELETE CASCADE
);

-- Create index for feedback items
CREATE INDEX IF NOT EXISTS idx_ai_ingest_feedback_items_check ON ai_ingest_feedback_items("aiIngestCheckId");

-- Create daily upload count table for rate limiting
CREATE TABLE IF NOT EXISTS daily_upload_counts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER DEFAULT 0,
    
    -- Foreign key
    CONSTRAINT fk_user_upload FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT unique_user_date UNIQUE ("userId", "date")
);

-- Create index for daily upload counts
CREATE INDEX IF NOT EXISTS idx_daily_upload_counts ON daily_upload_counts("userId", "date");

-- Add update trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_ingest_checks_updated_at
    BEFORE UPDATE ON ai_ingest_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();