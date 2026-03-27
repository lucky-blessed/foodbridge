// auth.routes.js maps URLS to controller functions


const express = require('express');
const AuthController = require('./auth.controller');

const router = express.Router();

// POST / auth/register
router.post('/register', (req, res) => AuthController.register(req, res));

// POST /auth/login
router.post('/login', (req, res) => AuthController.login(req, res));

// POST /auth/logout - requires a valid token in authorization header
router.post('/logout', (req, res) => AuthController.logout(req, res));

module.exports = router;