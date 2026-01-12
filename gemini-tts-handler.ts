import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./ai-handler";

const MODEL_NAME = "gemini-2.5-pro-preview-tts"; // As requested

// WAV Header Generation (Ported from Python struct.pack logic)
const convertToWav = (pcmData: Uint8Array, sampleRate: number = 24000): ArrayBuffer => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const chunkSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Write PCM data
    const pcmBytes = new Uint8Array(buffer, 44);
    pcmBytes.set(pcmData);

    return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

export const speakWithGemini = async (text: string, langCode: string = 'EN'): Promise<void> => {
    // Prefer specific TTS key, fall back to general key if missing
    const apiKey = import.meta.env.VITE_GEMINI_TTS_API_KEY || getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    if (apiKey.startsWith('sk-or-')) {
        throw new Error("OpenRouter does not support Gemini TTS direct streaming via this SDK yet. Please use a Google API Key.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Custom voice selection: Use 'Aoede' (higher pitch) for Bengali, 'Zephyr' (balanced) for others
    const voiceName = langCode === 'BN' ? "Aoede" : "Zephyr";

    // Configuration based on user's python script
    const config = {
        model: MODEL_NAME,
        config: {
            responseModalities: ["audio"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voiceName
                    }
                }
            }
        }
    };

    // We send the text as a user message part with explicit instruction to READ it
    const langNames: Record<string, string> = {
        'EN': 'English', 'HI': 'Hindi', 'BN': 'Bengali', 'TE': 'Telugu', 'MR': 'Marathi',
        'GU': 'Gujarati', 'TA': 'Tamil', 'KN': 'Kannada', 'PA': 'Punjabi', 'BH': 'Bhojpuri'
    };
    const langName = langNames[langCode] || 'English';
    const prompt = `Please read the following text aloud exactly as written, in ${langName} language. Do not add any conversational filler. Text: "${text}"`;

    const content = {
        parts: [{ text: prompt }]
    };

    console.log(`[Gemini TTS] Generating speech for: "${text.substring(0, 50)}..."`);

    try {
        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: content,
            config: config.config as any
        });

        const candidates = result.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini TTS");
        }

        const part = candidates[0].content?.parts?.[0];
        if (!part || !part.inlineData || !part.inlineData.data) {
            throw new Error("No audio data found in response");
        }

        // Decode Base64 string to Uint8Array (PCM Data)
        const binaryString = atob(part.inlineData.data);
        const len = binaryString.length;
        const pcmData = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            pcmData[i] = binaryString.charCodeAt(i);
        }

        // Convert to WAV Blob
        const wavBuffer = convertToWav(pcmData, 24000);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        // Play using standard Audio element
        const audio = new Audio(url);
        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };
            audio.play().catch(reject);
        });

    } catch (error) {
        console.error("Gemini TTS Failed:", error);
        throw error;
    }
};
