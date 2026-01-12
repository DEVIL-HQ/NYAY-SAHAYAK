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
            // Check if user exists for THIS role
            const db = getUserDB();
            const key = `${activeTab}_${mobile}`;

            if (db[key]) {
                setLoading(false);
                return showNotify(`Already registered as ${activeTab}. Login instead.`, 'error');
            }

            // Store in Temp State & Trigger OTP
            setTempRegData({
                mobile,
                password,
                role: activeTab,
                name: name || "Citizen",
                age: age || ""
            });

            // Generate Random OTP
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
                // Check if they exist in other role to give a helpful hint?
                // (Optional but good UX)
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

            // Password Valid, Trigger OTP
            const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
            setGeneratedOtp(newOtp);
            setOtpTimer(60);

            setLoading(false);
            setShowOtp(true);
            showNotify(`OTP sent securely to ${mobile}`, 'success');

            // Simulate 'System' SMS Delivery
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

        // Simulate Verification
        setTimeout(() => {
            setLoading(false);

            if (otp === generatedOtp) {
                if (isRegistering && tempRegData) {
                    // FINALIZE REGISTRATION
                    saveUserToDB(tempRegData.mobile, tempRegData.role, tempRegData);
                    showNotify("Registration Verified & Successful!", 'success');

                    // Auto Login - use the composite key
                    const userKey = `${tempRegData.role}_${tempRegData.mobile}`;

                    // If Professional, show Lawyer Registration Form instead of direct login
                    if (tempRegData.role === 'PROFESSIONAL') {
                        setTimeout(() => setShowLawyerReg(true), 800);
                    } else {
                        // Citizen: Direct Login
                        setTimeout(() => onLogin(tempRegData.role, userKey), 1000);
                    }

                } else {
                    // FINALIZE LOGIN
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">

            {/* Toast Notification Container */}
            <div className={`absolute top-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${notification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                {notification && (
                    <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-500/90 text-white border-red-400' :
                        notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' :
                            'bg-slate-800/90 text-white border-slate-700'
                        }`}>
                        <span className="text-lg">
                            {notification.type === 'error' ? '⚠️' : notification.type === 'success' ? '✅' : 'ℹ️'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide">{notification.msg}</span>
                    </div>
                )}
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in-up relative z-10 max-h-[85vh] overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="p-8 pb-6 text-center border-b border-slate-100 relative">
                    {/* Back Button for Auth View */}
                    {view === 'AUTH' && !showOtp && (
                        <button
                            onClick={() => { setView('SELECTION'); resetForm(); }}
                            className="absolute left-6 top-8 text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    )}

                    <div className="w-16 h-16 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        {ICONS.SCALE}
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-tight flex items-center justify-center gap-4">
                        <span>NYAAY</span>
                        <span>SAHAYAK</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                        {view === 'SELECTION' ? 'Choose Your Portal' : (activeTab === 'PROFESSIONAL' ? "Legal Professional Access" : "Secure Citizen Access")}
                    </p>
                </div>

                {view === 'SELECTION' ? (
                    // ---------------- VIEW: SELECTION ----------------
                    <div className="p-8 space-y-4">
                        <button
                            onClick={() => { setActiveTab('CITIZEN'); setView('AUTH'); setIsRegistering(false); }}
                            className="w-full bg-slate-50 border-2 border-slate-100 hover:border-[var(--legal-gold)] rounded-2xl p-6 flex flex-col items-center gap-3 group transition-all"
                        >
                            <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-slate-700">
                                {ICONS.USER_VOICE}
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black uppercase text-slate-800">Citizen Portal</h3>
                                <p className="text-[10px] text-slate-400 font-medium">Get Legal Assistance & Info</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setActiveTab('PROFESSIONAL'); setView('AUTH'); setIsRegistering(false); }}
                            className="w-full bg-slate-50 border-2 border-slate-100 hover:border-black rounded-2xl p-6 flex flex-col items-center gap-3 group transition-all"
                        >
                            <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-slate-700">
                                {ICONS.GAVEL}
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black uppercase text-slate-800">Professional Portal</h3>
                                <p className="text-[10px] text-slate-400 font-medium">For Advocates & Legal Experts</p>
                            </div>
                        </button>

                        <div className="mt-4 text-center">
                            <p className="text-[9px] text-slate-400 px-6">Select the appropriate portal to continue to secure login or registration.</p>
                        </div>
                    </div>
                ) : (
                    // ---------------- VIEW: AUTH ----------------
                    // Form Body
                    <div className="p-8 pt-6">
                        {/* OTP Screen (Final Step) */}
                        {showOtp ? (
                            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
                                <div className="text-center mb-2">
                                    <p className="text-sm font-bold text-slate-900">Verify One-Time Password</p>
                                    <p className="text-xs text-slate-400 mt-1">Sent to {mobile}</p>

                                    <div className="mt-2 text-center">
                                        {otpTimer > 0 ? (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${otpTimer > 10 ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500'}`}>
                                                Expires in 00:{otpTimer.toString().padStart(2, '0')}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                className="text-[10px] font-black uppercase text-[var(--legal-gold)] bg-black px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors animate-pulse"
                                            >
                                                Resend Code ↻
                                            </button>
                                        )}
                                    </div>

                                    {isRegistering && <p className="text-[10px] text-amber-600 font-bold mt-2 bg-amber-50 inline-block px-2 py-0.5 rounded">Completing Registration</p>}
                                </div>

                                <div className="flex justify-center">
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-40 text-center text-3xl font-black tracking-widest py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[var(--legal-gold)] transition-all placeholder:text-slate-200 text-slate-900"
                                        placeholder="••••"
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otpTimer === 0}
                                    className="w-full py-4 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <span className="w-4 h-4 border-2 border-[var(--legal-gold)] border-t-transparent rounded-full animate-spin" /> : ICONS.UNLOCK}
                                    {!loading && (otpTimer === 0 ? "OTP Expired" : (isRegistering ? "Verify & Create Account" : "Verify & Login"))}
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowOtp(false)}
                                        className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </form>
                        ) : (
                            // Register / Login Form
                            <form onSubmit={isRegistering ? handleRegisterStep1 : handleLoginStep1} className="space-y-5 animate-fade-in">

                                <div className="text-center mb-4">
                                    <h2 className="text-lg font-bold text-slate-800">{isRegistering ? "Create Account" : "Welcome Back"}</h2>
                                </div>

                                {/* Extra Logic for Registering */}
                                {isRegistering && (
                                    <>
                                        {/* Name */}
                                        {(activeTab === 'PROFESSIONAL' || isRegistering) && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 pl-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Enter full name"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] transition-colors"
                                                    required={activeTab === 'PROFESSIONAL'}
                                                />
                                            </div>
                                        )}

                                        {/* Age (Pro Only) */}
                                        {activeTab === 'PROFESSIONAL' && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 pl-2">Age (Must be 18+)</label>
                                                <input
                                                    type="number"
                                                    value={age}
                                                    onChange={(e) => setAge(e.target.value)}
                                                    placeholder="Enter Age"
                                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none transition-colors ${age && parseInt(age) < 18 ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-[var(--legal-gold)]'}`}
                                                    required
                                                    min="18"
                                                />
                                                {age && parseInt(age) < 18 && (
                                                    <p className="text-[10px] font-bold text-red-500 pl-2 pt-1 animate-pulse">
                                                        ⚠️ Must be 18 or older to register.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Mobile Number (Common) */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 pl-2">Mobile Number</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </div>
                                        <input
                                            type="tel"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="999-999-9999"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 pl-2">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={isRegistering ? "Create Valid Password" : "Enter Password"}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] transition-colors"
                                        required
                                    />
                                </div>

                                {/* Confirm Password (Register Only) */}
                                {isRegistering && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 pl-2">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat Password"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--legal-gold)] transition-colors"
                                            required
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[var(--legal-black)] text-[var(--legal-gold)] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                                >
                                    {loading ? (
                                        <span className="w-4 h-4 border-2 border-[var(--legal-gold)] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        isRegistering ? "Register User" : "Verify & Get OTP"
                                    )}
                                </button>

                                {/* Toggle Mode */}
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsRegistering(!isRegistering)}
                                        className="text-[11px] font-bold text-slate-500 hover:text-[var(--legal-black)] transition-colors underline decoration-dotted underline-offset-4"
                                    >
                                        {isRegistering ? "Already registered? Login here." : "New user? Create an account."}
                                    </button>
                                </div>

                            </form>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {activeTab === 'PROFESSIONAL' ? "Law Students & Advocates Portal" : "Citizen Portal"}
                    </p>
                </div>

            </div>

            {/* Hidden Dev Admin Panel Toggle */}
            <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="fixed bottom-2 right-2 p-2 bg-black text-white text-[10px] font-bold rounded-full opacity-0 hover:opacity-20 transition-opacity z-50 cursor-pointer"
                title="Prototype Data Inspector"
            >
                DEV
            </button>

            {/* Admin Data Inspector Modal */}
            {showAdmin && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800">🛠️ Registered User Database (Local)</h3>
                            <button onClick={() => setShowAdmin(false)} className="px-2 py-1 bg-slate-200 rounded hover:bg-slate-300 text-xs font-bold">Close</button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                            {userList.length === 0 ? (
                                <p className="text-center text-slate-400 text-xs italic">No users registered yet.</p>
                            ) : (
                                userList.map((user: any) => (
                                    <div key={user.key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${user.role === 'PROFESSIONAL' ? 'bg-slate-800 text-[var(--legal-gold)]' : 'bg-green-100 text-green-700'}`}>
                                                {user.role}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">{user.key}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className='bg-slate-50 p-2 rounded-lg border border-slate-100'>
                                                <p className='text-[8px] font-bold text-slate-400 uppercase'>Mobile</p>
                                                <p className='text-xs font-mono font-bold text-slate-700'>{user.mobile}</p>
                                            </div>
                                            <div className='bg-slate-50 p-2 rounded-lg border border-slate-100'>
                                                <p className='text-[8px] font-bold text-slate-400 uppercase'>Password</p>
                                                <p className='text-xs font-mono font-bold text-slate-700'>{user.password}</p>
                                            </div>
                                        </div>
                                        {user.role === 'PROFESSIONAL' && (
                                            <div className='bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1'>
                                                <p className='text-[8px] font-bold text-slate-400 uppercase'>Details</p>
                                                <p className='text-xs text-slate-600'>{user.name} | Age: {user.age}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-2 text-center border-t border-slate-100 bg-slate-50">
                            <p className="text-[9px] text-slate-400">This data is stored in your browser's LocalStorage.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Non-Blocking System Alert */}
            {systemAlert?.show && (
                <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-start justify-center pt-20 animate-fade-in">
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-white/50 transform transition-all animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                💬
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">New Message</h4>
                                <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{systemAlert.message}</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSystemAlert(null)}
                                className="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lawyer Registration Overlay */}
            {showLawyerReg && (
                <div className="fixed inset-0 z-[200] bg-[#0c0c0c] overflow-y-auto animate-fade-in">
                    <LawyerRegistration onBack={() => {
                        // On Complete, finally login
                        const userKey = `PROFESSIONAL_${mobile}`;
                        onLogin('PROFESSIONAL', userKey);
                    }} />
                </div>
            )}
        </div>
    );
};

export default Login;
