/**
 * auth.js — Authentication service functions
 *
 * These functions call the backend auth endpoints.
 * Components import these instead of calling api directly
 * — keeps API logic out of UI components.
 */

import api from './api';

/**
 * register — create a new account
 * Calls POST /auth/register
 */
export const register = async (firstName, lastName, email, password, role) => {
    const response = await api.post('/auth/register', {
        firstName, lastName, email, password, role
    });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
};

/**
 * login — sign into an existing account
 * Calls POST /auth/login
 */
export const login = async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
};

/**
 * logout — invalidate the current token
 * Calls POST /auth/logout
 */
export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

/**
 * getCurrentUser — get the logged-in user from localStorage
 * No API call needed — reads from storage
 */
export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

/**
 * isLoggedIn — check if a user is currently logged in
 */
export const isLoggedIn = () => {
    return !!localStorage.getItem('token');
};