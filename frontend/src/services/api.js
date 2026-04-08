/**
 * api.js - Axios instance for FoodBridge API
 * 
 * to create a single configured Axios instance
 * that every page and component uses to talk to the backend.
 * 
 * Request -> attaches JWT token to every request
 * Response -> redirects to login page on 401 Unauthorized
 */

import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json'
    }
});

// ------------Request interceptor-----
// Runs before every request is sent
// Reads the JWT from localStorage and attaches it to the Authorization header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ---- Response interceptor ------------------------
// Runs after every response is received
// If the server returns 401, the token is expired or invalid
// Clear storage and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Save user's current location to their profile
// Called from Discover.jsx when geolocation resolves
export const saveUserLocation = (lat, lng) =>
    api.patch('/auth/profile', { location_lat: lat, location_lng: lng });

export const getNotifications = (params) =>
    api.get('/notifications', { params });

export const markNotifRead     = (id)     => api.patch(`/notifications/${id}/read`);
export const markAllNotifsRead = ()       => api.patch('/notifications/read-all');



export default api;