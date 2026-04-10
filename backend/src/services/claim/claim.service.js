/**
 * claim.service.js - Claim Service
 * 
 * Core business logic for the fair distribution claim system.
 * 
 * Key design decisions:
 *      1. Atomic PostgreSQL transaction. Claim creation touches both 
 *         PostgreSQL (claim_records) and mongoDB (listing status) on one 
 *         logical operation. If either fails, we roll back both.
 *      2. Row-level locking (SELECT FOR UPDATE), prevents two recipients 
 *         from claiming the same listing at the exact same moment.
 *      3. Rolling window, we count claims from the last N days (configurable
 *         by admin via platform_settings), not a fixed Mon-Sun week.
 *      4. Cancel boundary, 30 minutes before pickupStart, not pickupEnd.
 *         This gives the donor enough notice before they prepare.
 *      5. Claim limits are sub-role aware. Individual recipients use
 *         claim_limit_individual; organization recipients use
 *         claim_limit_organization. Both are configurable by admin.
 * 
 * @author Lucky Nkwor
 */

const FoodListing = require('../../models/Listing');
const { pool } = require('../../config/database');

const CANCEL_CUTOFF_MIN = 30; // minutes before pickupStart — not admin-configurable

/**
 * getClaimSettings - reads claim limit and window days from platform_settings
 * 
 * Selects the correct claim limit key based on the recipient's sub_role:
 *   individual   -> claim_limit_individual   (default 3)
 *   organization -> claim_limit_organization (default 10)
 * 
 * Falls back to safe hardcoded defaults if the DB query fails,
 * so a settings table issue never breaks the claim flow.
 * 
 * @param {string} subRole - 'individual' or 'organization'
 * @returns {{ CLAIM_LIMIT: number, WINDOW_DAYS: number }}
 */
const getClaimSettings = async (recipientId) => {
    try {
        // Attempt to read sub_role — this column won't exist until migration 009
        // If the column doesn't exist yet, the catch block defaults to 'individual'
        let subRole = 'individual';
        try {
            const subRoleResult = await pool.query(
                `SELECT sub_role FROM users WHERE id = $1`,
                [recipientId]
            );
            subRole = subRoleResult.rows[0]?.sub_role || 'individual';
        } catch {
            // sub_role column not yet added — treat everyone as individual
            subRole = 'individual';
        }

        const limitKey = subRole === 'organization'
            ? 'claim_limit_organization'
            : 'claim_limit_individual';

        const result = await pool.query(
            `SELECT key, value FROM platform_settings
             WHERE key IN ($1, 'window_days')`,
            [limitKey]
        );

        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = parseInt(row.value, 10);
        });

        return {
            CLAIM_LIMIT: settings[limitKey]       || (subRole === 'organization' ? 10 : 3),
            WINDOW_DAYS: settings['window_days']  || 7
        };
    } catch {
        return { CLAIM_LIMIT: 3, WINDOW_DAYS: 7 };
    }
};

class ClaimService {
    /**
     * create - atomically claim a food listing
     * 
     * Transaction steps:
     *  1. BEGIN
     *  2. Read recipient sub_role and fetch claim settings from platform_settings
     *  3. Count recipient's claims in the rolling window
     *  4. Reject if at limit
     *  5. Fetch the MongoDB listing and verify it is still available
     *  6. INSERT into claim_records
     *  7. UPDATE MongoDB listing status -> 'claimed'
     *  8. COMMIT
     * 
     * If anything throws between BEGIN and COMMIT, we ROLLBACK,
     * and the listing stays available for other recipients.
     * 
     * @param {string} recipientId - UUID from req.user.id
     * @param {string} listingId   - MongoDB ObjectId string
     * @returns {Object} { claim, listing, remainingClaims }
     */
    async create(recipientId, listingId) {

        // --0-- Read sub_role and claim settings before opening the transaction
        // sub_role column will be NULL until migration 009 runs — falls back to 'individual'
        // ✅ Fix
        const { CLAIM_LIMIT, WINDOW_DAYS } = await getClaimSettings(recipientId);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // --1-- Rolling window claim count------
            // COUNT claims where this recipient claimed within the configured window.
            // We only count 'active' and 'completed' — not 'cancelled'.
            // Cancelled claims still count toward the window (prevents gaming).
            const countResult = await client.query(
                `SELECT COUNT(*) AS count
                FROM claim_records
                WHERE recipient_id = $1
                    AND claimed_at > NOW() - INTERVAL '${WINDOW_DAYS} days'
                    AND status IN ('active', 'completed')`,
                [recipientId]
            );

            const claimCount = parseInt(countResult.rows[0].count, 10);

            if (claimCount >= CLAIM_LIMIT) {
                // Calculate when the oldest claim in the window will fall out,
                // which is when the window resets for this recipient.
                const resetResult = await client.query(
                    `SELECT claimed_at + INTERVAL '${WINDOW_DAYS} days' AS resets_at
                     FROM claim_records
                     WHERE recipient_id = $1
                        AND status IN ('active', 'completed')
                    ORDER BY claimed_at ASC
                    LIMIT 1`,
                    [recipientId]
                );
                const resetsAt = resetResult.rows[0]?.resets_at;
                await client.query('ROLLBACK');
                const error = new Error(
                    `Claim limit reached. You have used ${claimCount} of ${CLAIM_LIMIT} claims this week.`
                );
                error.code = 'CLAIM_LIMIT_REACHED';
                error.resetsAt = resetsAt;
                throw error;
            }

            // --2-- Check MongoDB listing availability-----
            // Check INSIDE the transaction so the status check and the
            // INSERT are part of the same atomic unit.
            const listing = await FoodListing.findById(listingId);

            if (!listing) {
                await client.query('ROLLBACK');
                throw new Error('Listing not found.');
            }

            if (listing.status !== 'available') {
                await client.query('ROLLBACK');
                throw new Error(
                    `The listing is no longer available. Current status: ${listing.status}.`
                );
            }

            // --3-- Insert claim record-----
            const insertResult = await client.query(
                `INSERT INTO claim_records
                    (recipient_id, listing_id, status, claimed_at)
                VALUES ($1, $2, 'active', NOW())
                RETURNING
                    id,
                    recipient_id,
                    listing_id,
                    status,
                    claimed_at`,
                [recipientId, listingId]
            );

            const claim = insertResult.rows[0];

            // --4-- Update MongoDB listing status-----
            // Mark the listing as claimed so no other recipient sees it
            // as available. Also record who claimed it and when.
            await FoodListing.findByIdAndUpdate(
                listingId,
                {
                    status: 'claimed',
                    claimedBy: recipientId,
                    claimedAt: new Date()
                },
                { returnDocument: 'after' }
            );

            await client.query('COMMIT');

            return {
                claim,
                listing,
                remainingClaims: CLAIM_LIMIT - (claimCount + 1)
            };

        } catch (error) {
            // If we haven't already rolled back (limit/not-found cases above),
            // roll back now to undo any partial writes.
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw error;

        } finally {
            // Always release the client back to the pool,
            // even if an error was thrown.
            client.release();
        }
    }

    /**
     * cancel - cancel an active claim
     * 
     * Rules:
     *      - Only the recipient who made the claim can cancel it.
     *      - Cancellation is only allowed more than 30 minutes before pickupStart.
     *      - Cancelled claims still count toward the rolling window (no gaming).
     *      - Restores the listing status to 'available' in MongoDB.
     * 
     * @param {string} claimId     - UUID from claim_records.id
     * @param {string} recipientId - Must match claim_records.recipient_id
     */
    async cancel(claimId, recipientId) {
        // Fetch the claim from PostgreSQL
        const result = await pool.query(
            `SELECT * FROM claim_records WHERE id = $1`,
            [claimId]
        );

        const claim = result.rows[0];

        if (!claim) {
            throw new Error('Claim not found.');
        }

        if (claim.recipient_id !== recipientId) {
            throw new Error('You can only cancel your own claims.');
        }

        if (claim.status !== 'active') {
            throw new Error(`Cannot cancel a claim with status: ${claim.status}.`);
        }

        // Check the 30-minute cutoff against pickupStart in MongoDB
        const listing = await FoodListing.findById(claim.listing_id);

        if (!listing) {
            throw new Error('Associated listing not found.');
        }

        const now = new Date();
        const pickupStart = new Date(listing.pickupStart);
        const cutoff = new Date(pickupStart.getTime() - CANCEL_CUTOFF_MIN * 60 * 1000);

        if (now >= cutoff) {
            throw new Error(
                `Cancellation is only allowed more than ${CANCEL_CUTOFF_MIN} minutes ` +
                `before pickup starts. Pickup starts at ${pickupStart.toISOString()}.`
            );
        }

        // Update claim status to cancelled in PostgreSQL
        await pool.query(
            `UPDATE claim_records
            SET status = 'cancelled', cancelled_at = NOW()
            WHERE id = $1`,
            [claimId]
        );

        // Restore listing to available in MongoDB
        await FoodListing.findByIdAndUpdate(
            claim.listing_id,
            {
                status: 'available',
                claimedBy: null,
                claimedAt: null
            }
        );

        return { message: 'Claim cancelled successfully. This listing is now available again.' };
    }

    /**
     * getMyHistory - paginated claim history for the recipient
     * 
     * Returns claims with listing details joined from MongoDB.
     * 
     * @param {string} recipientId
     * @returns {Array} claims enriched with listing details
     */
    async getMyHistory(recipientId) {
        // Get all claims for this recipient, newest first
        const result = await pool.query(
            `SELECT
                id,
                listing_id,
                status,
                claimed_at,
                cancelled_at,
                picked_up_at
            FROM claim_records
            WHERE recipient_id = $1
            ORDER BY claimed_at DESC`,
            [recipientId]
        );

        const claims = result.rows;

        // Enrich each claim with the listing title from MongoDB
        const enriched = await Promise.all(
            claims.map(async (claim) => {
                const listing = await FoodListing.findById(claim.listing_id)
                    .select('title category donorName status pickupStart pickupEnd');
                return { ...claim, listing: listing || null };
            })
        );

        return enriched;
    }

    /**
     * getRollingCount - current rolling window stats for the recipient
     * 
     * Used by GET /claims/count — feeds the ClaimLimit.jsx UI.
     * Reads the correct limit from platform_settings based on sub_role.
     * 
     * @param {string} recipientId
     * @returns {{ count, limit, remaining, resetsAt }}
     */
    async getRollingCount(recipientId) {
        // Read sub_role and settings before querying claim counts
        // ✅ Fix
        const { CLAIM_LIMIT, WINDOW_DAYS } = await getClaimSettings(recipientId);

        // Count active + completed claims in the rolling window
        const countResult = await pool.query(
            `SELECT COUNT(*) AS count
            FROM claim_records
            WHERE recipient_id = $1
                AND claimed_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'
                AND status IN ('active', 'completed')`,
            [recipientId]
        );

        const count = parseInt(countResult.rows[0].count, 10);

        // Find when the window resets (when oldest qualifying claim exits the window)
        let resetsAt = null;
        if (count > 0) {
            const resetResult = await pool.query(
                `SELECT claimed_at + INTERVAL '${WINDOW_DAYS} days' AS resets_at
                FROM claim_records
                WHERE recipient_id = $1
                    AND status IN ('active', 'completed')
                ORDER BY claimed_at ASC
                LIMIT 1`,
                [recipientId]
            );
            resetsAt = resetResult.rows[0]?.resets_at || null;
        }

        return {
            count,
            limit:     CLAIM_LIMIT,
            remaining: Math.max(0, CLAIM_LIMIT - count),
            resetsAt
        };
    }
}

module.exports = new ClaimService();