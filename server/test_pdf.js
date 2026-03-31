require('dotenv').config();
const { query } = require('./src/config/db');
const { buildNotesPdf } = require('./src/services/pdfService');
const fs = require('fs');

async function test() {
    try {
        const sylRes = await query('SELECT * FROM syllabi ORDER BY created_at DESC LIMIT 1');
        const syl = sylRes.rows[0];
        
        const noteRes = await query('SELECT * FROM course_notes WHERE syllabus_id=$1', [syl.id]);
        if (noteRes.rows.length === 0) {
            console.log('No notes found for syllabus');
            process.exit(0);
        }
        
        let text = noteRes.rows[0].notes_json;
        if (typeof text === 'string') text = JSON.parse(text);
        if (text.content) text = text.content;

        console.log('Building PDF...');
        const chunks = [];
        
        await buildNotesPdf(text, syl, 
            (c) => chunks.push(c), 
            () => {
                fs.writeFileSync('test_out.pdf', Buffer.concat(chunks));
                console.log('DONE!');
                process.exit(0);
            }
        );
    } catch (e) {
        console.error('CRASH:', e);
        process.exit(1);
    }
}
test();
