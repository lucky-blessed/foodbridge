/**
 * notification.service.js - Notification Service
 *
 * Handles creating, fetching, and marking notifications as read.
 *
 * Key design decisions:
 *      1. Non-blocking by design. Every call to createNotification is
 *         wrapped in a try/catch at the call site (listing, claim service).
 *         A notification failure should NEVER crash the main operation
 *         (posting a listing, claiming food). It is always a side effect.
 *      2. Real-time + persistent. We write to PostgreSQL first (persistent),
 *         then emit via Socket.io (real-time). If the socket emit fails,
 *         the notification is still in the DB and visible on next page load.
 *      3. Socket.io rooms. Each logged-in user joins a room named
 *         "user:<userId>" on connect. We emit only to that room so
 *         notifications are private and targeted.
 *      4. Unread count is derived from the DB rows, not a separate counter
 *         column, so it is always accurate even if rows are deleted.
 *
 * @author Lucky Nkwor
 */
const { pool } = require('../../config/database');
class NotificationService {

    /**
     * create - persist a notification and push it in real time 
     * 
     * Called from listing.controller.js (NewListing) and 
     * claim.controller.js (ClaimConfirm, LimitWarning).
     * Always fire-and-forget - the caller should catch errors independently.
     * 
     * @param {Object} io           - Socket.io server instance (app.get('io'))
     *                              Pass null in unit tests or if io is unavailable.
     * @param {string} userId       - UUID of the user who receives the notification
     * @param {string} message      - Human-readable notification text
     * @param {string} type         - One of: NewListing | ClaimConfirm | LimitWarning
     * @returns {Object}            - The saved notification row
     */
    async create(io, userId, message, type) {
        // Write to PostgreSQL first so the notification survives
        // even if the Socket.io emit never reaches the client
        const result = await pool.query(
            `INSERT INTO notifications (user_id, message, notification_type)
            VALUES ($1, $2, $3)
            RETURNING
                id,
                user_id,
                message,
                notification_type,
                is_read,
                created_at`,
            [userId, message, type]
        );

        const notification = result.rows[0];

        // Real time push - only if io is available (won't be in tests ie CLI scripts)
        // Each authenticated client joins room "user:<userId>" on socket connect.
        // Emitting to that room ensures only the intended recipient gets this event
        if (io) {
            io.to(`user:${userId}`).emit('notification', notification);
        }

        return notification;
    }

    /**
     * getForUser - fetch all notification for a userm newest first
     * 
     * Also returns the unread count so the Sidebar bell badge can be updated in the same request
     * without a second round trip.
     * 
     * @param {string} userId       - UUID of the requesting user
     * @param {number} limit        - Max rows to return (default 30)
     * @param {number} offset       - For pagination (default 0)
     * @returns {Object}            - { notifications: [], unreadCount: number }
     */
    async getForUser(userId, limit = 30, offset = 0) {
        const result = await pool.query(
            `SELECT
                id,
                user_id,
                message,
                notification_type,
                is_read,
                created_at
                FROM notifications
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
        );


        const notifications = result.rows;

        // Derive unread count from the returned rows rather than
        // running a second COUNT query - good enough for limit=30
        const unreadCount = notifications.filter(n => !n.is_read).length;

        return { notifications, unreadCount };
    }
    
    /**
     * markOneRead - mark a single notification as read
     * 
     * Verifies that the notification belongs to the requesting user
     * before updating, so users cannot mark each other's notifications.
     * 
     * @param {string} notificationId   - UUID of the notification
     * @param {string} userId   - Must match notification.user_id
     * @returns {Object} - The updated notification row
     */
    async markOneRead(notificationId, userId) {
        const result = await pool.query(
            `UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1
                AND user_id = $2
            RETURNING
                id,
                user_id,
                message,
                notification_type,
                is_read,
                created_at`,
                [notificationId, userId]
        );

        if (!result.rows.length) {
            // Either the notification does not exist or belongs to a different user
            const error = new Error('Notification not found.');
            error.code = 'NOT_FOUND';
            throw error;
        }

        return result.rows[0];
    }


    /**
     * markAllRead - mark every uread notification for a user as read
     * 
     * Called when the user clicks "Mark all read" on the notifications page.
     * More efficient than calling markOneRead in a loop.
     * 
     * @param {string} userId   - UUID of the requesting user
     * @returns {number}  - Count of rows updated
     */
    async markAllRead(userId) {
        const result = await pool.query(
            `UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1
                AND is_read = FALSE`,
            [userId]
        );

        // rowCount is the number of rows actually updated
        return result.rowCount;
    }
}


module.exports = new NotificationService()