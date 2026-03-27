/**
 * Listing.js - The Food Listing Model
 * 
 * The MongoDB schema for food donation
 * We use MongoDB (not PostgreSQL) for listings because:
 *      1. Listings have flexible fields (photos, categories, description)
 *      2. MongoDB has a built-in 2dshere geospatial index that makes
 *          "find listings within 5km of me" extremely fast and simple
 *      3. Listing data is document-shaped, it maps naturally to JSON
 * 
 * @author Lucky Nkwor
 * @feature Post Food Donation, Map-Based Discovery
 */

const mongoose = require('mongoose');

/**
 * FoodListing Schema
 *  Food donation becomes one document in listing collection in MongoDB Atlas.
 */

const FoodListingSchema = new mongoose.Schema(
    // basic food information
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters']
        },
    
        category: {
            type: String,
            required: [true, 'Category is required'],
            // using enum - this is to restrict the value to this list only
            // Any other value throws a validation error
            enum: ['baked', 'produce', 'meals', 'dairy', 'non-perishable', 'other']
        },
    
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'], // 'loaves', 'kg', 'litres', 'items'
            min: [1, 'Quantity must be at least 1']
        },

        unit: {
            type: String,
            required: [true, 'Unit is required'],
            trim: true
        },

        condition: {
            type: String,
            enum: ['fresh', 'good', 'use-soon'],
            default: 'fresh'
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters']
        },

        // --Photo-----------
        // PhotoURL is the Cloudinary CND URL returned after upload
        // We store the URL, not the image itself
        photoUrl: {
            type: String,
            default: null
        },

        // -----Location-------------------------
        // GeoJSON Point format. This is required by MongoDB 2dshere index
        // coordinates: [longitude and latitude]
        
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [long, lat]
                required: [true, 'Location coordinates are required']
            },
            address: {
                type: String,
                trim: true
            }
        },

        // -----Pickup window------
        // Donor specifies when recipient can collect the food
        pickupStart: {
            type: Date,
            required: [true, 'Pickup start time is required']
        },

        pickupEnd: {
            type: Date,
            required: [true, 'Pickup end time is required']
        },

        // ---Status------
        // Track the listing lifecycle:
        //      available -> claimed -> completed, or
        //      available -> expired (auto-set by cron job), or
        //      available -> hidden (set by admin moderation)
        status:  {
            type: String,
            enum: ['available', 'claimed', 'completed', 'expired', 'hidden'],
            default: 'available'
        },

        // -----Ownership--------------
        // donorId links this listing to the users table in PostgreSQL
        // We store it as a string (UUID) not a MongoDB ObjectID
        donorId: {
            type: String,
            required: [true, 'Donor ID is required']
        },

        donorName: { // stored here for convenient, avoids a PostgreSQL join on every listing display
            type: String,
            trim: true
        }
    },
    {
        // timestamp: true, automatically adds createdAt and updatedAt
        timestamps: true
    }
);



/**
 * 2dsphere index - enables geospatial queries
 * 
 * Makes finding food within 5km possible.
 * Prevents every goe-query from sanning the entire collection.
 * Enables MongoDB to use a spatial tree structure for near-instant lookups
 * 
 * 
 * Must match the path exactly: 'location'
 */

FoodListingSchema.index({ location: '2dsphere' });

/**
 * Additional index for common query patterns
 * 
 * status index to filter by status='available ...
 * donorId index: donor view their own listing frequently
 * pickupEnd index: the cron expiry job queries by pickupEnd
 */

FoodListingSchema.index({ status: 1 });
FoodListingSchema.index({ donorId: 1 });
FoodListingSchema.index({ pickupEnd: 1 });

const FoodListing =  mongoose.model('FoodListing', FoodListingSchema);

module.exports = FoodListing; 