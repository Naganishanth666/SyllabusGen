const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const createDatabase = async () => {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres', // Connect to default database
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        await client.connect();

        // Check if database exists
        const checkRes = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
        if (checkRes.rowCount === 0) {
            console.log(`Database ${process.env.DB_NAME} not found. Creating...`);
            await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
            console.log('Database created successfully.');
        } else {
            console.log(`Database ${process.env.DB_NAME} already exists.`);
        }

        await client.end();
    } catch (err) {
        console.error('Error creating database:', err);
        await client.end();
        process.exit(1);
    }
};

const runSchema = async () => {
    const { Pool } = require('pg');
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        const schemaPath = path.join(__dirname, '../models/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema creation...');
        await pool.query(schemaSql);
        console.log('Schema applied successfully.');
        await pool.end();
    } catch (err) {
        console.error('Error applying schema:', err);
        await pool.end();
        process.exit(1);
    }
};

const init = async () => {
    await createDatabase();
    await runSchema();
};

init();
