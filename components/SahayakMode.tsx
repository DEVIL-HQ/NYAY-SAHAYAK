import React, { useState, useEffect, useRef } from 'react';
import { ICONS, LANGUAGES, TRANSLATIONS, HELPLINES } from '../constants';
import { Language, Lawyer, FIR } from '../types';
import { generateContentWithFallback, getApiKey } from '../ai-handler';
import { speakWithGemini } from '../gemini-tts-handler';
import FindLawyer from './FindLawyer';
import OnlineFIR from './OnlineFIR';
import FIRStatus from './FIRStatus';
import LiveMap from './LiveMap';

type State = 'IDLE' | 'LISTENING' | 'THINKING' | 'RESULT';

interface LegalAnalysis {
  roadmap: string[];
  simpleLaw: string;
  rights: string;
  sourceDoc: {
    title: string;
    section: string;
    date: string;
  };
}

// Audio utility functions for raw PCM decoding
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const SahayakMode: React.FC<{ language: Language; userKey: string | null; onListeningStateChange?: (isListening: boolean) => void }> = ({ language, userKey, onListeningStateChange }) => {
  const [state, setState] = useState<State>('IDLE');
  const [dots, setDots] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [analysis, setAnalysis] = useState<LegalAnalysis | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ data: string; mime: string } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Renamed from isPlaying to setIsSpeaking in instruction, but keeping isPlaying for consistency with existing code
  const [showLawyers, setShowLawyers] = useState(false);
  const [showFIR, setShowFIR] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [viewMode, setViewMode] = useState<'ASSISTANT' | 'ACTIVITY'>('ASSISTANT'); // Dashboard Toggle

  // Initialize FIRs from LocalStorage based on userKey
  const [firs, setFirs] = useState<FIR[]>(() => {
    if (!userKey) return [];
    try {
      const saved = localStorage.getItem(`nyaay_firs_${userKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load FIRs", e);
      return [];
    }
  });

  // Save FIRs to LocalStorage whenever they change
  useEffect(() => {
    if (userKey) {
      localStorage.setItem(`nyaay_firs_${userKey}`, JSON.stringify(firs));
    }
  }, [firs, userKey]);

  const handleFileFIR = (newFIR: FIR) => {
    setFirs(prev => [newFIR, ...prev]);
    setShowFIR(false); // Close modal
    setViewMode('ACTIVITY'); // Switch to tracking view
  };

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Context for follow-up questions
  const [contextData, setContextData] = useState<string>('');
  const [voiceDebug, setVoiceDebug] = useState<string>('');
  const [lastQuery, setLastQuery] = useState<string>('');
  const [isResolvingFollowUp, setIsResolvingFollowUp] = useState(false);

  const t = TRANSLATIONS[language];
  const currentLangConfig = LANGUAGES.find(l => l.code === language);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Notify parent about listening state
  useEffect(() => {
    if (onListeningStateChange) {
      // Hide toggle for LISTENING, THINKING, and RESULT states (immersive modes)
      onListeningStateChange(state !== 'IDLE');
    }
  }, [state, onListeningStateChange]);

  // Animated loading dots
  useEffect(() => {
    let interval: any;
    if (state === 'LISTENING' || state === 'THINKING') {
      interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [state]);

  // Pre-load voices to ensure they are available
  useEffect(() => {
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Language Change Effect: Re-generate result if language changes while viewing result
  useEffect(() => {
    if (state === 'RESULT' && (lastQuery || fileData)) {
      stopAudio();
      setState('THINKING');
      // Keep existing context if any
    }
  }, [language]);

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setVoiceDebug('');
  };

  const speakResult = async (text: string, forcePlay = false) => {
    if (!forcePlay && isPlaying) {
      stopAudio();
      return;
    }

    if (!text) return;
    console.log(`[TTS] Speaking (${currentLangConfig?.label}):`, text); // Debug log
    setIsPlaying(true);

    try {
      await speakWithGemini(text, currentLangConfig?.code || 'EN');
      setIsPlaying(false);
    } catch (error) {
      console.warn("Gemini TTS error, switching to browser:", error);

      if (!window.speechSynthesis) {
        alert("Text-to-Speech is not supported.");
        setIsPlaying(false);
        return;
      }

      window.speechSynthesis.cancel();

      // Ensure voices are loaded
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        await new Promise<void>(resolve => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve();
          };
          // Timeout safety
          setTimeout(resolve, 1000);
        });
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const targetLang = currentLangConfig?.voice || 'en-IN';
      utterance.lang = targetLang;

      let matchingVoice: SpeechSynthesisVoice | undefined;
      const tryFind = (predicate: (v: SpeechSynthesisVoice) => boolean) => voices.find(predicate);

      // Robust matching strategy
      if (!matchingVoice) matchingVoice = tryFind(v => v.lang === targetLang && v.name.includes("Google"));
      if (!matchingVoice) matchingVoice = tryFind(v => v.lang === targetLang && v.name.includes("Natural"));
      if (!matchingVoice) matchingVoice = tryFind(v => v.lang === targetLang && v.name.includes("Microsoft"));

      // Loose matching for Indian languages
      const isIndian = ['hi', 'bn', 'te', 'mr'].some(code => targetLang.includes(code));
      if (!matchingVoice && isIndian) {
        const langCode = targetLang.split('-')[0]; // e.g. 'hi'
        matchingVoice = tryFind(v => v.lang.startsWith(langCode) || v.name.toLowerCase().includes(LANGUAGES.find(l => l.voice === targetLang)?.label.toLowerCase() || ''));
      }

      // Final fallback to exact code
      if (!matchingVoice) matchingVoice = tryFind(v => v.lang === targetLang);

      if (matchingVoice) {
        utterance.voice = matchingVoice;
        setVoiceDebug(`Browser Voice: ${matchingVoice.name}`);
      } else {
        setVoiceDebug(`No ${targetLang} voice found. Using default.`);
        // Critical: If target is Hindi but no Hindi voice, user will hear silence/garbage. Alert them.
        if (targetLang.startsWith('hi')) {
          alert("Hindi Voice not found in your browser settings. Please install a Hindi Language Pack in Windows/Chrome settings.");
        }
      }

      utterance.rate = 0.9; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => { setIsPlaying(false); setVoiceDebug(''); };
      utterance.onerror = (e) => {
        console.error("Browser TTS Error", e);
        setIsPlaying(false);
        setVoiceDebug(`Error: ${e.error}`);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const startVoiceCapture = async () => {
    // Clear context for new voice session unless we are already in RESULT mode (then it might look like a new query, but let's assume mic on home = new query)
    if (state !== 'RESULT') {
      setContextData('');
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = currentLangConfig?.voice || 'en-IN';

      recognitionRef.current.onstart = () => {
        setState('LISTENING');
        setTranscript('');
        setInterimTranscript('');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) setTranscript(prev => prev + final);
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Recognition Error:", event.error);
        if (event.error !== 'no-speech') setState('IDLE');
      };

      recognitionRef.current.start();
    } catch (err) {
      console.error("Mic Access Error:", err);
      alert("Permission to use the microphone was denied.");
      setState('IDLE');
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    setTranscript('');
    setInterimTranscript('');
    startVoiceCapture();
  };

  const stopAndProcess = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    setState('THINKING');
  };

  const handleBackToHome = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    stopAudio();
    setState('IDLE');
    setTranscript('');
    setInterimTranscript('');
    setContextData('');
  };

  useEffect(() => {
    if (state === 'THINKING') {
      const queryText = (transcript + interimTranscript) || textInput || lastQuery;
      if (queryText || fileData) {
        generateRoadmap(queryText);
      } else {
        setState('IDLE');
      }
    }
  }, [state]);

  const generateRoadmap = async (queryText: string, isInline = false) => {
    setShowLawyers(false);
    setLastQuery(queryText);

    try {
      // Construct prompt with context if available
      let fullPrompt = `Analyze this legal query: "${queryText}".`;
      if (contextData) {
        fullPrompt = `CONTEXT: ${contextData}\n\nUSER NEW QUESTION: "${queryText}".\n\nINSTRUCTION: Provide an answer to the new question primarily, but use the provided context to understand references (like 'it', 'that', or specific case details mentioned previously).`;
      }

      const parts: any[] = [{
        text: `${fullPrompt} 
        IMPORTANT: You must respond in ${currentLangConfig?.label} language using the native script (e.g., Devanagari for Hindi). 
        The audience is rural villagers, so use very simple, non-technical language where possible.`
      }];

      if (fileData) {
        parts.push({ inlineData: { data: fileData.data, mime: fileData.mime } });
      }

      const response = await generateContentWithFallback('gemini-3-flash-preview', {
        parts: parts,
        config: {
          systemInstruction: `You are NYAAYa-Sahayak, a friendly and helpful legal guide for rural India.
          
          TONE: Casual, conversational, and encouraging (like a wise elder brother or friend). AVOID strict legal jargon. Use simple everyday language.
          
          ${currentLangConfig?.code === 'EN' ? `
            CRITICAL INSTRUCTION: Respond in simple, conversational English.
            RULES:
            1. Use very simple words (Grade 5 level).
            2. Explain laws like you are talking to a neighbor.
            3. Be warm, gentle, and empathetic.
            4. Do not transliterate.
            5. PRONUNCIATION: For acronyms, write them with dots to ensure they are spelled out. Example: Write 'F.I.R.' instead of 'FIR', 'O.T.P.' instead of 'OTP'.
          ` : `
            CRITICAL INSTRUCTION: Respond STRICTLY in ${currentLangConfig?.label} (${currentLangConfig?.native}) using native script.
            
            RULES:
            1. Use very simple, soft-spoken ${currentLangConfig?.label}. (Avoid complex 'Shuddh' or formal bookish words).
            2. Be warm, gentle, and empathetic (like a polite elder brother).
            3. Translate EVERYTHING to ${currentLangConfig?.label}.
            4. If a legal term has no direct translation, transliterate it into ${currentLangConfig?.label} script.
            5. PRONUNCIATION: For acronyms like FIR, PAN, write them phonetically with simple dots (e.g., 'FIR' -> 'एफ.आई.आर.', 'OTP' -> 'ओ.टी.पी.').
            6. The entire JSON response values MUST be in ${currentLangConfig?.label} script.
          `}
          
          Output JSON format: {
            "roadmap": ["Step 1", "Step 2", ...],
            "simpleLaw": "Explanation",
            "rights": "Citizen right",
            "sourceDoc": {
              "title": "Act Name",
              "section": "Section number",
              "date": "2024"
            }
          }`,
          responseMimeType: "application/json"
        }
      });

      let responseText = typeof response.text === 'function' ? response.text() : response.text;

      // Clean markdown formatting if present
      if (responseText) {
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const data = JSON.parse(responseText || '{}') as LegalAnalysis;
      setAnalysis(data);
      // Wait for state update to reflect? React batches.
      setState('RESULT');

      // Auto-speak result in native language
      setTimeout(() => {
        if (data.simpleLaw) speakResult(`${data.simpleLaw}. ${data.rights}`, true);
      }, 800);

    } catch (e) {
      console.error("AI Generation Error:", e);
      alert("Unable to process request. Please check your internet connection or API quota.");
      setState('IDLE');
    } finally {
      setIsResolvingFollowUp(false);
    }
  };

  const SUGGESTIONS = [
    { label: t.topics.fir, icon: ICONS.POLICE, hint: "FIR Help" },
    { label: t.topics.property, icon: ICONS.HOME, hint: "Land Issue" },
    { label: t.topics.fraud, icon: ICONS.MONEY, hint: "Money Lost" },
    { label: t.topics.bail, icon: ICONS.UNLOCK, hint: "Bail Info" },
    { label: t.topics.violence, icon: ICONS.SHIELD, hint: "Safety" }
  ];

  return (
    <div className="h-full w-full flex flex-col no-scrollbar bg-[var(--legal-bg)] transition-colors duration-500">

      {/* Header with Toggle */}
      <header className="p-4 sm:p-6 flex items-center justify-between relative z-10 shrink-0 bg-[var(--legal-bg)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--legal-gold)] rounded-full flex items-center justify-center text-[var(--legal-black)] shadow-lg animate-pulse-slow">
            {ICONS.SHIELD}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[var(--legal-black)] uppercase tracking-tight leading-none">
              {t.portal_citizen}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-[var(--legal-black)]/60 uppercase tracking-widest">{currentLangConfig?.native} Active</span>
            </div>
          </div>

          {/* Emergency & Map Buttons */}
          <div className="flex items-center gap-2 mx-4">
            <button
              onClick={() => setShowEmergency(true)}
              className="p-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
              title="View Live Map"
            >
              <span className="font-black text-xs px-2 flex items-center gap-1">🗺️ {t.btn_map}</span>
            </button>

            <button
              onClick={() => setShowEmergency(true)}
              className="p-2 bg-red-50 text-red-600 rounded-full border border-red-100 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200 transition-all active:scale-95 animate-pulse-slow"
              title={t.emergency.btn_sos}
            >
              <span className="font-black text-xs px-2 flex items-center gap-1">🚨 SOS</span>
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-[var(--legal-white)] p-1 rounded-xl shadow-sm border border-[var(--legal-accent)]">
          <button
            onClick={() => setViewMode('ASSISTANT')}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'ASSISTANT' ? 'bg-[var(--legal-black)] text-[var(--legal-gold)] shadow-md' : 'text-slate-400 hover:text-[var(--legal-black)]'}`}
          >
            Assistant
          </button>
          <button
            onClick={() => setViewMode('ACTIVITY')}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'ACTIVITY' ? 'bg-[var(--legal-black)] text-[var(--legal-gold)] shadow-md' : 'text-slate-400 hover:text-[var(--legal-black)]'}`}
          >
            My Activity
          </button>
        </div>
      </header>

      {viewMode === 'ACTIVITY' ? (
        <div className="flex-1 overflow-hidden">
          <FIRStatus firs={firs} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 sm:px-6 pb-24 scrollbar-hide">

          {state === 'IDLE' && (
            <div className="max-w-5xl mx-auto w-full px-6 py-8 sm:py-16 space-y-12 animate-fade-in">

              {/* Hero Section */}
              <div className="text-center space-y-6 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--legal-gold)]/10 rounded-full blur-3xl -z-10"></div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-[var(--legal-gold)]/20 shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--legal-gold)]">Secure Justice Node Active</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl serif-heading font-medium text-[var(--legal-black)] tracking-tight leading-tight">
                  {t.hero_title}
                </h2>
                <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed text-sm sm:text-lg">
                  {t.hero_subtitle}
                </p>
              </div>

              {/* Main Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Speak Button */}
                <button
                  onClick={() => { setContextData(''); startVoiceCapture(); }}
                  className="group relative flex flex-col items-center justify-center p-10 sm:p-14 bg-[var(--legal-black)] text-[var(--legal-white)] rounded-[2.5rem] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl overflow-hidden hover:shadow-[var(--legal-gold-glow)]"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--legal-white)]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[var(--legal-gold)]/20 transition-all duration-500"></div>
                  <div className="mb-6 scale-125 sm:scale-[2] text-[var(--legal-gold)] group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg">{ICONS.MIC}</div>
                  <span className="text-2xl sm:text-3xl font-serif font-medium tracking-tight">{t.btn_speak}</span>
                  <span className="text-[10px] mt-3 opacity-60 font-bold uppercase tracking-widest border border-[var(--legal-gold)]/30 px-3 py-1 rounded-full">{currentLangConfig?.native}</span>
                </button>

                <div className="flex flex-col gap-4">
                  {/* Scan Button */}
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--legal-white)] border border-[var(--legal-accent)] rounded-[2rem] transition-all hover:border-[var(--legal-gold)]/50 group relative hover:shadow-xl active:scale-[0.98] glass-panel">
                    <label className="cursor-pointer flex flex-col items-center text-center w-full h-full justify-center space-y-3">
                      <div className="scale-125 sm:scale-[1.5] text-slate-300 group-hover:text-[var(--legal-black)] transition-all duration-300">{ICONS.UPLOAD}</div>
                      <span className="text-lg font-bold tracking-tight text-[var(--legal-black)]">{t.btn_scan}</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setContextData('');
                          setFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setFileData({ data: (reader.result as string).split(',')[1], mime: file.type });
                            setState('THINKING');
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>

                  {/* Type Input */}
                  <form onSubmit={(e) => { e.preventDefault(); if (textInput.trim()) { setContextData(''); setTranscript(textInput); setState('THINKING'); } }}
                    className="flex items-center space-x-3 bg-[var(--legal-white)] border border-[var(--legal-accent)] rounded-[1.5rem] p-2 pl-6 shadow-sm focus-within:border-[var(--legal-gold)] focus-within:ring-2 focus-within:ring-[var(--legal-gold)]/10 transition-all glass-panel"
                  >
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={t.placeholder_type}
                      className="flex-1 py-3 text-sm font-medium outline-none bg-transparent text-[var(--legal-black)] placeholder-slate-400"
                    />
                    <button type="submit" className="bg-[var(--legal-black)] text-[var(--legal-gold)] p-3 rounded-2xl hover:bg-[var(--legal-gold)] hover:text-[var(--legal-black)] transition-colors shadow-md">{ICONS.CHECK}</button>
                  </form>
                </div>
              </div>

              {/* Quick Topics */}
              <div className="space-y-6 pt-4 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.quick_topics}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[var(--legal-accent)] via-slate-200 to-[var(--legal-accent)]"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setContextData(''); setTranscript(s.label); setState('THINKING'); }}
                      className="p-5 flex flex-col items-center text-center gap-3 transition-all bg-[var(--legal-white)] border border-[var(--legal-accent)] rounded-2xl hover:border-[var(--legal-gold)] hover:shadow-lg hover:-translate-y-1 group glass-panel"
                    >
                      <div className="p-3 bg-[var(--legal-accent)] rounded-xl group-hover:bg-[var(--legal-gold)] group-hover:text-white transition-all duration-300 text-[var(--legal-black)] shadow-inner">{s.icon}</div>
                      <span className="text-xs font-bold text-[var(--legal-black)]">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(state === 'LISTENING' || state === 'THINKING') && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-fade-in px-6">
              <div className={`p-16 sm:p-24 bg-[var(--legal-black)] rounded-[3rem] shadow-[var(--legal-shadow)] relative overflow-hidden transition-all duration-700 ${state === 'LISTENING' ? 'scale-110 shadow-[var(--legal-gold-glow)]' : 'scale-100'}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--legal-gold)_0%,transparent_70%)] opacity-20 animate-pulse"></div>
                <div className="flex gap-2 items-center h-20 relative z-10">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-2 bg-[var(--legal-gold)] rounded-full animate-neural-pulse" style={{
                      height: '20px',
                      animationDelay: `${i * 0.15}s`,
                      boxShadow: '0 0 15px var(--legal-gold)'
                    }}></div>
                  ))}
                </div>
              </div>

              <div className="text-center space-y-8 max-w-xl w-full">
                <div className="space-y-2">
                  <h3 className="text-3xl sm:text-4xl font-serif italic text-[var(--legal-black)]">
                    {state === 'LISTENING' ? t.label_listening : t.label_thinking}
                    <span className="animate-pulse">{dots}</span>
                  </h3>
                  <p className="text-xs font-bold text-[var(--legal-gold)] uppercase tracking-widest">{currentLangConfig?.native} Interface</p>
                </div>

                <div className="p-8 bg-[var(--legal-white)]/50 backdrop-blur-sm rounded-[2rem] border border-[var(--legal-gold)]/20 shadow-lg">
                  <p className="text-lg sm:text-xl font-medium text-[var(--legal-black)] leading-relaxed font-native min-h-[3rem] flex items-center justify-center">
                    {fileName ? `${t.btn_scan}: ${fileName}` : (interimTranscript || transcript || "Listening...")}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={state === 'LISTENING' ? stopAndProcess : () => { }}
                    className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${state === 'LISTENING' ? 'bg-[var(--legal-gold)] text-[var(--legal-black)] hover:brightness-110 shadow-lg active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                    {t.btn_stop}
                  </button>
                  <button onClick={handleBackToHome} className="px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest border border-slate-300 hover:border-red-400 hover:text-red-500 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {state === 'RESULT' && analysis && (
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 animate-slide-up space-y-8">

              {/* Header Card */}
              <div className="bg-[var(--legal-black)] text-[var(--legal-white)] rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--legal-gold)] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

                <button onClick={handleBackToHome} className="absolute top-6 right-6 p-2 bg-[var(--legal-white)]/10 rounded-full hover:bg-[var(--legal-white)]/20 text-white transition-all text-sm">
                  ✕ Close
                </button>

                <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="bg-[var(--legal-gold)] text-[var(--legal-black)] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Analysis Complete</span>
                    <span className="text-[var(--legal-gold)] text-[10px] font-bold border border-[var(--legal-gold)]/30 px-3 py-1 rounded-full uppercase">{currentLangConfig?.native}</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-[var(--legal-white)] leading-tight font-native">
                    "{fileName ? fileName : (transcript || textInput)}"
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Left Column: Audio & Key Info */}
                <div className="lg:col-span-1 space-y-6">

                  {/* Audio Player Card */}
                  <div className="p-8 bg-[var(--legal-white)] border border-[var(--legal-gold)]/20 rounded-[2rem] shadow-lg flex flex-col items-center text-center gap-4 glass-panel">
                    <button
                      onClick={() => speakResult(`${analysis.simpleLaw}. ${analysis.rights}`, false)}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 text-2xl ${isPlaying ? 'bg-[var(--legal-gold)] text-[var(--legal-black)] ring-4 ring-[var(--legal-gold)]/30 animate-pulse' : 'bg-[var(--legal-black)] text-[var(--legal-gold)] hover:scale-105'}`}
                    >
                      {isPlaying ? 'II' : ICONS.VOLUME}
                    </button>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.label_briefing}</h4>
                      <p className="text-sm font-bold text-[var(--legal-black)] mt-1">{isPlaying ? 'Playing Audio...' : 'Listen to Advice'}</p>
                    </div>
                  </div>

                  {/* Source Card */}
                  <div className="p-6 bg-[var(--legal-accent)]/50 border border-[var(--legal-accent)] rounded-[2rem] hover:border-[var(--legal-black)]/10 transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-[var(--legal-white)] rounded-lg shadow-sm text-slate-400 group-hover:text-[var(--legal-black)]">{ICONS.DOC}</div>
                      <span className="text-[9px] font-black uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full tracking-wide">Verified Source</span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--legal-black)] leading-snug font-native">{analysis.sourceDoc.title}</h4>
                    <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase">Section {analysis.sourceDoc.section}</p>
                  </div>
                </div>

                {/* Right Column: Content */}
                <div className="lg:col-span-2 space-y-8">

                  {/* Insight/Answer */}
                  <div className="p-8 sm:p-10 bg-[var(--legal-white)] rounded-[2.5rem] shadow-xl border-l-[6px] border-[var(--legal-gold)] glass-panel">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                      {ICONS.SCALE} {t.label_insight}
                    </h4>
                    <p className="text-lg sm:text-2xl font-medium text-[var(--legal-black)] leading-relaxed font-native">
                      {analysis.simpleLaw}
                    </p>
                  </div>

                  {/* Roadmap Steps */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">{t.label_roadmap}</h4>
                    <div className="grid gap-3">
                      {analysis.roadmap.map((step, i) => (
                        <div key={i} className="flex gap-4 p-5 bg-[var(--legal-white)] rounded-2xl border border-[var(--legal-accent)] hover:border-[var(--legal-gold)]/50 hover:shadow-md transition-all group items-start">
                          <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-900 text-[var(--legal-gold)] dark:bg-slate-800 dark:border dark:border-[var(--legal-gold)]/30 rounded-full font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                            {i + 1}
                          </span>
                          <p className="text-sm sm:text-base font-medium text-[var(--legal-black)] pt-1 font-native">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Follow Up Input */}
                  <div className="bg-[var(--legal-accent)] p-2 rounded-[1.5rem] flex items-center gap-2 shadow-inner border border-[var(--legal-black)]/5">
                    <button
                      onClick={() => { stopAudio(); startVoiceCapture(); }}
                      className="p-3 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-full hover:scale-105 transition-transform shadow-lg"
                    >
                      {ICONS.MIC}
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (textInput.trim()) {
                          stopAudio();
                          setContextData(`Previous Query: ${lastQuery}. Previous Answer: ${analysis?.simpleLaw}`);
                          setIsResolvingFollowUp(true);
                          generateRoadmap(textInput, true);
                          setTranscript(textInput);
                          setTextInput('');
                        }
                      }}
                      className="flex-1 flex gap-2"
                    >
                      <input
                        type="text"
                        disabled={isResolvingFollowUp}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={isResolvingFollowUp ? "Thinking..." : t.placeholder_followup}
                        className="flex-1 bg-transparent px-3 outline-none text-sm font-medium text-[var(--legal-black)] placeholder-slate-500"
                      />
                      <button type="submit" disabled={isResolvingFollowUp} className="p-3 bg-[var(--legal-white)] text-[var(--legal-black)] rounded-xl hover:shadow-md transition-all disabled:opacity-50">
                        {isResolvingFollowUp ? '...' : ICONS.CHECK}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[var(--legal-accent)]">
                {/* Action Grid */}
                {!showLawyers && !showFIR ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Find Justice / Lawyer Card */}
                    <div className="flex flex-col gap-4 p-6 bg-[var(--legal-accent)]/30 rounded-[2rem] border border-[var(--legal-accent)] hover:border-[var(--legal-gold)]/30 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="scale-150">{ICONS.SCALE}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--legal-gold)]/10 text-[var(--legal-gold)] rounded-xl group-hover:scale-110 transition-transform">
                          {ICONS.USERS}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--legal-black)]">{t.card_aid_title}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{t.card_aid_desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLawyers(true)}
                        className="w-full px-6 py-3 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-[var(--legal-gold-glow)] transition-all active:scale-95 whitespace-nowrap"
                      >
                        {t.btn_aid}
                      </button>
                    </div>

                    {/* Online FIR Card */}
                    <div className="flex flex-col gap-4 p-6 bg-red-50/50 rounded-[2rem] border border-red-100 hover:border-red-200 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500 group-hover:opacity-20 transition-opacity">
                        <div className="scale-150">{ICONS.GAVEL}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                          {ICONS.PENCIL}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--legal-black)]">{t.card_fir_title}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{t.card_fir_desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFIR(true)}
                        className="w-full px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-red-200 transition-all active:scale-95 whitespace-nowrap"
                      >
                        {t.btn_file_fir}
                      </button>
                    </div>


                  </div>
                ) : (
                  // Modal Container
                  <div className="animate-fade-in bg-white border border-[var(--legal-accent)] rounded-[2.5rem] overflow-hidden shadow-xl h-[80vh] sm:h-auto sm:min-h-[600px] relative flex flex-col">
                    <div className="absolute top-4 right-4 z-20">
                      <button
                        onClick={() => { setShowLawyers(false); setShowFIR(false); }}
                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shadow-sm active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {showLawyers && <FindLawyer onBack={() => setShowLawyers(false)} language={language} />}
                      {showFIR && <OnlineFIR onBack={() => setShowFIR(false)} onSubmit={handleFileFIR} language={language} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <style>{`
        @keyframes neural-pulse {
          0%, 100% { height: 10px; opacity: 0.3; }
          50% { height: 40px; opacity: 1; }
        }
        .animate-neural-pulse { animation: neural-pulse 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .font-native { 
          font-family: 'Inter', 'Noto Sans Devanagari', 'Noto Sans Gujarati', 'Noto Sans Bengali', sans-serif; 
        }
      `}</style>

          {/* Emergency Modal */}
          {showEmergency && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-[var(--legal-bg)] rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl space-y-6 relative overflow-hidden transition-colors duration-500">

                {/* Header */}
                <div className="flex justify-between items-center relative z-10">
                  <h3 className="text-xl font-black text-red-600 uppercase tracking-tight">{t.emergency.modal_title}</h3>
                  <button onClick={() => setShowEmergency(false)} className="p-2 bg-[var(--legal-white)] text-[var(--legal-black)] rounded-full hover:bg-slate-200 shadow-sm border border-[var(--legal-border)]">✕</button>
                </div>

                {/* Live Map */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <LiveMap onLocationFound={(lat, lng) => {
                    // Reverse Geocode using OSM Nominatim
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                      .then(res => res.json())
                      .then(data => {
                        const addr = data.address;
                        const shortAddr = `${addr.suburb || addr.neighbourhood || addr.road || ''}, ${addr.city || addr.state_district || ''}`;
                        setUserLocation({ lat, lng, address: shortAddr || "Unknown Location" });
                      })
                      .catch(() => setUserLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
                  }} />
                </div>

                {/* SOS Call Button */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-red-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
                  <button
                    onClick={() => {
                      const locText = userLocation ? `Location: ${userLocation.address}\nCoords: ${userLocation.lat}, ${userLocation.lng}` : "Location not detected yet.";
                      alert(`${t.emergency.locating}\n\n${t.emergency.connecting}\n\n${locText}`);
                      window.open("tel:112");
                    }}
                    className="w-full py-6 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-3xl shadow-xl flex flex-col items-center gap-2 relative z-10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <div className="text-4xl animate-bounce">🚨</div>
                    <span className="text-lg font-black uppercase tracking-widest">{t.emergency.btn_call_police}</span>
                    <span className="text-[10px] font-bold opacity-80 bg-red-800/30 px-3 py-1 rounded-full">
                      {userLocation ? `GPS: ${userLocation.address}` : "Detecting Location..."}
                    </span>
                  </button>
                </div>

                {/* Helplines Grid */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.emergency.helpline_title}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {HELPLINES.map((h, i) => (
                      <a
                        key={i}
                        href={`tel:${h.number}`}
                        className="flex items-center gap-2 p-3 bg-[var(--legal-white)] border border-[var(--legal-border)] rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors group"
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform">{h.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[var(--legal-black)]/60 uppercase leading-none">
                            {/* Use translated name based on ID, fallback to English name */}
                            {t.emergency.helplines?.[h.id as string] || h.name}
                          </span>
                          <span className="text-sm font-black text-[var(--legal-black)]">{h.number}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default SahayakMode;
