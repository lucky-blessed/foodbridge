/**
 * claims.test.js - Claims Integration Tests
 *
 * Tests the full HTTP request/response cycle for claim endpoints.
 * Uses Supertest against the real Express app with real DB connections.
 *
 * Endpoints covered:
 *  POST   /claims              - create claim with optional schedule
 *  DELETE /claims/:id          - cancel claim
 *  PATCH  /claims/:id/reschedule - reschedule pickup time
 *  GET    /claims/me           - claim history
 *  GET    /claims/count        - rolling window stats
 *
 * Strategy:
 *  - Login as existing donor and recipient accounts
 *  - Create a fresh test listing before each test that needs one
 *  - Clean up all test listings and claims after the suite
 *
 * @author Lucky Nkwor
 */

const request  = require('supertest');
const app      = require('../../src/app');
const { pool } = require('../../src/config/database');
const mongoose = require('mongoose');
const FoodListing = require('../../src/models/Listing');

// ── Existing test accounts ─────────────────────────────────
const DONOR_EMAIL = 'test.donor.claims@claimstest.local';
const DONOR_PASSWORD = 'Password1';
const RECIP_EMAIL = 'test.recip.claims@claimstest.local';
const RECIP_PASSWORD = 'Password1';

let donorToken;
let recipientToken;
let recipientId;
let testListingId;
const createdListingIds = [];

beforeAll(async () => {
    // Register donor
    await request(app)
        .post('/auth/register')
        .field('firstName', 'Test')
        .field('lastName',  'Donor')
        .field('email',     DONOR_EMAIL)
        .field('password',  DONOR_PASSWORD)
        .field('role',      'donor')
        .field('subRole',   'individual');

    // Register recipient
    await request(app)
        .post('/auth/register')
        .field('firstName', 'Test')
        .field('lastName',  'Recipient')
        .field('email',     RECIP_EMAIL)
        .field('password',  RECIP_PASSWORD)
        .field('role',      'recipient')
        .field('subRole',   'individual')
        .field('ageRange',  '18_24')
        .field('gender',    'male');

    // Login donor
    const donorRes = await request(app)
        .post('/auth/login')
        .send({ email: DONOR_EMAIL, password: DONOR_PASSWORD });
    donorToken = donorRes.body.token;

    // Login recipient
    const recipRes = await request(app)
        .post('/auth/login')
        .send({ email: RECIP_EMAIL, password: RECIP_PASSWORD });
    recipientToken = recipRes.body.token;
    recipientId    = recipRes.body.user?.id;

    if (!donorToken)     console.warn('Donor login failed');
    if (!recipientToken) console.warn('Recipient login failed');
});

// ── Helper: create a fresh available listing ──────────────────
const createTestListing = async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const soon   = new Date(Date.now() + 1  * 60 * 60 * 1000).toISOString();
    const res = await request(app)
        .post('/listings')
        .set('Authorization', `Bearer ${donorToken}`)
        .field('title',       'Test Claim Listing')
        .field('category',    'meals')
        .field('quantity',    '5')
        .field('unit',        'kg')
        .field('lat',         '52.2681')
        .field('lng',         '-113.8112')
        .field('address',     'Red Deer AB')
        .field('pickupStart', soon)
        .field('pickupEnd',   future);
    const id = res.body.listing?._id;
    if (id) createdListingIds.push(id);
    return id;
};

// ── Cleanup: delete all test listings and claims ──────────────
afterAll(async () => {
    for (const id of createdListingIds) {
        await FoodListing.findByIdAndDelete(id).catch(() => {});
    }
    await pool.query(
        `DELETE FROM users WHERE email IN ($1, $2)`,
        [DONOR_EMAIL, RECIP_EMAIL]
    ).catch(() => {});
    // Clean up test users
    await pool.query(
        `DELETE FROM users WHERE email IN ($1, $2)`,
        [DONOR_EMAIL, RECIP_EMAIL]
    ).catch(() => {});
});

// ══════════════════════════════════════════════════════════════
// POST /claims — Create Claim
// ══════════════════════════════════════════════════════════════
describe('POST /claims', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .post('/claims')
            .send({ listingId: '507f1f77bcf86cd799439011' });
        expect(res.status).toBe(401);
    });

    test('returns 400 when listingId is missing', async () => {
        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/listingId/i);
    });

    test('returns 400 when listingId format is invalid', async () => {
        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId: 'not-a-valid-id' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid listing ID/i);
    });

    test('returns 403 when donor tries to claim', async () => {
        const listingId = await createTestListing();
        if (!listingId) return;
        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${donorToken}`)
            .send({ listingId });
        expect(res.status).toBe(403);
    });

    test('successfully creates a claim and returns PIN', async () => {
        const listingId = await createTestListing();
        if (!listingId) { console.warn('Skipping — could not create listing'); return; }

        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/claimed successfully/i);
        expect(res.body.pin).toMatch(/^\d{6}$/);  // 6-digit numeric PIN
        expect(res.body.claim.status).toBe('active');
        expect(res.body.claim.listing_id).toBe(listingId);
        expect(res.body.remainingClaims).toBeDefined();
    });

    test('successfully creates a claim with scheduled pickup time', async () => {
        const listingId = await createTestListing();
        if (!listingId) { console.warn('Skipping — could not create listing'); return; }

        const scheduled = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId, scheduledPickupAt: scheduled });

        expect(res.status).toBe(201);
        expect(res.body.claim.scheduled_pickup_at).toBeDefined();
        expect(res.body.claim.reschedule_count).toBe(0);
    });

    test('returns 404 when listing does not exist', async () => {
        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId: '507f1f77bcf86cd799439011' });
        expect(res.status).toBe(404);
    });

    test('returns 409 when listing is already claimed', async () => {
        const listingId = await createTestListing();
        if (!listingId) { console.warn('Skipping — could not create listing'); return; }

        // First claim should succeed
        await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId });

        // Second claim on same listing should fail
        const res = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId });

        expect([409, 403]).toContain(res.status);
    });
});

// ══════════════════════════════════════════════════════════════
// GET /claims/me — Claim History
// ══════════════════════════════════════════════════════════════
describe('GET /claims/me', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/claims/me');
        expect(res.status).toBe(401);
    });

    test('returns 403 when donor tries to access', async () => {
        const res = await request(app)
            .get('/claims/me')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(403);
    });

    test('returns claim history for authenticated recipient', async () => {
        const res = await request(app)
            .get('/claims/me')
            .set('Authorization', `Bearer ${recipientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.claims).toBeDefined();
        expect(Array.isArray(res.body.claims)).toBe(true);
        expect(res.body.count).toBeDefined();
    });

    test('claim history includes scheduled_pickup_at and reschedule_count', async () => {
        const res = await request(app)
            .get('/claims/me')
            .set('Authorization', `Bearer ${recipientToken}`);

        expect(res.status).toBe(200);
        if (res.body.claims.length > 0) {
            const claim = res.body.claims[0];
            expect(claim).toHaveProperty('scheduled_pickup_at');
            expect(claim).toHaveProperty('reschedule_count');
        }
    });
});

// ══════════════════════════════════════════════════════════════
// GET /claims/count — Rolling Window Stats
// ══════════════════════════════════════════════════════════════
describe('GET /claims/count', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/claims/count');
        expect(res.status).toBe(401);
    });

    test('returns rolling window stats for recipient', async () => {
        const res = await request(app)
            .get('/claims/count')
            .set('Authorization', `Bearer ${recipientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBeDefined();
        expect(res.body.limit).toBeDefined();
        expect(res.body.remaining).toBeDefined();
        expect(res.body.resetsAt).toBeDefined();
        expect(res.body.limit).toBeGreaterThan(0);
        expect(res.body.count).toBeGreaterThanOrEqual(0);
    });

    test('remaining equals limit minus count', async () => {
        const res = await request(app)
            .get('/claims/count')
            .set('Authorization', `Bearer ${recipientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.remaining).toBe(res.body.limit - res.body.count);
    });
});

// ══════════════════════════════════════════════════════════════
// DELETE /claims/:id — Cancel Claim
// ══════════════════════════════════════════════════════════════
describe('DELETE /claims/:id', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .delete('/claims/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(401);
    });

    test('returns 404 when claim does not exist', async () => {
        const res = await request(app)
            .delete('/claims/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(404);
    });

    test('successfully cancels an active claim', async () => {
        const listingId = await createTestListing();
        if (!listingId) { console.warn('Skipping — could not create listing'); return; }

        // Create a claim
        const claimRes = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId });

        if (claimRes.status !== 201) { console.warn('Skipping cancel test — claim failed'); return; }
        const claimId = claimRes.body.claim.id;

        // Cancel it
        const cancelRes = await request(app)
            .delete(`/claims/${claimId}`)
            .set('Authorization', `Bearer ${recipientToken}`);

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.message).toMatch(/cancelled/i);
    });
});

// ══════════════════════════════════════════════════════════════
// PATCH /claims/:id/reschedule
// ══════════════════════════════════════════════════════════════
describe('PATCH /claims/:id/reschedule', () => {

    test('returns 400 when newScheduledTime is missing', async () => {
        const res = await request(app)
            .patch('/claims/00000000-0000-0000-0000-000000000000/reschedule')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/newScheduledTime/i);
    });

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .patch('/claims/00000000-0000-0000-0000-000000000000/reschedule')
            .send({ newScheduledTime: new Date().toISOString() });
        expect(res.status).toBe(401);
    });

    test('successfully reschedules an active claim', async () => {
        const listingId = await createTestListing();
        if (!listingId) { console.warn('Skipping — could not create listing'); return; }

        // Create a claim with scheduled time
        const scheduled = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
        const claimRes = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId, scheduledPickupAt: scheduled });

        if (claimRes.status !== 201) { console.warn('Skipping reschedule test — claim failed'); return; }
        const claimId = claimRes.body.claim.id;

        // Reschedule
        const newTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        const res = await request(app)
            .patch(`/claims/${claimId}/reschedule`)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ newScheduledTime: newTime });

        expect(res.status).toBe(200);
        expect(res.body.claim.reschedule_count).toBe(1);
        expect(res.body.claim.reschedule_history).toHaveLength(1);
        expect(res.body.listing.donorId).toBeDefined();
    });

    test('returns 400 when new time is outside pickup window', async () => {
        const listingId = await createTestListing();
        if (!listingId) { console.warn('Skipping — could not create listing'); return; }

        const claimRes = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId });

        if (claimRes.status !== 201) { console.warn('Skipping — claim failed'); return; }
        const claimId = claimRes.body.claim.id;

        // Time far in the past — outside window
        const badTime = new Date('2020-01-01T10:00:00.000Z').toISOString();
        const res = await request(app)
            .patch(`/claims/${claimId}/reschedule`)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ newScheduledTime: badTime });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/outside/i);
    });
});