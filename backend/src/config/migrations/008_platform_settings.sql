-- 008_platform_settings.sql
-- Stores configurable platform settings adjustable by admins.
-- Using a key-value structure so new settings can be added
-- without schema changes.

CREATE TABLE IF NOT EXISTS platform_settings (
    key         VARCHAR(50) PRIMARY KEY,
    value       VARCHAR(255) NOT NULL,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default claim limit values
-- These match the hardcoded constants currently in claim.service.js
INSERT INTO platform_settings (key, value)
VALUES
    ('claim_limit',  '3'),
    ('window_days',  '7')
ON CONFLICT (key) DO NOTHING;