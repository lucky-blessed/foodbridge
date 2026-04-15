ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_notification_type_check
    CHECK (notification_type IN (
        'NewListing',
        'ClaimConfirm',
        'LimitWarning',
        'PickupReminder',
        'PickupConfirmed',
        'PickupScheduled'
    ));