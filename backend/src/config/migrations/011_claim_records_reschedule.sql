ALTER TABLE claim_records
    ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reschedule_count INTEGER default 0,
    ADD COLUMN IF NOT EXISTS reschedule_history JSONB;