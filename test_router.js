require('dotenv').config();
const axios = require('axios');

const TEST_URL = 'https://router.huggingface.co/hf-inference/models/HuggingFaceH4/zephyr-7b-beta';
const TEST_URL_2 = 'https://router.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta';

const test = async () => {
    const token = process.env.HF_API_TOKEN;
    console.log('Testing URL 1:', TEST_URL);
    try {
        const res = await axios.post(TEST_URL, { inputs: 'Hello' }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Success 1:', res.data[0].generated_text);
    } catch (err) {
        console.log('Fail 1:', err.response ? err.response.data : err.message);
    }

    console.log('\nTesting URL 2:', TEST_URL_2);
    try {
        const res = await axios.post(TEST_URL_2, { inputs: 'Hello' }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Success 2:', res.data[0].generated_text);
    } catch (err) {
        console.log('Fail 2:', err.response ? err.response.data : err.message);
    }
};

test();
