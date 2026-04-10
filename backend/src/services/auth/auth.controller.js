/**
 * auth.controller.js - Authentication Controller
 * ...
 */

const AuthService = require('./auth.service');

const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


/**
 * uploadProfilePic -> upload a profile picture to Cloudinary
 * Deletes the temp file after upload regardless of success or failure.
 * Returns the secure URL or null if no file was provided.
 */
const uploadProfilePic = async (file) => {
    if (!file) return null;
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            folder: 'foodbridge/profiles',
            transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }]
        });
        return result.secure_url;
    } finally {
        // Always delete the temp file even if Cloudinary upload fails
        fs.unlink(file.path, () => {});
    }
};

class AuthController {
    // User registration
    async register(req, res) {
        try {
            const {
                firstName, lastName, email, password, role,
                subRole, orgName, orgType, orgRegNumber,
                ageRange, gender
            } = req.body;

            if (!firstName || !lastName || !email || !password) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    required: ['firstName', 'lastName', 'email', 'password']
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    error: 'Password must be at least 8 characters'
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: 'Please provide a valid email address'
                });
            }

            if (role && !['donor', 'recipient'].includes(role)) {
                return res.status(400).json({
                    error: 'Role must be either donor or recipient'
                });
            }

            if (subRole && !['individual', 'organization'].includes(subRole)) {
                return res.status(400).json({
                    error: 'Sub-role must be either individual or organization'
                });
            }

            // Organization users must provide org name and type
            if (subRole === 'organization' && (!orgName || !orgType)) {
                return res.status(400).json({
                    error: 'Organization name and type are required for organization accounts.'
                });
            }

            // Individual recipients must provide age range and gender
            if (role === 'recipient' && subRole !== 'organization' && (!ageRange || !gender)) {
                return res.status(400).json({
                    error: 'Age range and gender are required for individual recipient accounts.'
                });
            }

            // Upload profile picture to Cloudinary if provided
            const profilePicUrl = await uploadProfilePic(req.file);

            const { user, token } = await AuthService.register({
                firstName, lastName, email, password, role,
                subRole, orgName, orgType, orgRegNumber,
                ageRange, gender, profilePicUrl
            });

            if (user !== null && token !== null) {
                return res.status(201).json({
                    message: 'Account created successfully',
                    token,
                    user
                });
            } else {
                return res.status(409).json({
                    message: 'Registration failed. Please try again.'
                });
            }
        } catch (error) {
            console.error('[AuthController.register] ERROR:', error);
            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }
            if (error.message.includes('required')) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({
                error: 'Registration failed. Please try again.'
            });
        }
    }

    
    // Secure login and logout
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    error: 'Email and password are required'
                });
            }

            const { user, token } = await AuthService.login({ email, password });

            if (user !== null && token !== null) {
                return res.status(200).json({
                    message: 'Login successful',
                    token,
                    user
                });
            } else {
                return res.status(400).json({
                    message: 'Invalid email or password'
                });
            }
            
        } catch (error) {
            if (error.message.toLowerCase().includes('invalid email or password')) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            console.error('Login error:', error);
            return res.status(500).json({
                error: 'Login failed. Please try again.'
            });
        }
    }

    
    /**
     * logout - handle POST /auth/logout
     * 
     * Extracts the JWT from the Authorization header and
     * passes it to AuthService to be blacklisted in Redis.
     * 
     * Why POST not DELETE?
     *  Logout is an action (performing something) not deleting a resource.
     *  POST is HTTP verb for actions.
     * 
     * 
     * @param {Object} req - req.headers.authorization must contain 'Bearer TOKEN'
     * @param {Object} res
     */

    async logout(req, res) {
        try {

            // Extract token from Authorization header
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(400).json({
                    error: 'No token provided'
                });
            }

            const token = authHeader.split(' ')[1];

            await AuthService.logout(token);

            return res.status(200).json({
                message: 'Logged out successfully.'
            });
            
        } catch (error) {
            console.error('[AuthController.logout] Unexpected error:', error);
            return res.status(500).json({
                error: 'Logout failed. Please try again.'
            });
        }
    }

    /**
     * getProfile - GET /auth/profile
     * Protected: any authenticated user
     */
    async getProfile(req, res) {
        try {
            const user = await AuthService.getProfile(req.user.id);
            return res.status(200).json({ user });
        } catch (error) {
            console.error('[AuthController.getProfile]', error);
            return res.status(404).json({ error: error.message });
        }
    }

    /**
     * updateProfile - PATCH /auth/profile
     * Protected: any authenticated user
     * Body: any combination of updatable profile fields
     */
    async updateProfile(req, res) {
        try {
               const {
                firstName, lastName,
                location_lat, location_lng,
                orgName, orgType, orgRegNumber,
                ageRange, gender
            } = req.body;

            // Upload new profile picture to Cloudinary if one was attached
            // profilePicUrl comes from the upload result, not req.body
            const profilePicUrl = await uploadProfilePic(req.file);

            const user = await AuthService.updateProfile(req.user.id, {
                firstName, lastName,
                location_lat, location_lng,
                orgName, orgType, orgRegNumber,
                ageRange, gender, profilePicUrl
            });

            return res.status(200).json({
                message: 'Profile updated successfully.',
                user
            });
            
        } catch (error) {
            if (error.message.includes('required')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AuthController.updateProfile]', error);
            return res.status(500).json({ error: 'Failed to update profile.' });
        }
        
    }

    /**
     * forgotPassword - POST /auth/forgot-password
     * Public route - no token required
     * Body: { email }
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email is required.' });
            }
            const result = await AuthService.forgotPassword(email);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AuthController.forgotPassword]', error);
            return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
        }
    }

    /**
     * resetPassword - POST /auth/reset-password
     * Public route - token from email link is the auth
     * Body: { token, newPassword }
     */
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            const result = await AuthService.resetPassword(token, newPassword);
            return res.status(200).json(result);
        } catch (error) {
            if (
                error.message.includes('required') ||
                error.message.includes('at least 8') ||
                error.message.includes('invalid or has expired')
            ) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AuthController.resetPassword]', error);
            return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
        }
    }
}


module.exports = new AuthController();