-- Drop the typo column canclled_at if it still exists
-- 002 added cancelled_at correctly
-- 003 skipped the rename because cancelled_at already existed
-- This cleans up the leftover typo column

ALTER TABLE claim_records
    DROP COLUMN IF EXISTS canclled_at;