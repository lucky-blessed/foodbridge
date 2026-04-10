/**
 * impact.routes.js - Impact Routes
 *
 * All routes require authenticateJWT.
 * Each endpoint is additionally guarded by requireRole
 * so a recipient cannot access donor data and vice versa.
 *
 * Routes:
 *  GET /impact/donor     - donor role only
 *  GET /impact/recipient - recipient role only
 *  GET /impact/admin     - admin role only
 *
 * @author Lucky Nkwor
 */

const express = require('express');
const ImpactController = require('./impact.controller');
const { authenticateJWT, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

// GET /impact/donor — donor's personal analytics
router.get('/donor',
    authenticateJWT,
    requireRole('donor'),
    (req, res) => ImpactController.getDonorImpact(req, res)
);

// GET /impact/recipient — recipient's personal analytics
router.get('/recipient',
    authenticateJWT,
    requireRole('recipient'),
    (req, res) => ImpactController.getRecipientImpact(req, res)
);

// GET /impact/admin — platform-wide analytics
router.get('/admin',
    authenticateJWT,
    requireRole('admin'),
    (req, res) => ImpactController.getAdminImpact(req, res)
);

module.exports = router;