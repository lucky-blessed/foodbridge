/**
 * auth.middleware.js - JWT Authentication Middleware
 * 
 * Middleware protects routes that require a logged-in user.
 * Runs BEFORE the route handler on every protected endpoint.
 * 
 * Three things to do in order:
 *      1. Exracts and verifies the JWT from the Authorization header
 *      2. Checks the token has not been blacklisted (logout)
 *      3. Attaches the full user object to req.user
 * 
 * Usage in routes:
 *      router.post('/listings', authenticateJWT, ListingController.create)
 *      router.get('/claims/me', authenticateJWT, ClaimController.getMyClaims)
 * 
 * Role based usage:
 * router.get('/admin/listings', authenticateJWT, requireRole('admin'), ...)
 * 
 * @author Lucky Nkwor
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('../config/redis');

/**
 * authenticateJWT - verify token and attach user to request
 * 
 * next() - function that tells Express to move on to the next 
 * middleware or route handler - the prevents the request from hanging forever.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Call this to proceed to the route handler
 */

const authenticateJWT = async (req, res, next) => {
    try {
        // --1-- extract the token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied. No token provided.',
                hint: 'Add Autorization: Bearer YOUR_TOKEN to your request headers'
            });
        }

        // Split 'Bearer TOKEN' on the space and take the second part
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Access denied. Token is empty.'
            });
        }

        // --2-- verify the token signature and expiry using jwt.verify()
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            
        } catch (jwtError) {
            return res.status(401).json({
                error: 'Access denied. Invalid or expired token.'
            });
        }


        // --3-- check the Redis blackist
        // When a user logs out, their token is stored in Redis.
        // Even though the token is technically still valid (not expired),
        // we treat the blacklisted tokens as invalid.
        //
        // redis.get() returns the stored value or null if key does not exist
        const isBlacklisted = await redis.get(`blacklist:${token}`);

        if (isBlacklisted) {
            return res.status(401).json({
                error: 'Access denied. Token has been invalidated. Please log in again.'
            });
        }


        // --4-- load the full user from PostgreSQL
        // llok up the user to ensure we always have the current state
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                error: 'Access denied. User no longer exists.'
            });
        }

        if (!user.is_active) {
            // user was deactivated by admin after the token was issued
            return res.status(403).json({
                error: 'Your account has been deactivated. Please contact support.'
                // 403 Forbidden (we know who you are but you are not allowed in)
            });
        }

        // --5-- Attach user to the  request
        // From this point on, every route handler can access:
        //      req.user.id     - the user's UUID
        //      req.user.role   - 'donor', 'recipient', or 'admin'
        //      req.user.email  - the user's email
        //      req.user.first_name - the user's first name
        req.user = user;
        

        // call next()
        next();

        
    } catch (error) {
        console.error('[authenticationJWT] Unexpected error:', error);
        return res.status(500).json({
            error: 'Authentication failed. Please try again.'
        });
        
    }
};

/**
 * requireRole - restrict a route to specific role
 * 
 * This is a middleware FACTORY - a function that returns a middleware.
 * You call it with the allowed roles and it gives back a middleware
 * functions that checks req.user.role against those roles.
 * 
 * Must be used AFTER authenticateJWT - it depends on req.user existing.
 * 
 * Usage:
 *  router.get('/admin/user', authenticateJWT, requireRole('admin'), handler)
 *  router.post('/listings', authenticateJWT, requireRole('donor'), handler)
 *  router.post('/claims', authenticateJWT, requireRole('recipient'), handler)
 * 
 * @param {...string} roles - One or more allowed roles
 * @param {Function} Express middleware function
 */

const requireRole = (...roles) => {
    return (req, res, next) => {

        // First check if user exists
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. Authentication required.'
            });
        }
        

        // Check if the user's role is in the list of allowed roles
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. This action requires ${roles.join(' or ')} role.`,
                yourRole: req.user.role
                // 403 Forbidden - authenticated but not authorised
            });
        }

        // Role check passed - proceed to route handler
        next();
    };
};


module.exports = { authenticateJWT, requireRole };