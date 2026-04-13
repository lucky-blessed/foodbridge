/**
 * auth.middleware.test.js
 * 
 * Tests the two middleware functions.
 *  - authenticateJWT: token extraction, verification, blacklist check, user lookup
 *  - requireRole: role-based access control
 * 
 * Strategy: mock the JWT, Redis, and User dependencies so tests 
 * run without needing real database connection.
 */

const { JsonWebTokenError } = require('jsonwebtoken');
const { authenticateJWT, requireRole } = require('../../src/middleware/auth.middleware');

// -------Mocks-------
jest.mock('jsonwebtoken');
jest.mock('../../src/config/redis');
jest.mock('../../src/models/User');

const jwt = require('jsonwebtoken');
const redis = require('../../src/config/redis');
const User = require('../../src/models/User');

// Helper to build a mock Express request with an  Authorization header
const mockReq = (token) => ({
    headers: { authorization: token ? `Bearer ${token}` : undefined }
});

// Helper to build a mock Express response that captures status and json calls
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res
};

const next = jest.fn();

// ----------- authenticateJWT tests -------------------
describe('authenticateJWT', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });


    test('returns 401 when no Authorization header is provided', async () => {
        const req = { headers: {} };
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('return 401 when Authorization header does not start with  Bearer', async () => {
        const req = { headers: { authorization: 'Token abc123' } };
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is invalid or expired', async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error('invalid token');
        });
        const req = mockReq('badtoken');
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is blacklisted in Redis', async () => {
        jwt.verify.mockReturnValue({ userId: 'user-123', role: 'donor' });
        redis.get = jest.fn().mockResolvedValue('true');
        const req = mockReq('blacklistedtoken');
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when user no longer exists in database', async () => {
        jwt.verify.mockReturnValue({ userId: 'deleted-user', role: 'donor' });
        redis.get = jest.fn().mockResolvedValue(null);
        User.findById = jest.fn().mockResolvedValue(null);
        const req = mockReq('validtoken');
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when user account is deactivated', async () => {
        jwt.verify.mockReturnValue({ userId: 'user-123', role: 'donor' });
        redis.get = jest.fn().mockResolvedValue(null);
        User.findById = jest.fn().mockResolvedValue({
            id: 'user-123', role: 'donor', is_active: false
        });
        const req = mockReq('validtoken');
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next() and attaches user to req when token is valid', async () => {
        const mockUser = { id: 'user-123', role: 'donor', is_active: true };
        jwt.verify.mockReturnValue({ userId: 'user-123', role: 'donor' });
        redis.get = jest.fn().mockResolvedValue(null);
        User.findById = jest.fn().mockResolvedValue(mockUser);
        const req = mockReq('validtoken');
        const res = mockRes();
        await authenticateJWT(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
    });
});

// ------ requireRole tests ------------
describe('requireRole', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 401 req.user is not set', () => {
        const middleware = requireRole('admin');
        const req = {};
        const res = mockRes();
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when user role does not match required role', () => {
        const middleware = requireRole('admin');
        const req = { user: { role: 'donor' } };
        const res = mockRes();
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next() when user role matches required role', () => {
        const middleware = requireRole('donor');
        const req = { user: { role: 'donor' } };
        const res = mockRes();
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('calls next() when user role matches one of multiple allowed roles', () => {
        const middleware = requireRole('admin', 'donor');
        const req = { user: { role: 'donor' } };
        const res = mockRes();
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('403 response does not expose user role', () => {
        const middleware = requireRole('admin');
        const req = { user: { role: 'recipient' } };
        const res = mockRes();
        middleware(req, res, next);
        const jsonCall = res.json.mock.calls[0][0];
        expect(jsonCall).not.toHaveProperty('yourRole');
    });
});