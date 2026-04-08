-- 007_user_location.sql
-- Adds location columns to the users table.
-- These are used by the NewListing notification query to find
-- recipients within 25 km of a newly posted listing.
-- Nullable because location is set optionally from the profile page.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS location_lat DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS location_lng DECIMAL(9,6);

-- Index speeds up the Haversine radius query in listing.controller.js
-- which filters WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_users_location
    ON users(location_lat, location_lng)
    WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;