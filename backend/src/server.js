/**
 * server.js - application entry point
 * 
 * Connect all database then starts the HTTP server.
 * Order matters: database must be ready before accepting requests.
 */

require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./config/database');
const redis = require('./config/redis');

const cron = require('node-cron');
const ListingService = require('./services/listing/listing.service');


// process.env.PORT to read port variable from .env

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    // connect PostgreSQL and MongoDB
    await connectDatabase();

    // connect Redis
    //redis.connect() only needed when lazyConnect is true
    try {
        await redis.connect();
    } catch (err) {
        // Redis failure is non-fatal for startup - log and continue
        // The app can run without Redis but logout blacklisting won't work
        console.warn(' Redis unavailable - logout blacklisting disabled');
    } 

    // Run every 5 minutes : expire listings past their pickup window
    // Cron syntax: '*/5 * * * *' = every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        const count = await ListingService.expireOldListings();
        if (count > 0) {
            console.log(`Expired ${count} listing(s)`);
        }
    });



    app.listen(PORT, () => {
        console.log(`\nFoodBridge API running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });
};

startServer();