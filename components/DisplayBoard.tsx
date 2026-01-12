
import React, { useState, useEffect } from 'react';
import { ICONS, TRANSLATIONS, MOCK_LAWYERS } from '../constants';
import { Language, Lawyer } from '../types';

interface DisplayBoardProps {
  language: Language;
}

const DisplayBoard: React.FC<DisplayBoardProps> = ({ language }) => {
  const t = TRANSLATIONS[language].board;
  const commonT = TRANSLATIONS[language];

  const COMPLEXES = language === 'HI' ?
    ["साकेत कोर्ट, दिल्ली", "जयपुर जिला अदालत", "बॉम्बे हाई कोर्ट", "कलकत्ता सिटी कोर्ट", "मद्रास हाई कोर्ट"] :
    ["Saket Court, Delhi", "Jaipur District Court", "Bombay High Court", "Calcutta City Court", "Madras High Court"];

  const ROOMS = language === 'HI' ?
    ["कोर्ट रूम 4 - जस्टिस शर्मा", "कोर्ट रूम 12 - जस्टिस वर्मा", "कोर्ट रूम 1 - मुख्य न्यायाधीश कार्यालय", "कोर्ट रूम 7 - जस्टिस अय्यर", "कोर्ट रूम 21 - जस्टिस दास"] :
    ["Courtroom 4 - Justice Sharma", "Courtroom 12 - Justice Verma", "Courtroom 1 - Chief Justice Office", "Courtroom 7 - Justice Iyer", "Courtroom 21 - Justice Das"];

  const [complex, setComplex] = useState(COMPLEXES[0]);
  const [room, setRoom] = useState(ROOMS[0]);
  const [currentItem, setCurrentItem] = useState(14);
  const [myItem, setMyItem] = useState<number | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [filteredLawyers, setFilteredLawyers] = useState<Lawyer[]>([]);

  useEffect(() => {
    setIsUpdating(true);
    const timer = setTimeout(() => {
      setCurrentItem(Math.floor(Math.random() * 40) + 5);
      setIsUpdating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [complex, room]);

  useEffect(() => {
    // Filter lawyers based on the selected complex
    // Note: Since COMPLEX list and MOCK_LAWYERS court strings match conceptually
    const currentComplex = complex;
    const matches = MOCK_LAWYERS.filter(l => l.court === currentComplex);
    setFilteredLawyers(matches);
  }, [complex]);

  const waitTime = myItem && myItem > currentItem ? (myItem - currentItem) * 15 : 0;

  const getUrgencyColor = () => {
    if (waitTime === 0) return 'text-slate-300';
    if (waitTime < 45) return 'text-red-500';
    if (waitTime < 90) return 'text-gold';
    return 'text-green-500';
  };

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-y-auto px-4 sm:px-12 pb-24 animate-fade-in no-scrollbar">
      <div className="max-w-6xl mx-auto w-full py-12 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-red-50 px-4 py-1.5 rounded-full mb-4 border border-red-100">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
            <span className="text-[10px] font-bold uppercase text-red-600">{t.feed_status}</span>
          </div>
          <h2 className="text-4xl sm:text-6xl serif-heading font-semibold text-black tracking-tight">{t.title}</h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto text-sm sm:text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="space-y-4">
            <label className="flex items-center space-x-3 text-[10px] font-black uppercase text-slate-400">
              <span>{ICONS.BUILDING}</span>
              <span>{t.complex}</span>
            </label>
            <select
              value={complex}
              onChange={(e) => setComplex(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:border-black transition-all outline-none appearance-none cursor-pointer"
            >
              {COMPLEXES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 text-[10px] font-black uppercase text-slate-400">
              <span>{ICONS.GAVEL}</span>
              <span>{t.room}</span>
            </label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:border-black transition-all outline-none appearance-none cursor-pointer"
            >
              {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Live Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Display Area */}
          <div className="lg:col-span-2 bg-black text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center min-h-[400px]">
            <div className="absolute top-0 right-0 p-10 opacity-10 scale-[4] text-gold">{ICONS.TV}</div>

            <div className="relative z-10 text-center space-y-8 w-full">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gold">{t.hearing}</span>
                <h3 className="text-9xl font-black tracking-tighter transition-all duration-500 font-mono" style={{ opacity: isUpdating ? 0.2 : 1 }}>
                  #{currentItem}
                </h3>
              </div>

              <div className="flex flex-col items-center space-y-6">
                <div className="w-full max-w-md h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gold transition-all duration-1000" style={{ width: `${(currentItem / 60) * 100}%` }}></div>
                </div>
                <p className="text-[10px] font-bold uppercase text-white/40">Daily Docket Progress: {currentItem}/60</p>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-lg border-t border-white/10 pt-8">
                {[currentItem + 1, currentItem + 2, currentItem + 3].map(item => (
                  <div key={item} className="text-center group">
                    <span className="block text-[9px] font-bold text-white/30 uppercase mb-1 group-hover:text-gold transition-colors">{t.on_deck}</span>
                    <span className="text-xl font-bold text-gold">#{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Tracking Panel */}
          <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-xl flex flex-col space-y-10">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">{ICONS.TIMER}</div>
                <h4 className="text-sm font-black uppercase">{t.tracker_title}</h4>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                {t.tracker_desc}
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase text-slate-400 block ml-1">{t.your_item}</label>
              <input
                type="number"
                value={myItem}
                onChange={(e) => setMyItem(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="Ex: 24"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-2xl font-black focus:border-black transition-all outline-none"
              />
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
              {myItem && myItem > currentItem ? (
                <div className="space-y-3 animate-slide-up">
                  <span className="text-[10px] font-black uppercase text-slate-400">{t.wait_time}</span>
                  <div className={`text-6xl font-black tracking-tight ${getUrgencyColor()}`}>
                    {waitTime}<span className="text-xl ml-1 font-bold">min</span>
                  </div>
                </div>
              ) : myItem && myItem <= currentItem ? (
                <div className="text-red-500 space-y-4 animate-pulse">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-xs font-black uppercase tracking-widest">{t.passed}</p>
                  <p className="text-[10px] font-bold text-slate-400 italic">{t.report}</p>
                </div>
              ) : (
                <div className="text-slate-300 space-y-4">
                  <div className="scale-150 mb-2 opacity-20">{ICONS.TIMER}</div>
                  <p className="text-[10px] font-black uppercase">Input Item Number</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Lawyer Marketplace (Rapido-Style Location Based) */}
        <section className="space-y-10 pt-12 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-gold">
                <span className="scale-125">{ICONS.USERS}</span>
                <h3 className="text-[11px] font-black uppercase">{t.marketplace_title}</h3>
              </div>
              <p className="text-xs font-medium text-slate-400">Verified legal counsel currently active at {complex}</p>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-[9px] font-black uppercase text-slate-600">Dynamic Matching Enabled</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
            {filteredLawyers.length > 0 ? filteredLawyers.map(lawyer => (
              <article key={lawyer.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden hover:border-gold hover:shadow-2xl transition-all group flex flex-col relative">
                <div className="absolute top-6 right-6 z-10">
                  <div className="px-3 py-1 bg-white/90 backdrop-blur rounded-full border border-slate-100 shadow-sm flex items-center space-x-2">
                    <span className="text-gold scale-75">{ICONS.STAR}</span>
                    <span className="text-[10px] font-black">{lawyer.rating}</span>
                  </div>
                </div>

                <div className="p-8 space-y-8 flex-1">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-gold transition-colors">
                        <img src={lawyer.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={lawyer.name} />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-white border-4 border-white shadow-lg">
                        <div className="scale-50">{ICONS.CHECK}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold serif-heading tracking-tight text-slate-900">{lawyer.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {lawyer.specialization.slice(0, 2).map(s => (
                          <span key={s} className="text-[8px] font-black uppercase tracking-tighter text-slate-400 border border-slate-100 px-2 py-0.5 rounded-md">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats Rapido-style Grid */}
                  <div className="grid grid-cols-3 gap-4 border-y border-slate-50 py-6">
                    <div className="text-center space-y-1">
                      <span className="block text-[8px] font-black uppercase text-slate-400">{commonT.label_wins}</span>
                      <span className="text-lg font-black text-green-600 serif-heading">{lawyer.wins}</span>
                    </div>
                    <div className="text-center space-y-1 border-x border-slate-50">
                      <span className="block text-[8px] font-black uppercase text-slate-400">{commonT.label_losses}</span>
                      <span className="text-lg font-black text-slate-300 serif-heading">{lawyer.losses}</span>
                    </div>
                    <div className="text-center space-y-1">
                      <span className="block text-[8px] font-black uppercase text-slate-400">{commonT.label_cases}</span>
                      <span className="text-lg font-black text-slate-900 serif-heading">{lawyer.wins + lawyer.losses}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl group-hover:bg-gold/5 transition-colors">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400">{commonT.label_fee}</span>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-[10px] font-bold text-slate-500">₹</span>
                        <span className="text-2xl font-black text-black tracking-tighter serif-heading">{lawyer.fee}</span>
                        <span className="text-[9px] font-bold text-slate-400">/ Session</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-sm text-gold group-hover:bg-black group-hover:text-gold transition-all duration-300">{ICONS.GAVEL}</div>
                  </div>
                </div>

                <button className="w-full py-6 bg-black text-white text-[11px] font-black uppercase hover:bg-gold hover:text-black transition-all active:scale-[0.98]">
                  {commonT.btn_consult}
                </button>
              </article>
            )) : (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="flex justify-center opacity-10">{ICONS.USERS}</div>
                <p className="text-[10px] font-black uppercase text-slate-300">No Counsel Registered at this Node</p>
              </div>
            )}
          </div>
        </section>

        {/* Disclaimer Note */}
        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center space-x-6 hover:bg-white transition-colors">
          <div className="p-4 bg-white rounded-2xl text-gold shadow-sm group-hover:scale-110 transition-transform">{ICONS.DOC}</div>
          <div className="space-y-1">
            <h5 className="text-[10px] font-black uppercase">{t.disclaimer}</h5>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{t.disclaimer_text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayBoard;
