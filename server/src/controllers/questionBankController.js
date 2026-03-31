const { query } = require('../config/db');
const { generateQuestionBank } = require('../services/llmService');

// Generate Question Bank
exports.generateQuestions = async (req, res) => {
    const { syllabusId, difficulty, numQuestions } = req.body;

    try {
        // valid syllabus ownership
        const syllabusResult = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [syllabusId, req.user.id]);
        if (syllabusResult.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }

        const syllabus = syllabusResult.rows[0];
        // Use syllabus_json (which might be raw text or JSON) to generate questions
        // Assuming syllabus_json is storing the text content for now as per requirement "Output format... Course Title..."
        const syllabusContent = JSON.stringify(syllabus.syllabus_json);

        const questions = await generateQuestionBank(syllabusContent, difficulty, numQuestions);

        // Save to DB
        const result = await query(
            'INSERT INTO question_banks (syllabus_id, difficulty, questions) VALUES ($1, $2, $3) RETURNING *',
            [syllabusId, difficulty, JSON.stringify(questions)]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Question Bank Generation failed' });
    }
};

// Get Question Banks for a Syllabus
exports.getQuestionBanks = async (req, res) => {
    try {
        const result = await query('SELECT * FROM question_banks WHERE syllabus_id = $1 ORDER BY created_at DESC', [req.params.syllabusId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}
