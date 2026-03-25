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
            role: role || 'recipicient'
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
}


module.exports = new AuthService();