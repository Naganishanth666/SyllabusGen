const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_mGhXy4Nxe3Yd@ep-late-field-angcgypz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

const run = async () => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'src', 'models', 'schema.sql'), 'utf-8');
        await pool.query(schema);
        console.log("SUCCESS! Neon PostgreSQL tables perfectly seeded!");
    } catch (e) {
        console.error("FAIL:", e);
    } finally {
        pool.end();
        process.exit();
    }
};

run();
