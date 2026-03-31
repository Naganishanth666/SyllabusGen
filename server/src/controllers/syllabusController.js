const { query } = require('../config/db');
const { generateSyllabus, regenerateSyllabus } = require('../services/llmService');

// Get all syllabi for a user
exports.getSyllabi = async (req, res) => {
    try {
        const result = await query('SELECT * FROM syllabi WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single syllabus
exports.getSyllabus = async (req, res) => {
    try {
        const result = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create/Save Syllabus
exports.createSyllabus = async (req, res) => {
    const { title, courseCode, department, duration, description, objectives, syllabusContent } = req.body;

    try {
        console.log('Creating syllabus with data:', { title, courseCode, department, duration, description, objectives });
        // Ensure syllabusContent is JSON if it's a string, or handle it as text if we change schema.
        // Schema says JSONB. If AI returns text, we must wrap it or frontend must send object.
        // If frontend sends raw text string, Postgres will error on JSONB unless valid JSON.
        // Let's wrap it if it's a string that isn't valid JSON.
        let contentToSave = syllabusContent;
        if (typeof syllabusContent === 'string') {
            try {
                JSON.parse(syllabusContent);
            } catch (e) {
                // Not valid JSON, wrap it
                contentToSave = JSON.stringify({ content: syllabusContent });
            }
        }

        const result = await query(
            `INSERT INTO syllabi 
      (user_id, course_title, course_code, department, duration, description, objectives, syllabus_json) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
            [req.user.id, title, courseCode, department, duration, description, objectives, contentToSave]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating syllabus:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update Syllabus
exports.updateSyllabus = async (req, res) => {
    const { title, courseCode, department, duration, description, objectives, syllabusContent } = req.body;

    try {
        // Check ownership
        const check = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }

        // Ensure syllabusContent is JSON if it's a string
        let contentToSave = syllabusContent;
        if (typeof syllabusContent === 'string') {
            try {
                JSON.parse(syllabusContent);
            } catch (e) {
                contentToSave = JSON.stringify({ content: syllabusContent });
            }
        }

        const result = await query(
            `UPDATE syllabi 
      SET course_title = $1, course_code = $2, department = $3, duration = $4, description = $5, objectives = $6, syllabus_json = $7, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $8 AND user_id = $9 
      RETURNING *`,
            [title, courseCode, department, duration, description, objectives, contentToSave, req.params.id, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate Syllabus (AI)
exports.generate = async (req, res) => {
    try {
        const generatedText = await generateSyllabus(req.body);
        // Return generated text directly to frontend for preview/editing
        res.json({ generatedText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'AI Generation failed' });
    }
};

// Regenerate Syllabus (AI)
exports.regenerate = async (req, res) => {
    const { currentSyllabus, instructions } = req.body;
    try {
        const generatedText = await regenerateSyllabus(currentSyllabus, instructions);
        res.json({ generatedText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'AI Regeneration failed' });
    }
};
