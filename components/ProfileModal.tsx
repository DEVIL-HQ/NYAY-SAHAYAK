import React, { useState, useEffect } from 'react';

import { UserRole } from '../types';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    userRole: UserRole;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onLogout, userRole }) => {
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'PASSWORD'>('DETAILS');
    const [user, setUser] = useState<any>(null);
    const [currentUserKey, setCurrentUserKey] = useState<string | null>(null);

    // Edit State
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Find current user logic (in a real app this would be from context/auth)
            // Here we rely on the specific format or look for the last active one
            // Ideally App should pass the user identifier. 
            // For now, let's try to infer from localStorage 'active_role' doesn't have ID.
            // We need to know WHO lies logged in. 
            // To fix this cleanly, we'll just search for the first user matching the role 
            // OR we'll need App.tsx to store the 'active_user_id' as well.
            // Let's assume for this buildathon scope, we might store 'active_user_key' in localStorage

            const activeKey = localStorage.getItem('active_user_key');
            if (activeKey) {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const foundUser = users.find((u: any) => u.key === activeKey);
                if (foundUser) {
                    setUser(foundUser);
                    setCurrentUserKey(activeKey);
                    setName(foundUser.name || '');
                    // key format is ROLE_IDENTIFIER
                    setMobile(foundUser.key.split('_')[1]);
                }
            }
        }
    }, [isOpen]);

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!name || !mobile) {
            setMessage({ type: 'error', text: 'All fields are required.' });
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: any) => u.key === currentUserKey);

        if (userIndex > -1) {
            const updatedUser = { ...users[userIndex], name: name };
            // Note: Changing mobile (key) is complex because it changes the ID. 
            // For simplicity, we stick to updating Name only, or we re-key if mobile changes.
            // Let's allow Name update only for safety in this iteration, 
            // or if mobile changes, we check for duplicates.

            const oldKey = users[userIndex].key;
            const role = oldKey.split('_')[0];
            const newKey = `${role}_${mobile}`;

            if (newKey !== oldKey) {
                if (users.find((u: any) => u.key === newKey)) {
                    setMessage({ type: 'error', text: 'User with this mobile already exists.' });
                    return;
                }
                updatedUser.key = newKey;
                // Update active session
                localStorage.setItem('active_user_key', newKey);
            }

            users[userIndex] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
            setUser(updatedUser);
            setCurrentUserKey(updatedUser.key);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        }
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!currentPassword || !newPassword) {
            setMessage({ type: 'error', text: 'Please fill all fields.' });
            return;
        }

        if (user && user.password !== currentPassword) {
            setMessage({ type: 'error', text: 'Incorrect current password.' });
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: any) => u.key === currentUserKey);

        if (userIndex > -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));
            setCurrentPassword('');
            setNewPassword('');
            setMessage({ type: 'success', text: 'Password changed successfully.' });
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Transparent Backdrop for closing */}
            <div className="fixed inset-0 z-[90]" onClick={onClose} />

            {/* Dropdown Container - Anchored to parent */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 z-[100] w-[320px] animate-fade-in-up origin-top-right"
            >
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-black/5">

                    {/* Header Section */}
                    <div className="relative p-6 bg-slate-50 border-b border-slate-100">
                        {/* Close Button on Mobile (Optional) or just X */}
                        <div className="absolute top-4 right-4">
                            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500">
                                <span className="font-bold text-lg">✕</span>
                            </button>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black mb-3 shadow-lg ${userRole === 'PROFESSIONAL' ? 'bg-black text-white' : 'bg-[#c5a059] text-white'}`}>
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <h2 className="text-lg font-black uppercase text-slate-800 text-center leading-tight px-4">{user?.name || 'User Profile'}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 bg-slate-200 px-2 py-0.5 rounded-full">{userRole}</p>
                        </div>
                    </div>

                    <div className="flex border-b border-slate-100 bg-white">
                        <button
                            onClick={() => { setActiveTab('DETAILS'); setMessage(null); }}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'DETAILS' ? 'text-black border-b-2 border-[#c5a059]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Edit Details
                        </button>
                        <button
                            onClick={() => { setActiveTab('PASSWORD'); setMessage(null); }}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'PASSWORD' ? 'text-black border-b-2 border-[#c5a059]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Security
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[300px]">
                        {message && (
                            <div className={`mb-6 p-4 rounded-xl text-xs font-bold uppercase tracking-wide text-center ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {message.text}
                            </div>
                        )}

                        {activeTab === 'DETAILS' ? (
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-black transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Mobile / Email (ID)</label>
                                    <input
                                        type="text"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-black transition-all"
                                    />
                                </div>
                                <button type="submit" className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md">
                                    Save Changes
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-black transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-black transition-all"
                                    />
                                </div>
                                <button type="submit" className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md">
                                    Update Password
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                        <button
                            onClick={onLogout}
                            className="w-full py-3 border border-red-200 text-red-500 bg-white hover:bg-red-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

};

export default ProfileModal;