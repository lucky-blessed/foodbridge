// migrate.js - runs all SQL migration files in order
// Usage: node src/config/migrate.js
// Run from inside backend/ folder

require('dotenv').config();


const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
    console.log('Running database migration...\n');

    const migrationsDir = path.join(__dirname, 'migrations');

    // Read all .sql files and sort them by filename (001_, 002_, etc.)

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    try {
        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running: ${file}`);
            await pool.query(sql);
            console.log(`   - ${file} completed`);
        }

        console.log('\nAll migrations completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};


runMigration();