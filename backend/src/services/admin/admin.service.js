/**
 * admin.service.js - Admin service
 * 
 * Business logic for admin moderation operations.
 * All actions are logged to the audit_log table.
 * 
 * Endpoints served:
 *  GET /admin/listings             - all listing paginated
 *  GET /admin/listings/flagged     - flagged listings only
 *  PATCH /admin/listings/:id/flag  - flag a listing (hidden)
 *  PATCH /admin/listings/:id/restor - restor hidden listing
 *  DELETE /admin/listings/:id       - hard delete a listing
 *  GET /admin/users                - all users paginated
 *  PATCH /admin/users/:id/deactive - deactivate a user account
 *  PATCH /admin/users/:id/activate - reactivate a user account
 *  GET /admin/reports/distribution - claim counts per recipient
 *  GET /admin/stats/               - platform-wide stats
 * 
 * @author Lucky Nkwor
 */

const FoodListing = require('../../models/Listing');
const { pool } = require('../../config/database');

class AdminService {

    /**
     * writeAuditLog - record every admin action
     * @private
     */
    async writeAuditLog(adminId, action, targetId, reason = null) {
        await pool.query(
            `INSERT INTO audit_log (admin_id, action, target_id, reason)
            VALUES ($1, $2, $3, $4)`,
            [adminId, action, targetId, reason]
        );
    }

    // ========================
    // LISTING MANAGEMENT
    // ==================

    /**
     * getAllListings - paginated list of all listings 
     * @param {number} paginated
     * @param {number} limit
     * @param {string} status -> filter by status (optional)
     */

    async getAllListings(page = 1, limit = 20, status = null) {
        const skip = (page -1) * limit;
        const filter = status ? { status } : {};

        const [listings, total] = await Promise.all([
            FoodListing.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodListing.countDocuments(filter)
        ]);

        return {
            listings,
            total,
            page,
            totalPages: Math.ceil(total /  limit)
        };
    }

    /**
     * flagListing - set listing status to hidden
     * Write to audit_log
     */
    async flagListing(listingId, adminId, reason = null) {
        const listing = await FoodListing.findById(listingId);
        if (!listing) throw new Error('Listing not found.');

        if (listing.status === 'hidden') {
            throw new Error('Listing is already hidden.');
        }

        listing.status = 'hidden';
        await listing.save();

        await this.writeAuditLog(adminId, 'FLAG_LISTING', listingId, reason);

        return { message: 'Listing flagged and hidden successfully.', listing };
    }

    /**
     * restoreListing - restore a hidden listing to available
     * Write to audit_log
     */
    async restoreListing(listingId, adminId) {
        const listing = await FoodListing.findById(listingId);
        if (!listing) throw new Error('Listing not found.');

        if (listing.status !== 'hidden') {
            throw new Error(`Listing is not hidden. Current status: ${listing.status}`);
        }

        listing.status = 'available';
        await listing.save();

        await this.writeAuditLog(adminId, 'RESTORE_LISTING', listingId, null);

        return { message: 'Listing restorec successfully.', listing };
    }

    /** deleteListing - permanently delete a listing
     * Write to auditLog
     */

    async deleteListing(listingId, adminId, reason = null) {
        const listing = await FoodListing.findById(listingId);
        if (!listing) throw new Error('Listing not found.');

        await FoodListing.findByIdAndDelete(listingId);

        await this.writeAuditLog(adminId, 'DELETE_LISTING', listingId, reason);

        return { message: 'Listing permanently deleted.'};
    }


    // =================
    // USER MANAGEMENT
    // ========================

    /**
     * getAllUsers - paginated list of all users
     */
    async getAllUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const offset = skip;

        const [usersResult, countResult] = await Promise.all([
            pool.query(
                `SELECT id, first_name, last_name, email, role,
                        is_active, created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
            pool.query('SELECT COUNT(*) FROM users')
        ]);

        return {
            users: usersResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        };
    }

    /**
     * deactivateUser - set is_active=false
     * Write to auditLog
     */
    async deactivateUser(userId, adminId, reason = null) {
        const result = await pool.query(
            `UPDATE users SET is_active = false
            WHERE id = $1 AND is_active = true
            RETURNING id, first_name, last_name, email, role`,
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found or already deactivated.');
        }

        await this.writeAuditLog(adminId, 'DEACTIVATE_USER', userId, reason);

        return {
            message: 'User deactivated successfully.',
            user: result.rows[0]
        };
    }

    /**
     * activateUser - set is_active=true
     * Write to audit_log
     */
    async activateUser(userId, adminId) {
        const result = await pool.query(
            `UPDATE users SET is_active = true
            WHERE id = $1 AND is_active = false
            RETURNING id, first_name, last_name, email, role`,
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found or aleady active.');
        }

        await this.writeAuditLog(adminId, 'ACTIVE_USER', userId, null);

        return {
            message: 'User activated successfully.',
            user: result.rows[0]
        };
    }


    // =======
    // REPORTS
    // ===============

    /**
     * getDistrubutionReport - claim counts per recipient
     * Shows how many claims each recipient has made
     */
    async getDistributionReport() {
        const result = await pool.query(
            `SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                COUNT(c.id) AS total_claims,
                COUNT(CASE WHEN c.status = 'active' THEN 1 END) AS active_claims,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) AS completed_claims,
                COUNT(CASE WHEN c.status = 'cancelled' THEN 1 END) AS cancelled_claims,
                MAX(c.claimed_at)
            FROM users u
            LEFT JOIN claim_records c ON c.recipient_id = u.id
            WHERE u.role = 'recipient'
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY total_claims DESC`
        );

        return { report: result.rows };
    }

    /**
     * getPlatformStats - overview numbers for admin dashbord
     */
    async getPlatformStats() {
        const [
            listingStats,
            userStats,
            claimStats
        ] = await Promise.all([
            FoodListing.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            pool.query(
                `SELECT
                    COUNT(*) AS total_users,
                    COUNT(CASE WHEN role = 'donor' THEN 1 END) AS donors,
                    COUNT(CASE WHEN role = 'recipient' THEN 1 END) AS recipients,
                    COUNT(CASE WHEN is_active = false THEN 1 END) AS deactivated
                FROM users`
            ),
            pool.query(
                `SELECT
                    COUNT(*) AS total_claims,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
                FROM claim_records`
            )
        ]);

        // Convert listing aggregate array to object
        const listings = {};
        listingStats.forEach(({ _id, count }) => { listings[_id] = count; });

        return {
            listings: {
                total: Object.values(listings).reduce((a, b) => a + b, 0),
                available: listings.available || 0,
                claimed: listings.claimed || 0,
                completed: listings.completed || 0,
                expired: listings.expired || 0,
                hidden: listings.hidden || 0,
            },
            users: userStats.rows[0],
            claims: claimStats.rows[0]
        };
    }

    /**
     * getAuditLog - recent admin actions
     */
    async getAuditLog(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT
                a.id, a.action, a.target_id, a.reason, a.created_at,
                u.first_name, u.last_name, u.email
            FROM audit_log a
            JOIN users u ON u.id = a.admin_id
            ORDER BY a.created_at DESC
            LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return { log: result.rows };
    }
}

module.exports = new AdminService();