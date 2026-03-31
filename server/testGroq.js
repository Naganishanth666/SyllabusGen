require('dotenv').config();
const axios = require('axios');

const testGroq = async () => {
    try {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        console.log("Key starting with:", GROQ_API_KEY.substring(0, 10));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: "user", content: "TEST" }],
            max_tokens: 4000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("SUCCESS:", response.data);
    } catch (e) {
        console.error("FAIL:", e.response ? e.response.data : e.message);
    }
};

testGroq();
