/**
 * socket.js — Socket.io client service
 *
 * Creates and manages a single shared Socket.io connection.
 * Called once after login, disconnected on logout.
 *
 * The server expects the client to emit 'join' with the userId
 * immediately after connecting so the server can add this socket
 * to the user's private room (user:<userId>).
 * All notifications are emitted to that room.
 */

import { io } from 'socket.io-client';

let socket = null;

/**
 * Connect to the Socket.io server and join the user's private room.
 * Safe to call multiple times — will not create duplicate connections.
 *
 * @param {string} userId - The logged-in user's UUID
 */
export const connectSocket = (userId) => {
    if (socket?.connected) return;

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        // Join the private room for this user
        // The server uses this to target notifications correctly
        socket.emit('join', userId);
    });

    socket.on('connect_error', (err) => {
        if (import.meta.env.DEV) {
            console.warn('Socket.io connection error:', err.message);
        }
    });
};

/**
 * Disconnect the socket — called on logout.
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Subscribe to an event.
 * Returns an unsubscribe function to clean up in useEffect.
 *
 * @param {string}   event    - Event name e.g. 'notification'
 * @param {Function} callback - Handler function
 */
export const onSocket = (event, callback) => {
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => socket.off(event, callback);
};