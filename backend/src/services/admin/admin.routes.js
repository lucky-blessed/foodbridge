/**
 * admin.routes.js - Admin Routes
 * 
 * All routes require:
 *  - authenticateJWT (valid token)
 *  - requireRole('admin') (admin only)
 * 
 * @author Lucky Nkwor
 */

const express = require('express');
const AdminController = require('./admin.controller');
const { authenticateJWT, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to ALL admin routes
router.use(authenticateJWT);
router.use(requireRole('admin'));

// --------Listing routes-----------------------
// GET /admin/listing - all listings paginated
// GET /admin/listings?status=hidden - filter by status
router.get('/listings',
    (req, res) => AdminController.getAllListings(req, res));

// PATCH /admin/listings/:id/flag - hide a listing
router.patch('/listings/:id/flag',
    (req, res) => AdminController.flagListing(req, res));

// PATCH /admin/listings/:id/restore - restore hidden listing
router.patch('/listings/:id/restore',
    (req, res) => AdminController.restoreListing(req, res));


// DELETE /admin/listings/:id  - hard delete
router.delete('/listings/:id',
    (req, res) => AdminController.deleteListing(req, res));


// -------User routes--------------
// GET /admin/users - all users paginated
router.get('/users',
    (req, res) => AdminController.getAllUsers(req, res));

// PATCH /admin/users/:id/deactivate - deactivate account
router.patch('/users/:id/deactivate',
    (req, res) => AdminController.deactivateUser(req, res));

// PATCH /admin/users/:id/activate - reactivate account
router.patch('/users/:id/activate',
    (req, res) => AdminController.activateUser(req, res));


// --------------Report routes-------------
// GET /admin/reports/distribution - claim per recipient
router.get('/reports/distribution',
    (req, res) => AdminController.getDistributionReport(req, res));

// GET /admin/stats - platform overview
router.get('/stats',
    (req, res) => AdminController.getPlatformStats(req, res));


// GET /adim/audit-log - recent admin actions
router.get('/audit-log',
    (req, res) => AdminController.getAuditLog(req, res));

// -------Claim Settings---------
// GET  /admin/settings/claims  - get current limits and window days
router.get('/settings/claims',
    (req, res) => AdminController.getClaimSettings(req, res));

// PATCH /admin/settings/claims - update individual limit, org limit, or window days
router.patch('/settings/claims',
    (req, res) => AdminController.updateClaimSettings(req, res));


module.exports = router;