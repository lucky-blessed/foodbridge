/**
 * listing.controller.js - Listing Controller
 * 
 * Handles HTTP requests and responses for food listings.
 * 
 * @author Lucky Nkwor
 */

const ListingService = require('./listing.service');

class ListingController {

    /**
     * create - POST /listings
     * Protected: donors only
     */
    async create(req, res) {
        try {
            const {
                title, category, quantity, unit,
                condition, description,
                lat, lng, address,
                pickupStart, pickupEnd,
                expiryDate, estimatedValue, allergens
            } = req.body;

            // Validate required field
            if (!title || !category || !quantity || !unit) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    required: ['title', 'category', 'quantity', 'unit']
                });
            }

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'Location coordinates (lat, lng) are required'
                });
            }

            if (!pickupStart || !pickupEnd) {
                return res.status(400).json({
                    error: 'Pickup window (pickupStart, pickupEnd) is required'
                });
            }

            // validate pikup window makes sense
            if (new Date(pickupEnd) <= new Date(pickupStart)) {
                return res.status(400).json({
                    error: 'pickupEnd must be after pickupStart'
                });
            }

            const listingData = {
                title,
                category,
                quantity: Number(quantity),
                unit,
                condition,
                description,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
                allergens: allergens || '',
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(lng), parseFloat(lat)],
                    address: address || ''
                },
                pickupStart: new Date(pickupStart),
                pickupEnd: new Date(pickupEnd)
            };

            // req.file comes from multer if a photo was uploaded
            // req.user comes from authenticateJWT middleware
            const listing = await ListingService.create(
                listingData,
                req.user,
                req.file || null
            );

            return res.status(201).json({
                message: 'Listing created successfully.',
                listing
            });
            
        } catch (error) {
            console.error('[ListingController.create]', error);
            return res.status(500).json({
                error: 'Failed to create listing. Please try again.'
            });
        }
    }

    /**
     * findNearby - GET /listings
     * Public route - no auth required for discovery
     */

    async findNearby(req, res) {
        try {
            const { lat, lng, radius, category } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    error: 'lat and lng query parameters are required',
                    example: '/listings?lat=52.2681&lng=-113.8112&radius=5'
                });
            }

            const listings = await ListingService.findNearby({
                lat, lng, radius, category
            });

            return res.status(200).json({
                count: listings.length,
                listings
            });
            
        } catch (error) {
            console.error('[ListingController.findNearby]', error);
            return res.status(500).json({
                error: 'Failed to fetch listings. Please try again.'
            });
        }
    }

    /**
     * findOne - GET /listings/:id
     * Public route
     */

    async findOne(req, res) {
        try {
            // Validate MongoDB ObjectId format before querying
            // ObjectId must be exactly 24 hexadecimal characters
            const { id } = req.params;
            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    error: 'Invalid listing ID formart'
                });
            }

            const listing = await ListingService.findById(req.params.id);

            if (!listing) {
                return res.status(404).json({ error: 'Listing not found' });
            }

            return res.status(200).json({ listing });
            
        } catch (error) {
            console.error('[ListingController.findOne]', error);
            return res.status(500).json({ error: 'Failed to fetch listing.' });
        }
    }

    /**
     * myListings - GET /listings/my
     * Protected: donors only
     */

    async myListings(req, res) {
        try {
            const listings = await ListingService.findByDonor(req.user.id);
            return res.status(200).json({ count: listings.length, listings });
        } catch (error) {
            console.error('[ListingController.myListings]', error);
            return res.status(500).json({ error: 'Failed to fetch your listings.'});
        }
    }

    /**
     * update - PATCH /listings/:id
     * Protected: donor who owns the listing only
     */

    async update(req, res) {
        try {
            const listing = await ListingService.update(
                req.params.id,
                req.user.id,
                req.body
            );

            return res.status(200).json({
                message: 'Listing updated successfully',
                listing
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('only edit')) {
                return res.status(403).json({ error: error.message});
            }
            if (error.message.includes('Cannot edit')) {
                return res.status(400).json({ error: error.message});
            }
            console.error('[ListingController.update]', error);
            return res.status(500).json({ error: 'Failed to update listing.' });
        }
    }

    /**
     * remove - DELETE /listing/"id"
     * Protected: donor who owns the listing only
     */

    async remove(req, res) {
        try {
            const result = await ListingService.remove(
                req.params.id,
                req.user.id
            );
            return res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('only delete')) {
                return res.status(403).json({ error: error.message });
            }
            console.error('[ListingController.remove]', error);
            return res.status(500).json({ error: 'Failed to delete listing'});
        }
    }
    

    /**
     * confirmPickup - PATCH /listings/:id/confirm
     * Protected: recipient who claimed this listing only
     */
    async confirmPickup(req, res) {
        try {
            const { id } = req.params;

            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ error: 'Invalid listing ID format.' });
            }

            const result = await ListingService.confirmPickup(id, req.user.id);
            return res.status(200).json(result);

        } catch (error) {
            if (!error || !error.message) {
                console.error('[ListingController.confirmPickup] Unknown error');
                return res.status(500).json({ error: 'Failed to confirm pickup.'});
            }
            if (error.message.includes('No active claim')) {
                return res.status(403).json({ error: error.message });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('Cannot confirm')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[ListingController.confirmPickup]', error);
            return res.status(500).json({ error: 'Failed to confirm pickup.' });
        }
    }
}


module.exports = new ListingController();