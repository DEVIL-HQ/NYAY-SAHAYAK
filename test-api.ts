
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env manullay since we are running with ts-node/node
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const apiKey = envConfig.GEMINI_API_KEY || envConfig.VITE_GEMINI_API_KEY;

console.log("Testing API Key:", apiKey ? "Present (" + apiKey.slice(0, 10) + "...)" : "Missing");


const MODELS_TO_TEST = [
    'google/gemini-pro',
];

async function testOpenRouter() {
    for (const model of MODELS_TO_TEST) {
        console.log(`\n---------------------------------`);
        console.log(`Testing model: ${model}`);

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "NYAAYa Sahayak Test",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: 'Say hello' }]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`FAILED: ${response.status} ${response.statusText}`);
                console.error("Details:", errText.slice(0, 200)); // Truncate long errors
            } else {
                const data = await response.json();
                console.log("SUCCESS! Model found:", model);
                console.log("Response snippet:", data.choices?.[0]?.message?.content);
                return; // Stop after first success
            }

        } catch (error) {
            console.error("Network Exception:", error);
        }
    }
    console.log("\nAll models failed.");
}

testOpenRouter();
