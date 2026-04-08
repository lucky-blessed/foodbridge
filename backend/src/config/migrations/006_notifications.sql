-- 006_notifications.sql
-- Creates the notifications table for FR-14 (in-app push notifications)
-- Stores all notifications persistently so users see them after reconnecting
-- Real-time delivery is layered on top via Socket.io in the notification service

CREATE TABLE IF NOT EXISTS notifications (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message           TEXT        NOT NULL,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN (
                          'NewListing',
                          'ClaimConfirm',
                          'LimitWarning',
                          'PickupReminder'
                      )),
    is_read           BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Serves two frequent queries:
--   1. Fetch all notifications: WHERE user_id = $1 ORDER BY created_at DESC
--   2. Unread badge count:      WHERE user_id = $1 AND is_read = FALSE
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON notifications(user_id, is_read);

-- Prevents a full sort on the notifications page
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at DESC);
