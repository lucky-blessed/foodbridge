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

    let failed = 0;
    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`Running: ${file}`);

        try {
            await pool.query(sql);
            console.log(`   - ${file} completed`);
        } catch (error) {
            // Skip already-applied migrations, fail on genuinely new errors
            const ignorable = [
                'already exists',
                'does not exist',
                'duplicate column',
            ];
            const isIgnorable = ignorable.some(msg => error.message.includes(msg));
            if (isIgnorable) {
                console.log(`   - ${file} skipped (already applied: ${error.message.split('\n')[0]})`);
            } else {
                console.error(`Migration failed on ${file}: ${error.message}`);
                failed++;
                break;
            }
        }
    }

    if (failed === 0) {
        console.log('\nAll migrations completed successfully.');
    } else {
        console.error('\nMigration stopped due to error.');
        process.exit(1);
    }

    await pool.end();
};


runMigration();