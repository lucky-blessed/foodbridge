/**
 * listing.controller.js - Listing Controller
 * 
 * Handles HTTP requests and responses for food listings.
 * 
 * @author Lucky Nkwor
 */

const ListingService = require('./listing.service');
const NotificationService = require('../notification/notification.service');
const EmailService = require('../auth/email.service');
const User = require('../../models/User');
const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');

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

            // Validate required fields
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

            // Validate pickup window makes sense
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

            // ── NewListing notifications =========================================
            // Fire-and-forget: runs AFTER the 201 response is already decided.
            // A notification failure must never cause the listing creation to fail.
            // We query PostgreSQL for recipients with a saved location within 25 km
            // using the Haversine formula directly in SQL.
            try {
                const { rows: nearbyRecipients } = await pool.query(
                    `SELECT id FROM users
                    WHERE role = 'recipient'
                    AND is_active = TRUE
                    AND location_lat IS NOT NULL
                    AND location_lng IS NOT NULL
                    AND (
                        6371 * acos(
                        cos(radians($1)) * cos(radians(location_lat)) *
                        cos(radians(location_lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(location_lat))
                        )
                    ) <= 25`,
                    [parseFloat(lat), parseFloat(lng)]
                );

                if (nearbyRecipients.length > 0) {
                    const pickupTime = new Date(pickupEnd).toLocaleTimeString(
                        'en-CA', { hour: '2-digit', minute: '2-digit' }
                    );
                    const message =
                        `New listing nearby: "${title}" — available until ${pickupTime}.`;

                    const io = req.app.get('io');

                    // Notify each recipient independently so one failure
                    // does not block the others
                    for (const recipient of nearbyRecipients) {
                        NotificationService.create(
                            io,
                            recipient.id,
                            message,
                            'NewListing'
                        ).catch(err =>
                            console.error(
                                `[ListingController.create] notification failed for ${recipient.id}:`,
                                err.message
                            )
                        );
                    }
                }
            } catch (notifError) {
                // Log but never let this bubble up and affect the 201 response
                console.error('[ListingController.create] notification dispatch error:', notifError.message);
            }
            // ======================================

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
            const { id, pin } = req.params;

            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ error: 'Invalid listing ID format.' });
            }

            const result = await ListingService.confirmPickup(id, req.user.id);

            let pinHash = await bcrypt.hash(pin, 12);
            // Email the recipient to confirm their pickup is complete
            try {
                const listing = result.listing;
                const claim = await pool.query(
                    `SELECT recipient_id FROM claim_records
                    WHERE listing_id = $1 AND pickup_pin_hash = $2 AND status = 'completed'
                    ORDER BY picked_up_at DESC LIMIT 1`,
                    [id, pinHash]
                );
                if (claim.rows[0]) {
                    const recipient = await User.findById(claim.rows[0].recipient_id);
                    if (recipient) {
                        EmailService.sendPickupConfirmed(
                            recipient.email,
                            recipient.first_name,
                            listing.title
                        ).catch(err =>
                            console.error('[confirmPickup] email failed:', err.message)
                        );
                    }
                } else {
                    return res.status(400).json({ error: 'Invalid PIN. Please check the PIN and try again.' });
                }
            } catch (emailErr) {
                console.error('[confirmPickup] email dispatch error:', emailErr.message);
            }
            
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