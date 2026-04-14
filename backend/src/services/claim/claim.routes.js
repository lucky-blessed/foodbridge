/**
 * claim.routes.js - Claim Routes
 * 
 * Maps HTTP endpoints to ClaimController methods.
 * All routes are protected, recipient only.
 * 
 * Route order matters:
 *  /claims/me and /claims/count must be defined BEFORE /claims"id
 *  otherwise Express treats 'me' and 'count' as the :id parameter.
 * 
 * @author Lucky Nkwor
 */

const express = require('express');
const ClaimController = require('./claim.controller');
const { authenticateJWT, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

// GET /claims/me - claim history for logged-in recipient
router.get(
    '/me',
    authenticateJWT,
    requireRole('recipient'),
    (req, res) => ClaimController.getMyHistory(req, res)
);

// GET /claims/count - rolling window stats for logged-in recipient
router.get(
    '/count',
    authenticateJWT,
    requireRole('recipient'),
    (req, res) => ClaimController.getRollingCount(req, res)
);

// POST /claims - create a new claim
router.post(
    '/',
    authenticateJWT,
    requireRole('recipient'),
    (req, res) => ClaimController.create(req, res)
);

// DELETE /claims/:id - cancel a claim
router.delete(
    '/:id',
    authenticateJWT,
    requireRole('recipient'),
    (req, res) => ClaimController.cancel(req, res)
);


// PATCH /claims/:id/reschedule - reschedule pickup time
router.patch(
    '/:id/reschedule',
    authenticateJWT,
    requireRole('recipient'),
    (req, res) => ClaimController.reschedule(req, res)
);

module.exports = router;