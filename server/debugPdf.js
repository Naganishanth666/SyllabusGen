const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/sylgen/server/.env' });
const fs = require('fs');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const logBuffer = [];
const log = (msg) => logBuffer.push(msg);

const debugParser = async () => {
    try {
        const res = await pool.query('SELECT syllabus_json FROM syllabi ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length === 0) {
            log('No syllabi found');
            fs.writeFileSync('debug_output.txt', logBuffer.join('\n'));
            return;
        }

        let plainText = res.rows[0].syllabus_json;
        if (typeof plainText === 'object') {
            plainText = JSON.stringify(plainText, null, 2);
        }
        plainText = plainText.replace(/\\n/g, '\n').replace(/\\r/g, '');

        log('--- START RAW TEXT SAMPLE (First 500 chars) ---');
        log(plainText.substring(0, 500));
        log('--- END RAW TEXT SAMPLE ---');

        const lines = plainText.split('\n');

        const RE_CASE_STUDIES = /Case\s*Studies/i;
        const RE_TEXTBOOKS = /Textbooks/i;

        log('\n--- SCANNING LINES ---');
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) return;

            log(`[Line ${i}] "${trimmed}"`);

            // Check Case Studies
            if (trimmed.match(RE_CASE_STUDIES)) {
                log(`   >>> MATCHED CASE STUDIES!`);
            }

            // Check Textbooks
            if (trimmed.match(RE_TEXTBOOKS)) {
                log(`   >>> MATCHED TEXTBOOKS!`);
            }
        });

        fs.writeFileSync('debug_output.txt', logBuffer.join('\n'));
        console.log('Debug output written to debug_output.txt');

    } catch (err) {
        log(err.toString());
        fs.writeFileSync('debug_output.txt', logBuffer.join('\n'));
    } finally {
        pool.end();
    }
};

debugParser();
