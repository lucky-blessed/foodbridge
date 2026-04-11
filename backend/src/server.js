/**
 * server.js - application entry point
 * 
 * Connect all database then starts the HTTP server.
 * Order matters: database must be ready before accepting requests.
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

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

    // Run every minute: send pickup reminder email 30 minutes before window closes
    // Checks for active claims whose listing pickupEnd is 30–31 minutes from now
    // The 1-minute window prevents duplicate emails on each cron tick
    cron.schedule('* * * * *', async () => {
        try {
            const { pool } = require('./config/database');
            const FoodListing = require('./services/listing/listing.service');
            const User = require('./models/User');
            const EmailService = require('./services/auth/email.service');

            const now = new Date();
            const windowStart = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now
            const windowEnd   = new Date(now.getTime() + 31 * 60 * 1000); // 31 min from now

            // Find all active claims where the listing pickup window
            // closes in the next 30–31 minutes
            const { rows: claims } = await pool.query(
                `SELECT cr.recipient_id, cr.listing_id
                FROM claim_records cr
                WHERE cr.status = 'active'`,
            );

            for (const claim of claims) {
                try {
                    // Fetch the MongoDB listing to check pickupEnd
                    const mongoose = require('mongoose');
                    const FoodListingModel = require('./models/Listing');
                    const listing = await FoodListingModel.findById(claim.listing_id);

                    if (!listing) continue;

                    const pickupEnd = new Date(listing.pickupEnd);
                    if (pickupEnd >= windowStart && pickupEnd < windowEnd) {
                        const recipient = await User.findById(claim.recipient_id);
                        if (recipient) {
                            await EmailService.sendPickupReminder(
                                recipient.email,
                                recipient.first_name,
                                listing.title,
                                listing.location?.address || '',
                                listing.pickupEnd
                            );
                            console.log(
                                `Pickup reminder sent to ${recipient.email} for "${listing.title}"`
                            );
                        }
                    }
                } catch (innerErr) {
                    console.error('Pickup reminder error for claim:', claim.listing_id, innerErr.message);
                }
            }
        } catch (err) {
            console.error('Pickup reminder cron error:', err.message);
        }
    });



    app.listen(PORT, () => {
        console.log(`\nFoodBridge API running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });

    const cleanUploads = () => {
        const dir = path.join(__dirname, '../uploads');
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        fs.readdirSync(dir).forEach(file => {
            if (file === '.gitkeep') return;
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs < oneHourAgo) fs.unlinkSync(filePath);
        });
    };
    cron.schedule('0 * * * *', cleanUploads); // every hour
};

startServer();