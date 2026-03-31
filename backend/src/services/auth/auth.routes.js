// auth.routes.js maps URLs to controller functions

const express = require('express');
const AuthController = require('./auth.controller');
const { authenticateJWT } = require('../../middleware/auth.middleware');

const router = express.Router();

// POST /auth/register
router.post('/register', (req, res) => AuthController.register(req, res));

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
    (req, res) => AuthController.updateProfile(req, res)
);

module.exports = router;