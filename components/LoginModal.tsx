import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm no-print">
            <div role="dialog" aria-modal="true" aria-labelledby="login-modal-title" className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-modal-in">
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                            <Lock size={20} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h3 id="login-modal-title" className="text-lg font-semibold text-slate-900">Quản trị viên</h3>
                            <p className="text-sm text-slate-500">Đăng nhập để truy cập tính năng bảo mật</p>
                        </div>
                    </div>
                    <IconButton icon={X} label="Đóng" onClick={onClose} className="shrink-0" />
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5">
                        <label htmlFor="admin-password" className="clinic-label">Mật khẩu admin</label>
                        <input
                            id="admin-password"
                            type="password"
                            placeholder="Nhập mật khẩu..."
                            className={`clinic-input ${error ? 'is-invalid' : ''}`}
                            aria-invalid={error ? true : undefined}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1.5" role="alert">
                                <AlertCircle size={14} aria-hidden /> {error}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Hủy
                        </Button>
                        <Button type="submit" variant="primary">
                            Đăng nhập
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
