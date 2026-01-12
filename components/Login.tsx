import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import LawyerRegistration from './LawyerRegistration';
import { UserRole } from '../types';

interface LoginProps {
    onLogin: (role: UserRole, userKey?: string) => void;
}

// Simple Mock Database Helper
const getUserDB = () => {
    const db = localStorage.getItem('nyaay_users_db');
    return db ? JSON.parse(db) : {};
};

const saveUserToDB = (mobile: string, role: string, userData: any) => {
    const db = getUserDB();
    const key = `${role}_${mobile}`; // Composite Key
    db[key] = userData;
    localStorage.setItem('nyaay_users_db', JSON.stringify(db));
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [activeTab, setActiveTab] = useState<'CITIZEN' | 'PROFESSIONAL'>('CITIZEN');
    const [view, setView] = useState<'SELECTION' | 'AUTH'>('SELECTION');
    const [isRegistering, setIsRegistering] = useState(false); // Toggle between Login/Register

    // Form States
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');

    // Flow States
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    // OTP Security
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [otpTimer, setOtpTimer] = useState(0);

    // Notification State
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Admin Panel State
    const [showAdmin, setShowAdmin] = useState(false);
    const [showLawyerReg, setShowLawyerReg] = useState(false);

    // Simulated System Alert (Non-blocking)
    const [systemAlert, setSystemAlert] = useState<{ show: boolean, message: string } | null>(null);

    // Temp Data for Registration
    const [tempRegData, setTempRegData] = useState<any>(null);

    // OTP Timer Countdown
    useEffect(() => {
        if (otpTimer > 0) {
            const interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [otpTimer]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ msg, type });
    };

    const resetForm = () => {
        setMobile('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setAge('');
        setOtp('');
        setShowOtp(false);
        setTempRegData(null);
        setOtpTimer(0);
        setGeneratedOtp('');
    };

    const handleRegisterStep1 = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (mobile.length < 10) return showNotify("Valid mobile number required.", 'error');
        if (password.length < 4) return showNotify("Password must be at least 4 characters.", 'error');
        if (password !== confirmPassword) return showNotify("Passwords do not match.", 'error');
        if (activeTab === 'PROFESSIONAL') {
            if (!name) return showNotify("Name is required.", 'error');
            if (!age || parseInt(age) < 18) return showNotify("You must be 18+ to register.", 'error');
        }

        setLoading(true);
        setTimeout(() => {
            const db = getUserDB();
            const key = `${activeTab}_${mobile}`;

            if (db[key]) {
                setLoading(false);
                return showNotify(`Already registered as ${activeTab}. Login instead.`, 'error');
            }

            setTempRegData({
                mobile,
                password,
                role: activeTab,
                name: name || "Citizen",
                age: age || ""
            });

            const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
            setGeneratedOtp(newOtp);
            setOtpTimer(60);

            setLoading(false);
            setShowOtp(true);
            showNotify(`OTP sent securely to ${mobile}`, 'success');

            setTimeout(() => {
                setSystemAlert({
                    show: true,
                    message: `[NYAAY SAHAYAK]\n\nYour One-Time Password is: ${newOtp}`
                });
            }, 800);
        }, 1000);
    };

    const handleLoginStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            const db = getUserDB();
            const key = `${activeTab}_${mobile}`;
            const user = db[key];

            if (!user) {
                setLoading(false);
                const otherRole = activeTab === 'CITIZEN' ? 'PROFESSIONAL' : 'CITIZEN';
                if (db[`${otherRole}_${mobile}`]) {
                    return showNotify(`Found in ${otherRole} Portal. Switch tabs or Register for ${activeTab}.`, 'info');
                }
                return showNotify(`No ${activeTab} account found. Register first.`, 'error');
            }

            if (user.password !== password) {
                setLoading(false);
                return showNotify("Incorrect Password.", 'error');
            }

            const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
            setGeneratedOtp(newOtp);
            setOtpTimer(60);

            setLoading(false);
            setShowOtp(true);
            showNotify(`OTP sent securely to ${mobile}`, 'success');

            setTimeout(() => {
                setSystemAlert({
                    show: true,
                    message: `[NYAAY SAHAYAK]\n\nYour One-Time Password is: ${newOtp}`
                });
            }, 800);
        }, 1000);
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (otpTimer === 0) return showNotify("OTP Expired. Please Resend Code.", 'error');
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
            if (otp === generatedOtp) {
                if (isRegistering && tempRegData) {
                    saveUserToDB(tempRegData.mobile, tempRegData.role, tempRegData);
                    showNotify("Registration Verified & Successful!", 'success');
                    const userKey = `${tempRegData.role}_${tempRegData.mobile}`;
                    if (tempRegData.role === 'PROFESSIONAL') {
                        setTimeout(() => setShowLawyerReg(true), 800);
                    } else {
                        setTimeout(() => onLogin(tempRegData.role, userKey), 1000);
                    }
                } else {
                    const userKey = `${activeTab}_${mobile}`;
                    onLogin(activeTab, userKey);
                }
            } else {
                showNotify("Invalid OTP. Try again.", 'error');
            }
        }, 1000);
    };

    const handleResendOtp = () => {
        const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(newOtp);
        setOtpTimer(60);
        setOtp('');
        showNotify(`OTP Resent to ${mobile}`, 'success');
        setTimeout(() => {
            setSystemAlert({
                show: true,
                message: `[NYAAY SAHAYAK]\n\nYour New OTP is: ${newOtp}`
            });
        }, 800);
    };

    const userDB = getUserDB();
    const userList = Object.keys(userDB).map(key => ({ key, ...userDB[key] }));

    return (
        <div className="min-h-screen bg-[#0f172a] relative overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start md:justify-center p-4 md:p-8 custom-scrollbar">

            {/* IMMERSIVE BACKGROUND (FIXED) */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[var(--legal-gold)]/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[150px]"></div>
                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                {/* Floating Elements (Decorative) */}
                <div className="absolute inset-0 opacity-[0.03]">
                    <div className="absolute top-[15%] left-[10%] text-9xl rotate-[-15deg] animate-float">{ICONS.SCALE}</div>
                    <div className="absolute bottom-[20%] right-[10%] text-9xl rotate-[15deg] animate-float delay-700">{ICONS.GAVEL}</div>
                </div>
            </div>

            {/* Notification layer */}
            <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${notification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                {notification && (
                    <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 backdrop-blur-xl border ${notification.type === 'error' ? 'bg-red-500/80 text-white border-red-400/50' :
                        notification.type === 'success' ? 'bg-emerald-500/80 text-white border-emerald-400/50' :
                            'bg-slate-800/80 text-white border-slate-700/50'
                        }`}>
                        <span className="text-xl">
                            {notification.type === 'error' ? '⚠️' : notification.type === 'success' ? '✅' : 'ℹ️'}
                        </span>
                        <span className="text-sm font-black uppercase tracking-widest">{notification.msg}</span>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-8 md:gap-12 animate-fade-in">

                {/* BRANDING */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl mb-2 hover:scale-105 transition-transform duration-500">
                        <div className="text-4xl text-[var(--legal-gold)] drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            {ICONS.SCALE}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                            NYAAY <span className="text-[var(--legal-gold)]">SAHAYAK</span>
                        </h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mt-3 opacity-60">
                            Advanced AI Legal Intelligence
                        </p>
                    </div>
                </div>

                {view === 'SELECTION' ? (
                    <div className="w-full flex flex-col md:flex-row justify-center gap-6 px-4">
                        {/* Citizen Portal Card */}
                        <button
                            onClick={() => { setActiveTab('CITIZEN'); setView('AUTH'); setIsRegistering(false); }}
                            className="group relative flex-1 max-w-sm mx-auto bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/[0.08] hover:border-[var(--legal-gold)]/30 transition-all duration-500 shadow-2xl overflow-hidden hover:-translate-y-2"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 text-6xl">{ICONS.USER_VOICE}</div>
                            <div className="relative z-10 flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-3xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                                    {ICONS.USER_VOICE}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Citizen Portal</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">AI Legal Assistant, Case Roadmap, e-FIR, and Verified Legal Aid.</p>
                                </div>
                                <div className="px-6 py-2 bg-white/5 rounded-full text-[10px] font-black text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center gap-2">
                                    ENTER PORTAL <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </div>
                            </div>
                        </button>

                        {/* Professional Portal Card */}
                        <button
                            onClick={() => { setActiveTab('PROFESSIONAL'); setView('AUTH'); setIsRegistering(false); }}
                            className="group relative flex-1 max-w-sm mx-auto bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/[0.08] hover:border-blue-400/30 transition-all duration-500 shadow-2xl overflow-hidden hover:-translate-y-2"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity -rotate-12 text-6xl">{ICONS.GAVEL}</div>
                            <div className="relative z-10 flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-3xl text-blue-400 border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                                    {ICONS.GAVEL}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Expert Portal</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Dossier Management, Statutory AI Core, and Petition Drafting Tools.</p>
                                </div>
                                <div className="px-6 py-2 bg-white/5 rounded-full text-[10px] font-black text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all flex items-center gap-2">
                                    RESTRICTED ACCESS <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-md animate-scale-in">
                        <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 flex flex-col">
                            <div className="p-8 pb-6 text-center border-b border-slate-100 relative bg-slate-50/30">
                                {!showOtp && (
                                    <button
                                        onClick={() => { setView('SELECTION'); resetForm(); }}
                                        className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-all p-2.5 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md group"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </button>
                                )}
                                <div className="space-y-1">
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--legal-gold)]">
                                        {activeTab === 'PROFESSIONAL' ? "Expert Portal" : "Citizen Portal"}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Secure Authentication</p>
                                </div>
                            </div>

                            <div className="p-8 flex-1">
                                {showOtp ? (
                                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                                        <div className="text-center space-y-2">
                                            <p className="text-lg font-black text-slate-800 tracking-tight">Verify Secure Code</p>
                                            <p className="text-xs font-medium text-slate-400">Identity check for <span className="text-slate-900 font-bold">{mobile}</span></p>
                                            <div className="pt-2">
                                                {otpTimer > 0 ? (
                                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${otpTimer > 10 ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500'}`}>
                                                        AUTODESTRUCT IN 00:{otpTimer.toString().padStart(2, '0')}
                                                    </span>
                                                ) : (
                                                    <button type="button" onClick={handleResendOtp} className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full">
                                                        Resend Code ↺
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-center py-4">
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    className="w-56 text-center text-5xl font-black tracking-[0.5em] py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-[var(--legal-gold)] focus:ring-8 focus:ring-[var(--legal-gold)]/5 transition-all text-slate-900 shadow-inner"
                                                    placeholder="0000"
                                                    autoFocus
                                                />
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-[var(--legal-gold)]/20 to-transparent rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || otpTimer === 0}
                                            className="w-full py-5 bg-slate-900 text-[var(--legal-gold)] rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-[var(--legal-gold)] border-t-transparent rounded-full animate-spin" /> : ICONS.UNLOCK}
                                            VERIFY IDENTITY
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={isRegistering ? handleRegisterStep1 : handleLoginStep1} className="space-y-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="flex-1 h-px bg-slate-100"></div>
                                            <h3 className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em]">{isRegistering ? "Register Identity" : "Member Login"}</h3>
                                            <div className="flex-1 h-px bg-slate-100"></div>
                                        </div>

                                        {isRegistering && (
                                            <div className="space-y-4 animate-fade-in">
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--legal-gold)] transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Full Identity Name"
                                                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] focus:ring-4 focus:ring-[var(--legal-gold)]/5 transition-all"
                                                        required
                                                    />
                                                </div>
                                                {activeTab === 'PROFESSIONAL' && (
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--legal-gold)] transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={age}
                                                            onChange={(e) => setAge(e.target.value)}
                                                            placeholder="Current Age (18+)"
                                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] focus:ring-4 focus:ring-[var(--legal-gold)]/5 transition-all"
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--legal-gold)] transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </div>
                                            <input
                                                type="tel"
                                                value={mobile}
                                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                placeholder="Mobile Reference"
                                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] focus:ring-4 focus:ring-[var(--legal-gold)]/5 transition-all"
                                                required
                                            />
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--legal-gold)] transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Security Password"
                                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] focus:ring-4 focus:ring-[var(--legal-gold)]/5 transition-all"
                                                required
                                            />
                                        </div>

                                        {isRegistering && (
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--legal-gold)] transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                </div>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Confirm Security Password"
                                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] focus:ring-4 focus:ring-[var(--legal-gold)]/5 transition-all"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-5 bg-slate-900 text-[var(--legal-gold)] rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-2xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-[var(--legal-gold)] border-t-transparent rounded-full animate-spin mx-auto" /> : (isRegistering ? "Register Identity" : "Authorize Access")}
                                        </button>

                                        <div className="text-center pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsRegistering(!isRegistering)}
                                                className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
                                            >
                                                {isRegistering ? "Have Credentials? Sign In" : "Need Access? Request Portal"}
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                            <div className="bg-slate-50/50 p-4 border-t border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    End-To-End Encryption
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Stats Ticker */}
                <div className="w-full max-w-2xl px-4 py-8 pointer-events-none overflow-hidden">
                    <div className="flex animate-marquee whitespace-nowrap gap-12 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] opacity-40">
                        <span className="flex items-center gap-2">🟢 System Online</span>
                        <span className="flex items-center gap-2">⚖️ 12k+ Active Precedents</span>
                        <span className="flex items-center gap-2">👨‍⚖️ 500+ Verified Advocates</span>
                        <span className="flex items-center gap-2">� 1.2k+ Queries Resolved</span>
                        <span className="flex items-center gap-2">⚖️ 12k+ Active Precedents</span>
                        <span className="flex items-center gap-2">👨‍⚖️ 500+ Verified Advocates</span>
                    </div>
                </div>
            </div>

            {/* Admin Identity Inspector Modal */}
            <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="fixed bottom-4 right-4 p-3 bg-white/5 text-white/10 text-[10px] font-black rounded-full hover:bg-white/10 hover:text-white transition-all z-50 opacity-0 hover:opacity-100"
            >
                SYS
            </button>

            {showAdmin && (
                <div className="fixed inset-0 z-[200] bg-[#0c0c0c]/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-12 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-full max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identity Inspector</h3>
                            <button onClick={() => setShowAdmin(false)} className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-4 bg-white custom-scrollbar flex-1">
                            {userList.length === 0 ? (
                                <p className="text-center text-slate-400 py-20 font-bold uppercase tracking-widest text-xs">No Identities Found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {userList.map((user: any) => (
                                        <div key={user.key} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${user.role === 'PROFESSIONAL' ? 'bg-slate-900 text-[var(--legal-gold)]' : 'bg-green-600 text-white'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className='text-[10px] font-black text-slate-300 uppercase mb-1'>Identity Holder</p>
                                                    <p className='text-sm font-black text-slate-800'>{user.name}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className='text-[10px] font-black text-slate-300 uppercase mb-1'>Reference</p>
                                                        <p className='text-xs font-bold text-slate-600'>{user.mobile}</p>
                                                    </div>
                                                    <div>
                                                        <p className='text-[10px] font-black text-slate-300 uppercase mb-1'>Secret</p>
                                                        <p className='text-xs font-bold text-slate-600'>{user.password}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {systemAlert?.show && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 animate-fade-in p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full animate-scale-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-xl text-white">💬</div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Transmission</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-bold bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 whitespace-pre-wrap">{systemAlert.message}</p>
                        <button onClick={() => setSystemAlert(null)} className="w-full py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all">Dismiss Signal</button>
                    </div>
                </div>
            )}

            {showLawyerReg && (
                <div className="fixed inset-0 z-[400] bg-[#0c0c0c] overflow-y-auto animate-fade-in">
                    <LawyerRegistration onBack={() => {
                        const userKey = `PROFESSIONAL_${mobile}`;
                        onLogin('PROFESSIONAL', userKey);
                    }} />
                </div>
            )}
        </div>
    );
};

export default Login;
