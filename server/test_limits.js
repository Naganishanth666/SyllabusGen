require('dotenv').config();
const axios = require('axios');

const checkLimits = async (modelName) => {
    try {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: modelName,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 10
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });
        
        console.log(`\n--- LIMITS FOR ${modelName} ---`);
        console.log("Tokens Remaining (Minute):", response.headers['x-ratelimit-remaining-tokens']);
        console.log("Tokens Remaining (Day):", response.headers['x-ratelimit-remaining-tokens']); // Groq might not send daily in headers, let's see
        console.log("Full Headers:", JSON.stringify(response.headers, null, 2).split('\n').filter(l => l.includes('ratelimit')).join('\n'));
    } catch (e) {
        console.error("FAIL:", modelName, e.response ? e.response.status : e.message);
        if (e.response && e.response.headers) {
             console.log("Error Headers:", JSON.stringify(e.response.headers, null, 2).split('\n').filter(l => l.includes('ratelimit')).join('\n'));
        }
    }
};

const run = async () => {
    await checkLimits('llama-3.1-8b-instant');
    await checkLimits('llama-3.3-70b-versatile');
};
run();
