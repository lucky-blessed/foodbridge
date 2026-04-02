/**
 * claims.js - Claim service functions
 * 
 * These functions call the backend claim endpoints.
 * Conponents import these instead of calling api directly.
 */

import api from './api';

/**
 * claimListing - claim a food listing
 * Calls POST /claims
 */

export const claimListing = async (listingId) => {
    const response = await api.post('claims', { listingId });
    return response.data;
};

/**
 * cancelClaim - cancel an active claim
 * Calls DELETE /claims/:id
 */
export const cancelClaim = async (claimId) => {
    const response = await api.delete(`/claims/${claimId}`);
    return response.data;
};

/**
 * getMyClaims - get claim history for logged-in recipient
 * Calls GET /claims/me
 */

export const getMyClaims = async () => {
    const response = await api.get('/claims/me');
    return response.data;
};

/**
 * getClaimCount - get rolling window stats
 * Calls GET /claims/count
 * Returns { count, limit, remaining, resetsAt }
 */

export const getClaimCount = async () => {
    const response = await api.get('/claims/count');
    return response.data;
};