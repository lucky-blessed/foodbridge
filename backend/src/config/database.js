// Connect both PostgreSQL and MongoDB database

const { Pool } = require('pg');
const mongoose = require('mongoose');


// ------PostgreSQL--------
// Pool to manage multiple database connection rather than opening and closing connection on every request

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// Testing the PostgreSQL connection
const connectPostgres = async () => {
    try {
        // client.query to run a simple test query
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release(); // to retrun the connection to the pool 
        console.log('PostgreSQL connected.');
    } catch (error) {
        console.error(' PostgreSQL connection failed:', error.message);
        process.exit(1); 
    }
};


// ------MongoDB--------
const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected.');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

// --------Connect both DB-------
// This function is to be called once when the server starts
const connectDatabase = async () => {
    await connectPostgres();
    await connectMongo();
};



module.exports = { connectDatabase, pool };