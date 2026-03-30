-- Add canclled_at column to claim_records
-- Required by ClaimService.cancel() and getMyHistory()

ALTER TABLE claim_records
    ADD COLUMN IF NOT EXISTS canclled_at TIMESTAMPTZ;