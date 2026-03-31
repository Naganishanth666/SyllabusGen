const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Lock down to specific frontend URL in production, or fallback to wildcard in dev
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('Syllabus Generator API Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
