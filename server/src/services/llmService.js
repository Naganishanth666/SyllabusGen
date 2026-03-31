require('dotenv').config();
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');

const hf = new HfInference(process.env.HF_API_TOKEN);

const callGroqAPI = async (prompt, maxTokens, temperature) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing from environment variables.");

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
};

// Switch to a very reliable, high-availability model
const MODEL_NAME = process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
// Alternative: 'Qwen/Qwen2.5-7B-Instruct'

const generateSyllabus = async (formData) => {
    const {
        title, courseCode, department, duration, description, objectives,
        modulesCount, includeCaseStudies, benchmarkingUniversities, textbooks, referenceBooks, customModules
    } = formData;

    // Calculate duration logic
    let usedHours = 0;
    if (customModules && customModules.length > 0) {
        usedHours = customModules.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    }
    const remainingHours = duration - usedHours;

    const prompt = `
You are an academic syllabus generator.
Follow these rules strictly:
1. Each module must contain: Module title, Duration (hours), Overview, 5–8 highly detailed bullet point topics.
   - CRITICAL: Do NOT make the syllabus too broad or generic. You must expand subtopics to cover specific algorithms, methodologies, advanced concepts, and technical details where appropriate. Make it comprehensive and academically rigorous.
2. Time allocation: The TOTAL course duration is ${duration} hours.
   ${customModules && customModules.length > 0 ? `- The user-defined modules take up ${usedHours} hours.
   - You have EXACTLY ${remainingHours} hours remaining to distribute among the other modules.
   - ENSURE the sum of all module durations equals ${duration}.` : `- Distribute time based on topic complexity. All module durations must sum exactly to ${duration} hours.`}
3. Output format must clearly preserve structure.

Course Title: ${title}
Course Code: ${courseCode}
Department: ${department}
Total Duration: ${duration} hours
Course Description: ${description}
Course Objectives:
Generate 4-6 academic course objectives based on the course title and description.

Course Outcomes:
- Generate 4-6 specific course outcomes (COs) based on the modules.

CO-PEO Mapping Matrix:
Generate a CO-PEO Mapping Matrix using the following standard Program Educational Objectives (PEOs):
- PEO1: Graduates will excel in engineering professions or pursue advanced studies.
- PEO2: Graduates will contribute to sustainable development and innovation.
- PEO3: Graduates will demonstrate leadership, ethics, teamwork, and communication skills in diverse environments.

The matrix should map each Course Outcome (CO1, CO2, etc.) to these PEOs using correlation levels: 3 (High), 2 (Medium), 1 (Low). If there is no correlation, use 0.

Format the matrix EXACTLY as a Markdown Table with these headers:
| CO No. | Course Outcome Statement | PEO1 | PEO2 | PEO3 |
|---|---|---|---|---|

Module-wise Syllabus:
${customModules && customModules.length > 0 ? `
CRITICAL INSTRUCTION: The user has defined the following MANDATORY modules. You MUST include them exactly as specified, using the provided Title, Duration, and Topics. EXPAND on the topics academically.
${customModules.map((m, i) => `
Module ${i + 1}:
- Title: ${m.title || 'Generate Title'}
- Duration: ${m.duration || 'Calculate'} hours
- Topics:
${m.description ? `(Expand on: ${m.description})` : ''}
(Provide 5-8 highly detailed bullet points. Do NOT include "Case Studies" here.)
`).join('\n')}

For any remaining modules (to reach ${modulesCount}), generate them to fit the course flow.
DISTRIBUTE the remaining ${remainingHours} hours among these new modules.
` : `For each module (Total ${modulesCount} modules):
- Module number and title
- Duration
- Overview
- Bullet point topics (Highly detailed! DO NOT repeat the Module Title. Do NOT include Case Studies here.)`}

After all modules:
${includeCaseStudies ? '- Case Studies: Provide 3-4 SPECIFIC, REAL-WORLD case studies with NAMED companies (e.g., "Netflix", "Tesla"). INCLUDE A BRIEF DESCRIPTION (2-3 sentences) of how they use the technology. Do NOT just list names.' : ''}
- Textbooks: ${textbooks || 'Recommend 2-3 standard textbooks for this course include year of publication.'}
- Reference Books: ${referenceBooks || 'Recommend 2-3 standard reference books for this course.'}
- Syllabus Benchmarking: Compare with ${benchmarkingUniversities} first check if ${benchmarkingUniversities} has the same or simlar course if it doesnt mention that no such course exists in that particular unviersity
Generate the detailed syllabus now.
`;

    try {
        const result = await hf.chatCompletion({
            model: MODEL_NAME,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000, // Maximized for exhaustive textbook chapters
            temperature: 0.3
        });

        let content = result.choices[0].message.content;
        
        // Failsafe: If the AI STILL hits the token ceiling while writing a diagram, 
        // aggressively close the backticks so it doesn't poison the Markdown parsers for the rest of the application.
        const startBlocks = (content.match(/```mermaid/gi) || []).length;
        const endBlocks = (content.match(/```/g) || []).length - startBlocks;
        if (startBlocks > endBlocks) {
            content += '\n```\n';
        }

        return content;
    } catch (error) {
        console.error('Error calling HF SDK (Generate Syllabus):');
        if (error.result && error.result.error) {
            console.error('API Error Details:', JSON.stringify(error.result.error, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
        throw new Error('Failed to generate syllabus from AI');
    }
};

const regenerateSyllabus = async (currentSyllabus, instructions) => {
    const prompt = `
You are an academic syllabus generator.
The user has provided a CURRENT DRAFT of a syllabus.
Your task is to REWRITE the entire syllabus from top to bottom based on the instructions.

Current Draft:
${currentSyllabus}

User Instructions:
${instructions || 'Improve clarity, structure, and time distribution.'}

CRITICAL RULES:
1. SEAMLESS INTEGRATION: If the user added brief notes or edits, you MUST integrate them directly into the appropriate module. 
2. NO APPENDICES: DO NOT append new sections like "Expanded Topics" at the bottom! You must rewrite the original content seamlessly.
3. DETAILED MODULES: Ensure every module has 5-8 highly detailed, technical, and academic bullet points.
4. PRESERVE STRUCTURE: Keep the overall format (Course Title, Modules, Duration, etc.) identical. Do not remove any existing modules.
5. NO HALLUCINATION: Only add what is requested or implied by the user's notes.
`;

    try {
        const result = await hf.chatCompletion({
            model: MODEL_NAME,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
            temperature: 0.4 // Slightly higher creativity for expansion
        });
        return result.choices[0].message.content;
    } catch (error) {
        console.error('Error calling HF SDK (Regenerate Syllabus):');
        if (error.result && error.result.error) {
            console.error('API Error Details:', JSON.stringify(error.result.error, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
        throw new Error('Failed to regenerate syllabus from AI');
    }
};

const generateQuestionBank = async (syllabusContent, difficulty, numQuestions) => {
    const prompt = `
Generate a strict Multiple Choice Question (MCQ) quiz bank based on the following syllabus content:
${syllabusContent}

Rules:
- Generate EXACTLY ${numQuestions} distinct MCQs for EACH module. 
- You must NOT generate any Short Answer, Long Answer, or Application-Based questions. Only MCQs.
- Difficulty level: ${difficulty}
- Each question should indicate the Bloom's taxonomy level it targets in the form "**Quiz (MCQ):** [Question text]"
- Format options sequentially using (A), (B), (C), (D) on a single line separated by spaces.
- You MUST append the text "(Correct)" exactly like that to the end of the correct option string.

Example Format:
Module 1: Introduction
- **Quiz (MCQ):** What is the main purpose of... 
  (A) Option 1 (B) Option 2 (Correct) (C) Option 3 (D) Option 4
`;

    try {
        const result = await hf.chatCompletion({
            model: MODEL_NAME,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
            temperature: 0.5
        });
        return result.choices[0].message.content;
    } catch (error) {
        console.error('Error calling HF SDK (Generate Question Bank):');
        if (error.result && error.result.error) {
            console.error('API Error Details:', JSON.stringify(error.result.error, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
        throw new Error('Failed to generate question bank from AI');
    }
};

const generateChapterOutline = async (courseTitle, moduleContent) => {
    const prompt = `
You are an academic architect designing a textbook chapter for "${courseTitle}".
Break down the following syllabus module into EXACTLY 7 to 8 incredibly specific, highly technical micro-topics.
DO NOT summarize. Expand the concepts into atomic academic lecture topics.
Module Content:
${moduleContent}

Return ONLY a valid JSON array of strings, nothing else. No markdown formatting.
Example: ["Topic 1: Deep dive into X", "Topic 2: Mathematical foundation of Y"]
`;
    try {
        // Reduced maxTokens drastically to 500 specifically to stop Groq from pre-reserving 1500 unused tokens from our strict TPM allowance!
        const rawContent = await callGroqAPI(prompt, 500, 0.3);
        const match = rawContent.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        const content = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(content);
    } catch (e) {
        console.error('Failed to generate chapter outline:', e);
        // Fallback: just return the module lines as topics
        return moduleContent.split('\n').filter(l => l.trim().length > 5);
    }
};

const generateCourseNotes = async (courseTitle, topic, moduleContent) => {
    const prompt = `
You are a distinguished university professor teaching an advanced course titled "${courseTitle}".
Your objective is to author an EXHAUSTIVE, ENCYCLOPEDIC chapter of course notes specifically covering the following TARGET TOPIC.

Module Context: ${moduleContent.split('\n')[0] || 'Overview'}
TARGET TOPIC TO WRITE ABOUT: ${topic}

CRITICAL INSTRUCTIONS FOR MAXIMUM DETAIL:
1. **NO SUMMARIZATION:** You must dive incredibly deep into the target topic. Write a massive, multi-page textbook explanation just for this single concept.
2. **PARAGRAPH DEPTH:** Write at least 5 to 6 substantial paragraphs of advanced academic explanation.
3. **PRACTICAL DEPTH:** Include real-world applications, mathematical proofs, historical context, and technical architectures.
4. **MATHEMATICAL TYPOGRAPHY (LaTeX):** If you use ANY formulas, equations, or mathematical notations, you MUST wrap them inside a code block labeled \`\`\`mathjax\`\`\`. Example:
\`\`\`mathjax
f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi
\`\`\`
Do NOT use $ or $$ inline math. ALWAYS use the \`\`\`mathjax\`\`\` code block convention for formulas so the rendering engine can embed them gracefully. Follow standard LaTeX logic.
5. **VISUALIZATIONS:** Integrate 1 or 2 \`\`\`mermaid\`\`\` code blocks (flowcharts, state diagrams). CRITICAL: Ensure your Mermaid syntax is 100% valid! You must ONLY build basic \`flowchart TD\` or \`graph TD\` structures. DO NOT use advanced styling, subgraphs, classDefs, or complex logic. If a node text contains parentheses \`()\` or brackets \`[]\`, you MUST wrap the text in quotes (Example: \`A["Data (Input)"]\`).
6. **FORMATTING:** Use beautiful Markdown. Start with an H3 Header (e.g., ### ${topic}). Use H4 for subtopics. 
7. **LENGTH REQUIREMENT:** Your output must be thousands of words long. Be as verbose, detailed, and academically rigorous as possible.
`;

    try {
        // Limited max tokens requested per pass strictly to 1000 to absolutely guarantee 8 passes never reserve more than the 14,400 TPM Groq Free Tier pool.
        const rawOutput = await callGroqAPI(prompt, 1000, 0.7);

        // Failsafe: if the AI was cut off mid-mermaid block by token limits, close it forcefully so React/PDF parsing doesn't break
        const openMermaidMatches = rawOutput.match(/```mermaid/g);
        const closeMatches = rawOutput.match(/```/g);
        let content = rawOutput;
        if (openMermaidMatches && closeMatches) {
            if (openMermaidMatches.length > closeMatches.length - openMermaidMatches.length) {
                content += '\n```\n';
            }
        }
        return content;
    } catch (error) {
        console.error('Error calling Groq API (Generate Course Notes):', error.message);
        throw new Error('Failed to generate course notes from AI');
    }
};

module.exports = { generateSyllabus, regenerateSyllabus, generateQuestionBank, generateChapterOutline, generateCourseNotes };
