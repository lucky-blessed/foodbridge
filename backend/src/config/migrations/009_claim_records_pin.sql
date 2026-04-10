ALTER TABLE claim_records
    ADD COLUMN IF NOT EXISTS pickup_pin_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pin_attempts INTEGER;