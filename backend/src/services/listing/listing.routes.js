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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
        }
    }
});

// Public routes : no token required
router.get('/', (req, res) => ListingController.findNearby(req, res));
router.get('/my', authenticateJWT, requireRole('donor'),
            (req, res) => ListingController.myListings(req, res));

// PATCH /listings/:id/:pin/confirm - donor confirms pickup
router.patch('/:id/:pin/confirm',
    authenticateJWT,
    requireRole('donor'),
    (req, res) => ListingController.confirmPickup(req, res)
);


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