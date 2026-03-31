require('dotenv').config();
const { query } = require('./src/config/db');
const fs = require('fs');

async function run() {
    try {
        const r = await query('SELECT notes_json FROM course_notes ORDER BY created_at DESC LIMIT 1');
        let text = r.rows[0].notes_json;
        if (typeof text === 'string') text = JSON.parse(text);
        if (text.content) text = text.content;
        
        const m = text.match(/```mermaid[\s\S]*?```/g);
        fs.writeFileSync('mermaid_dump.txt', m ? m.join('\n\n---NEXT---\n\n') : 'none');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
