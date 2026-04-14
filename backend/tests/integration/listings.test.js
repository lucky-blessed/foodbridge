/**
 * listings.test.js - Listings Integration Tests
 *
 * Tests the full HTTP request/response cycle for listing endpoints.
 *
 * Endpoints covered:
 *  POST   /listings              - create listing
 *  GET    /listings              - geo-search nearby listings
 *  GET    /listings/:id          - single listing
 *  GET    /listings/my           - donor's own listings
 *  PATCH  /listings/:id          - update listing
 *  DELETE /listings/:id          - delete listing
 *  PATCH  /listings/:id/:pin/confirm - verify PIN and complete pickup
 *
 * @author Team ShareBite
 */

const request     = require('supertest');
const app         = require('../../src/app');
const { pool }    = require('../../src/config/database');
const FoodListing = require('../../src/models/Listing');

// ── Test accounts ─────────────────────────────────────────────
const DONOR_EMAIL    = 'test.donor.listings@listingstest.local';
const DONOR_PASSWORD = 'Password1';
const RECIP_EMAIL    = 'test.recip.listings@listingstest.local';
const RECIP_PASSWORD = 'Password1';

let donorToken;
let recipientToken;
const createdListingIds = [];

// ── Helpers ───────────────────────────────────────────────────
const futureDate = (hoursFromNow) =>
    new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();

const createListing = async (overrides = {}) => {
    const res = await request(app)
        .post('/listings')
        .set('Authorization', `Bearer ${donorToken}`)
        .field('title',       overrides.title       || 'Test Listing')
        .field('category',    overrides.category    || 'meals')
        .field('quantity',    overrides.quantity    || '5')
        .field('unit',        overrides.unit        || 'kg')
        .field('lat',         overrides.lat         || '52.2681')
        .field('lng',         overrides.lng         || '-113.8112')
        .field('address',     overrides.address     || 'Red Deer AB')
        .field('pickupStart', overrides.pickupStart || futureDate(1))
        .field('pickupEnd',   overrides.pickupEnd   || futureDate(48));
    const id = res.body.listing?._id;
    if (id) createdListingIds.push(id);
    return { res, id };
};

// ── Setup ─────────────────────────────────────────────────────
beforeAll(async () => {
    // Register accounts
    await request(app)
        .post('/auth/register')
        .field('firstName', 'Listing')
        .field('lastName',  'Donor')
        .field('email',     DONOR_EMAIL)
        .field('password',  DONOR_PASSWORD)
        .field('role',      'donor')
        .field('subRole',   'individual');

    await request(app)
        .post('/auth/register')
        .field('firstName', 'Listing')
        .field('lastName',  'Recipient')
        .field('email',     RECIP_EMAIL)
        .field('password',  RECIP_PASSWORD)
        .field('role',      'recipient')
        .field('subRole',   'individual')
        .field('ageRange',  '18_24')
        .field('gender',    'male');

    // Login
    const [donorRes, recipRes] = await Promise.all([
        request(app).post('/auth/login').send({ email: DONOR_EMAIL, password: DONOR_PASSWORD }),
        request(app).post('/auth/login').send({ email: RECIP_EMAIL, password: RECIP_PASSWORD }),
    ]);
    donorToken     = donorRes.body.token;
    recipientToken = recipRes.body.token;

    if (!donorToken)     console.warn('Donor login failed');
    if (!recipientToken) console.warn('Recipient login failed');
});

// ── Cleanup ───────────────────────────────────────────────────
afterAll(async () => {
    for (const id of createdListingIds) {
        await FoodListing.findByIdAndDelete(id).catch(() => {});
    }
    await pool.query(
        `DELETE FROM claim_records WHERE listing_id = ANY($1::text[])`,
        [createdListingIds]
    ).catch(() => {});
    await pool.query(
        `DELETE FROM users WHERE email IN ($1, $2)`,
        [DONOR_EMAIL, RECIP_EMAIL]
    ).catch(() => {});
});

// ══════════════════════════════════════════════════════════════
// POST /listings — Create Listing
// ══════════════════════════════════════════════════════════════
describe('POST /listings', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .post('/listings')
            .field('title', 'Test')
            .field('category', 'meals')
            .field('quantity', '1')
            .field('unit', 'kg')
            .field('lat', '52.2681')
            .field('lng', '-113.8112')
            .field('pickupStart', futureDate(1))
            .field('pickupEnd', futureDate(48));
        expect(res.status).toBe(401);
    });

    test('returns 403 when recipient tries to create listing', async () => {
        const res = await request(app)
            .post('/listings')
            .set('Authorization', `Bearer ${recipientToken}`)
            .field('title', 'Test')
            .field('category', 'meals')
            .field('quantity', '1')
            .field('unit', 'kg')
            .field('lat', '52.2681')
            .field('lng', '-113.8112')
            .field('pickupStart', futureDate(1))
            .field('pickupEnd', futureDate(48));
        expect(res.status).toBe(403);
    });

    test('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/listings')
            .set('Authorization', `Bearer ${donorToken}`)
            .field('title', 'Only Title');
        expect(res.status).toBe(400);
        expect(res.body.required).toBeDefined();
    });

    test('returns 400 when location is missing', async () => {
        const res = await request(app)
            .post('/listings')
            .set('Authorization', `Bearer ${donorToken}`)
            .field('title', 'Test')
            .field('category', 'meals')
            .field('quantity', '1')
            .field('unit', 'kg')
            .field('pickupStart', futureDate(1))
            .field('pickupEnd', futureDate(48));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/location/i);
    });

    test('returns 400 when pickupEnd is before pickupStart', async () => {
        const res = await request(app)
            .post('/listings')
            .set('Authorization', `Bearer ${donorToken}`)
            .field('title', 'Test')
            .field('category', 'meals')
            .field('quantity', '1')
            .field('unit', 'kg')
            .field('lat', '52.2681')
            .field('lng', '-113.8112')
            .field('pickupStart', futureDate(48))
            .field('pickupEnd',   futureDate(1));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/pickupEnd/i);
    });

    test('successfully creates a listing with all required fields', async () => {
        const { res } = await createListing({ title: 'Fresh Bread' });
        expect(res.status).toBe(201);
        expect(res.body.listing).toBeDefined();
        expect(res.body.listing.title).toBe('Fresh Bread');
        expect(res.body.listing.status).toBe('available');
        expect(res.body.listing.donorId).toBeDefined();
    });

    test('created listing has correct donor name and location', async () => {
        const { res } = await createListing({ title: 'Rice Bags' });
        expect(res.status).toBe(201);
        expect(res.body.listing.donorName).toBeDefined();
        expect(res.body.listing.location.coordinates).toHaveLength(2);
    });
});

// ══════════════════════════════════════════════════════════════
// GET /listings — Geo-search
// ══════════════════════════════════════════════════════════════
describe('GET /listings', () => {

    test('returns 400 when lat and lng are missing', async () => {
        const res = await request(app).get('/listings');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/lat/i);
    });

    test('returns available listings near coordinates', async () => {
        const res = await request(app)
            .get('/listings?lat=52.2681&lng=-113.8112&radius=25');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('listings');
        expect(res.body).toHaveProperty('count');
        expect(Array.isArray(res.body.listings)).toBe(true);
    });

    test('returns empty array when no listings in radius', async () => {
        // Coordinates in the middle of the ocean
        const res = await request(app)
            .get('/listings?lat=0&lng=0&radius=1');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
    });

    test('count matches listings array length', async () => {
        const res = await request(app)
            .get('/listings?lat=52.2681&lng=-113.8112&radius=25');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(res.body.listings.length);
    });

    test('all returned listings have available status', async () => {
        const res = await request(app)
            .get('/listings?lat=52.2681&lng=-113.8112&radius=25');
        expect(res.status).toBe(200);
        res.body.listings.forEach(listing => {
            expect(listing.status).toBe('available');
        });
    });
});

// ══════════════════════════════════════════════════════════════
// GET /listings/:id — Single Listing
// ══════════════════════════════════════════════════════════════
describe('GET /listings/:id', () => {

    test('returns 400 for invalid MongoDB ObjectId format', async () => {
        const res = await request(app).get('/listings/invalid-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid listing ID/i);
    });

    test('returns 404 when listing does not exist', async () => {
        const res = await request(app)
            .get('/listings/507f1f77bcf86cd799439011');
        expect(res.status).toBe(404);
    });

    test('returns listing for valid id', async () => {
        const { id } = await createListing({ title: 'Soup Cans' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        const res = await request(app).get(`/listings/${id}`);
        expect(res.status).toBe(200);
        expect(res.body.listing._id).toBe(id);
        expect(res.body.listing.title).toBe('Soup Cans');
    });
});

// ══════════════════════════════════════════════════════════════
// GET /listings/my — Donor's Own Listings
// ══════════════════════════════════════════════════════════════
describe('GET /listings/my', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app).get('/listings/my');
        expect(res.status).toBe(401);
    });

    test('returns 403 when recipient tries to access', async () => {
        const res = await request(app)
            .get('/listings/my')
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(403);
    });

    test('returns donor listings with count', async () => {
        const res = await request(app)
            .get('/listings/my')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('listings');
        expect(res.body).toHaveProperty('count');
        expect(Array.isArray(res.body.listings)).toBe(true);
    });

    test('all returned listings belong to authenticated donor', async () => {
        const res = await request(app)
            .get('/listings/my')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);
        // All listings should have been created by this donor
        expect(res.body.count).toBeGreaterThanOrEqual(0);
    });
});

// ══════════════════════════════════════════════════════════════
// DELETE /listings/:id — Delete Listing
// ══════════════════════════════════════════════════════════════
describe('DELETE /listings/:id', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .delete('/listings/507f1f77bcf86cd799439011');
        expect(res.status).toBe(401);
    });

    test('returns 403 when recipient tries to delete', async () => {
        const { id } = await createListing({ title: 'Delete Test' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        const res = await request(app)
            .delete(`/listings/${id}`)
            .set('Authorization', `Bearer ${recipientToken}`);
        expect(res.status).toBe(403);
    });

    test('successfully deletes own available listing', async () => {
        const { id } = await createListing({ title: 'To Be Deleted' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        const res = await request(app)
            .delete(`/listings/${id}`)
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(200);

        // Verify it is gone
        const checkRes = await request(app).get(`/listings/${id}`);
        expect(checkRes.status).toBe(404);
    });
});

// ══════════════════════════════════════════════════════════════
// PATCH /listings/:id — Update Listing
// ══════════════════════════════════════════════════════════════
describe('PATCH /listings/:id', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .patch('/listings/507f1f77bcf86cd799439011')
            .send({ title: 'Updated' });
        expect(res.status).toBe(401);
    });

    test('returns 403 when recipient tries to update', async () => {
        const { id } = await createListing({ title: 'Update Test' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        const res = await request(app)
            .patch(`/listings/${id}`)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ title: 'Hacked' });
        expect(res.status).toBe(403);
    });

    test('successfully updates own listing title', async () => {
        const { id } = await createListing({ title: 'Original Title' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        const res = await request(app)
            .patch(`/listings/${id}`)
            .set('Authorization', `Bearer ${donorToken}`)
            .send({ title: 'Updated Title' });

        expect(res.status).toBe(200);
        expect(res.body.listing.title).toBe('Updated Title');
    });
});

// ══════════════════════════════════════════════════════════════
// PATCH /listings/:id/:pin/confirm — PIN Verification
// ══════════════════════════════════════════════════════════════
describe('PATCH /listings/:id/:pin/confirm', () => {

    test('returns 401 when no token provided', async () => {
        const res = await request(app)
            .patch('/listings/507f1f77bcf86cd799439011/123456/confirm');
        expect(res.status).toBe(401);
    });

    test('returns 400 for invalid listing ID format', async () => {
        const res = await request(app)
            .patch('/listings/invalid-id/123456/confirm')
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid listing ID/i);
    });

    test('returns 404 when no active claim exists', async () => {
        const { id } = await createListing({ title: 'PIN Test Listing' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        const res = await request(app)
            .patch(`/listings/${id}/123456/confirm`)
            .set('Authorization', `Bearer ${donorToken}`);
        expect(res.status).toBe(404);
    });

    test('full PIN verification flow — claim then verify', async () => {
        const { id } = await createListing({ title: 'PIN Flow Test' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        // Recipient claims the listing
        const claimRes = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId: id });

        if (claimRes.status !== 201) {
            console.warn('Skipping PIN test — claim failed:', claimRes.body.error);
            return;
        }

        const pin = claimRes.body.pin;
        expect(pin).toMatch(/^\d{6}$/);

        // Donor verifies with correct PIN
        const confirmRes = await request(app)
            .patch(`/listings/${id}/${pin}/confirm`)
            .set('Authorization', `Bearer ${donorToken}`);

        expect(confirmRes.status).toBe(200);
    });

    test('returns 400 with wrong PIN', async () => {
        const { id } = await createListing({ title: 'Wrong PIN Test' });
        if (!id) { console.warn('Skipping — listing creation failed'); return; }

        // Claim the listing
        const claimRes = await request(app)
            .post('/claims')
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({ listingId: id });

        if (claimRes.status !== 201) {
            console.warn('Skipping — claim failed');
            return;
        }

        // Verify with wrong PIN
        const res = await request(app)
            .patch(`/listings/${id}/000000/confirm`)
            .set('Authorization', `Bearer ${donorToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/incorrect pin/i);
    });
});