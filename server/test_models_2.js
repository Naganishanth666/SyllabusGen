require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_API_TOKEN);

const test = async () => {
    console.log('--- TEST: Llama-3 ---');
    try {
        const res = await hf.chatCompletion({
            model: 'meta-llama/Meta-Llama-3-8B-Instruct',
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 20
        });
        console.log('Llama-3 SUCCESS:', res.choices[0].message.content);
    } catch (e) {
        console.log('Llama-3 FAILED:', e.message);
    }

    console.log('\n--- TEST: Zephyr ---');
    try {
        const res = await hf.chatCompletion({
            model: 'HuggingFaceH4/zephyr-7b-beta',
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 20
        });
        console.log('Zephyr SUCCESS:', res.choices[0].message.content);
    } catch (e) {
        console.log('Zephyr FAILED:', e.message);
    }
};

test();
