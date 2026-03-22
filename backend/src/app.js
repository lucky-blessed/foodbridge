const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Create the express application
const app = express();

// -----Middleware------
// Middleware to run every request before it gets to routes

// helmet to add security related HTTP headers automatically 
app.use(helmet());


// cors allows your React frontend (on a different port/domain) to
// send requests to this backend — without this, browsers block it

app.use(cors({
    origin: process.env.CLIENt_URL || 'http://locahost:5173',
    credentials: true
}));

app.use(express.json());

app.use(morgan('dev'));

// -----Routes------
// Health check: a simple endpoint to confirm the server is running
// Visit http://localhost:3000/health in your browser to test it

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        project: 'FoodBridge',
        team: 'ShareBite',
        timestamp: new Date().toDateString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'ROute not found',
        message: `${req.method} ${req.path} does not exist on this server.`
    });
});




module.exports = app;