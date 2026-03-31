require('dotenv').config();
const { generateChapterOutline, generateCourseNotes } = require('./src/services/llmService');

const test = async () => {
    try {
        console.log("Testing Chapter Outline...");
        const outline = await generateChapterOutline("Machine Learning", "Module 1: Introduction to ML, Supervised vs Unsupervised, Clustering Algorithms");
        console.log("Outline:", outline);
        
        console.log("Testing Course Notes for first topic...");
        const notes = await generateCourseNotes("Machine Learning", outline[0], "Module 1: Introduction to ML, Supervised vs Unsupervised, Clustering Algorithms");
        console.log("Notes Snippet:", String(notes).substring(0, 150));
        
    } catch (e) {
        console.log("CRITICAL ERROR:", e);
    }
};

test();
