require('dotenv').config();

const app = require('./app');

// process.env.PORT to read port variable from .env

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`FoodBridge API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
