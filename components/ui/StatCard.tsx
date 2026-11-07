import React from 'react';
import { LucideIcon } from 'lucide-react';

type Accent = 'teal' | 'emerald' | 'sky' | 'amber';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: Accent;
  sub?: string;
}

const accentMap: Record<Accent, string> = {
  teal: 'text-brand-600 bg-brand-50 ring-brand-100',
  emerald: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
  sky: 'text-sky-600 bg-sky-50 ring-sky-100',
  amber: 'text-amber-600 bg-amber-50 ring-amber-100',
};

/** Ô số liệu — cùng chiều cao, icon trái, số lớn */
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accent = 'teal', sub }) => (
  <div className="clinic-card p-5 flex items-start gap-4 h-full">
    <div className={`w-11 h-11 shrink-0 rounded-xl ring-1 ring-inset flex items-center justify-center ${accentMap[accent]}`}>
      <Icon size={22} strokeWidth={2} aria-hidden />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums truncate">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);
