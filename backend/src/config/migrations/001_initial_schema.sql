-- 001_initial_schema.sql
-- Run this once to create all tables in my PostgreSQL database


-- -------USERS----------
-- Store every registered user regardless of role
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(50) NOT NULL,
    last_name       VARCHAR(50) NOT NULL,
    email           VARCHAR(225) NOT NULL UNIQUE,
    password_hash   VARCHAR(225) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'recipient'
                    CHECK (role IN ('donor', 'recipient', 'admin')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email to search by email on every login
-- Without this index, PostgreSQL scans every row to find a match with it, lookups are near instant even with millions of users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- --------------CLAIM RECORDS----------------------
-- Tracks every claim ever made to help implement fair distribution limit 
CREATE TABLE IF NOT EXISTS claim_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id      VARCHAR(24) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'cancelled')),
    claimed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_up_at    TIMESTAMPTZ
);


-- Index on recipient_id + claimed_at together.
-- Query for claim limit:
-- WHERE recipient_id = $1 AND claimed_at >= NOW() - INTERVAL '7 days'
-- Having both columns indexed should make this query very fast
CREATE INDEX IF NOT EXISTS idx_claims_recipient_date
    ON claim_records(recipient_id, claimed_at);


-- -----------AUDIT LOG--------------
-- To record every admin action, this required for accountability 
CREATE TABLE IF NOT EXISTS audit_log(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    target_id       VARCHAR(255),
    reason          TEXT,
    matadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Index on admin_id so we can quickly find all actions by a specific admin
CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_log(admin_id);

-- -----------UPDATED_AT TRIGER----------------
-- Automatically updates the updated_at column whenever a user row changes.
-- Without this we'd have to manually set updated_at in every UPDATE query
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();