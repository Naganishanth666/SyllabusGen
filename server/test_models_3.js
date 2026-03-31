require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_API_TOKEN);

const test = async () => {
    console.log('--- TEST: Qwen/Qwen2.5-7B-Instruct ---');
    try {
        const res = await hf.chatCompletion({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 20
        });
        console.log('Qwen SUCCESS:', res.choices[0].message.content);
    } catch (e) {
        console.log('Qwen FAILED:', e.message);
    }

    console.log('\n--- TEST: google/gemma-1.1-7b-it ---');
    try {
        const res = await hf.chatCompletion({
            model: 'google/gemma-1.1-7b-it',
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 20
        });
        console.log('Gemma SUCCESS:', res.choices[0].message.content);
    } catch (e) {
        console.log('Gemma FAILED:', e.message);
    }
};

test();
