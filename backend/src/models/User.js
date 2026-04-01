/**
 * User.js - User model
 * 
 */

const { pool } = require('../config/database');


class User {

    // findByEmail -> used by AuthService.login
    async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );
        return result.rows[0];
    }

    // findById -> used by JWT middleware to get current user
    async findById(id) {
        const result = await pool.query(
            'SELECT id, first_name, last_name, email, role, is_active, created_at FROM users WHERE id = $1',
            [id] 
        );
        return result.rows[0]; 
    } 

    // create -> used by AuthService.register
    async create({ firstName, lastName, email, passwordHash, role }) {
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, role )
             VALUES
                ($1, $2, $3, $4, $5)
             RETURNING
                id,
                first_name,
                last_name,
                email,
                role,
                created_at`,
             [firstName, lastName, email, passwordHash, role]
        );
        return result.rows[0];
    }

    // update -> used by AuthService.updateProfile
    async update(id, { firstName, lastName }) {
        const result = await pool.query(
            `UPDATE users
             SET first_name = $1,
                last_name = $2,
                updated_at = NOW()
             WHERE id = $3
             RETURNING
                id,
                first_name,
                last_name,
                email,
                role,
                created_at,
                updated_at`,
                [firstName, lastName, id]
        );
        return result.rows[0];
    }
}


module.exports = new User();