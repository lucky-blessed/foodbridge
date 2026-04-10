/**
 * admin.controller.js - Admin Controller
 * 
 * HTTP layer for admin endpoints.
 * Maps requests to AdminService, maps errors to HTTP codes.
 *
 * @author Lucky Nkwor
 */

const AdminService = require('./admin.service');

class AdminController {

    // --------Listings---------

    async getAllListings(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status || null;
            const result = await AdminService.getAllListings(page, limit, status);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AdminController.getAllListings]', error);
            return res.status(500).json({ error: 'Failed to fetch listings.' });
        }
    }

    async flagListing(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const result = await AdminService.flagListing(id, req.user.id, reason);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('already hidden')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AdminController.flagListing]', error);
            return res.status(500).json({ error: 'Failed to flag listing.'  });
        }
    }

    async restoreListing(req, res) {
        try {
            const { id } = req.params;
            const result = await AdminService.restoreListing(id, req.user.id);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('not hidden')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AdminController.restoreListing]', error);
            return res.status(500).json({ error: 'Failed to restore listng.' });
        }
    }

    async deleteListing(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const result = await AdminService.deleteListing(id, req.user.id, reason);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            console.error('[AdminController.deleteListing]', error);
            return res.status(500).json({ error: 'Failed to delete listing.' });
        }
    }

    // -------Users----

    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await AdminService.getAllUsers(page, limit);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AdminController.getAllUsers]', error);
            return res.status(500).json({ error: 'Failed to fetch users.' });
        }
    }

    async deactivateUser(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            // Prevent admin from deactivating themselves
            if (id === req.user.id) {
                return res.status(400).json({
                    error: 'You cannot deactivate your own account.'
                });
            }

            const result = await AdminService.deactivateUser(id, req.user.id, reason);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('not found') ||
                error.message.includes('already deactivated')) {
                return res.status(400).json({ error: error.message });
        }
        console.error('[AdminController.deactivateUser]', error);
        return res.status(500).json({ error: 'Failed to deactivate user.' });
        }
    }

    async activateUser(req, res) {
        try {
            const { id } = req.params;
            const result = await AdminService.activateUser(id, req.user.id);
            return res.status(200).json(result)
        } catch (error) {
         if (error.message.includes('not found') ||
            error.message.includes('already active')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AdminController.activateUser]', error);
            return res.status(500).json({ error: 'Failed to activate user.' });
        }
    }

    // ------- Reports--------------

    async getDistributionReport(req, res) {
        try {
            const result = await AdminService.getDistributionReport();
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AdminController.getDistributionReport]', error);
            return res.status(500).json({ error: 'Failed to generate report.' });
        }
    }

    async getPlatformStats(req, res) {
        try {
            const result = await AdminService.getPlatformStats();
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AdminController.getPlatformStats]', error);
            return res.status(500).json({ error: 'Failed to fetch stats.' });
        }
    }

    async getAuditLog(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await AdminService.getAuditLog(page, limit);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AdminController.getAuditLog]', error);
            return res.status(500).json({ error: 'Failed to fetch audit log.' });
        }
    }

    // -------Claim Settings--------

    /**
     * getClaimSettings - GET /admin/settings/claims
     * Returns current individual limit, org limit, and window days
     */
    async getClaimSettings(req, res) {
        try {
            const result = await AdminService.getClaimSettings();
            return res.status(200).json(result);
        } catch (error) {
            console.error('[AdminController.getClaimSettings]', error);
            return res.status(500).json({ error: 'Failed to fetch claim settings.' });
        }
    }

    /**
     * updateClaimSettings - PATCH /admin/settings/claims
     * Body: { claimLimitIndividual, claimLimitOrganization, windowDays }
     * Any combination accepted — at least one required
     */
    async updateClaimSettings(req, res) {
        try {
            const claimLimitIndividual = req.body.claimLimitIndividual !== undefined
                ? parseInt(req.body.claimLimitIndividual, 10) : undefined;

            const claimLimitOrganization = req.body.claimLimitOrganization !== undefined
                ? parseInt(req.body.claimLimitOrganization, 10) : undefined;

            const windowDays = req.body.windowDays !== undefined
                ? parseInt(req.body.windowDays, 10) : undefined;

            if (claimLimitIndividual === undefined &&
                claimLimitOrganization === undefined &&
                windowDays === undefined) {
                return res.status(400).json({
                    error: 'Provide at least one of: claimLimitIndividual, claimLimitOrganization, windowDays.'
                });
            }

            const result = await AdminService.updateClaimSettings(
                claimLimitIndividual,
                claimLimitOrganization,
                windowDays,
                req.user.id
            );

            return res.status(200).json({
                message: 'Claim settings updated successfully.',
                settings: result
            });

        } catch (error) {
            if (error.message.includes('must be')) {
                return res.status(400).json({ error: error.message });
            }
            console.error('[AdminController.updateClaimSettings]', error);
            return res.status(500).json({ error: 'Failed to update claim settings.' });
        }
    }

    
}

module.exports = new AdminController();