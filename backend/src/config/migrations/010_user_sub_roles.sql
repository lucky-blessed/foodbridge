-- 010_user_sub_roles.sql
-- Adds sub-role and demographic fields to the users table.
-- These support the Individual/Organization distinction for donors and recipients,
-- demographic reporting for city planning, and profile pictures for all users.
--
-- All new columns are nullable so existing users are unaffected.
-- Sub-role defaults to 'individual' for backwards compatibility.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS sub_role        VARCHAR(20)  DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS org_name        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS org_type        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS org_reg_number  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS age_range       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS gender          VARCHAR(30),
    ADD COLUMN IF NOT EXISTS profile_pic_url VARCHAR(255);

-- Index to support demographic queries filtering by sub_role
CREATE INDEX IF NOT EXISTS idx_users_sub_role
    ON users(sub_role);

-- Index to support demographic queries filtering by gender and age_range
CREATE INDEX IF NOT EXISTS idx_users_demographics
    ON users(gender, age_range)
    WHERE gender IS NOT NULL AND age_range IS NOT NULL;