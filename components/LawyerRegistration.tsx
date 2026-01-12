import React, { useState } from 'react';
import { ICONS, COLORS } from '../constants';
import { LawyerAPI } from '../lawyer-handler';
import { LawyerSpecialization } from '../types';

const LawyerRegistration: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        barCouncilId: '',
        specialization: [] as LawyerSpecialization[],
        experience: 0,
        fee: 0,
        bio: '',
        court: '',
        availability: 'AVAILABLE' as 'AVAILABLE' | 'BUSY'
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [idCard, setIdCard] = useState<File | null>(null);

    const SPECIALIZATIONS: LawyerSpecialization[] = ['Criminal', 'Civil', 'Family', 'Property', 'Corporate', 'Cyber', 'Bail Rules', 'Domestic Violence', 'Financial Fraud'];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (spec: LawyerSpecialization) => {
        setFormData(prev => {
            const specs = prev.specialization.includes(spec)
                ? prev.specialization.filter(s => s !== spec)
                : [...prev.specialization, spec];
            return { ...prev, specialization: specs };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await LawyerAPI.registerLawyer({
                name: formData.name,
                specialization: formData.specialization,
                fee: Number(formData.fee),
                court: formData.court,
                barCouncilId: formData.barCouncilId,
                experience: Number(formData.experience),
                availability: formData.availability,
                bio: formData.bio,
                email: formData.email,
                phone: formData.phone
            }, profileImage || undefined, idCard || undefined);

            setSuccess(true);
            setSuccess(true);
            // Auto redirect removed to show Profile Card as requested
            // setTimeout(() => {
            //     onBack();
            // }, 2000);
        } catch (error) {
            alert("Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
                {/* Advocate Profile Card */}
                <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 flex items-center justify-between w-full max-w-sm shadow-xl relative overflow-hidden group hover:border-[var(--legal-gold)]/30 transition-all">
                    <div className="flex items-center gap-4 relative z-10">
                        {/* Icon Container */}
                        <div className="w-10 h-10 rounded-full bg-transparent border border-gray-600 flex items-center justify-center text-gray-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        {/* Text */}
                        <span className="text-sm font-bold tracking-widest text-[#5c8bc0] uppercase" style={{ textShadow: '0 0 10px rgba(92, 139, 192, 0.3)' }}>
                            Advocate Profile
                        </span>
                    </div>

                    {/* Green Status Dot */}
                    <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
                    </div>
                </div>

                <div className="mt-8 text-center space-y-4">
                    <h2 className="text-2xl font-bold text-white">Registration Successful!</h2>
                    <p className="text-slate-400 text-sm">Welcome to the Nyaay Sahayak Network.</p>
                    <button onClick={onBack} className="px-6 py-2 bg-[var(--legal-gold)] text-black font-bold rounded-full text-xs uppercase hover:bg-yellow-500 transition-colors">
                        Proceed to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto pb-24 animate-slide-up">
            <div className="flex items-center mb-8">
                <button onClick={onBack} className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full mr-4 transition-colors">
                    {ICONS.BACK}
                </button>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">Lawyer Registration</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Join the NYAAYa Sahayak Network</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">

                {/* Basic Info */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-[var(--legal-gold)] mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
                            <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" placeholder="Adv. Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Email</label>
                            <input required name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" placeholder="lawyer@example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Phone</label>
                            <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" placeholder="+91 9876543210" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Practicing Court</label>
                            <input required name="court" value={formData.court} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" placeholder="e.g. Supreme Court, Delhi High Court" />
                        </div>
                    </div>
                </section>

                {/* Professional Details */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-[var(--legal-gold)] mb-4">Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Bar Council ID</label>
                            <input required name="barCouncilId" value={formData.barCouncilId} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" placeholder="BCI/..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Experience (Years)</label>
                            <input required name="experience" type="number" value={formData.experience} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Consultation Fee (₹)</label>
                            <input required name="fee" type="number" value={formData.fee} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Profile Bio</label>
                            <textarea name="bio" value={formData.bio} onChange={handleInputChange} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-[var(--legal-gold)] outline-none transition-all text-black h-[52px] resize-none" placeholder="Brief about your expertise..." />
                        </div>
                    </div>
                </section>

                {/* Specialization */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-[var(--legal-gold)] mb-4">Specialization</h3>
                    <div className="flex flex-wrap gap-3">
                        {SPECIALIZATIONS.map(spec => (
                            <button
                                key={spec}
                                type="button"
                                onClick={() => handleCheckboxChange(spec)}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase border-2 transition-all ${formData.specialization.includes(spec) ? 'bg-[var(--legal-black)] text-white border-[var(--legal-black)]' : 'bg-transparent text-slate-400 border-slate-200 hover:border-slate-400'}`}
                            >
                                {spec}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Documents */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-[var(--legal-gold)] mb-4">Verification Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                            <input type="file" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            <div className="text-slate-400 mb-2">{ICONS.USERS}</div>
                            <p className="text-xs font-bold text-slate-600 uppercase">{profileImage ? profileImage.name : 'Upload Profile Photo'}</p>
                        </div>
                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                            <input type="file" onChange={(e) => setIdCard(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf" />
                            <div className="text-slate-400 mb-2">{ICONS.DOC}</div>
                            <p className="text-xs font-bold text-slate-600 uppercase">{idCard ? idCard.name : 'Upload Bar Council ID'}</p>
                        </div>
                    </div>
                </section>

                {/* Submit */}
                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[var(--legal-black)] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        <span>Complete Registration</span>
                    </button>
                </div>

            </form>
        </div>
    );
};

export default LawyerRegistration;
