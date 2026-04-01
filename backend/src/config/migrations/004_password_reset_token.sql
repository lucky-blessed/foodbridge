-- Password reset tokens table
-- One token per user at a time, old tokens are replaced on new requests
-- Token expires after 1 hour
-- Used by POST /auth/forget-password and POST /auth/reset-password

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    Used        BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inx_password_reset_tokens_token
    ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS inx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);