/**
 * notification.routes.js - Notification Routes
 *
 * Maps HTTP endpoints to NotificationController methods.
 * All routes are protected — any authenticated role can access notifications.
 *
 * Route order matters:
 *  /notifications/read-all must be defined BEFORE /notifications/:id/read
 *  otherwise Express treats the string "read-all" as the :id parameter
 *  and hits the wrong handler.
 *
 * @author Lucky Nkwor
 */

const express = require('express');
const NotificationController = require('./notification.controller');
const { authenticateJWT } = require('../../middleware/auth.middleware');

const router = express.Router();

// GET /notifications — fetch all notifications for the logged-in user
// Returns notifications newest-first plus unread badge count
router.get(
    '/',
    authenticateJWT,
    (req, res) => NotificationController.getForUser(req, res)
);

// PATCH /notifications/read-all — mark every unread notification as read
// Must be before /:id/read so Express does not treat "read-all" as a UUID
router.patch(
    '/read-all',
    authenticateJWT,
    (req, res) => NotificationController.markAllRead(req, res)
);

// PATCH /notifications/:id/read — mark a single notification as read
router.patch(
    '/:id/read',
    authenticateJWT,
    (req, res) => NotificationController.markOneRead(req, res)
);

module.exports = router;