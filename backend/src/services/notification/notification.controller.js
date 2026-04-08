/**
 * notification.controller.js - Notification Controller
 *
 * Handles HTTP requests and responses for the notification service.
 * Translates NotificationService results and errors into correct HTTP codes.
 *
 * Routes handled:
 *  GET   /notifications          -> getForUser()
 *  PATCH /notifications/:id/read -> markOneRead()
 *  PATCH /notifications/read-all -> markAllRead()
 *
 * @author Lucky Nkwor
 */

const NotificationService = require('./notification.service');

class NotificationController {

    /**
     * getForUser - GET /notifications
     * Protected: any authenticated user
     *
     * Query params: limit (default 30), offset (default 0)
     * Returns notifications newest-first plus the unread badge count.
     */
    async getForUser(req, res) {
        try {
            // parseInt with fallback so non-numeric query params don't silently produce NaN
            const limit  = parseInt(req.query.limit)  || 30;
            const offset = parseInt(req.query.offset) || 0;

            const data = await NotificationService.getForUser(
                req.user.id,
                limit,
                offset
            );

            return res.status(200).json(data);

        } catch (error) {
            console.error('[NotificationController.getForUser]', error);
            return res.status(500).json({ error: 'Failed to fetch notifications. Please try again.' });
        }
    }

    /**
     * markOneRead - PATCH /notifications/:id/read
     * Protected: any authenticated user
     *
     * Marks a single notification as read.
     * Returns 404 if the notification does not exist or belongs to another user.
     */
    async markOneRead(req, res) {
        try {
            const notification = await NotificationService.markOneRead(
                req.params.id,
                req.user.id
            );

            return res.status(200).json(notification);

        } catch (error) {
            // Service throws with error.code = 'NOT_FOUND' for missing or
            // wrong-owner notifications — never leak which case it is
            if (error.code === 'NOT_FOUND') {
                return res.status(404).json({ error: error.message });
            }

            console.error('[NotificationController.markOneRead]', error);
            return res.status(500).json({ error: 'Failed to mark notification as read. Please try again.' });
        }
    }

    /**
     * markAllRead - PATCH /notifications/read-all
     * Protected: any authenticated user
     *
     * Marks every unread notification for the user as read in one query.
     * Returns the count of rows updated.
     */
    async markAllRead(req, res) {
        try {
            const updatedCount = await NotificationService.markAllRead(req.user.id);

            return res.status(200).json({
                message: 'All notifications marked as read.',
                updatedCount
            });

        } catch (error) {
            console.error('[NotificationController.markAllRead]', error);
            return res.status(500).json({ error: 'Failed to mark notifications as read. Please try again.' });
        }
    }
}

module.exports = new NotificationController();