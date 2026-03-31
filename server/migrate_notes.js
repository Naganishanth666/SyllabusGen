const { query } = require('./src/config/db');

async function migrate() {
    try {
        console.log('Running migration...');
        
        // Add course_notes table
        await query(`
            CREATE TABLE IF NOT EXISTS course_notes (
                id SERIAL PRIMARY KEY,
                syllabus_id INTEGER REFERENCES syllabi(id) ON DELETE CASCADE,
                notes_json JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Migration successful: course_notes table created.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
