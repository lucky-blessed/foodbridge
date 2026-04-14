/**
 * impact.test.js - Impact Integration Tests
 *
 * Tests the full HTTP request/response cycle for impact endpoints.
 *
 * Endpoints covered:
 *  GET /impact/donor     - donor analytics (donor role only)
 *  GET /impact/recipient - recipient analytics (recipient role only)
 *  GET /impact/admin     - platform analytics (admin role only)
 *
 * Tests cover:
 *  - Role gating (wrong role returns 403)
 *  - Auth gating (no token returns 401)
 *  - Period validation (invalid period returns 400)
 *  - Response shape validation (correct fields returned)
 *  - Period toggle (week/month/year all return data)
 *
 * @author Team ShareBite
 */

const request = require('supertest');
const app     = require('../../src/app');
const { pool } = require('../../src/config/database');

// ── Test accounts ─────────────────────────────────────────────
const DONOR_EMAIL    = 'test.donor.impact@impacttest.local';
const DONOR_PASSWORD = 'Password1';
const RECIP_EMAIL    = 'test.recip.impact@impacttest.local';
const RECIP_PASSWORD = 'Password1';
const ADMIN_EMAIL    = 'admin@foodbridge.com';
const ADMIN_PASSWORD = 'Admin1234';

let donorToken;
let recipientToken;
let adminToken;

// ── Setup ─────────────────────────────────────────────────────
beforeAll(async () => {
    // Register donor
    await request(app)
        .post('/auth/register')
        .field('firstName', 'Impact')
        .field('lastName',  'Donor')
        .field('email',     DONOR_EMAIL)
        .field('password',  DONOR_PASSWORD)
        .field('role',      'donor')
        .field('subRole',   'individual');

    // Register recipient
    await request(app)
        .post('/auth/register')
        .field('firstName', 'Impact')
        .field('lastName',  'Recipient')
        .field('email',     RECIP_EMAIL)
        .field('password',  RECIP_PASSWORD)
        .field('role',      'recipient')
        .field('subRole',   'individual')
        .field('ageRange',  '18_24')
        .field('gender',    'female');

    // Login all three
    const [donorRes, recipRes, adminRes] = await Promise.all([
        request(app).post('/auth/login').send({ email: DONOR_EMAIL, password: DONOR_PASSWORD }),
        request(app).post('/auth/login').send({ email: RECIP_EMAIL, password: RECIP_PASSWORD }),
        request(app).post('/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    ]);

    donorToken     = donorRes.body.token;
    recipientToken = recipRes.body.token;
    adminToken     = adminRes.body.token;

    if (!donorToken)     console.warn('Donor login failed');
    if (!recipientToken) console.warn('Recipient login failed');
    if (!adminToken)     console.warn('Admin login failed');
});

// ── Cleanup ───────────────────────────────────────────────────
afterAll(async () => {
    await pool.query(
        `DELETE FROM users WHERE email IN ($1, $2)`,
        [DONOR_EMAIL, RECIP_EMAIL]
    ).catch(() => {});
});

// ══════════════════════════════════════════════════════════════
// GET /impact/donor
// ══════════════════════════════════════════════════════════════
describe('GET /impact/donor', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/impact/donor');
        expect(res.status).toBe(401);
    });

    test('returns 403 when recipient tries to access', async () => {
        const res = await request(app)
            .get('/impact/donor')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(403);
    });

    test('returns 403 when admin tries to access', async () => {
        const res = await request(app)
            .get('/impact/donor')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(403);
    });

    test('returns 400 when period is invalid', async () => {
        const res = await request(app)
            .get('/impact/donor?period=invalid')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/period/i);
    });

    test('returns 200 with correct shape for donor', async () => {
        const res = await request(app)
            .get('/impact/donor?period=month')
            .set('Authorization', `Bearer ${donorToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalListings');
        expect(res.body).toHaveProperty('completed');
        expect(res.body).toHaveProperty('expired');
        expect(res.body).toHaveProperty('active');
        expect(res.body).toHaveProperty('completionRate');
        expect(res.body).toHaveProperty('totalValue');
        expect(res.body).toHaveProperty('kgRescued');
        expect(res.body).toHaveProperty('mealsSaved');
        expect(res.body).toHaveProperty('chartData');
        expect(res.body).toHaveProperty('categoryBreakdown');
        expect(res.body).toHaveProperty('period');
        expect(Array.isArray(res.body.chartData)).toBe(true);
        expect(Array.isArray(res.body.categoryBreakdown)).toBe(true);
    });

    test('returns correct period in response for week', async () => {
        const res = await request(app)
            .get('/impact/donor?period=week')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);
        expect(res.body.period).toBe('week');
    });

    test('returns correct period in response for year', async () => {
        const res = await request(app)
            .get('/impact/donor?period=year')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);
        expect(res.body.period).toBe('year');
    });

    test('completionRate is between 0 and 100', async () => {
        const res = await request(app)
            .get('/impact/donor?period=month')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);
        expect(res.body.completionRate).toBeGreaterThanOrEqual(0);
        expect(res.body.completionRate).toBeLessThanOrEqual(100);
    });

    test('mealsSaved equals floor of kgRescued divided by 0.3', async () => {
        const res = await request(app)
            .get('/impact/donor?period=month')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);
        expect(res.body.mealsSaved).toBe(Math.floor(res.body.kgRescued / 0.3));
    });
});

// ══════════════════════════════════════════════════════════════
// GET /impact/recipient
// ══════════════════════════════════════════════════════════════
describe('GET /impact/recipient', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/impact/recipient');
        expect(res.status).toBe(401);
    });

    test('returns 403 when donor tries to access', async () => {
        const res = await request(app)
            .get('/impact/recipient')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(403);
    });

    test('returns 403 when admin tries to access', async () => {
        const res = await request(app)
            .get('/impact/recipient')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(403);
    });

    test('returns 400 when period is invalid', async () => {
        const res = await request(app)
            .get('/impact/recipient?period=daily')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(400);
    });

    test('returns 200 with correct shape for recipient', async () => {
        const res = await request(app)
            .get('/impact/recipient?period=month')
            .set('Authorization', `Bearer ${recipientToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalClaims');
        expect(res.body).toHaveProperty('completed');
        expect(res.body).toHaveProperty('cancelled');
        expect(res.body).toHaveProperty('active');
        expect(res.body).toHaveProperty('pickupRate');
        expect(res.body).toHaveProperty('totalValue');
        expect(res.body).toHaveProperty('kgReceived');
        expect(res.body).toHaveProperty('mealsReceived');
        expect(res.body).toHaveProperty('chartData');
        expect(res.body).toHaveProperty('categoryBreakdown');
        expect(Array.isArray(res.body.chartData)).toBe(true);
    });

    test('pickupRate is between 0 and 100', async () => {
        const res = await request(app)
            .get('/impact/recipient?period=month')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.pickupRate).toBeGreaterThanOrEqual(0);
        expect(res.body.pickupRate).toBeLessThanOrEqual(100);
    });

    test('mealsReceived equals floor of kgReceived divided by 0.3', async () => {
        const res = await request(app)
            .get('/impact/recipient?period=month')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.mealsReceived).toBe(Math.floor(res.body.kgReceived / 0.3));
    });
});

// ══════════════════════════════════════════════════════════════
// GET /impact/admin
// ══════════════════════════════════════════════════════════════
describe('GET /impact/admin', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/impact/admin');
        expect(res.status).toBe(401);
    });

    test('returns 403 when donor tries to access', async () => {
        const res = await request(app)
            .get('/impact/admin')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(403);
    });

    test('returns 403 when recipient tries to access', async () => {
        const res = await request(app)
            .get('/impact/admin')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(403);
    });

    test('returns 400 when period is invalid', async () => {
        const res = await request(app)
            .get('/impact/admin?period=quarterly')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
    });

    test('returns 200 with correct shape for admin', async () => {
        const res = await request(app)
            .get('/impact/admin?period=month')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalListings');
        expect(res.body).toHaveProperty('completed');
        expect(res.body).toHaveProperty('expired');
        expect(res.body).toHaveProperty('completionRate');
        expect(res.body).toHaveProperty('totalValue');
        expect(res.body).toHaveProperty('kgRescued');
        expect(res.body).toHaveProperty('mealsSaved');
        expect(res.body).toHaveProperty('totalClaims');
        expect(res.body).toHaveProperty('topDonors');
        expect(res.body).toHaveProperty('topRecipients');
        expect(res.body).toHaveProperty('chartData');
        expect(res.body).toHaveProperty('categoryBreakdown');
        expect(Array.isArray(res.body.topDonors)).toBe(true);
        expect(Array.isArray(res.body.topRecipients)).toBe(true);
    });

    test('topDonors has at most 5 entries', async () => {
        const res = await request(app)
            .get('/impact/admin?period=month')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.topDonors.length).toBeLessThanOrEqual(5);
    });

    test('topRecipients has at most 5 entries', async () => {
        const res = await request(app)
            .get('/impact/admin?period=month')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.topRecipients.length).toBeLessThanOrEqual(5);
    });

    test('all three periods return valid responses', async () => {
        const periods = ['week', 'month', 'year'];
        for (const period of periods) {
            const res = await request(app)
                .get(`/impact/admin?period=${period}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.period).toBe(period);
        }
    });

    test('mealsSaved equals floor of kgRescued divided by 0.3', async () => {
        const res = await request(app)
            .get('/impact/admin?period=month')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.mealsSaved).toBe(Math.floor(res.body.kgRescued / 0.3));
    });
});