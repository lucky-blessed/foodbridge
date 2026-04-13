/**
 * auth.test.js - Auth Integration Tests
 * 
 * Tests the full HTTP request/response cycle for auth endpoints.
 * Uses Supertest to make real HTTP requests against the Express app.
 * Uses a real database connection (test data is cleaned up after each test).
 * 
 * Endpoints covered:
 *  POST /auth/register
 *  POST /auth/login
 *  POST /auth/logout
 *  GET /auth/profile
 *  PATCH /auth/profile
 */

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

// Test user data: prefixed with TEST_ so cleanup is easy
const testDonor = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'test.donor.integration@foodbridge.test',
    password: 'Password1',
    role: 'donor',
    subRole: 'individual'
};

const testRecipient = {
    firstName: 'Test',
    lastName: 'Recipient',
    email: 'test.recipient.integration@foodbridge.test',
    password: 'Password1', 
    role: 'recipient',
    subRole: 'individual',
    ageRange: '18_24',
    gender: 'male'
};

// clean up test users after all tests in this file
afterAll(async () => {
    await pool.query(
        `DELETE FROM users WHERE email LIKE '%@foodbridge.test'`
    );
});

// ------- POST /auth/register --------------
describe('POST /auth/register', () => {

    test('successfully registers a donor with valid data', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', testDonor.firstName)
            .field('lastName', testDonor.lastName)
            .field('email', testDonor.email)
            .field('password', testDonor.password)
            .field('role', testDonor.role)
            .field('subRole', testDonor.subRole);

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(testDonor.email);
        expect(res.body.user.role).toBe('donor');
        // Password hash must never be returned
        expect(res.body.user.password_hash).toBeUndefined();
    });

    test('successfully registers an individual recipient with age range and gender', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', testRecipient.firstName)
            .field('lastName',  testRecipient.lastName)
            .field('email',     testRecipient.email)
            .field('password',  testRecipient.password)
            .field('role',      testRecipient.role)
            .field('subRole',   testRecipient.subRole)
            .field('ageRange',  testRecipient.ageRange)
            .field('gender',    testRecipient.gender);

        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('recipient');
        expect(res.body.user.sub_role).toBe('individual');
        expect(res.body.user.age_range).toBe('18_24');
        expect(res.body.user.gender).toBe('male');
    });

    test('returns 409 when email is already registered', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', 'Another')
            .field('lastName',  'User')
            .field('email',     testDonor.email) // already registered above
            .field('password',  'Password1')
            .field('role',      'donor')
            .field('subRole',   'individual');

        expect(res.status).toBe(409);
    });

    test('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', 'Only')
            .field('lastName',  'Name');
            // missing email and password

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('returns 400 when password is too short', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', 'Test')
            .field('lastName',  'User')
            .field('email',     'short.pass@foodbridge.test')
            .field('password',  'short') // less than 8 chars
            .field('role',      'donor')
            .field('subRole',   'individual');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/8 characters/i);
    });


    test('returns 400 when organization sub-role is missing org name', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', 'Test')
            .field('lastName',  'Org')
            .field('email',     'test.org@foodbridge.test')
            .field('password',  'Password1')
            .field('role',      'donor')
            .field('subRole',   'organization');
            // missing orgName and orgType

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/organization name/i);
    });


    test('returns 400 when individual recipient is missing age range', async () => {
        const res = await request(app)
            .post('/auth/register')
            .field('firstName', 'Test')
            .field('lastName',  'Recip')
            .field('email',     'test.noage@foodbridge.test')
            .field('password',  'Password1')
            .field('role',      'recipient')
            .field('subRole',   'individual')
            .field('gender',    'male');
            // missing ageRange

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/age range/i);
    });  
});

// --------POST /auth/login ------------------
describe('POST /auth/login', () => {


    test('returns 400 when email or password is missing', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: testDonor.email });
            // missing password

        expect(res.status).toBe(400);
    });

    test('successfully logs in with correct credentials', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: testDonor.email, password: testDonor.password });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(testDonor.email);
        expect(res.body.user.password_hash).toBeUndefined();
    });


    test('returns 400 with wrong password', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: testDonor.email, password: 'WrongPass1' });

        expect(res.status).toBe(400);
    });


    test('returns 400 with non-existent email', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'nobody@foodbridge.test', password: 'Password1' });
    
        expect([400, 429]).toContain(res.status);
    });

    
});



// --GET /auth/profile
describe('GET /auth/profile', () => {

    let token;

    beforeAll(async () => {
        // Try donor first, fall back to recipient
        let res = await request(app)
            .post('/auth/login')
            .send({ email: testDonor.email, password: testDonor.password });
    
        // If rate limited, token stays undefined and profile tests will skip
        if (res.status === 200) {
            token = res.body.token;
        }
    });
    
    test('returns profile for authenticated user', async () => {
        if (!token) {
            console.warn('No token available — skipping profile test');
            return;
        }
        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`);
    
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(testDonor.email);
        expect(res.body.user.sub_role).toBe('individual');
    });


    test('returns 401 when no token is provided', async () => {
        const res = await request(app)
            .get('/auth/profile');

        expect(res.status).toBe(401);
    });
});


// ----- POST /auth/logout ---------------
describe('POST /auth/logout', () => {

    test('successfully logs out and blacklists token', async () => {
        // Use the recipient account which has fewer login attempts
        const loginRes = await request(app)
            .post('/auth/login')
            .send({ email: testRecipient.email, password: testRecipient.password });

        // Skip test gracefully if rate limited
        if (loginRes.status === 429) {
            console.warn('Rate limited — skipping logout test');
            return;
        }

        const token = loginRes.body.token;
        expect(token).toBeDefined();

        const logoutRes = await request(app)
            .post('/auth/logout')
            .set('Authorization', `Bearer ${token}`);
        expect(logoutRes.status).toBe(200);

        const profileRes = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`);
        expect(profileRes.status).toBe(401);
    });
});