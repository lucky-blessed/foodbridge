/**
 * listing.routes.js - Listing Routes
 * 
 * @author Lucky Nkwor
 */

const express = require('express');
const multer = require('multer');
const ListingController = require('./listing.controller');
const { authenticateJWT, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

/**
 * Multer configuration: handles photo uploads
 * 
 * dest: 'uploads/' stores files temporarily on disk
 * before Cloudinary uploads them and we delete the temp file
 * 
 * limits.fileSize: 10MB maximum per the documentation spec
 */

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Public routes : no token required
router.get('/', (req, res) => ListingController.findNearby(req, res));
router.get('/my', authenticateJWT, requireRole('donor'),
            (req, res) => ListingController.myListings(req, res));
router.get('/:id', (req, res) => ListingController.findOne(req, res));

// Protected routes : donor only
router.post('/',
    authenticateJWT,
    requireRole('donor'),
    upload.single('photo'),
    (req, res) => ListingController.create(req, res)
);

router.patch('/:id',
    authenticateJWT,
    requireRole('donor'),
    (req, res) => ListingController.update(req, res)
);

router.delete('/:id',
    authenticateJWT,
    requireRole('donor'),
    (req, res) => ListingController.remove(req, res)
);

module.exports = router;