require('dotenv').config();
const { query } = require('./src/config/db');

async function run() {
    try {
        const sylRes = await query('SELECT * FROM syllabi ORDER BY created_at DESC LIMIT 1');
        const syl = sylRes.rows[0];
        
        const noteRes = await query('SELECT * FROM course_notes WHERE syllabus_id=$1', [syl.id]);
        if (noteRes.rows.length === 0) {
            console.log('No notes found');
            process.exit(0);
        }
        
        let text = noteRes.rows[0].notes_json;
        if (typeof text === 'string') text = JSON.parse(text);
        if (text.content) text = text.content;

        text = text.replace(/```mermaid[\s\S]*?```/g, '**[Corrupted Diagram Wiped From Cache]**');
        
        await query('UPDATE course_notes SET notes_json=$1 WHERE syllabus_id=$2', [JSON.stringify({content: text}), syl.id]);
        console.log('Wiped corrupted diagrams from DB!');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
