/**
 * impact.controller.js - Impact Controller
 *
 * HTTP layer for the Impact Dashboard endpoints.
 * Maps requests to ImpactService, maps errors to HTTP codes.
 *
 * Endpoints served:
 *  GET /impact/donor     - donor's personal analytics
 *  GET /impact/recipient - recipient's personal analytics
 *  GET /impact/admin     - platform-wide analytics
 *
 * All three endpoints accept ?period=week|month|year (default month)
 *
 * @author Lucky Nkwor
 */

const ImpactService = require('./impact.service');

class ImpactController {

    /**
     * getDonorImpact - GET /impact/donor
     * Protected: donor role only
     */
    async getDonorImpact(req, res) {
        try {
            const period = req.query.period || 'month';
            if (!['week', 'month', 'year'].includes(period)) {
                return res.status(400).json({
                    error: 'Period must be week, month, or year.'
                });
            }
            const result = await ImpactService.getDonorImpact(req.user.id, period);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[ImpactController.getDonorImpact]', error);
            return res.status(500).json({ error: 'Failed to fetch donor impact data.' });
        }
    }

    /**
     * getRecipientImpact - GET /impact/recipient
     * Protected: recipient role only
     */
    async getRecipientImpact(req, res) {
        try {
            const period = req.query.period || 'month';
            if (!['week', 'month', 'year'].includes(period)) {
                return res.status(400).json({
                    error: 'Period must be week, month, or year.'
                });
            }
            const result = await ImpactService.getRecipientImpact(req.user.id, period);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[ImpactController.getRecipientImpact]', error);
            return res.status(500).json({ error: 'Failed to fetch recipient impact data.' });
        }
    }

    /**
     * getAdminImpact - GET /impact/admin
     * Protected: admin role only
     */
    async getAdminImpact(req, res) {
        try {
            const period = req.query.period || 'month';
            if (!['week', 'month', 'year'].includes(period)) {
                return res.status(400).json({
                    error: 'Period must be week, month, or year.'
                });
            }
            const result = await ImpactService.getAdminImpact(period);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[ImpactController.getAdminImpact]', error);
            return res.status(500).json({ error: 'Failed to fetch admin impact data.' });
        }
    }
}

module.exports = new ImpactController();