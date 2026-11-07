import React from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'frame' | 'lens';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}

/** frame = gọng (amber), lens = tròng (sky) — dùng thống nhất ở mọi màn hình */
export const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  frame: 'bg-amber-50 text-amber-800 ring-amber-200',
  lens: 'bg-sky-50 text-sky-700 ring-sky-200',
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-400', brand: 'bg-brand-500', success: 'bg-emerald-500', warning: 'bg-amber-500',
  danger: 'bg-red-500', info: 'bg-sky-500', frame: 'bg-amber-500', lens: 'bg-sky-500',
};

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral', className = '', dot }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${badgeToneClasses[tone]} ${className}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[tone]}`} aria-hidden />}
    {children}
  </span>
);
