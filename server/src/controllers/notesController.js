const { query } = require('../config/db');
const { generateCourseNotes, generateChapterOutline } = require('../services/llmService');
const { buildNotesPdf } = require('../services/pdfService');

exports.generateModuleNotes = async (req, res) => {
    try {
        // Prevent Express from timing out the HTTP socket during the massive 3-minute iterative generation cycle
        req.setTimeout(0);
        res.setTimeout(0);

        const { syllabusId, courseTitle, moduleContent } = req.body;
        
        const check = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [syllabusId, req.user.id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }

        // Phase 1: Architect (Extract 8 Micro-Topics)
        const { generateChapterOutline } = require('../services/llmService');
        const microTopics = await generateChapterOutline(courseTitle, moduleContent);
        let fullNotes = `## ${moduleContent.split('\n')[0] || 'Module Overview'}\n\n`;

        // Phase 2: Writer (Recursive Heavy Generation)
        for (const topic of microTopics) {
            try {
                const topicContent = await generateCourseNotes(courseTitle, topic, moduleContent);
                fullNotes += topicContent + '\n\n---\n\n';
                // 1.5s delay inside the topic loop to guarantee we don't trip Groq's burst limits
                await new Promise(r => setTimeout(r, 1500));
            } catch (topicErr) {
                console.error(`Failed to generate topic: ${topic}`, topicErr);
            }
        }

        res.json({ notes: fullNotes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate module notes' });
    }
};

exports.saveCompiledNotes = async (req, res) => {
    try {
        const { syllabusId, compiledNotes } = req.body;
        
        const check = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [syllabusId, req.user.id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }

        const existingNotes = await query('SELECT id FROM course_notes WHERE syllabus_id = $1', [syllabusId]);
        
        if (existingNotes.rows.length > 0) {
            await query('UPDATE course_notes SET notes_json = $1, created_at = CURRENT_TIMESTAMP WHERE syllabus_id = $2', [JSON.stringify({ content: compiledNotes }), syllabusId]);
        } else {
            await query('INSERT INTO course_notes (syllabus_id, notes_json) VALUES ($1, $2)', [syllabusId, JSON.stringify({ content: compiledNotes })]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to save compiled notes' });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const syllabusId = req.params.syllabusId;
        const check = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [syllabusId, req.user.id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }

        const notesDB = await query('SELECT * FROM course_notes WHERE syllabus_id = $1', [syllabusId]);
        if (notesDB.rows.length > 0) {
            let content = notesDB.rows[0].notes_json;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) {}
            }
            res.json({ notes: content.content || content });
        } else {
            res.json({ notes: null });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching notes' });
    }
};

exports.downloadNotesPdf = async (req, res) => {
    try {
        const syllabusId = req.params.syllabusId;
        const check = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [syllabusId, req.user.id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }
        const syllabus = check.rows[0];

        const notesDB = await query('SELECT * FROM course_notes WHERE syllabus_id = $1', [syllabusId]);
        if (notesDB.rows.length === 0) {
            return res.status(404).json({ message: 'Notes not found' });
        }

        let content = notesDB.rows[0].notes_json;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) {}
        }
        const notesText = content.content || content;

        const stream = res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment;filename=course-notes-${syllabus.course_code}.pdf`,
        });

        await buildNotesPdf(
            notesText,
            syllabus,
            (chunk) => stream.write(chunk),
            () => stream.end()
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Notes PDF Generation failed' });
    }
};
