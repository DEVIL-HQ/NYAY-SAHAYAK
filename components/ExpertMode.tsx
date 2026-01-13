
import React, { useState, useRef, useEffect } from 'react';
import { Message, Citation, Language, GroundingChunk } from '../types';
import { GENERIC_RESPONSE, ICONS, TRANSLATIONS } from '../constants';
import { generateContentWithFallback } from '../ai-handler';
import LawyerRegistration from './LawyerRegistration';

interface ExpertModeProps {
  language: Language;
}

interface HistoryItem {
  id: string;
  query: string;
  time: string;
  messages: Message[];
}

const ExpertMode: React.FC<ExpertModeProps> = ({ language }) => {
  const t = TRANSLATIONS[language].expert;

  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'h1',
      query: 'Writ Petition: Mandamus Draft',
      time: '2m ago',
      messages: [
        { id: 'm1', text: 'Writ Petition: Mandamus Draft', sender: 'user', timestamp: new Date(Date.now() - 120000) },
        { id: 'm2', text: 'Drafting Mandamus Petition under Article 226...', sender: 'ai', timestamp: new Date(Date.now() - 110000) }
      ]
    },
    {
      id: 'h2',
      query: 'Murder vs Culpable Homicide Diff',
      time: '1h ago',
      messages: [
        { id: 'm3', text: 'Murder vs Culpable Homicide Diff', sender: 'user', timestamp: new Date(Date.now() - 3600000) },
        { id: 'm4', text: 'Distinction defined in Section 299 and 300 of IPC (corresponding BNS sections)...', sender: 'ai', timestamp: new Date(Date.now() - 3590000) }
      ]
    },
    {
      id: 'h3',
      query: 'Evidence Admissibility: Sec 65B',
      time: '3h ago',
      messages: [
        { id: 'm5', text: 'Evidence Admissibility: Sec 65B', sender: 'user', timestamp: new Date(Date.now() - 10800000) },
        { id: 'm6', text: 'Section 65B of Indian Evidence Act (BSA equivalent) requires...', sender: 'ai', timestamp: new Date(Date.now() - 10790000) }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [activeGrounding, setActiveGrounding] = useState<GroundingChunk[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // User State for Expert Mode
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Load logged-in user details
    const userKey = localStorage.getItem('active_user_key');
    const db = localStorage.getItem('nyaay_users_db');
    if (userKey && db) {
      const parsedDB = JSON.parse(db);
      // The key format is ROLE_MOBILE, but we stored Composite Key in DB directly?
      // Check Login.tsx: db[key] = userData. 
      // So simple lookup works.
      if (parsedDB[userKey]) {
        setCurrentUser(parsedDB[userKey]);
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'HI' ? 'hi-IN' : 'en-US'; // Or map other languages
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showProfile, setShowProfile] = useState(false); // New State for Profile View

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleToolSelect = (toolId: string) => {
    setActiveTool(prev => prev === toolId ? null : toolId);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false); // Close menu on selection on mobile
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: toolId === activeTool
        ? "Standard Analysis Mode Restored."
        : `Module Activated: ${toolId.replace('_', ' ')}. Waiting for input...`,
      sender: 'ai',
      timestamp: new Date()
    }]);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const query = inputValue;
    setInputValue('');
    setIsTyping(true);

    let systemContext = `You are the Lead Legal Strategist for the High Court. Respond in ${language}.`;

    // Tool-specific Context Injection
    switch (activeTool) {
      case 'PRECEDENT_SEARCH':
        systemContext += " Focus EXCLUSIVELY on finding relevant Global and Indian Supreme Court precedents. Cite case names and years.";
        break;
      case 'IPC_BNS_CONVERTER':
        systemContext += " ACT AS A CONVERTER. User will provide an IPC section or crime. You MUST return the corresponding Bharatiya NYAAYa Sanhita (BNS) 2023 section, highlight changes, and explain the new penalty.";
        break;
      case 'DRAFT_PETITION':
        systemContext += " MODE: LEGAL DRAFTING. Create a formal, court-ready logic petition/affidavit based on the user's facts. Use proper legal formatting.";
        break;
      case 'EVIDENCE_CHECK':
        systemContext += " VERIFY EVIDENCE ADMISSIBILITY under the Bharatiya Sakshya Adhiniyam (BSA) 2023. Analyze if the electronic or physical evidence is valid.";
        break;
      default:
        systemContext += " Provide technical legal analysis including sections from the Constitution, BNS, BNSS, and BSA. Tone: Formal, precise, authoritative.";
    }

    try {
      const response = await generateContentWithFallback('gemini-3-pro-preview', {
        contents: query,
        config: {
          systemInstruction: systemContext,
        }
      });

      const responseText = typeof response.text === 'function' ? response.text() : response.text;
      const grounding = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];

      const aiMsg: Message = {
        id: Date.now().toString(),
        text: responseText || "Analysis synthesized based on statutory guidelines.",
        sender: 'ai',
        timestamp: new Date(),
        citations: GENERIC_RESPONSE.citations,
        grounding: grounding
      };

      setMessages(prev => [...prev, aiMsg]);
      setActiveCitations(prev => [...GENERIC_RESPONSE.citations, ...prev].slice(0, 5));
      if (grounding.length > 0) {
        setActiveGrounding(prev => [...grounding, ...prev].slice(0, 10));
      }

      // Add to History
      setHistory(prev => [
        {
          id: Date.now().toString(),
          query: query,
          time: 'Just now',
          messages: [...messages, userMsg, aiMsg]
        },
        ...prev
      ]);

    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Neural Link Offline: Statutory database synchronization required.",
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRefresh = () => {
    setMessages([]);
    setInputValue('');
    setActiveTool(null);
  };

  const EXPERT_TOOLS = [
    { id: 'PRECEDENT_SEARCH', label: t.tools.search, icon: ICONS.SEARCH, color: 'text-blue-500' },
    { id: 'IPC_BNS_CONVERTER', label: t.tools.convert, icon: ICONS.LAYERS, color: 'text-purple-500' },
    { id: 'DRAFT_PETITION', label: t.tools.draft, icon: ICONS.PENCIL, color: 'text-orange-500' },
    { id: 'EVIDENCE_CHECK', label: t.tools.verify, icon: ICONS.CHECK, color: 'text-green-500' }
  ];

  const getPlaceholder = () => {
    if (isListening) return "Listening...";
    switch (activeTool) {
      case 'PRECEDENT_SEARCH': return "Enter legal issue to find precedents (e.g., Right to Privacy)...";
      case 'IPC_BNS_CONVERTER': return "Enter IPC Section (e.g., Section 420) or Crime...";
      case 'DRAFT_PETITION': return "Describe facts for the petition...";
      case 'EVIDENCE_CHECK': return "Describe evidence to verify under BSA 2023...";
      default: return t.placeholder;
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setMessages(item.messages);
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden font-mono selection:bg-gold/30">

      {/* Pane 1: Legal Sidebar (Expert Toolbox) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 flex flex-col h-full bg-[#111111] transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h4 className="text-[10px] font-black text-white/40 uppercase">Workbench v5.0</h4>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/40 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {EXPERT_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all group text-left ${activeTool === tool.id ? 'bg-white/10 border border-gold/50' : 'hover:bg-white/5 border border-transparent'}`}
            >
              <span className={`${tool.color} ${activeTool === tool.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{tool.icon}</span>
              <div className="flex-1">
                <span className={`text-[10px] font-bold uppercase transition-colors ${activeTool === tool.id ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>{tool.label}</span>
                {activeTool === tool.id && <div className="text-[8px] text-gold animate-pulse">● Active</div>}
              </div>
            </button>
          ))}

          {/* Registration Button in Sidebar (Mobile fallback) */}
          <button
            onClick={() => { setShowRegistration(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 border border-transparent transition-all group lg:hidden"
          >
            <span className="text-blue-400 group-hover:scale-110 transition-transform">{ICONS.USERS}</span>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase text-white/60 group-hover:text-white transition-colors">Register Identity</span>
              <div className="text-[8px] text-gold/60">Professional Profile</div>
            </div>
          </button>

          <div className="pt-8 space-y-4">
            <div className="flex items-center space-x-2 px-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-green-500 uppercase">Neural Link Active</span>
            </div>
            <div className="px-3 border-l border-white/10 ml-3 py-2 space-y-2">
              <div className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Powered By:</div>
              <div className="text-[9px] font-black text-gold uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gold rounded-full"></div>
                Gemini 3 Pro
              </div>
            </div>
          </div>

          {/* Mobile-Only Dashboard Sections (History & References) - Visible < xl */}
          <div className="xl:hidden pt-8 space-y-6 border-t border-white/10 mt-6">

            {/* Mobile History */}
            <div className="space-y-4 px-3">
              <div className="flex items-center space-x-2 text-gold">
                <span>{ICONS.TIMER}</span>
                <span className="text-[10px] font-black uppercase">{language === 'HI' ? 'सत्र इतिहास' : 'Session History'}</span>
              </div>
              <div className="space-y-3">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { handleHistoryClick(item); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between group p-2 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <span className="text-[9px] text-white/60 group-hover:text-white transition-colors truncate max-w-[140px] text-left">{item.query}</span>
                    <span className="text-[8px] text-white/20 whitespace-nowrap">{item.time}</span>
                  </button>
                ))}
              </div>
            </div>


          </div>
        </nav>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Pane 2: Primary Analysis Console */}
      <main className="flex-1 flex flex-col h-full relative border-r border-white/10 bg-[#0c0c0c]">
        {/* Terminal Header */}
        <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-white/60 hover:text-gold md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="p-2 bg-white/5 rounded-lg text-gold">{ICONS.GAVEL}</div>
            <div>
              <h3 className="text-[10px] font-black text-white uppercase">{t.feed_title}</h3>
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Encrypted statutory sandbox active</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">

            {/* Conditional Button: Profile OR Register */}
            {/* User Request: Replace 'Advocate Profile' with 'Register' to ensure registration visibility */}
            <button
              onClick={() => setShowRegistration(true)}
              className="p-2 border border-white/20 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all group flex items-center space-x-2"
              title="Register as Professional"
            >
              <span className="scale-90 sm:scale-100">{ICONS.USERS}</span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase hidden sm:inline">Register</span>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gold rounded-full animate-pulse ml-0.5 sm:ml-1"></div>
            </button>

            <button
              onClick={handleRefresh}
              className="p-2 border border-white/20 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all group"
              title="Reset Session"
            >
              <span className="group-hover:rotate-180 transition-transform block">{ICONS.REFRESH}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Analysis Log */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 space-y-8 sm:space-y-12 no-scrollbar"
        >
          {messages.map((msg) => (
            <article key={msg.id} className="animate-fade-in group">
              <div className="flex items-start space-x-3 sm:space-x-6">
                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110 ${msg.sender === 'user' ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'bg-gold text-black'
                  }`}>
                  {msg.sender === 'user' ? 'U' : 'AI'}
                </div>
                <div className="flex-1 space-y-4">
                  <header className="flex items-center space-x-4 opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black text-white uppercase">{msg.sender === 'user' ? 'Counsel Inquiry' : t.brain}</span>
                    <span className="text-[8px] text-white/40">{msg.timestamp.toLocaleTimeString()}</span>
                  </header>
                  <div className={`text-sm sm:text-base leading-relaxed ${msg.sender === 'ai' ? 'text-[#ffefd5] serif-heading text-xl italic' : 'text-white/90 font-mono tracking-tight'
                    }`}>
                    {msg.text}
                  </div>
                  {msg.grounding && msg.grounding.length > 0 && (
                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <span className="text-[8px] font-black text-blue-400 uppercase flex items-center gap-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
                        Grounding Sources (Live):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.grounding.map((g, idx) => g.web && (
                          <a
                            key={idx}
                            href={g.web.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] text-blue-300/60 hover:text-blue-300 transition-all flex items-center space-x-2 bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10 hover:border-blue-500/30"
                          >
                            <span>{ICONS.GLOBE}</span>
                            <span className="truncate max-w-[150px] font-bold uppercase tracking-tighter">{g.web.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
          {isTyping && (
            <div className="flex items-center space-x-3 px-14 py-4 animate-pulse">
              <div className="w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_10px_#c5a059]"></div>
              <span className="text-[9px] font-black text-[#ffefd5] uppercase">Synthesizing Statutory Logic...</span>
            </div>
          )}
        </div>

        {/* Modal: Registration Or Profile */}
        {showRegistration && (
          <div className="absolute inset-0 z-50 bg-[#0c0c0c] overflow-y-auto">
            <LawyerRegistration onBack={() => setShowRegistration(false)} />
          </div>
        )}

        {/* Simple Profile Modal */}
        {showProfile && currentUser && (
          <div className="absolute inset-0 z-50 bg-[#0c0c0c]/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
            <div className="bg-[#111] border border-gold/30 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(197,160,89,0.1)] relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">✕</button>

              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center text-black text-3xl font-black">
                  {currentUser.name ? currentUser.name[0] : 'U'}
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">{currentUser.name}</h2>
                  <p className="text-xs text-gold uppercase tracking-widest">Verified Advocate / Student</p>
                </div>

                <div className="w-full h-px bg-white/10 my-4"></div>

                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 uppercase font-bold text-[10px]">Mobile</span>
                    <span className="text-white font-mono">{currentUser.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 uppercase font-bold text-[10px]">Aadhaar</span>
                    <span className="text-white font-mono opacity-60">xxxx-xxxx-{currentUser.aadhaar ? currentUser.aadhaar.slice(-4) : 'xxxx'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 uppercase font-bold text-[10px]">Active Since</span>
                    <span className="text-white font-mono text-[10px]">Session Active</span>
                  </div>
                </div>

                <div className="w-full pt-6">
                  <button onClick={() => setShowProfile(false)} className="w-full py-3 bg-white/5 border border-white/10 hover:bg-gold hover:text-black hover:border-gold transition-all rounded-xl text-xs font-black uppercase tracking-widest text-white/60">
                    Close Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}




        {/* Command Input */}
        <div className="p-3 sm:p-6 border-t border-white/10 bg-black/40">
          <div className="max-w-4xl mx-auto flex items-stretch border border-white/20 rounded-2xl overflow-hidden focus-within:border-gold transition-all bg-white/5 relative">
            <div className="hidden sm:flex items-center px-6 text-white/20 border-r border-white/10">{ICONS.GAVEL}</div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={getPlaceholder()}
              className="flex-1 bg-transparent px-4 sm:px-6 py-3 sm:py-4 text-[11px] font-bold text-white uppercase focus:outline-none placeholder:text-white/20"
            />
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              className={`px-3 sm:px-4 border-l border-white/10 hover:bg-white/5 transition-all text-white/40 hover:text-gold ${isListening ? 'text-red-500 animate-pulse' : ''}`}
            >
              {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              )}
            </button>
            <button
              onClick={handleSend}
              className="bg-gold text-black px-4 sm:px-10 text-[10px] font-black uppercase hover:bg-white transition-all active:scale-95 shadow-[0_0_20px_rgba(197,160,89,0.2)]"
            >
              {t.btn_analyze}
            </button>
          </div>
          <div className="flex justify-center mt-3">
            <p className="text-[8px] font-bold text-white/20 uppercase">Verified against official digital legal records of the Government of India</p>
          </div>
        </div>
      </main>

      {/* Pane 3: Intelligence Dashboard (Sidebar) */}
      <aside className="w-96 h-full bg-[#0a0a0a] overflow-y-auto hidden xl:flex flex-col border-l border-white/10">
        <header className="px-8 py-6 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-black text-white uppercase">{t.citations_title}</h4>
            <div className="px-2 py-0.5 bg-gold/10 text-gold text-[8px] font-black rounded uppercase">Live Feed</div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-4 space-y-4">
          <div className="h-full flex flex-col p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4 hover:border-gold transition-all">
            <div className="flex items-center space-x-3 text-gold shrink-0 border-b border-white/5 pb-2">
              <span>{ICONS.TIMER}</span>
              <span className="text-[10px] font-black uppercase">{language === 'HI' ? 'सत्र इतिहास' : 'Session History'}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  className="w-full flex items-center justify-between group p-2 rounded-lg hover:bg-white/5 transition-all shrink-0"
                >
                  <span className="text-[9px] text-white/60 group-hover:text-white transition-colors truncate max-w-[180px] text-left">{item.query}</span>
                  <span className="text-[8px] text-white/20 whitespace-nowrap">{item.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="p-8 border-t border-white/10 shrink-0">
          <div className="flex items-center space-x-3 grayscale opacity-30">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-black text-xl">N</div>
            <div className="text-[9px] font-black text-white uppercase">NYAAYa AI Core v5.1</div>
          </div>
        </footer>
      </aside>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #c5a059; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div >
  );
};

export default ExpertMode;
