// auth.service.js uses ES6 class to match Design Class spec

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

class AuthService {

    async register({ firstName, lastName, email, password, role }) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            throw new Error('An account with this email already exists.');
        }
        
        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            passwordHash,
            role: role || 'recipient'
        });

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return { user, token };
    }

    async login({ email, password }) {
        const user = await User.findByEmail(email.toLowerCase().trim());

        if (!user) {
            throw new Error('Invalid email or password');
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            throw new Error("Invalid email or password");
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const { password_hash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    /**
     * logout - invalidate a JWT token by adding it to the Redis blacklist
     * 
     * How it should work:
     *  1. Decode the token to find its expiry time
     *  2. Store the token in Redis with TTL = remaining lifetime 
     *  3. The auth middleware checks this backlist on every request
     *  4. When the token naturally expires, Redis auto-deletes the entry
     * 
     * Why store the whole token not the userId?
     *  A user might be logged in on multiple device simultaneously.
     *  Blacklisting by userId would log them out everywhere.
     *  Blacklising the specific token only logs out the one device.
     * 
     * @param {string} token - The JWT token from the Authorization header
     * @param {Error} if token is invalid or already blacklisted
     */

    async logout(token) {
        // Decode the token without verifying - we just the expiry time 
        // jwt.decode() never throws - returns null if token is malformed
        const decoded = jwt.decode(token);

        if (!decoded || !decoded.exp) {
            throw new Error('Invalid token');
        }

        // Calculate how many seconds until this token expires
        const now = Math.floor(Date.now() / 1000);
        const secondsUntilExpiry = decoded.exp - now;

        // if the token is already expired, no need to blacklist
        if (secondsUntilExpiry <= 0) {
            return { message: 'Token already expired'};
        }

        // store in redis
        const redis = require('../../config/redis');
        await redis.set(
            `blacklist:${token}`,
            'true',
            'EX',
            secondsUntilExpiry
        );

        return { message: 'Logged out successfully.' }
    }

    /**
     * getProfile - return the logged-in user's profile
     * @param {string} userId - from req.user.id
     */

    async getProfile(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found.');
        }
        return user;
    }

    /**
     * updateProfile - update firstName and lastName only
     * Email and role are never changed here.
     * @param {string} userId
     * @param {Object} fields - { firstName, lastName}
     */
    async updateProfile(userId, { firstName, lastName }) {
        if (!firstName || !lastName) {
            throw new Error('First name and last name are required.');
        }
        const updated = await User.update(userId, { firstName, lastName });
        if (!updated) {
            throw new Error('User not found.');
        }
        return updated;
    }
}


module.exports = new AuthService();