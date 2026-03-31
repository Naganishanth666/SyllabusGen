require('dotenv').config();
const axios = require('axios');

const getModels = async () => {
    try {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
        });
        const models = response.data.data.map(m => m.id);
        console.log("AVAILABLE MODELS:\n", models.join('\n'));
    } catch (e) {
        console.error("FAIL:", e.response ? e.response.data : e.message);
    }
};

getModels();
