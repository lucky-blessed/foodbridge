/**
 * User.js - User model
 *
 * Handles all PostgreSQL queries for the users table.
 * Updated to support sub-roles, demographic fields, and profile pictures.
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

    // findById -> used by JWT middleware and profile endpoints
    // Returns all fields including new sub-role and demographic columns
    async findById(id) {
        const result = await pool.query(
            `SELECT
                id, first_name, last_name, email, role,
                sub_role, org_name, org_type, org_reg_number,
                age_range, gender, profile_pic_url,
                location_lat, location_lng,
                is_active, created_at
            FROM users
            WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }

    // create -> used by AuthService.register
    // Accepts all fields including new sub-role, org, demographic, and profile pic fields
    async create({
        firstName, lastName, email, passwordHash, role,
        subRole, orgName, orgType, orgRegNumber,
        ageRange, gender, profilePicUrl
    }) {
        const result = await pool.query(
            `INSERT INTO users (
                first_name, last_name, email, password_hash, role,
                sub_role, org_name, org_type, org_reg_number,
                age_range, gender, profile_pic_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING
                id, first_name, last_name, email, role,
                sub_role, org_name, org_type, org_reg_number,
                age_range, gender, profile_pic_url,
                created_at`,
            [
                firstName, lastName, email, passwordHash,
                role || 'recipient',
                subRole || 'individual',
                orgName    || null,
                orgType    || null,
                orgRegNumber || null,
                ageRange   || null,
                gender     || null,
                profilePicUrl || null
            ]
        );
        return result.rows[0];
    }

    // update -> used by AuthService.updateProfile
    // COALESCE preserves existing value when a field is not provided
    async update(id, {
        firstName, lastName,
        location_lat, location_lng,
        orgName, orgType, orgRegNumber,
        ageRange, gender, profilePicUrl
    }) {
        const result = await pool.query(
            `UPDATE users
            SET first_name      = COALESCE($1,  first_name),
                last_name       = COALESCE($2,  last_name),
                location_lat    = COALESCE($3,  location_lat),
                location_lng    = COALESCE($4,  location_lng),
                org_name        = COALESCE($5,  org_name),
                org_type        = COALESCE($6,  org_type),
                org_reg_number  = COALESCE($7,  org_reg_number),
                age_range       = COALESCE($8,  age_range),
                gender          = COALESCE($9,  gender),
                profile_pic_url = COALESCE($10, profile_pic_url),
                updated_at      = NOW()
            WHERE id = $11
            RETURNING
                id, first_name, last_name, email, role,
                sub_role, org_name, org_type, org_reg_number,
                age_range, gender, profile_pic_url,
                location_lat, location_lng, created_at`,
            [
                firstName     || null,
                lastName      || null,
                location_lat  !== undefined ? location_lat  : null,
                location_lng  !== undefined ? location_lng  : null,
                orgName       || null,
                orgType       || null,
                orgRegNumber  || null,
                ageRange      || null,
                gender        || null,
                profilePicUrl || null,
                id
            ]
        );
        return result.rows[0];
    }
}

module.exports = new User();