/**
 * server.js - Application Entry Point
 *
 * Connects all databases then starts the HTTP server with Socket.io.
 * Order matters: databases must be ready before accepting requests.
 *
 * Startup sequence:
 *  1. Connect PostgreSQL + MongoDB
 *  2. Connect Redis (non-fatal if unavailable)
 *  3. Create HTTP server + Socket.io
 *  4. Attach Socket.io Redis adapter
 *  5. Register cron jobs
 *  6. Start listening
 *
 * @author Team ShareBite
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const http = require('http');

const { Server }        = require('socket.io');
const cron              = require('node-cron');
const app               = require('./app');
const { connectDatabase } = require('./config/database');
const redis             = require('./config/redis');
const ListingService    = require('./services/listing/listing.service');

const PORT = process.env.PORT || 3000;

const startServer = async () => {

    // --- 1. Connect databases -----------------
    await connectDatabase();

    // ---- 2. Connect Redis (non-fatal) ---------------
    try {
        await redis.connect();
    } catch (err) {
        console.warn('Redis unavailable — logout blacklisting disabled');
    }

    // --- 3. HTTP server + Socket.io ----------------
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? [process.env.CLIENT_URL]
                : ['http://localhost:5173', 'http://localhost:5174'],
            credentials: true
        }
    });

    // Attach io to the Express app so controllers can use req.app.get('io')
    app.set('io', io);

    // Each authenticated client emits 'join' with their userId on connect.
    // The server joins that socket to a private room: "user:<userId>"
    // Notifications are emitted to that room so only the intended user receives them.
    io.on('connection', (socket) => {
        socket.on('join', (userId) => {
            if (userId) socket.join(`user:${userId}`);
        });
        socket.on('disconnect', () => {});
    });

    // ---- 4. Socket.io Redis adapter (horizontal scaling) ------------
    // Allows multiple server instances to share the same Socket.io channel.
    // Falls back to in-memory if Redis adapter is unavailable.
    try {
        const { createAdapter } = require('@socket.io/redis-adapter');
        const pubClient = redis.duplicate();
        const subClient = redis.duplicate();
        Promise.all([pubClient.connect(), subClient.connect()])
            .then(() => {
                io.adapter(createAdapter(pubClient, subClient));
            })
            .catch(err => {
                console.warn('Socket.io Redis adapter failed — using in-memory:', err.message);
            });
    } catch (err) {
        console.warn('Socket.io Redis adapter not available:', err.message);
    }

    // ----- 5. Cron jobs ---------------------------

    // Every 5 minutes: mark listings as expired when pickupEnd has passed
    cron.schedule('*/5 * * * *', async () => {
        try {
            const count = await ListingService.expireOldListings();
            if (count > 0) console.log(`Expired ${count} listing(s)`);
        } catch (err) {
            console.error('Expiry cron error:', err.message);
        }
    });

    // Every minute: send pickup reminder email 30 minutes before window closes.
    // Only checks claims from the last 7 days to avoid a full table scan.
    cron.schedule('* * * * *', async () => {
        try {
            const { pool }        = require('./config/database');
            const FoodListingModel = require('./models/Listing');
            const User            = require('./models/User');
            const EmailService    = require('./services/auth/email.service');

            const now         = new Date();
            const windowStart = new Date(now.getTime() + 30 * 60 * 1000);
            const windowEnd   = new Date(now.getTime() + 31 * 60 * 1000);

            // Limit to recent active claims to avoid scanning the entire table
            const { rows: claims } = await pool.query(
                `SELECT recipient_id, listing_id
                 FROM claim_records
                 WHERE status = 'active'
                 AND claimed_at > NOW() - INTERVAL '7 days'`
            );

            for (const claim of claims) {
                try {
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
                            // Only log in development — never log emails in production
                            if (process.env.NODE_ENV !== 'production') {
                                console.log(`Pickup reminder sent for "${listing.title}"`);
                            }
                        }
                    }
                } catch (innerErr) {
                    console.error('Pickup reminder error:', claim.listing_id, innerErr.message);
                }
            }
        } catch (err) {
            console.error('Pickup reminder cron error:', err.message);
        }
    });

    // Every hour: delete temp upload files older than 1 hour
    const cleanUploads = () => {
        const dir        = path.join(__dirname, '../uploads');
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        try {
            fs.readdirSync(dir).forEach(file => {
                if (file === '.gitkeep') return;
                const filePath = path.join(dir, file);
                const stat     = fs.statSync(filePath);
                if (stat.mtimeMs < oneHourAgo) fs.unlinkSync(filePath);
            });
        } catch (err) {
            console.error('Upload cleanup error:', err.message);
        }
    };
    cron.schedule('0 * * * *', cleanUploads);

    // ---- 6. Start listening ---------------------------
    // ✅ Fix — skip listen in test environment
    if (process.env.NODE_ENV !== 'test') {
        server.listen(PORT, () => {
            console.log(`\nFoodBridge API running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    }
};

startServer();