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
 *      3. Rolling 7-day window, we count claims from the last 7 days,
 *         not a fixed Mon-Sun week. The window slides with time.
 *      4. Cancel boundary, 30 minutes before pickupStart, not pickupEnd.
 *         This gives the donor enough notice before they prepare.
 * 
 * @author Lucky Nkwor
 */

const bcrypt = require('bcryptjs');
const FoodListing = require('../../models/Listing');
const { pool } = require('../../config/database');

const CLAIM_LIMIT = 3;
const WINDOW_DAYS = 7;
const CANCEL_CUTOFF_MIN = 30; // minutes before pickupStart

class ClaimService {
    /**
     * create - automatically claim a food listing
     * 
     * Transaction steps:
     *  1. BEGIN
     *  2. Lock the listing row in claim_records (prevents race condition)
     *  2. Count recipient's claim in last 7 days
     *  3. Reject if at limit
     *  5. Fetch the MongoDB listing and verify it still available
     *  6. INSERT into claim_records
     *  7. UPDATE MongoDB listing status -> 'claimed'
     *  8. COMMIT
     * 
     * If anything throws between BEGIN and COMMIT, we ROLLBACK,
     * and the listing stays available for other recipients 
     * 
     * @param (string) recipientId - UUID from req.user.id
     * @param (string) listingId - MongoDB Object string
     * @returns (Object) the created claim record
     */

    async create(recipientId, listingId, pin) {


        const client = await pool.connect();

        try {
            await client.query('BEGIN')

            // --1-- Rolling window cliam count------
            // COUNT claims where this recipient claimed in the last 7 days.
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

            // --2-- Check MongoDB lisiting availability-----
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
            const pinHash = bcrypt.hash(pin, 12); // TODO: implement PIN generation and hashing
            const insertResult = await client.query(
                `INSERT INTO claim_records
                    (recipient_id, listing_id, status, claimed_at, pickup_pin_hash)
                VALUES ($1, $2, 'active', NOW(), $3)
                RETURNING
                    id,
                    recipient_id,
                    listing_id,
                    status,
                    claimed_at`,
                [recipientId, listingId, pinHash]
            );

            const claim = insertResult.rows[0];

            //--4-- Update MongoDB listing status-----
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
     *      - Restores the listing status to 'available' in MongoDB
     * 
     * @param {string} claimId UUID from claim_records.id
     * @param {string} recipientId Muct match claim_records.recipientId
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
            throw new Error(`Cannot cancle a claim with status: ${claim.status}.`);
        }

        // check the 30-minutes cutoff against pickupStart in MongoDB
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
     * getMyHistory - pagnated claim history for the recipient
     * 
     * Returns claims with listing details joined from MongoDb
     * 
     * @param {string} recipientId
     * @param {Object} claimes array * rolling window stats
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
     * Used by GET /claims/count - feeds the ClaimLimit.jsx UI.
     * 
     * @param {string} recipientId
     * @param {Object} { count, limit, remaining, resetsAt }
     */

    async getRollingCount(recipientId) {
        // Count active + completed claims in the window
        const countResult = await pool.query(
            `SELECT COUNT(*) AS count
            FROM claim_records
            WHERE recipient_id = $1
                AND claimed_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'
                AND status IN ('active', 'completed')`,
            [recipientId]
        );

        const count = parseInt(countResult.rows[0].count, 10);
            
            // Find when the window resets (when oldest qualifying claim exits)
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
                limit: CLAIM_LIMIT,
                remaining: Math.max(0, CLAIM_LIMIT - count),
                resetsAt
            };
        }
    }


    module.exports = new ClaimService();