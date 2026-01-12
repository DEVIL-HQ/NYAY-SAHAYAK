
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel (default, clear American English) - Change if needed

export const speakWithElevenLabs = async (text: string): Promise<void> => {
    if (!ELEVENLABS_API_KEY) {
        console.warn('ElevenLabs API Key is missing');
        throw new Error('API Key missing');
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                resolve();
                URL.revokeObjectURL(url);
            };
            audio.onerror = (e) => {
                reject(e);
                URL.revokeObjectURL(url);
            };
            audio.play().catch(reject);
        });

    } catch (error) {
        console.error('ElevenLabs TTS failed:', error);
        throw error; // Re-throw to allow fallback
    }
};
