/**
 * listing.service.js - Listing Services
 * 
 * Business logic for food donation listings.
 * Talks directly to MongoDB via the FoodListing model.
 * 
 * @author Lucky Nkwor
 */

const FoodListing = require('../../models/Listing');
const cloudinary = require('cloudinary').v2;
const { pool } = require('../../config/database');
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class ListingService {
    /**
     * create: post a new food donation
     * 
     * Steps:
     *  1. Upload photo to Cloudinary if provided
     *  2. Create listing document in MongoDB
     *  3. Return the created listing
     * 
     * @param {Object} listingData: fields from a request body
     * @param {Object} donor: req.user from JWT middleware
     * @param {Object} [field] upload field from multer (Optional)
     * @returns {Object} The created FoodListing document
     */

    async create(listingData, donor, file = null) {

        let photoUrl = null;

        // upload photo to cloudinary
        // If donor attached photo, we upload to cloudinary and store the return URL in the listing
        if (file) {
            try {
                const uploaded = await cloudinary.uploader.upload(file.path, {
                    folder: 'foodbridge/listings',
                    transformation: [{ width: 800, height: 600, crop: 'limit' }]
                });
                photoUrl = uploaded.secure_url;
            } finally {
                // Always delete the temp file whether upload succeeded or failed
                fs.unlink(file.path, () => {});
            }
        }

        // Create the listing in MongoDB
        const listing = await FoodListing.create({
            ...listingData,
            photoUrl,
            donorId: donor.id,
            donorName: `${donor.first_name} ${donor.last_name}`,
            status: 'available'
        });

        return listing;
    }

    /**
     * findNearby: discover food listings by location
     * 
     * Used MongoDB $nearSphere operator with 2dshere index.
     * Results are automatically sorted nearest first.
     * 
     * @param {number} lat : recipient lat
     * @param {number} lng : recipient lng
     * @param {number} radius : search radius in km (default 5)
     * @param {string} category : filter by food category (optional)
     * @returns {Array} Array of nearby available listings
     */

    async findNearby({ lat, lng, radius = 5, category = null }) {
        const query = {
            // Only return available listing not claimed or expired or hidden
            status: 'available',

            // $nearShere finds documents near a point on a sphere (the earth)
            // $maxDistance is in metres: multiply km by 1000
            location: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: radius * 1000
                }
            }
        };

        // Add category filter only if provided
        if (category) {
            query.category = category;
        }

        // Execute the query
        // .select('-__v') hides MongoDB's internal version field
        // Result comes back sorted nearest forst automatically
        const listings = await FoodListing.find(query).select('-__v');

        return listings;
    }

    /**
     * findById: get a single listing by its MongoDB _id
     * 
     * @param {string} id - MongoDB object string
     * @returns {Object | null} the listing or null if not found
     */

    async findById(id) {
        const listing = await FoodListing.findById(id).select('-__v');
        return listing;
    }

    /**
     * findByDonor: get all listing posted by a specific donor
     * 
     * @param {string} donorId : UUID from PostgreSQL
     * @returns {Array} All listing by this donor, newest first
     */

    async findByDonor(donorId) {
        const listings = await FoodListing
            .find({ donorId })
            .select('-__v')
            .sort({ createdAt: -1 }); // -1 = descending = newest first
        return listings;
    }

    /**
     * update - edit listing
     * 
     * Only donor who created the listing can edit it.
     * Claimed or expired listing cannot be edited.
     * 
     * @param {string} id - MongoDB object
     * @param {string} donorId : Must match listing.donorId
     * @param {Object} updates : Fields to update
     * @returns {Object} Updated listing
     * @throwa {Error} If not found or not owner or not editable
     */

    async update(id, donorId, updates) {
        const listing = await FoodListing.findById(id);

        if (!listing) {
            throw new Error('Listing not found.');
        }

        // Ownership check
        if (listing.donorId !== donorId) {
            throw new Error('You can only edit your own listings.');
        }

        // Check status
        if (!['available'].includes(listing.status)) {
            throw new Error(
                `Cannot edit a listing with status: ${listing.status}`
            );
        }

        // { new: true } returns the updated document
        // runValidators: true re-runs schema validation on the updated fields
        const updated = await FoodListing.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        return updated;
    }


    /**
     * remove : delete a listing
     * 
     * @param {string} id : MongoDB Object
     * @param {string} donorId : Must match listing.donorId
     * @throws {Error} If not found oor not owner
     */

    async remove(id, donorId) {

        const listing = await FoodListing.findById(id);

        if (!listing) {
            throw new Error('Listing not found.'); 
        }

        if (listing.donorId !== donorId) {
            throw new Error('You can only delete your own listings.');
        }

        await FoodListing.findByIdAndDelete(id);

        return { message: 'Listing deleted successfully' };
    }

    /**
     * expireOldListings - mark past-pickup listings as expired
     * 
     * Called by node-cron every 5 minutes.
     * Updates all available listings whose pickupEnd is in the past.
     * 
     * @returns {number} Count of listings expired
     */

    async expireOldListings() {

        const result = await FoodListing.updateMany(
            {
                status: 'available',
                pickupEnd: { $lt: new Date() } // $1t = less than = in the past
            },
            {
                status: 'expired'
            }
        );
        return result.modifiedCount;
    }

    /**
     * confirmPickup - mark a listing as picked up
     * 
     * Rules:
     *  - Only the recipient who claimed it can confirm pickup
     *  - Listing must currently be in 'claimed' status 
     *  - Updates claim_records.picked_up_at + status in PostgresSQL
     *  - Updates listing status -> 'completed' in MongoDB
     * 
     * @param {string} listingId - MongoDB ObjectId
     * @param {string} recipientId - UUID from req.user.id
     */

    async confirmPickup(listingId, donorId) {
        // Verify listing exists and belongs to this donor (FR-15)
        const listing = await FoodListing.findById(listingId);
        if (!listing) {
            throw new Error('Listing not found.');
        }
        if (listing.donorId !== donorId) {
            throw new Error('You can only confirm pickup for your own listings.');
        }
        if (listing.status !== 'claimed') {
            throw new Error(
                `Cannot confirm pickup. Listing status is: ${listing.status}.`
            );
        }
        // Find the active claim for this listing
        const claimResult = await pool.query(
            `SELECT * FROM claim_records
             WHERE listing_id = $1
               AND status = 'active'`,
            [listingId]
        );
        const claim = claimResult.rows[0];
        if (!claim) {
            throw new Error('No active claim found for this listing.');
        }
        // Update claim record in PostgreSQL
        await pool.query(
            `UPDATE claim_records
             SET status       = 'completed',
                 picked_up_at = NOW()
             WHERE id = $1`,
            [claim.id]
        );
        // Update listing status in MongoDB
        const updated = await FoodListing.findByIdAndUpdate(
            listingId,
            { status: 'completed' },
            { returnDocument: 'after' }
        );
        return {
            message: 'Pickup confirmed. Thank you for completing this donation.',
            listing: updated
        };
    }
}

module.exports = new ListingService();