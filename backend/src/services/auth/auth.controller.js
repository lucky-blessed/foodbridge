/**
 * auth.controller.js - Authentication Controller
 * ...
 */

const AuthService = require('./auth.service');

class AuthController {
    // User registration
    async register(req, res) {
        try {
            const { firstName, lastName, email, password, role } = req.body;

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

            const { user, token } = await AuthService.register({
                firstName, lastName, email, password, role
            });

            return res.status(201).json({
                message: 'Account created successfully',
                token,
                user
            });

        } catch (error) {
            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }
            console.error('Register error', error);
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

            return res.status(200).json({
                message: 'Login successful',
                token,
                user
            });
            
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
            return res.status(404),json({ error: error.message });
        }
    }

    /**
     * updateProfile - PATH /auth/profile
     * protected: any authenticated user
     * Body: { firstName, lastName }
     */

    async updateProfile(req, res) {
        try {
            const { firstName, lastName } = req.body;
            const user = await AuthService.updateProfile(
                req.user.id,
                { firstName, lastName }
            ); return res.status(200).json({
                message: 'Profile updated successfully.',
                user
            });
        } catch (error) {
            if (error.message.includes('required')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AuthController.updateProfile]', error);
            return res.status(500).json({ error: 'Failed to update profile.' })
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