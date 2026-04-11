// auth.routes.js maps URLs to controller functions

const express = require('express');
const multer  = require('multer');
const AuthController = require('./auth.controller');
const { authenticateJWT } = require('../../middleware/auth.middleware');

const router = express.Router();

// Multer config for profile picture uploads.
// Matches the same pattern as listing.routes.js —> temp disk storage
// before Cloudinary uploads and deletes the temp file.
// Field name must be 'profilePic' on the frontend FormData.
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

// POST /auth/register (accepts optional profilePic file)
router.post('/register',
    upload.single('profilePic'),
    (req, res) => AuthController.register(req, res)
);
// POST /auth/login
router.post('/login', (req, res) => AuthController.login(req, res));

// POST /auth/logout
router.post('/logout', (req, res) => AuthController.logout(req, res));

// GET /auth/profile — get logged-in user's profile
router.get(
    '/profile',
    authenticateJWT,
    (req, res) => AuthController.getProfile(req, res)
);

// PATCH /auth/profile — update firstName and lastName
router.patch(
    '/profile',
    authenticateJWT,
    upload.single('profilePic'),
    (req, res) => AuthController.updateProfile(req, res)
);

// POST /auth/forgot-password - send reset link to email
router.post('/forgot-password', (req, res) => AuthController.forgotPassword(req, res));

// POST /auth/reset-password - validate token and set new password
router.post('/reset-password', (req, res) => AuthController.resetPassword(req, res));


module.exports = router;