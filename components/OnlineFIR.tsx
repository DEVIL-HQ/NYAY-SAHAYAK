import React, { useState, useRef } from 'react';
import { ICONS, TRANSLATIONS } from '../constants';
import { FIR, Language } from '../types';

interface OnlineFIRProps {
    onBack: () => void;
    onSubmit: (fir: FIR) => void;
    language: Language;
}

const OnlineFIR: React.FC<OnlineFIRProps> = ({ onBack, onSubmit, language }) => {
    const [step, setStep] = useState(1);
    const t = TRANSLATIONS[language].fir_form;
    const [formData, setFormData] = useState({
        name: '',
        aadhaar: '',
        phone: '',
        email: '',
        incidentDate: '',
        incidentTime: '',
        location: '',
        category: t.category_theft, // Initial category from translations
        description: '',
        suspectName: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [firId, setFirId] = useState('');
    const [isDeclared, setIsDeclared] = useState(false); // Mandatory Checkbox
    const [files, setFiles] = useState<File[]>([]); // Evidence Files

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
    };

    const handleBackStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = () => {
        if (!isDeclared) return;

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
            const newId = `FIR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            setFirId(newId);

            // Enhanced Randomization
            const stationMap: Record<string, string[]> = {
                'Theft': ["Hauz Khas Police Station", "Malviya Nagar PS", "Saket Court PS", "Mehrauli PS"],
                'Cyber': ["Cyber Crime Cell, New Delhi", "Cyber Cell, South District", "Digital Forensics Unit, Lodhi Road"],
                'Lost': ["Parliament Street PS", "Connaught Place PS", "Tilak Marg PS"],
                'Threat': ["Vasant Vihar PS", "RK Puram PS", "Safdarjung Enclave PS"],
                'Other': ["Central Delhi PS", "Daryaganj PS", "Karol Bagh PS"]
            };

            const officerPool = [
                "SI Rajesh Kumar", "Insp. Vikram Singh", "SI Anita Desai", "ASI Manoj Tiwari", "Insp. Deepa Sharma",
                "SI Amit Chaudhary", "Insp. Priya Menon", "ASI Robert D'Souza", "SI Karthik Reddy", "Insp. Sunita Verma",
                "SI Rahul Khanna", "ASI Pooja Rani", "Insp. Arjun Malik", "SI Meera Kapoor", "ASI Sanjay Gupta"
            ];

            const randomOfficer = officerPool[Math.floor(Math.random() * officerPool.length)];
            const possibleStations = stationMap[formData.category] || ["Central Delhi Police Station"];
            const randomStation = possibleStations[Math.floor(Math.random() * possibleStations.length)];

            // Create Full FIR Object
            const newFIR: FIR = {
                id: newId,
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                status: 'Filed',

                // Incident
                incidentDate: formData.incidentDate,
                incidentTime: formData.incidentTime,
                location: formData.location,
                category: formData.category,
                description: formData.description,
                suspect: formData.suspectName,

                // Complainant
                complainantName: formData.name,
                aadhaar: formData.aadhaar,
                mobile: formData.phone,
                email: formData.email,

                // Officer & Station
                station: randomStation,
                officer: randomOfficer,
                officerContact: {
                    phone: "+91 " + Math.floor(6000000000 + Math.random() * 4000000000).toString(), // Random Indian mobile
                    email: `officer.${randomOfficer.split(' ')[1].toLowerCase()}${Math.floor(10 + Math.random() * 90)}@delhipolice.gov.in`
                },

                // Meta
                evidenceCount: files.length,
                timeline: [
                    { status: "Filed", date: new Date().toLocaleString(), completed: true },
                    { status: "Investigation", date: "Pending", completed: false },
                ]
            };

            onSubmit(newFIR); // Update Parent State
        }, 2000);
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 text-4xl shadow-lg">
                    {ICONS.CHECK}
                </div>
                <h2 className="text-2xl font-black text-[var(--legal-black)] uppercase mb-2">{t.success_title}</h2>
                <p className="text-slate-500 mb-6">{t.success_message}</p>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full max-w-sm mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.fir_number_label}</p>
                    <p className="text-3xl font-black text-[var(--legal-gold)] tracking-wider select-all">{firId}</p>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400">{t.email_sent_message}: {formData.email}</p>
                    </div>
                </div>

                <button
                    onClick={onBack}
                    className="px-8 py-3 bg-[var(--legal-black)] text-[var(--legal-white)] rounded-xl font-bold uppercase tracking-wider hover:shadow-lg transition-transform active:scale-95"
                >
                    {t.btn_dashboard}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50 dark:bg-[var(--legal-bg)]">
            {/* Header */}
            <div className="p-6 border-b border-[var(--legal-accent)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        {ICONS.GAVEL}
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--legal-black)] uppercase leading-none">{t.header_title}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t.header_subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${step >= i ? 'bg-[var(--legal-gold)]' : 'bg-slate-200'}`} />
                    ))}
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">

                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-sm font-black text-[var(--legal-black)] uppercase border-b border-slate-100 pb-2">{t.step1}</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_name} <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_name}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_aadhaar} <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="aadhaar"
                                        value={formData.aadhaar}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_aadhaar}
                                        maxLength={12}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_mobile} <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_mobile}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_email}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_email}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-sm font-black text-[var(--legal-black)] uppercase border-b border-slate-100 pb-2">{t.step2}</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_date} <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        name="incidentDate"
                                        value={formData.incidentDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_time} <span className="text-red-500">*</span></label>
                                    <input
                                        type="time"
                                        name="incidentTime"
                                        value={formData.incidentTime}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_location} <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_location}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_category} <span className="text-red-500">*</span></label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    >
                                        <option value="">{t.select_category}</option>
                                        <optgroup label={t.category_theft_burglary}>
                                            <option value="Mobile Theft">{t.category_mobile_theft}</option>
                                            <option value="Vehicle Theft">{t.category_vehicle_theft}</option>
                                            <option value="Burglary">{t.category_burglary}</option>
                                            <option value="Chain Snatching">{t.category_chain_snatching}</option>
                                        </optgroup>
                                        <optgroup label={t.category_cyber_crimes}>
                                            <option value="Cyber Fraud">{t.category_cyber_fraud}</option>
                                            <option value="Identity Theft">{t.category_identity_theft}</option>
                                            <option value="Hacking">{t.category_hacking}</option>
                                            <option value="Cyber Harassment">{t.category_cyber_harassment}</option>
                                        </optgroup>
                                        <optgroup label={t.category_crimes_against_women}>
                                            <option value="Harassment">{t.category_harassment}</option>
                                            <option value="Stalking">{t.category_stalking}</option>
                                            <option value="Domestic Violence">{t.category_domestic_violence}</option>
                                            <option value="Rape">{t.category_rape}</option>
                                            <option value="Dowry">{t.category_dowry}</option>
                                        </optgroup>
                                        <optgroup label={t.category_lost_items}>
                                            <option value="Lost Document">{t.category_lost_document}</option>
                                            <option value="Lost Property">{t.category_lost_property}</option>
                                        </optgroup>
                                        <optgroup label={t.category_economic_offenses}>
                                            <option value="Cheating">{t.category_cheating}</option>
                                            <option value="Criminal Breach of Trust">{t.category_criminal_breach_of_trust}</option>
                                        </optgroup>
                                        <optgroup label={t.category_other_crimes}>
                                            <option value="Assault">{t.category_assault}</option>
                                            <option value="Kidnapping">{t.category_kidnapping}</option>
                                            <option value="Threat">{t.category_threat}</option>
                                            <option value="Public Nuisance">{t.category_public_nuisance}</option>
                                            <option value="Other">{t.category_other}</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-sm font-black text-[var(--legal-black)] uppercase border-b border-slate-100 pb-2">{t.step3}</h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_desc} <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_desc}
                                        rows={5}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-medium transition-colors resize-none dark:text-slate-100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_suspect}</label>
                                    <input
                                        type="text"
                                        name="suspectName"
                                        value={formData.suspectName}
                                        onChange={handleInputChange}
                                        placeholder={t.placeholder_suspect}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[var(--legal-gold)] focus:outline-none text-sm font-bold transition-colors dark:text-slate-100"
                                    />
                                </div>

                                {/* Evidence Upload */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">{t.label_evidence}</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="evidence-upload"
                                        />
                                        <label
                                            htmlFor="evidence-upload"
                                            className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-[var(--legal-gold)] hover:text-[var(--legal-gold)] cursor-pointer transition-colors"
                                        >
                                            {files.length > 0 ? (
                                                <span className="font-bold text-slate-600">{files.length} {t.files_selected}</span>
                                            ) : (
                                                <>
                                                    {ICONS.UPLOAD}
                                                    <span className="text-xs font-bold uppercase">{t.click_to_upload}</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 pt-4 p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                                    <div className="pt-0.5">
                                        <input
                                            type="checkbox"
                                            id="declaration"
                                            checked={isDeclared}
                                            onChange={(e) => setIsDeclared(e.target.checked)}
                                            className="w-5 h-5 text-[var(--legal-gold)] accent-[var(--legal-gold)] cursor-pointer"
                                        />
                                    </div>
                                    <label htmlFor="declaration" className="text-xs text-slate-600 font-medium cursor-pointer select-none">
                                        {t.declaration_text}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-6 border-t border-[var(--legal-accent)] bg-white dark:bg-slate-900 sticky bottom-0 z-10 transition-colors">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <button
                        onClick={step === 1 ? onBack : handleBackStep}
                        className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl text-xs sm:text-sm font-bold uppercase text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        {step === 1 ? t.btn_cancel : t.btn_back}
                    </button>

                    <button
                        onClick={step === 3 ? handleSubmit : handleNext}
                        disabled={isSubmitting || (step === 3 && !isDeclared) || (step === 1 && (!formData.name || !formData.aadhaar || !formData.phone)) || (step === 2 && (!formData.incidentDate || !formData.incidentTime || !formData.location || !formData.category))}
                        className={`px-8 sm:px-10 py-2.5 sm:py-3 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 ${(isSubmitting || (step === 3 && !isDeclared) || (step === 1 && (!formData.name || !formData.aadhaar || !formData.phone)) || (step === 2 && (!formData.incidentDate || !formData.incidentTime || !formData.location || !formData.category))) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        {isSubmitting ? t.btn_registering : (step === 3 ? t.btn_submit : t.btn_next)}
                        {!isSubmitting && <span>→</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnlineFIR;
