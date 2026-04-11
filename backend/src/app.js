const express = require('express');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('mongo-sanitize');
const hpp = require('hpp');

const authRoutes = require('./services/auth/auth.routes');
const listingRoutes = require('./services/listing/listing.routes');
const claimRoutes = require('./services/claim/claim.routes');
const adminRoutes = require('./services/admin/admin.routes');
const notificationRoutes = require('./services/notification/notification.routes');
const impactRoutes = require('./services/impact/impact.routes');

// Create the express application
const app = express();

// Trust Render's proxy so rate limiting uses the real client IP
app.set('trust proxy', 1);

// Force HTTPS in production — Render terminates SSL at the proxy
// and sets x-forwarded-proto header to indicate the original protocol
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
        next();
    });
}

// -------Security Handlers-------------
// Helmet sets 14 security related HTTP headers automatically

// -----Middleware------
// Middleware to run every request before it gets to routes

// helmet to add security related HTTP headers automatically 
app.use(helmet());


// -------CORS-----------------
// cors allows your React frontend (on a different port/domain) to
// send requests to this backend — without this, browsers block it

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL]
    : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ------Rate Limiting------------
// Global limiter: 100 request per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many request from this IP. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for auth routes: 10 attempts per 15 minutes per IP
// Prevents brute-force attacks on login and register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many authentication attempts. Please try again in 15 minutes.'
    },
    standardHeaders:  true,
    legacyHeaders: false,
});

app.use(globalLimiter);

// -----Body parsing------------
app.use(express.json({ limit: '10kb' }));  // reject bodies larger than 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


// ---------NoSQL injection protection--------------
// mongo-sanitize strips $ and . from user input
// Prevents attacks like: { "email": { "$gt": "" } }
app.use((req, res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});


// ---------HTTP Parameter Pollution pretection----------
// Prevents duplicate query params: ?lat=1&lat=2&lat=3
app.use(hpp({
    whitelist: ['category'] // allow multiple categories in query
}));



// app.use(express.json());

// --------Logging----------
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------Routes-------------
// Health check: a simple endpoint to confirm the server is running
// Visit http://localhost:3000/health in your browser to test it

// Mount auth routes at /auth to make /auth/register and /auth/login available
// app.use('/auth', authLimiter, authRoutes);

// Strict limiter applied only to sensitive auth endpoints
// Profile and logout use the global limiter only
app.use('/auth/login',            authLimiter, authRoutes);
app.use('/auth/register',         authLimiter, authRoutes);
app.use('/auth/forgot-password',  authLimiter, authRoutes);
app.use('/auth/reset-password',   authLimiter, authRoutes);
app.use('/auth',                              authRoutes);

app.use('/listings', listingRoutes);

app.use('/claims', claimRoutes);

app.use('/admin', adminRoutes);

app.use('/notifications', notificationRoutes);
app.use('/impact', impactRoutes);


app.get('/health', (req, res) => {
    res.json({
        status: 'Ok',
        project: 'FoodBridge',
        team: 'ShareBite',
        timestamp: new Date().toISOString(),
   //     environment: process.env.NODE_ENV || 'development'
    });
});


// ------404 handler-----
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `${req.method} ${req.path} does not exist on this server.`
    });
});

// ------Global error handler-----
// Catches errors passed via next(err) including multer file type rejections
app.use((err, req, res, next) => {
    // Clean up any temp file if multer error occurs mid-upload
    if (req.file) fs.unlink(req.file.path, () => {});

    // Multer file type rejection
    if (err.message?.includes('Only JPEG')) {
        return res.status(400).json({ error: err.message });
    }

    console.error('[GlobalError]', err);
    return res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred.'
            : err.message
    });
});



module.exports = app;