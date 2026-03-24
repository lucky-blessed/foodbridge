require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./config/database');

// process.env.PORT to read port variable from .env

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`\nFoodBridge API running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });
};

startServer();