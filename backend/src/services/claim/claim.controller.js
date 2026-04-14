/**
 * claim.controllers.js = Claim Controler
 * 
 * Handles HTTP requests and response for the claim service.
 * Translates ClaimService results and errors into correct HTTP codes.
 * 
 * Routes handled:
 *  POST /claims  -> create()
 * DELETE /claims/:id -> cancel()
 * GET /claims/me   -> getMyHistory()
 * GET /claims/count  -> getRollingCount()
 * 
 * 
 * @author Lucky Nkwor
 */

const ClaimService = require('./claim.service');
const NotificationService = require('../notification/notification.service');
const EmailService = require('../auth/email.service');
const User = require('../../models/User');

class ClaimController {


    /**
     * create - POST /claims
     * Protected: recipient only
     * 
     * Body: { listingId }
     */

    async create(req, res) {
        try {
            const { listingId, scheduledPickupAt } = req.body;

            if (!listingId) {
                return res.status(400).json({
                    error: 'listingId is required.'
                });
            }

            // Validate MongoDB ObjectId format before hitting the DB
            if (!listingId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    error: 'Invalid listing ID format.'
                });
            }

            const result = await ClaimService.create(
                req.user.id,
                listingId,
                scheduledPickupAt || null
            );

            // ── Claim email -> donor ───────────────────────────────────────
            // Email the donor to let them know their listing has been claimed
            try {
                const { listing } = result;
                if (listing && listing.donorId) {
                    const donor = await User.findById(listing.donorId);
                    if (donor) {
                        EmailService.sendClaimNotification(
                            donor.email,
                            donor.first_name,
                            listing.title,
                            listing.pickupEnd,
                            result.pin
                        ).catch(err =>
                            console.error(
                                '[ClaimController.create] claim email failed:',
                                err.message
                            )
                        );
                    }
                }
            } catch (emailErr) {
                console.error('[ClaimController.create] claim email error:', emailErr.message);
            }


            // ── ClaimConfirm notification -> donor ────────────────────────
            try {
                const io = req.app.get('io');
                const { listing } = result;
                if (listing && listing.donorId) {
                    const scheduleMsg = scheduledPickupAt
                        ? ` Recipient scheduled pickup for ${new Date(scheduledPickupAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}.`
                        : ' No specific pickup time was selected.';

                    NotificationService.create(
                        io,
                        listing.donorId,
                        `Your listing "${listing.title}" has been claimed.${scheduleMsg}`,
                        'ClaimConfirm'
                    ).catch(err =>
                        console.error(
                            '[ClaimController.create] ClaimConfirm notification failed:',
                            err.message
                        )
                    );
                }
            } catch (notifError) {
                console.error('[ClaimController.create] ClaimConfirm dispatch error:', notifError.message);
            }
            
            // ── LimitWarning notification -> recipient ─────────────────────
            try {
                if (result.remainingClaims === 1) {
                    const io = req.app.get('io');
                    NotificationService.create(
                        io,
                        req.user.id,
                        'You have 1 claim remaining this week. Your window resets in 7 days.',
                        'LimitWarning'
                    ).catch(err =>
                        console.error(
                            '[ClaimController.create] LimitWarning notification failed:',
                            err.message
                        )
                    );
                }
            } catch (notifError) {
                console.error('[ClaimController.create] LimitWarning dispatch error:', notifError.message);
            }

            return res.status(201).json({
                message: 'Listing claimed successfully.',
                claim: result.claim,
                pin: result.pin,
                remainingClaims: result.remainingClaims
            });
        } catch (error) {
            // Claim limit reached: return 403 with reset date for the UI
            if (error.code === 'CLAIM_LIMIT_REACHED') {
                return res.status(403).json({
                    error: error.message,
                    resetsAt: error.resetsAt
                });
            }

            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }

            if (error.message.includes('no longer available')) {
                return res.status(409).json({ error: error.message });
            }

            console.error('[ClaimController.create]', error);
            return res.status(500).json({ error: 'Failed to create claim. Please try again.' });
        }
    }

    /**
     * cancel: DELETE /claims/:id
     * Protected: recipient only
     */

    async cancel(req, res) {
        try {
            const result = await ClaimService.cancel(
                req.params.id,
                req.user.id
            );

            return res.status(200).json(result);
        } catch (error) {
            
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }

            
            if (error.message.includes('your own')) {
                return res.status(403).json({ error: error.message });
            }

            if (
                error.message.includes('Cannot cancel') ||
                error.message.includes('only allowed')
            ) {
                return res.status(400).json({ error: error.message });
            }

            console.error('[ClaimController.cancel]', error);
            return res.status(500).json({ error: 'Failed to cancel claim. Please try again.' });     
        }
    }


    /**
     * reschedule - PATCH /claims/:id/reschedule
     * Protected: recipient only
     */
    async reschedule(req, res) {
        try {
            const { id } = req.params;
            const { newScheduledTime } = req.body;

            if (!newScheduledTime) {
                return res.status(400).json({ error: 'newScheduledTime is required.' });
            }

            const result = await ClaimService.reschedule(id, req.user.id, newScheduledTime);

            // Notify donor of the schedule change
            try {
                const io = req.app.get('io');
                if (result.listing.donorId) {
                    NotificationService.create(
                        io,
                        result.listing.donorId,
                        `A recipient has rescheduled their pickup of "${result.listing.title}" for ${new Date(newScheduledTime).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}.`,
                        'PickupScheduled'
                    ).catch(err => console.error('[reschedule] notification failed:', err.message));
                }
            } catch (notifErr) {
                console.error('[reschedule] notification dispatch error:', notifErr.message);
            }

            return res.status(200).json(result);

        } catch (error) {
            if (error.message.includes('Reschedule limit')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('Too close')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('outside the donor')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('own claims')) {
                return res.status(403).json({ error: error.message });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            console.error('[ClaimController.reschedule]', error);
            return res.status(500).json({ error: 'Failed to reschedule pickup.' });
        }
    }


    /**
     * getMyHistory - GET /claims/me
     * Protected: recipient only
     */

    async getMyHistory(req, res) {
        try {
            const claims = await ClaimService.getMyHistory(req.user.id);

            return res.status(200).json({
                count: claims.length,
                claims
            });
            
        } catch (error) {
            console.error('[ClaimController.getMyHistory]', error);
            return res.status(500).json({ error: 'Failed to fetch claim history. Please try again.' });            
        }
    }

    /**
     * getRollingCount - GET /claims/count
     * Protected: recipient only
     * Used by ClaimLimit.jsx to render the progress ring
     */

    async getRollingCount(req, res) {
        try {
            const stats = await ClaimService.getRollingCount(req.user.id);
            
            return res.status(200).json(stats);
            
        } catch (error) {
            console.error('[ClaimController.getRollingCount]', error);
            return res.status(500).json({ error: 'Failed to fetch claim count. Please try again.' });
        }
    }
}


module.exports = new ClaimController();