import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { Button } from './ui/Button';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const settings = db.getSettings();
        const adminPass = settings?.adminPassword || 'admin123';

        if (password === adminPass) {
            onLoginSuccess();
            setPassword('');
            setError('');
            onClose();
        } else {
            setError('Mật khẩu không đúng!');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-card w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200">
                <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-8 flex flex-col items-center text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/20">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-xl font-bold">Quản trị viên</h2>
                    <p className="text-brand-100 text-sm mt-1">Đăng nhập để truy cập tính năng bảo mật</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mật khẩu admin</label>
                        <input
                            type="password"
                            placeholder="Nhập mật khẩu..."
                            className="clinic-input"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-600 text-sm mt-2 flex items-center gap-1.5">
                                <AlertCircle size={14} /> {error}
                            </p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                        Đăng nhập
                    </Button>
                </form>
            </div>
        </div>
    );
};
