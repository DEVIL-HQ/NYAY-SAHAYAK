import React, { useState, useEffect } from 'react';
import { ICONS, TRANSLATIONS } from '../constants';
import { LawyerAPI } from '../lawyer-handler';
import { Lawyer, LawyerSpecialization, Language } from '../types';

const FindLawyer: React.FC<{ onBack: () => void; language: Language }> = ({ onBack, language }) => {
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [query, setQuery] = useState('');
    const [selectedSpec, setSelectedSpec] = useState<LawyerSpecialization | ''>('');
    const [loading, setLoading] = useState(true);
    const [connectingId, setConnectingId] = useState<string | null>(null);

    const t = TRANSLATIONS[language].find_lawyer;


    const SPECIALIZATIONS: LawyerSpecialization[] = ['Criminal', 'Civil', 'Family', 'Property', 'Corporate', 'Cyber', 'Bail Rules', 'Domestic Violence', 'Financial Fraud'];

    useEffect(() => {
        fetchLawyers();
    }, [selectedSpec, query]);

    const fetchLawyers = async () => {
        setLoading(true);
        // Debounce search could be added here
        const results = await LawyerAPI.searchLawyers({
            query,
            specialization: selectedSpec as LawyerSpecialization || undefined
        });
        setLawyers(results);
        setLoading(false);
    };

    const handleConnect = async (lawyerId: string) => {
        setConnectingId(lawyerId);
        try {
            await LawyerAPI.connectWithLawyer('current_user', lawyerId, "I would like to consult regarding a legal matter."); // Mock User ID
            alert("Connection Request Sent! The lawyer will review your request.");
        } catch (e) {
            console.error(e);
            alert("Failed to send request.");
        } finally {
            setConnectingId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-[var(--legal-bg)] animate-fade-in no-scrollbar overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between shrink-0 z-10 transition-colors">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden md:block">
                        {ICONS.BACK}
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[var(--legal-black)]">{t.title}</h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">{t.subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shrink-0 shadow-sm z-0 transition-colors">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.search_placeholder}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-[var(--legal-gold)] transition-colors dark:text-slate-100"
                    />
                    <div className="absolute left-3 top-3.5 text-slate-400 scale-75">{ICONS.SEARCH}</div>
                </div>
                <select
                    value={selectedSpec}
                    onChange={(e) => setSelectedSpec(e.target.value as LawyerSpecialization)}
                    className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-[var(--legal-gold)] transition-colors cursor-pointer dark:text-slate-100"
                >
                    <option value="">{t.filter_all}</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-4 opacity-50">
                        <div className="w-8 h-8 border-4 border-[var(--legal-black)] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold uppercase tracking-widest">{t.searching}</p>
                    </div>
                ) : lawyers.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <div className="text-4xl mb-4 grayscale">⚖️</div>
                        <p className="text-sm font-bold uppercase">{t.no_results}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lawyers.map(lawyer => (
                            <div key={lawyer.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-[var(--legal-gold)] transition-all group flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <img src={lawyer.image} alt={lawyer.name} className="w-14 h-14 rounded-2xl bg-slate-100 object-cover border border-slate-200" />
                                        <div>
                                            <h3 className="font-black text-sm text-[var(--legal-black)] leading-tight">{lawyer.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{lawyer.court}</p>
                                        </div>
                                    </div>
                                    {lawyer.isVerified && (
                                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-full" title="Verified">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {lawyer.specialization.map(s => (
                                        <span key={s} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">{s}</span>
                                    ))}
                                </div>

                                <p className="text-xs text-slate-600 line-clamp-2 mb-6 font-medium leading-relaxed italic">
                                    "{lawyer.bio || 'Experienced legal practitioner dedicated to justice.'}"
                                </p>

                                <div className="mt-auto space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-3">
                                        <span className="flex items-center space-x-1">
                                            <span className="text-orange-400">★</span> <span>{lawyer.rating.toFixed(1)}</span>
                                        </span>
                                        <span>{lawyer.experience} Yrs Exp</span>
                                        <span>₹{lawyer.fee}/hr</span>
                                    </div>

                                    <button
                                        onClick={() => handleConnect(lawyer.id)}
                                        disabled={connectingId === lawyer.id || lawyer.availability === 'BUSY'}
                                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lawyer.availability === 'BUSY' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[var(--legal-black)] text-white hover:bg-[var(--legal-gold)] hover:text-black shadow-lg hover:shadow-xl'}`}
                                    >
                                        {connectingId === lawyer.id ? t.btn_requesting : (lawyer.availability === 'BUSY' ? t.btn_busy : t.btn_connect)}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FindLawyer;
