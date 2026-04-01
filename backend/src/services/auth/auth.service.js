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
        // Guard against object injection, mongo-sanitize strips operatots
        // but may leave an empty object {} instead of a string
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new Error('invalid email or password');
        }

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


    /**
     * forgotPassword - generate reset token and send email
     * @param {string} email
     */
    async forgotPassword(email) {
        const user = await User.findByEmail(email.toLowerCase().trim());

        // Always return success even if email not found
        // Prevents user enumeration, attacker can't tell if email exists
        if (!user) return { message: 'If that email exists, a reset link has been sent.' };

        // Generate a secure random token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        // Store token in DB with 1-hour expiry
        // Delete any existing token for this user first
        const { pool } = require('../../config/database');
        await pool.query(
            `DELETE FROM password_reset_tokens WHERE user_id = $1`,
            [user.id]
        );
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
            [user.id, token]
        );

        // Send email
        const EmailService = require('./email.service');
        await EmailService.sendPasswordReset(user.email, user.first_name, token);
        return { message: 'If that email exists, a reset link has been sent.' };
    }


    /**
     * resetPassword - validate token and update password
     * @param {strin} token
     * @param {string} newPassword
     */
    async resetPassword(token, newPassword) {
        if (!token || !newPassword) {
            throw new Error('Token and new password are required.');
        }

        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters.');
        }

        const { pool } = require('../../config/database');

        // Find the token - must be usused and not expired
        const result = await pool.query(
            `SELECT * FROM password_reset_tokens
            WHERE token = $1
                AND used = FALSE
                AND expires_at > NOW()`,
                [token]
        );

        const resetToken = result.rows[0];
        if (!resetToken) {
            throw new Error('Reset link is invalid or has expired.');
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update the user's password
        await pool.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [passwordHash, resetToken.user_id]
        );

        // Mark token as used so it cannot be reused
        await pool.query(
            `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
            [resetToken.id]
        );

        return { message: 'Password reset successfully. You can now log in.' };
    }
}


module.exports = new AuthService();