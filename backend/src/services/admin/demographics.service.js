/**
 * demographics.service.js - Admin Demographics Service
 *
 * Provides anonymised aggregate demographic data for city planning.
 * No personally identifiable information is ever returned —
 * only counts grouped by demographic dimensions.
 *
 * Two views:
 *  - Individual: age range and gender breakdowns for individual users
 *  - Organization: org type breakdowns for organization users
 *
 * All queries accept filter params (view, role, gender, age_range)
 * that are applied as WHERE conditions on the users table.
 *
 * @author Lucky Nkwor
 */

const { pool } = require('../../config/database');

class DemographicsService {

    /**
     * buildWhereClause - builds a reusable WHERE clause from filter params
     * @private
     */
    buildWhereClause(filters, extraConditions = []) {
        const conditions = [...extraConditions];
        const values     = [];
        let   paramIndex = 1;

        if (filters.role && filters.role !== 'all') {
            conditions.push(`role = $${paramIndex++}`);
            values.push(filters.role);
        }
        if (filters.gender && filters.gender !== 'all') {
            conditions.push(`gender = $${paramIndex++}`);
            values.push(filters.gender);
        }
        if (filters.ageRange && filters.ageRange !== 'all') {
            conditions.push(`age_range = $${paramIndex++}`);
            values.push(filters.ageRange);
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        return { whereClause, values };
    }

    /**
     * getIndividualDemographics - aggregate counts for individual users
     *
     * Returns:
     *  byGender    - count per gender
     *  byAgeRange  - count per age bracket
     *  byRole      - count per role (donor/recipient)
     *  genderAge   - count per gender+age combination
     *  genderRole  - count per gender+role combination
     *  total       - total individual users matching filters
     *
     * @param {Object} filters - { role, gender, ageRange }
     */
    async getIndividualDemographics(filters = {}) {
        const baseConditions = ['sub_role = \'individual\''];

        // byGender
        const { whereClause: wg, values: vg } = this.buildWhereClause(
            { role: filters.role },
            [...baseConditions]
        );
        const byGenderRes = await pool.query(
            `SELECT gender, COUNT(*) AS count
             FROM users ${wg}
             AND gender IS NOT NULL
             GROUP BY gender
             ORDER BY count DESC`,
            vg
        );

        // byAgeRange
        const { whereClause: wa, values: va } = this.buildWhereClause(
            { role: filters.role, gender: filters.gender },
            [...baseConditions]
        );
        const byAgeRes = await pool.query(
            `SELECT age_range, COUNT(*) AS count
             FROM users ${wa}
             AND age_range IS NOT NULL
             GROUP BY age_range
             ORDER BY count DESC`,
            va
        );

        // byRole
        const { whereClause: wr, values: vr } = this.buildWhereClause(
            { gender: filters.gender, ageRange: filters.ageRange },
            [...baseConditions]
        );
        const byRoleRes = await pool.query(
            `SELECT role, COUNT(*) AS count
             FROM users ${wr}
             GROUP BY role
             ORDER BY count DESC`,
            vr
        );

        // genderAge matrix
        const { whereClause: wga, values: vga } = this.buildWhereClause(
            { role: filters.role },
            [...baseConditions]
        );
        const genderAgeRes = await pool.query(
            `SELECT gender, age_range, COUNT(*) AS count
             FROM users ${wga}
             AND gender IS NOT NULL AND age_range IS NOT NULL
             GROUP BY gender, age_range
             ORDER BY gender, age_range`,
            vga
        );

        // genderRole matrix
        const { whereClause: wgr, values: vgr } = this.buildWhereClause(
            { ageRange: filters.ageRange },
            [...baseConditions]
        );
        const genderRoleRes = await pool.query(
            `SELECT gender, role, COUNT(*) AS count
             FROM users ${wgr}
             AND gender IS NOT NULL
             GROUP BY gender, role
             ORDER BY gender, role`,
            vgr
        );

        // total
        const { whereClause: wt, values: vt } = this.buildWhereClause(
            { role: filters.role, gender: filters.gender, ageRange: filters.ageRange },
            [...baseConditions]
        );
        const totalRes = await pool.query(
            `SELECT COUNT(*) AS count FROM users ${wt}`,
            vt
        );

        return {
            byGender:   byGenderRes.rows.map(r => ({
                gender: r.gender, count: parseInt(r.count, 10)
            })),
            byAgeRange: byAgeRes.rows.map(r => ({
                ageRange: r.age_range, count: parseInt(r.count, 10)
            })),
            byRole:     byRoleRes.rows.map(r => ({
                role: r.role, count: parseInt(r.count, 10)
            })),
            genderAge:  genderAgeRes.rows.map(r => ({
                gender: r.gender, ageRange: r.age_range, count: parseInt(r.count, 10)
            })),
            genderRole: genderRoleRes.rows.map(r => ({
                gender: r.gender, role: r.role, count: parseInt(r.count, 10)
            })),
            total: parseInt(totalRes.rows[0].count, 10)
        };
    }

    /**
     * getOrganizationDemographics - aggregate counts for organization users
     *
     * Returns:
     *  byType    - count per org_type
     *  byRole    - count per role (donor org / recipient org)
     *  typeRole  - count per org_type+role combination
     *  active30d - orgs with at least one action in last 30 days
     *  total     - total organization users matching filters
     *
     * @param {Object} filters - { role }
     */
    async getOrganizationDemographics(filters = {}) {
        const baseConditions = ['sub_role = \'organization\''];
        const roleFilter = filters.role && filters.role !== 'all'
            ? { role: filters.role } : {};

        // byType
        const { whereClause: wt, values: vt } = this.buildWhereClause(
            roleFilter, [...baseConditions]
        );
        const byTypeRes = await pool.query(
            `SELECT org_type, COUNT(*) AS count
             FROM users ${wt}
             AND org_type IS NOT NULL
             GROUP BY org_type
             ORDER BY count DESC`,
            vt
        );

        // byRole
        const { whereClause: wr, values: vr } = this.buildWhereClause(
            {}, [...baseConditions]
        );
        const byRoleRes = await pool.query(
            `SELECT role, COUNT(*) AS count
             FROM users ${wr}
             GROUP BY role
             ORDER BY count DESC`,
            vr
        );

        // typeRole matrix
        const { whereClause: wtr, values: vtr } = this.buildWhereClause(
            roleFilter, [...baseConditions]
        );
        const typeRoleRes = await pool.query(
            `SELECT org_type, role, COUNT(*) AS count
             FROM users ${wtr}
             AND org_type IS NOT NULL
             GROUP BY org_type, role
             ORDER BY org_type, role`,
            vtr
        );

        // active30d — orgs that registered in the last 30 days as a proxy for activity
        // (full activity tracking would require an activity_log table)
        const { whereClause: wa, values: va } = this.buildWhereClause(
            roleFilter, [...baseConditions]
        );
        const active30dRes = await pool.query(
            `SELECT COUNT(*) AS count
             FROM users ${wa}
             AND created_at >= NOW() - INTERVAL '30 days'`,
            va
        );

        // total
        const { whereClause: wtotal, values: vtotal } = this.buildWhereClause(
            roleFilter, [...baseConditions]
        );
        const totalRes = await pool.query(
            `SELECT COUNT(*) AS count FROM users ${wtotal}`,
            vtotal
        );

        return {
            byType:    byTypeRes.rows.map(r => ({
                orgType: r.org_type, count: parseInt(r.count, 10)
            })),
            byRole:    byRoleRes.rows.map(r => ({
                role: r.role, count: parseInt(r.count, 10)
            })),
            typeRole:  typeRoleRes.rows.map(r => ({
                orgType: r.org_type, role: r.role, count: parseInt(r.count, 10)
            })),
            active30d: parseInt(active30dRes.rows[0].count, 10),
            total:     parseInt(totalRes.rows[0].count, 10)
        };
    }

    /**
     * getDemographics - main entry point called by controller
     *
     * Accepts view param to control which data is returned:
     *  individual   → individuals only
     *  organization → organizations only
     *  both         → both views (default)
     *
     * @param {Object} filters - { view, role, gender, ageRange }
     */
    async getDemographics(filters = {}) {
        const view = filters.view || 'both';

        const [individuals, organizations] = await Promise.all([
            (view === 'individual' || view === 'both')
                ? this.getIndividualDemographics(filters)
                : Promise.resolve(null),
            (view === 'organization' || view === 'both')
                ? this.getOrganizationDemographics(filters)
                : Promise.resolve(null)
        ]);

        return {
            individuals,
            organizations,
            totals: {
                individuals:   individuals?.total   || 0,
                organizations: organizations?.total || 0
            }
        };
    }
}

module.exports = new DemographicsService();