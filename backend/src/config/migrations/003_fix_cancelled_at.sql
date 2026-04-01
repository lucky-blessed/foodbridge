-- Rename typo column if it still exists
-- Safe to re-run — skips if already renamed

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name  = 'claim_records'
          AND column_name = 'canclled_at'
    ) THEN
        ALTER TABLE claim_records
            RENAME COLUMN canclled_at TO cancelled_at;
    END IF;
END $$;