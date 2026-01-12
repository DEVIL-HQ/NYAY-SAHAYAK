import React, { useState } from 'react';
import { ICONS } from '../constants';
import { FIR } from '../types';

interface FIRStatusProps {
    firs: FIR[];
}

const FIRStatus: React.FC<FIRStatusProps> = ({ firs }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Filed': return 'text-blue-500 bg-blue-50 border-blue-200';
            case 'Investigation': return 'text-orange-500 bg-orange-50 border-orange-200';
            case 'Court': return 'text-purple-500 bg-purple-50 border-purple-200';
            case 'Closed': return 'text-green-500 bg-green-50 border-green-200';
            default: return 'text-slate-500 bg-slate-50 border-slate-200';
        }
    };

    const generateFIRText = (fir: FIR) => {
        return `GOVERNMENT OF INDIA - FIRST INFORMATION REPORT (FIR)
--------------------------------------------------
FIR Registration Number: ${fir.id}
Date of Filing: ${fir.timeline[0].date}
Current Status: ${fir.status.toUpperCase()}

1. POLICE STATION DETAILS
   Station: ${fir.station}
   Investigating Officer: ${fir.officer}
   Officer Contact: ${fir.officerContact?.phone || 'N/A'} | ${fir.officerContact?.email || 'N/A'}

2. COMPLAINANT DETAILS
   Name: ${fir.complainantName}
   Mobile: ${fir.mobile}
   Email: ${fir.email}
   Aadhaar: ${fir.aadhaar.replace(/.(?=.{4})/g, 'X')} (Masked for privacy)

3. INCIDENT DETAILS
   Nature of Offense: ${fir.category}
   Date of Incident: ${fir.incidentDate || 'N/A'}
   Time of Incident: ${fir.incidentTime || 'N/A'}
   Location: ${fir.location}
   
   Description:
   ${fir.description}

   Suspect Details: ${fir.suspect || 'Unknown/Not Provided'}

4. EVIDENCE
   Files Attached: ${fir.evidenceCount}

--------------------------------------------------
This is a digitally signed computer-generated document.
Official Seal of ${fir.station}
--------------------------------------------------`;
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50 dark:bg-[var(--legal-bg)] p-4 sm:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-[var(--legal-black)] uppercase tracking-tight">My Activity</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Track your registered complaints</p>
                    </div>
                    {firs.length > 0 && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                            <span className="text-xs font-black text-[var(--legal-gold)] uppercase">{firs.length} Active Cases</span>
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {firs.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
                        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 text-slate-400">
                            {ICONS.FOLDER}
                        </div>
                        <p className="text-sm font-bold text-[var(--legal-black)]">No Registered Complaints</p>
                        <p className="text-xs text-slate-400 mt-1">Filed FIRs will appear here.</p>
                    </div>
                )}

                {/* FIR List */}
                <div className="space-y-4">
                    {firs.map((fir) => (
                        <div key={fir.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                            {/* Card Header (Always Visible) */}
                            <div
                                className="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                onClick={() => setExpandedId(expandedId === fir.id ? null : fir.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${getStatusColor(fir.status).split(' ')[1]} ${getStatusColor(fir.status).split(' ')[0]}`}>
                                        {ICONS.GAVEL}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-[var(--legal-black)] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{fir.id}</span>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(fir.status)}`}>
                                                {fir.status}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-[var(--legal-black)]">{fir.category}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{fir.station} • {fir.date}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Investigating Officer</p>
                                        <p className="text-xs font-bold text-[var(--legal-black)]">{fir.officer}</p>
                                    </div>
                                    <div className={`transform transition-transform duration-300 ${expandedId === fir.id ? 'rotate-180' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Timeline & Details */}
                            {expandedId === fir.id && (
                                <div className="px-6 pb-8 pt-2 animate-fade-in border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">

                                    {/* Detailed Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Complainant Details</p>
                                            <p className="text-sm font-bold text-[var(--legal-black)]">{fir.complainantName}</p>
                                            <p className="text-xs text-slate-500">{fir.mobile} • {fir.email}</p>
                                            <p className="text-xs text-slate-500">Aadhaar: {fir.aadhaar.replace(/.(?=.{4})/g, 'X')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Incident Details</p>
                                            <p className="text-sm font-bold text-[var(--legal-black)]">{fir.incidentDate} at {fir.incidentTime}</p>
                                            <p className="text-xs text-slate-500">{fir.location}</p>
                                            {fir.suspect && <p className="text-xs text-red-500 font-medium">Suspect: {fir.suspect}</p>}
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</p>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 italic leading-relaxed">"{fir.description}"</p>
                                        </div>
                                        {fir.evidenceCount > 0 && (
                                            <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                                                <div className="p-2 bg-[var(--legal-gold)]/10 text-[var(--legal-gold)] rounded-lg">
                                                    {ICONS.DOC}
                                                </div>
                                                <span className="text-xs font-bold text-[var(--legal-black)]">{fir.evidenceCount} Evidence File(s) Attached</span>
                                            </div>
                                        )}
                                    </div>

                                    <h4 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest border-t border-slate-200 pt-6">Investigation Timeline</h4>
                                    <div className="relative pl-4 space-y-8">
                                        {/* Vertical Line */}
                                        <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                                        {fir.timeline.map((event, idx) => (
                                            <div key={idx} className="relative flex items-start gap-4 z-10">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 ${event.completed ? 'border-[var(--legal-gold)] text-[var(--legal-gold)]' : 'border-slate-300 dark:border-slate-600 text-slate-300 dark:text-slate-600'}`}>
                                                    {event.completed && <div className="w-2 h-2 bg-[var(--legal-gold)] rounded-full" />}
                                                </div>
                                                <div className="flex-1 -mt-1.5">
                                                    <p className={`text-sm font-bold ${event.completed ? 'text-[var(--legal-black)]' : 'text-slate-400'}`}>{event.status}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{event.date}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const element = document.createElement("a");
                                                const file = new Blob([generateFIRText(fir)], { type: 'text/plain' });
                                                element.href = URL.createObjectURL(file);
                                                element.download = `${fir.id}_Full_Report.txt`;
                                                document.body.appendChild(element);
                                                element.click();
                                            }}

                                            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase text-[var(--legal-black)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {ICONS.DOC} Download Full Report
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                alert(`Contacting Investigating Officer:\n\nName: ${fir.officer}\nPhone: ${fir.officerContact?.phone}\nEmail: ${fir.officerContact?.email}\n\nStation: ${fir.station}\n\nConnecting you via secure CCTNS line...`);
                                            }}
                                            className="px-4 py-3 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-xl text-[10px] font-bold uppercase hover:shadow-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            {ICONS.USERS} Contact Investigating Officer
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    ))}
                </div>

            </div>
        </div >
    );
};

export default FIRStatus;
