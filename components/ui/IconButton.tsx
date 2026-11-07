import React from 'react';
import { LucideIcon } from 'lucide-react';

type Tone = 'neutral' | 'primary' | 'danger';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Bắt buộc — dùng làm aria-label và tooltip */
  label: string;
  tone?: Tone;
  size?: 'sm' | 'md';
}

const toneClasses: Record<Tone, string> = {
  neutral: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
  primary: 'text-brand-600 hover:text-brand-700 hover:bg-brand-50',
  danger: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
};

/** Nút chỉ có icon (sửa, xóa, in...) — kích thước & màu thống nhất toàn app */
export const IconButton: React.FC<IconButtonProps> = ({ icon: Icon, label, tone = 'neutral', size = 'md', className = '', type = 'button', ...props }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={[
      'inline-flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      size === 'sm' ? 'w-8 h-8' : 'w-9 h-9',
      toneClasses[tone], className,
    ].join(' ')}
    {...props}
  >
    <Icon size={size === 'sm' ? 16 : 18} aria-hidden />
  </button>
);
