import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Các nút ở chân modal (căn phải) */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/** Modal chuẩn: nền mờ, đóng bằng Esc / nút X / bấm ra ngoài */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  // Render qua portal vào body để không bị margin của khối cha (space-y-*) đẩy lớp nền mờ xuống
  const overlay = (
    <div
      className="fixed inset-0 z-50 m-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm no-print"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" className={`w-full ${sizeMap[size]} max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl animate-modal-in`}>
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">{icon}</div>}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">{footer}</div>
        )}
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
};
