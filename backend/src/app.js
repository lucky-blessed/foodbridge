const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./services/auth/auth.routes');

// Create the express application
const app = express();

// -----Middleware------
// Middleware to run every request before it gets to routes

// helmet to add security related HTTP headers automatically 
app.use(helmet());


// cors allows your React frontend (on a different port/domain) to
// send requests to this backend — without this, browsers block it

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://locahost:5173',
    credentials: true
}));

app.use(express.json());

app.use(morgan('dev'));

// ---------Routes-------------
// Health check: a simple endpoint to confirm the server is running
// Visit http://localhost:3000/health in your browser to test it

// Mount auth routes at /auth to make /auth/register and /auth/login available
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'Ok',
        project: 'FoodBridge',
        team: 'ShareBite',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Temporary route test - to be removed later
// This route tests that the JWT middleware is working correctly.
// We try it with a valid token, expired token and no token.
const { authenticateJWT, requireRole } = require('./middleware/auth.middleware');

app.get('/protected-test', authenticateJWT, (req, res) => {
    res.json({
        message: 'You are authenticated',
        userId: req.user.id,
        role: req.user.role,
        firstName: req.user.first_name
    });
});

app.get('/donor-only-test', authenticateJWT, requireRole('donor'), (req, res) => {
    res.json({
        message: 'You are a verified donor',
        user: req.user.first_name
    });
});

// -----End temporary test routes-----


app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `${req.method} ${req.path} does not exist on this server.`
    });
});




module.exports = app;