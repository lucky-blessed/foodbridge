// auth.service.js uses ES6 class to match Design Class spec

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const crypto = require('crypto');


class AuthService {
    async register({
        firstName, lastName, email, password, role,
        subRole, orgName, orgType, orgRegNumber,
        ageRange, gender, profilePicUrl
    }) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return { user: null, token: null };
        }
    
        // Server-side validation of conditional required fields
        // Organization users must provide org_name and org_type
        if (subRole === 'organization') {
            if (!orgName || !orgType) {
                throw new Error('Organization name and type are required for organization accounts.');
            }
        }
    
        // Individual recipients must provide age_range and gender for demographic reporting
        if (role === 'recipient' && subRole !== 'organization') {
            if (!ageRange || !gender) {
                throw new Error('Age range and gender are required for individual recipient accounts.');
            }
        }
    
        const passwordHash = await bcrypt.hash(password, 12);
    
        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            passwordHash,
            role:           role     || 'recipient',
            subRole:        subRole  || 'individual',
            orgName:        orgName  || null,
            orgType:        orgType  || null,
            orgRegNumber:   orgRegNumber || null,
            ageRange:       ageRange || null,
            gender:         gender   || null,
            profilePicUrl:  profilePicUrl || null
        });
    
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
    
        return { user, token };
    }

    async login({ email, password }) {
        // Guard against object injection, mongo-sanitize strips operatots
        // but may leave an empty object {} instead of a string
        if (typeof email !== 'string' || typeof password !== 'string') {
            //throw new Error('invalid email or password');
            return {user: null, token: null};
        }

        const user = await User.findByEmail(email.toLowerCase().trim());

        if (!user) {
            //throw new Error('Invalid email or password');
            return {user: null, token: null};
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            //throw new Error("Invalid email or password");
            return {user: null, token: null};
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
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
     * updateProfile - update user profile fields
     * Email, role, and sub_role are never changed here.
     * @param {string} userId
     * @param {Object} fields - any combination of updatable fields
     */
    async updateProfile(userId, {
        firstName, lastName,
        location_lat, location_lng,
        orgName, orgType, orgRegNumber,
        ageRange, gender, profilePicUrl
    }) {
        const hasAtLeastOne = firstName || lastName ||
            location_lat !== undefined || location_lng !== undefined ||
            orgName || orgType || orgRegNumber ||
            ageRange || gender || profilePicUrl;

        if (!hasAtLeastOne) {
            throw new Error('At least one field is required to update.');
        }

        const updated = await User.update(userId, {
            firstName, lastName,
            location_lat, location_lng,
            orgName, orgType, orgRegNumber,
            ageRange, gender, profilePicUrl
        });

        return updated;
    }


    /**
     * forgotPassword - generate reset token and send email
     * @param {string} email
     */
    async forgotPassword(email) {
        const user = await User.findByEmail(email.toLowerCase().trim());
    
        // Always return success even if email not found
        // Prevents user enumeration — attacker can't tell if email exists
        if (!user) return { message: 'If that email exists, a reset link has been sent.' };
    
        // Generate a secure random token — send raw token in email
        const token = crypto.randomBytes(32).toString('hex');
    
        // Hash the token before storing — if DB is breached, raw tokens are not exposed
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
        const { pool } = require('../../config/database');
    
        // Delete any existing token for this user first
        await pool.query(
            `DELETE FROM password_reset_tokens WHERE user_id = $1`,
            [user.id]
        );
    
        // Store the HASH not the raw token
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
            [user.id, tokenHash]
        );
    
        // Send the RAW token in the email — user presents raw, we hash and compare
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
    
        // Hash the incoming token to compare against the stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
        const { pool } = require('../../config/database');
    
        // Find the hashed token — must be unused and not expired
        const result = await pool.query(
            `SELECT * FROM password_reset_tokens
            WHERE token = $1
                AND used = FALSE
                AND expires_at > NOW()`,
            [tokenHash]
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