/**
 * listings.js: Listing service functions
 * Calls the backend listing endpoints
 */

import api from './api';

/**
 * getNearbyListings:  discover food near a location
 * Calls GET /listings?lat=&lng=&radius=&category=
 */

export const getNearbyListings = async ({ lat, lng, radius = 5, category = null}) => {
    const params = { lat, lng, radius };
    if (category) params.category = category;
    const response = await api.get('/listings', { params });
    return response.data;
};

/**
 * getListingById: get one listing by ID
 * Calls GET /listings/:id
 */

export const getListingById = async (id) => {
    const response = await api.get(`/listings/${id}`);
    return response.data;
}

/**
 * createListing — post a new food donation
 * Calls POST /listings
 * Uses FormData because photo upload is multipart
 */
export const createListing = async (listingData, photoFile = null) => {
    const formData = new FormData();

    // Append all listing fields to FormData
    Object.keys(listingData).forEach(key => {
        formData.append(key, listingData[key]);
    });

    // Append photo if provided
    if (photoFile) {
        formData.append('photo', photoFile);
    }

    const response = await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' } 
    });
    return response.data;
};

/**
 * getMyListings: get all listings posted by the logged-in donor
 * Calls GET /listings/my
 */

export const getMyListings = async () => {
    const response = await api.get('/listings/my');
    return response.data;
};

/**
 * updateListing: edit a listing
 * Calls PATCH /listings/:id
 */
export const updateListing = async (id, updates) => {
    const response = await api.patch(`/listings/${id}`, updates);
    return response.data;
};

/**
 * deleteListing — remove a listing
 * Calls DELETE /listings/:id
 */
export const deleteListing = async (id) => {
    const response = await api.delete(`/listings/${id}`);
    return response.data;
};
/**
 * confirmPickup — donor confirms the recipient picked up the food
 * Calls PATCH /listings/:id/:pin/confirm/
 */
export const confirmPickup = async (listingId, pin) => {
    const response = await api.patch(`/listings/${listingId}/${pin}/confirm`);
    return response.data;
};
