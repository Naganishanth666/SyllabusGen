require('dotenv').config();
const axios = require('axios');

const TEST_URL_3 = 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta';
const TEST_URL_4 = 'https://huggingface.co/api/models/HuggingFaceH4/zephyr-7b-beta';

const test = async () => {
    const token = process.env.HF_API_TOKEN;

    console.log('Testing URL 3 (API Inference - No Token):', TEST_URL_3);
    try {
        // Try without token first
        const res = await axios.post(TEST_URL_3, { inputs: 'Hello' });
        console.log('Success 3:', res.data[0].generated_text);
    } catch (err) {
        console.log('Fail 3:', err.response ? err.response.status : err.message);
        if (err.response && err.response.data) console.log(JSON.stringify(err.response.data));
    }

    console.log('\nTesting URL 4 (Public Metadata):', TEST_URL_4);
    try {
        const res = await axios.get(TEST_URL_4);
        console.log('Success 4: Model exists. Downloads:', res.data.downloads);
    } catch (err) {
        console.log('Fail 4:', err.response ? err.response.status : err.message);
    }
};

test();
