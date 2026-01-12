
import { GoogleGenAI } from "@google/genai";

export const getApiKey = () => {
    return process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY || '';
};

// Configuration for OpenRouter models mapping to Google models or equivalent
const OPENROUTER_MODELS: Record<string, string> = {
    'gemini-3-flash-preview': 'openai/gpt-4o-mini', // Fallback to GPT-4o-mini due to Gemini outage
    'gemini-3-pro-preview': 'openai/gpt-4o-mini',
    'gemini-2.5-flash-preview-tts': 'openai/gpt-4o-mini'
};

export async function generateContentWithFallback(
    model: string,
    params: {
        contents?: any;
        systemInstruction?: string;
        parts?: any[];
        config?: any;
    }
) {
    const apiKey = getApiKey();
    console.log(`[AI] API Key present: ${!!apiKey} (${apiKey.slice(0, 8)}...)`);

    if (!apiKey) {
        console.error("API Key is missing in getApiKey()");
        throw new Error("API Key is missing");
    }

    // Check if OpenRouter Key
    if (apiKey.startsWith('sk-' + 'or-')) {
        console.log(`[AI] Using OpenRouter API for model: ${model}`);
        return generateOpenRouterContent(apiKey, model, params);
    }

    // Default to Google GenAI SDK
    console.log(`[AI] Using Google GenAI API for model: ${model}`);
    const ai = new GoogleGenAI({ apiKey });

    // Clean up params for Google SDK to avoid type errors if strict
    const googleParams: any = {};
    if (params.contents) googleParams.contents = params.contents;
    if (params.config) googleParams.config = params.config;
    if (params.parts && !params.contents) {
        googleParams.contents = { parts: params.parts };
    }

    // Handle system instruction specifically for SDK
    if (params.config?.systemInstruction) {
        if (!googleParams.config) googleParams.config = {};
        googleParams.config.systemInstruction = params.config.systemInstruction;
    }

    // Map model name if necessary or verify it exists in Google SDK
    // Assuming the called models exist or we pass them through
    return await ai.models.generateContent({
        model: model,
        ...googleParams
    });
}

async function generateOpenRouterContent(apiKey: string, model: string, params: any) {
    const orModel = OPENROUTER_MODELS[model] || 'google/gemini-pro-1.5';

    // Construct messages for OpenRouter (OpenAI-like format)
    const messages = [];

    // Add system instruction if present
    if (params.config?.systemInstruction) {
        messages.push({ role: 'system', content: params.config.systemInstruction });
    } else if (params.systemInstruction) {
        messages.push({ role: 'system', content: params.systemInstruction });
    }

    // Handle contents (user/model messages)
    // If contents is a string
    if (typeof params.contents === 'string') {
        messages.push({ role: 'user', content: params.contents });
    }
    // If contents is list of parts (Google style)
    else if (params.contents && params.contents.parts) {
        const textParts = params.contents.parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
        const imageParts = params.contents.parts.filter((p: any) => p.inlineData);

        const contentArray: any[] = [{ type: 'text', text: textParts }];

        imageParts.forEach((img: any) => {
            contentArray.push({
                type: 'image_url',
                image_url: {
                    url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`
                }
            });
        });
        messages.push({ role: 'user', content: contentArray });
    }
    // If params.parts exists directly
    else if (params.parts) {
        const textParts = params.parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
        const imageParts = params.parts.filter((p: any) => p.inlineData);
        const contentArray: any[] = [{ type: 'text', text: textParts }];

        imageParts.forEach((img: any) => {
            contentArray.push({
                type: 'image_url',
                image_url: {
                    url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`
                }
            });
        });
        messages.push({ role: 'user', content: contentArray });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "NYAAYa Sahayak",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: orModel,
            messages: messages,
            response_format: params.config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter Error:", errText);
        throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    // Mimic Google SDK Response structure
    return {
        text: text, // Helper getter not strictly available in simple object, but commonly used property in this app
        candidates: [{
            content: { parts: [{ text: text }] },
            groundingMetadata: { groundingChunks: [] } // OpenRouter might not return this
        }]
    };
}
