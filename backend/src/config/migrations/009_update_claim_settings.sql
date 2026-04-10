-- 009_update_claim_settings.sql
-- Replaces the generic 'claim_limit' key with two sub-role specific keys:
--   claim_limit_individual   — for individual recipients (default 3)
--   claim_limit_organization — for organization recipients (default 10)
-- The original 'claim_limit' key is removed to avoid ambiguity.
-- claim.service.js will read the correct key based on recipient sub_role.

INSERT INTO platform_settings (key, value)
VALUES
    ('claim_limit_individual',   '3'),
    ('claim_limit_organization', '10')
ON CONFLICT (key) DO NOTHING;

DELETE FROM platform_settings WHERE key = 'claim_limit';