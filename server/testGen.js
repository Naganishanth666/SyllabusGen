require('dotenv').config();
const { generateSyllabus } = require('./src/services/llmService');

const mockData = {
    title: "AI in Cloud Computing",
    courseCode: "BCSE303L",
    department: "CSE",
    duration: 45, // Total hours
    description: "Learn AI in Cloud.",
    modulesCount: 5,
    includeCaseStudies: true,
    benchmarkingUniversities: "MIT, Stanford",
    textbooks: "",
    referenceBooks: "",
    customModules: [
        { title: "Introduction", duration: "5", description: "Basics" },
        // User provides 1 module of 5 hours.
        // Remaining: 40 hours for 4 modules -> 10 hours each.
    ]
};

async function test() {
    console.log("--- STARTING TEST ---");
    try {
        const result = await generateSyllabus(mockData);
        console.log("Writing result to gen_output.txt...");
        require('fs').writeFileSync('gen_output.txt', result, 'utf8');
        console.log("Done.");
    } catch (e) {
        console.error(e);
    }
}

test();
