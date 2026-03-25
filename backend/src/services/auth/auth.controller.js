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
            

            if (password.lenght < 8) {
                return res.status(400).json({
                    error: 'Passward must be at least 8 characters'
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
            if (error.message.includes('Invalid email or password')) {
                return res.status(401).json({ error: error.message });
            }
            console.error('Login error:', error);
            return res.status(500).json({
                error: 'Login failed. Please try again.'
            });
        }
    }
}


module.exports = new AuthController();