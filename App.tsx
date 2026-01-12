
import React, { useState, useEffect } from 'react';
import { AppMode, Language, UserRole } from './types';
import SahayakMode from './components/SahayakMode';
import ExpertMode from './components/ExpertMode';
import Login from './components/Login';

import { ICONS, LANGUAGES, TRANSLATIONS } from './constants';

type Theme = 'DEFAULT' | 'DARK';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    // SECURITY UPDATE: If we have a role but no user key (legacy session), require re-login to establish secure identity
    if (localStorage.getItem('active_role') && !localStorage.getItem('active_user_key')) {
      localStorage.removeItem('active_role');
      return null;
    }
    return (localStorage.getItem('active_role') as UserRole) || null;
  });
  const [userKey, setUserKey] = useState<string | null>(() => {
    return localStorage.getItem('active_user_key') || null;
  });
  const [mode, setMode] = useState<AppMode>(() => {
    // Default to EXPERT for professionals, SAHAYAK for citizens
    const role = (localStorage.getItem('active_role') as UserRole);
    return role === 'PROFESSIONAL' ? 'EXPERT' : 'SAHAYAK';
  });
  const [lang, setLang] = useState<Language>('EN');
  const [theme, setTheme] = useState<Theme>('DEFAULT');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);


  // Persist User Session
  useEffect(() => {
    if (userRole) {
      localStorage.setItem('active_role', userRole);
    } else {
      localStorage.removeItem('active_role');
      localStorage.removeItem('active_user_key'); // Clean up specific user session
      setUserKey(null);
    }
  }, [userRole]);

  const t = TRANSLATIONS[lang];

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'DEFAULT') {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    } else if (theme === 'DARK') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    }
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'DEFAULT') setTheme('DARK');
    else setTheme('DEFAULT');
  };

  const getThemeIcon = () => {
    if (theme === 'DEFAULT') return ICONS.SCALE; // Gold default
    if (theme === 'DARK') return <span className="text-white text-xs">🌙</span>;
    return ICONS.SCALE;
  };

  if (!userRole) {
    return <Login onLogin={(role, userKey) => {
      setUserRole(role);
      // We need to store the specific user key to know WHO is logged in
      if (userKey) {
        localStorage.setItem('active_user_key', userKey);
        setUserKey(userKey);
      }
    }} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--legal-bg)] text-[var(--legal-black)] selection:bg-[var(--legal-gold)]/30 transaction-colors duration-300">
      {/* Premium Glass Header */}
      <nav className="flex flex-col border-b border-[var(--legal-accent)] z-50 bg-[var(--legal-white)]/80 backdrop-blur-md transition-colors duration-300">
        <div className="relative flex flex-wrap md:flex-nowrap items-center justify-between px-6 sm:px-10 py-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center animate-pulse shadow-xl transition-colors ${theme === 'DARK' ? 'bg-white text-black' : 'bg-black text-[var(--legal-gold)]'}`}>
              {ICONS.SCALE}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight uppercase leading-none">NYAAY Sahayak</h1>
              <span className="text-[7px] sm:text-[8px] font-bold opacity-60 uppercase">Legal Intelligence Unit</span>
            </div>
          </div>



          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2.5 bg-[var(--legal-accent)]/80 text-[var(--legal-black)] rounded-2xl hover:bg-[var(--legal-black)] hover:text-[var(--legal-white)] transition-all shadow-sm flex items-center gap-2"
                title="Switch Language"
              >
                <span>{ICONS.GLOBE}</span>
                <span className="text-[10px] font-black uppercase">{lang}</span>
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-[10] cursor-default" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[20] animate-fade-in-up origin-top-right ring-1 ring-black/5 flex flex-col gap-1">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Select Language</span>
                    </div>
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLang(l.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase rounded-xl transition-colors ${lang === l.code ? 'bg-[var(--legal-black)] text-[var(--legal-gold)]' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <span>{l.label}</span>
                        <span className="text-[9px] font-native opacity-60">{l.native}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refined Theme Toggle (Pill Switch) */}
            <button
              onClick={cycleTheme}
              className={`relative w-14 h-8 rounded-full transition-all duration-500 shadow-inner flex items-center px-1 ${theme === 'DARK' ? 'bg-slate-800' : 'bg-slate-200'}`}
              title="Toggle Day/Night Mode"
            >
              {/* Sliding Knob */}
              <div className={`absolute w-6 h-6 rounded-full shadow-md transform transition-transform duration-500 flex items-center justify-center ${theme === 'DARK' ? 'translate-x-[22px] bg-[var(--legal-black)]' : 'translate-x-0 bg-white'}`}>
                {theme === 'DARK' ? <span className="text-[10px]">🌙</span> : <span className="text-[10px]">☀️</span>}
              </div>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
                className={`p-2 rounded-2xl transition-all shadow-sm ${showLogoutConfirm ? 'bg-red-50 text-red-500' : 'bg-[var(--legal-accent)]/80 text-[var(--legal-black)] hover:bg-red-50 hover:text-red-500'}`}
                title="Logout"
              >
                <div className="scale-75">{ICONS.LOGOUT}</div>
              </button>

              {/* Custom Logout Confirmation Popover */}
              {showLogoutConfirm && (
                <>
                  <div className="fixed inset-0 z-[10] cursor-default" onClick={() => setShowLogoutConfirm(false)} />
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[20] animate-fade-in-up origin-top-right ring-1 ring-black/5">
                    <button
                      onClick={() => {
                        setUserRole(null);
                        setShowLogoutConfirm(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 mb-1 text-[10px] font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                    >
                      <span>Logout</span>
                      <span className="scale-75">{ICONS.LOGOUT}</span>
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="w-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating Mode Selector - Only Show if Professional and NOT listening */}
        {userRole === 'PROFESSIONAL' && !isListening && (
          <div className="flex justify-center pb-4 px-6">
            <div className="flex bg-[var(--legal-accent)] p-1.5 rounded-[1.5rem] w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button
                onClick={() => setMode('SAHAYAK')}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-3 px-6 sm:px-8 py-3 text-[10px] font-black uppercase transition-all rounded-[1.2rem] ${mode === 'SAHAYAK' ? 'bg-[var(--legal-white)] text-[var(--legal-black)] shadow-lg' : 'opacity-50 hover:opacity-100'}`}
              >
                <span>{ICONS.USER_VOICE}</span>
                <span className="whitespace-nowrap">{t.portal_citizen}</span>
              </button>
              <button
                onClick={() => setMode('EXPERT')}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-3 px-6 sm:px-8 py-3 text-[10px] font-black uppercase transition-all rounded-[1.2rem] ${mode === 'EXPERT' ? 'bg-[var(--legal-white)] text-[var(--legal-black)] shadow-lg' : 'opacity-50 hover:opacity-100'}`}
              >
                <span>{ICONS.GAVEL}</span>
                <span className="whitespace-nowrap">{t.portal_expert}</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Container */}
      {/* Main Container */}
      <main className="flex-1 relative overflow-hidden bg-[var(--legal-bg)]">
        <div className="h-full w-full relative">
          <div style={{ display: mode === 'SAHAYAK' ? 'block' : 'none', height: '100%' }}>
            <SahayakMode
              language={lang}
              userKey={userKey}
              onListeningStateChange={setIsListening}
            />
          </div>
          <div style={{ display: mode === 'EXPERT' ? 'block' : 'none', height: '100%' }}>
            <ExpertMode language={lang} />
          </div>
        </div>
      </main>

      {/* Elegant Mini-Footer */}
      <footer className="bg-[var(--legal-white)] border-t border-[var(--legal-accent)] px-10 py-4 hidden sm:flex justify-between items-center text-[9px] opacity-60 font-bold uppercase text-[var(--legal-black)]">
        <div className="flex items-center space-x-4">
          <span className="text-[var(--legal-black)]">GOVERNMENT OF INDIA</span>
          <span className="opacity-20">|</span>
          <span className="bg-[var(--legal-accent)] opacity-80 px-3 py-1 rounded-lg">LIVE_MONITOR_v1</span>
        </div>
        <div className="flex space-x-6">
          <span>Sovereign Encryption Enabled</span>
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
