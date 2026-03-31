require('dotenv').config();
const { Pool } = require('pg');

console.log('--- Debugging Database Connection ---');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD (length):', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 'undefined');
console.log('DB_PASSWORD (first char):', process.env.DB_PASSWORD ? process.env.DB_PASSWORD[0] : 'N/A');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect()
    .then(client => {
        console.log('Successfully connected to database!');
        client.release();
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection Failed!');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        console.error('Full Error:', JSON.stringify(err, null, 2));
        process.exit(1);
    });
