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
    async update(id, { firstName, lastName, location_lat, location_lng }) {
        const result = await pool.query(
            `UPDATE users
            SET first_name    = COALESCE($1, first_name),
                last_name     = COALESCE($2, last_name),
                location_lat  = COALESCE($3, location_lat),
                location_lng  = COALESCE($4, location_lng),
                updated_at    = NOW()
            WHERE id = $5`,
            [firstName, lastName, location_lat, location_lng, id]
        );
        return result.rows[0];
    }
}


module.exports = new User();