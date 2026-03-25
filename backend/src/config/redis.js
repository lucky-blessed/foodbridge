/**
 * redis.js - Redis connection
 * 
 * Redis serves two purposes in FoodBridge:
 *  1. Token blacklist for logout (this file)
 *  2. Pub/sub adapter for Socket.io
 * 
 * We use Upstash Redis - a serverless Redis service with a free tier
 * ioredis is the Node.js client library.
 * 
 * @author Lucky Nkwor
 */

const Redis = require('ioredis');

/**
 * Creating the Redis client 
 * 
 * process.env.REDIs_URL comes from .env
 * Format: redis://default:PASSWORD@host.upstash.io.6378
 * 
 * lazyConnect: true means the connection is not made until 
 * the first command is sent - avoids blocking server startup
 * if Redis is temporarily unvailable 
 */

const redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetiesPerRequest: 3
});

/**
 * Event listener for monitoring connection state
 * These log to the conole so you see Redis status on startup
 */

redis.on('connect', () => console.log('Redis connected.'));
redis.on('error', (err) => console.error('Redis error:', err.message));


module.exports = redis;