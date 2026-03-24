// migrate.js to run the SQL schema file against our PostgreSQL database.
// This should run once with node src/config/migrate.js

require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
    console.log('Running database migration....\n');

    // Read the SQL file as a string
    const SQLFile = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(SQLFile, 'utf8');

    try {
        // Run all the SQL statements at once
        await pool.query(sql);
        console.log('Tables created successfully:');
        console.log('   - users');
        console.log('   - claim_records');
        console.log('   - audit_log');
        console.log('   - updated_at trigger\n');
        console.log('Migration completed.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        // Always close the pool when done
        await pool.end();
    }
};



runMigration();