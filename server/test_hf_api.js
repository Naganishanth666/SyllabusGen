require('dotenv').config();
const axios = require('axios');

const VARIATION_1 = 'https://router.huggingface.co/hf-inference/models/gpt2';
const VARIATION_2 = 'https://router.huggingface.co/gpt2';

const test = async () => {
    const token = process.env.HF_API_TOKEN;
    console.log('Token Length:', token ? token.length : 0);
    console.log('Token Start:', token ? token.substring(0, 5) : 'None');

    console.log('\n--- TEST 1: ROUTER /hf-inference/models/gpt2 ---');
    try {
        const res = await axios.post(VARIATION_1, { inputs: 'Hi' }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success! Data:', JSON.stringify(res.data));
    } catch (err) {
        console.log('Failed:', err.response ? err.response.status : err.message);
    }

    console.log('\n--- TEST 2: ROUTER /gpt2 ---');
    try {
        const res = await axios.post(VARIATION_2, { inputs: 'Hi' }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success! Data:', JSON.stringify(res.data));
    } catch (err) {
        console.log('Failed:', err.response ? err.response.status : err.message);
    }
};

test();
