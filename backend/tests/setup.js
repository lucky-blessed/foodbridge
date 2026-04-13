/**
 * setup.js - Global test setup and teardown
 * 
 * Runs once before all tests and once after all tests.
 * Connects to the database, runs any setup needed,
 * and clean up connections after tests complete.
 * 
 * We use the same database as development but with
 * clearly named test data prefixed with 'TEST_' so
 * it can be identified and cleaned up after tests.
 */


require('dotenv').config();

const { connectDatabase /** pool */ } = require('../src/config/database');
const mongoose = require('mongoose');

// Connect database before all tests run
beforeAll(async () => {
    await connectDatabase();
});

// Close all database connection after all tests complete
// This prevents Jest from hanging after tests finish
// Force Jest to exit after all tests complete
afterAll(async () => {
    await mongoose.connection.close();
    //await pool.end();
    // Give async operations time to clean up
    await new Promise(resolve => setTimeout(resolve, 500));
}, 10000);