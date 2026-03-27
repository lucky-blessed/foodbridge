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
            const uploaded = await cloudinary.uploader.upload(file.path, {
                folder: 'foodbridge/listings',
                transformation: [{ width: 800, height: 600, crop: 'limit' }]
                // Resizing to save storage
            });
            photoUrl = uploaded.secure_url;
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
     * @param {sting} id : MongoDB Object
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
}

module.exports = new ListingService();