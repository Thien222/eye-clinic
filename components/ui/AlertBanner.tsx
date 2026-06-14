import React from 'react';
import { LucideIcon } from 'lucide-react';

type Tone = 'success' | 'info' | 'warning' | 'danger';

interface AlertBannerProps {
  tone: Tone;
  icon: LucideIcon;
  children: React.ReactNode;
  spinning?: boolean;
}

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ tone, icon: Icon, children, spinning }) => (
  <div className={`mb-4 px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-sm font-medium no-print ${toneClasses[tone]}`}>
    <Icon size={16} className={spinning ? 'animate-spin-slow' : ''} aria-hidden />
    {children}
  </div>
);
