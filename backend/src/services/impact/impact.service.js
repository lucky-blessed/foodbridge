/**
 * impact.service.js - Impact Service
 *
 * Provides analytics data for the Impact Dashboard.
 * Three role-specific methods — donor, recipient, admin.
 *
 * Key design decisions:
 *      1. Donor and admin metrics come from MongoDB (listings collection)
 *         using the aggregation pipeline with $group and $dateToString
 *         for time-series bucketing by day, month, or year.
 *      2. Recipient metrics join PostgreSQL claim_records with MongoDB
 *         listings — PG gives us claim counts and status, Mongo gives
 *         us the estimatedValue and quantity from the listing document.
 *      3. All three methods accept a period param (week | month | year)
 *         that controls how chart data is bucketed.
 *      4. Meals are estimated at 0.3 kg per meal throughout.
 *
 * @author Lucky Nkwor
 */

const FoodListing = require('../../models/Listing');
const { pool }    = require('../../config/database');

const KG_PER_MEAL = 0.3;

/**
 * getPeriodFormat - returns MongoDB $dateToString format string
 * for the requested period bucket.
 */
const getPeriodFormat = (period) => {
    if (period === 'week')  return '%Y-%m-%d';   // daily buckets
    if (period === 'year')  return '%Y';          // yearly buckets
    return '%Y-%m';                               // monthly buckets (default)
};

/**
 * getPeriodStartDate - returns the start date for the chart window.
 * week  → last 7 days
 * month → last 12 months
 * year  → last 5 years
 */
const getPeriodStartDate = (period) => {
    const now = new Date();
    if (period === 'week') {
        return new Date(now.setDate(now.getDate() - 7));
    }
    if (period === 'year') {
        return new Date(now.setFullYear(now.getFullYear() - 5));
    }
    // default: month — last 12 months
    return new Date(now.setMonth(now.getMonth() - 12));
};

class ImpactService {

    /**
     * getDonorImpact - analytics for a single donor
     *
     * Lifetime totals + time-series chart data from MongoDB listings.
     *
     * @param {string} donorId - UUID from req.user.id
     * @param {string} period  - week | month | year (default month)
     * @returns {Object} metrics + chartData + categoryBreakdown
     */
    async getDonorImpact(donorId, period = 'month') {
        const periodFormat = getPeriodFormat(period);
        const startDate    = getPeriodStartDate(period);

        // --1-- Lifetime totals aggregation
        const [totals] = await FoodListing.aggregate([
            { $match: { donorId } },
            {
                $group: {
                    _id:            null,
                    totalListings:  { $sum: 1 },
                    completed:      { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    expired:        { $sum: { $cond: [{ $eq: ['$status', 'expired']   }, 1, 0] } },
                    active:         { $sum: { $cond: [{ $in:  ['$status', ['available', 'claimed']] }, 1, 0] } },
                    totalValue:     { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$estimatedValue', 0] } },
                    kgRescued:      { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$quantity', 0] } },
                }
            }
        ]);

        const t = totals || {};
        const completed      = t.completed    || 0;
        const expired        = t.expired      || 0;
        const completionRate = (completed + expired) > 0
            ? Math.round((completed / (completed + expired)) * 100)
            : 0;
        const kgRescued  = parseFloat((t.kgRescued  || 0).toFixed(2));
        const mealsSaved = Math.floor(kgRescued / KG_PER_MEAL);

        // --2-- Time-series chart data
        const chartData = await FoodListing.aggregate([
            {
                $match: {
                    donorId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id:   { $dateToString: { format: periodFormat, date: '$createdAt' } },
                    count: { $sum: 1 },
                    value: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$estimatedValue', 0] } },
                    kg:    { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$quantity', 0] } },
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, label: '$_id', count: 1, value: 1, kg: 1 } }
        ]);

        // --3-- Category breakdown (all time)
        const categoryBreakdown = await FoodListing.aggregate([
            { $match: { donorId } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, category: '$_id', count: 1 } }
        ]);

        return {
            totalListings:   t.totalListings  || 0,
            completed,
            expired,
            active:          t.active         || 0,
            completionRate,
            totalValue:      parseFloat((t.totalValue || 0).toFixed(2)),
            kgRescued,
            mealsSaved,
            chartData,
            categoryBreakdown,
            period
        };
    }

    /**
     * getRecipientImpact - analytics for a single recipient
     *
     * Claim counts from PostgreSQL joined with listing value/quantity
     * from MongoDB for each completed claim.
     *
     * @param {string} recipientId - UUID from req.user.id
     * @param {string} period      - week | month | year (default month)
     */
    async getRecipientImpact(recipientId, period = 'month') {
        const startDate = getPeriodStartDate(period);

        // --1-- Lifetime claim totals from PostgreSQL
        const totalsResult = await pool.query(
            `SELECT
                COUNT(*)                                                    AS total_claims,
                COUNT(CASE WHEN status = 'completed'  THEN 1 END)          AS completed,
                COUNT(CASE WHEN status = 'cancelled'  THEN 1 END)          AS cancelled,
                COUNT(CASE WHEN status = 'active'     THEN 1 END)          AS active
            FROM claim_records
            WHERE recipient_id = $1`,
            [recipientId]
        );
        const ct = totalsResult.rows[0];
        const completed  = parseInt(ct.completed,    10) || 0;
        const cancelled  = parseInt(ct.cancelled,    10) || 0;
        const pickupRate = (completed + cancelled) > 0
            ? Math.round((completed / (completed + cancelled)) * 100)
            : 0;

        // --2-- Enrich completed claims with listing value and quantity from MongoDB
        const completedClaims = await pool.query(
            `SELECT listing_id, claimed_at
             FROM claim_records
             WHERE recipient_id = $1 AND status = 'completed'`,
            [recipientId]
        );

        let totalValue  = 0;
        let kgReceived  = 0;
        const chartMap  = {};

        for (const claim of completedClaims.rows) {
            const listing = await FoodListing.findById(claim.listing_id)
                .select('estimatedValue quantity');
            if (!listing) continue;

            totalValue += listing.estimatedValue || 0;
            kgReceived += listing.quantity       || 0;

            // Build chart buckets based on claimed_at
            const claimedAt = new Date(claim.claimed_at);
            if (claimedAt >= startDate) {
                let label;
                if (period === 'week') {
                    label = claimedAt.toISOString().split('T')[0];
                } else if (period === 'year') {
                    label = String(claimedAt.getFullYear());
                } else {
                    label = `${claimedAt.getFullYear()}-${String(claimedAt.getMonth() + 1).padStart(2, '0')}`;
                }
                if (!chartMap[label]) chartMap[label] = { label, count: 0, value: 0, kg: 0 };
                chartMap[label].count += 1;
                chartMap[label].value += listing.estimatedValue || 0;
                chartMap[label].kg    += listing.quantity       || 0;
            }
        }

        const chartData = Object.values(chartMap).sort((a, b) =>
            a.label.localeCompare(b.label)
        );

        // --3-- Category breakdown from completed claims
        const categoryMap = {};
        for (const claim of completedClaims.rows) {
            const listing = await FoodListing.findById(claim.listing_id)
                .select('category');
            if (!listing) continue;
            categoryMap[listing.category] = (categoryMap[listing.category] || 0) + 1;
        }
        const categoryBreakdown = Object.entries(categoryMap)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);

        kgReceived = parseFloat(kgReceived.toFixed(2));

        return {
            totalClaims:   parseInt(ct.total_claims, 10) || 0,
            completed,
            cancelled,
            active:        parseInt(ct.active,       10) || 0,
            pickupRate,
            totalValue:    parseFloat(totalValue.toFixed(2)),
            kgReceived,
            mealsReceived: Math.floor(kgReceived / KG_PER_MEAL),
            chartData,
            categoryBreakdown,
            period
        };
    }

    /**
     * getAdminImpact - platform-wide analytics for admin
     *
     * Aggregates all listings and claims across all users.
     * Includes top 5 donors and top 5 recipients.
     *
     * @param {string} period - week | month | year (default month)
     */
    async getAdminImpact(period = 'month') {
        const periodFormat = getPeriodFormat(period);
        const startDate    = getPeriodStartDate(period);

        // --1-- Platform-wide listing totals
        const [totals] = await FoodListing.aggregate([
            {
                $group: {
                    _id:           null,
                    totalListings: { $sum: 1 },
                    completed:     { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    expired:       { $sum: { $cond: [{ $eq: ['$status', 'expired']   }, 1, 0] } },
                    totalValue:    { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$estimatedValue', 0] } },
                    kgRescued:     { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$quantity', 0] } },
                }
            }
        ]);

        const t = totals || {};
        const completed      = t.completed || 0;
        const expired        = t.expired   || 0;
        const kgRescued      = parseFloat((t.kgRescued  || 0).toFixed(2));
        const totalValue     = parseFloat((t.totalValue || 0).toFixed(2));
        const mealsSaved     = Math.floor(kgRescued / KG_PER_MEAL);
        const completionRate = (completed + expired) > 0
            ? Math.round((completed / (completed + expired)) * 100)
            : 0;

        // --2-- Platform-wide claim totals from PostgreSQL
        const claimTotals = await pool.query(
            `SELECT COUNT(*) AS total_claims FROM claim_records`
        );

        // --3-- Time-series chart data (platform-wide)
        const chartData = await FoodListing.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id:   { $dateToString: { format: periodFormat, date: '$createdAt' } },
                    count: { $sum: 1 },
                    value: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$estimatedValue', 0] } },
                    kg:    { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$quantity', 0] } },
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, label: '$_id', count: 1, value: 1, kg: 1 } }
        ]);

        // --4-- Category breakdown (platform-wide, all time)
        const categoryBreakdown = await FoodListing.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, category: '$_id', count: 1 } }
        ]);

        // --5-- Top 5 donors by completed listings
        const topDonorsRaw = await FoodListing.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id:       '$donorId',
                    completed: { $sum: 1 },
                    totalValue:{ $sum: '$estimatedValue' },
                    kgRescued: { $sum: '$quantity' },
                    donorName: { $first: '$donorName' }
                }
            },
            { $sort: { completed: -1 } },
            { $limit: 5 }
        ]);

        // Enrich top donors with profile pic from PostgreSQL
        const topDonors = await Promise.all(
            topDonorsRaw.map(async (d) => {
                const userRes = await pool.query(
                    `SELECT first_name, last_name, profile_pic_url
                     FROM users WHERE id = $1`,
                    [d._id]
                );
                const u = userRes.rows[0] || {};
                return {
                    donorId:        d._id,
                    donorName:      d.donorName || `${u.first_name} ${u.last_name}`,
                    profilePicUrl:  u.profile_pic_url || null,
                    completed:      d.completed,
                    totalValue:     parseFloat((d.totalValue || 0).toFixed(2)),
                    kgRescued:      parseFloat((d.kgRescued  || 0).toFixed(2)),
                };
            })
        );

        // --6-- Top 5 recipients by completed pickups
        const topRecipientsRaw = await pool.query(
            `SELECT
                u.id, u.first_name, u.last_name, u.profile_pic_url,
                COUNT(cr.id) AS completed_pickups
            FROM claim_records cr
            JOIN users u ON u.id = cr.recipient_id
            WHERE cr.status = 'completed'
            GROUP BY u.id, u.first_name, u.last_name, u.profile_pic_url
            ORDER BY completed_pickups DESC
            LIMIT 5`
        );

        const topRecipients = topRecipientsRaw.rows.map(r => ({
            recipientId:      r.id,
            recipientName:    `${r.first_name} ${r.last_name}`,
            profilePicUrl:    r.profile_pic_url || null,
            completedPickups: parseInt(r.completed_pickups, 10)
        }));

        return {
            totalListings:  t.totalListings || 0,
            completed,
            expired,
            completionRate,
            totalValue,
            kgRescued,
            mealsSaved,
            totalClaims:    parseInt(claimTotals.rows[0].total_claims, 10) || 0,
            topDonors,
            topRecipients,
            chartData,
            categoryBreakdown,
            period
        };
    }
}

module.exports = new ImpactService();