-- Fix typo column name: canclled_at -> cancelled_at

ALTER TABLE claim_records
    RENAME COLUMN canclled_at TO cancelled_at;