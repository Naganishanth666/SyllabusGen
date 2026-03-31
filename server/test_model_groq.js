require('dotenv').config();
const axios = require('axios');

const testGroq = async () => {
    try {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [{ role: "user", content: "Write a 5 segment flowchart using valid mermaid syntax." }],
            max_tokens: 1500,
            temperature: 0.3
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });
        console.log("SUCCESS:", response.data.choices[0].message.content);
    } catch (e) {
        console.error("FAIL:", e.response ? e.response.data : e.message);
    }
};

testGroq();
