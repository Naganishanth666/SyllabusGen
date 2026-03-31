const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const syllabusController = require('../controllers/syllabusController');
const { buildPdf } = require('../services/pdfService');
const { query } = require('../config/db'); // For quick access if needed, mostly via controllers

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Syllabus Routes
router.get('/syllabus', authMiddleware, syllabusController.getSyllabi);
router.get('/syllabus/:id', authMiddleware, syllabusController.getSyllabus);
router.post('/syllabus', authMiddleware, syllabusController.createSyllabus);
router.put('/syllabus/:id', authMiddleware, syllabusController.updateSyllabus);

// Generation Routes
router.post('/generate/syllabus', authMiddleware, syllabusController.generate);
router.post('/regenerate/syllabus', authMiddleware, syllabusController.regenerate);

// PDF Download Route
router.get('/syllabus/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const result = await query('SELECT * FROM syllabi WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }
        const syllabus = result.rows[0];

        const stream = res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment;filename=syllabus-${syllabus.course_code}.pdf`,
        });

        buildPdf(
            syllabus,
            (chunk) => stream.write(chunk),
            () => stream.end()
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'PDF Generation failed' });
    }
});

// Question Bank Route
// Need to add Question Bank controller logic
const questionController = require('../controllers/questionBankController');
router.post('/generate/question-bank', authMiddleware, questionController.generateQuestions);
router.get('/syllabus/:syllabusId/question-banks', authMiddleware, questionController.getQuestionBanks);

// Course Notes Routes
const notesController = require('../controllers/notesController');
router.post('/generate/course-module-notes', authMiddleware, notesController.generateModuleNotes);
router.put('/syllabus/:syllabusId/notes', authMiddleware, notesController.saveCompiledNotes);
router.get('/syllabus/:syllabusId/notes', authMiddleware, notesController.getNotes);
router.get('/syllabus/:syllabusId/notes/pdf', authMiddleware, notesController.downloadNotesPdf);

module.exports = router;
