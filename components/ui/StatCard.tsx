import React from 'react';
import { LucideIcon } from 'lucide-react';

type Accent = 'teal' | 'emerald' | 'sky' | 'amber';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: Accent;
}

const accentMap: Record<Accent, { icon: string; bar: string }> = {
  teal: { icon: 'text-brand-600 bg-brand-50', bar: 'bg-brand-500' },
  emerald: { icon: 'text-emerald-600 bg-emerald-50', bar: 'bg-emerald-500' },
  sky: { icon: 'text-sky-600 bg-sky-50', bar: 'bg-sky-500' },
  amber: { icon: 'text-amber-600 bg-amber-50', bar: 'bg-amber-500' },
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accent = 'teal' }) => {
  const colors = accentMap[accent];
  return (
    <div className="clinic-card p-5 relative overflow-hidden group hover:shadow-card transition-shadow duration-200">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bar} rounded-l-xl`} />
      <div className="flex justify-between items-start pl-2">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colors.icon} transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={22} strokeWidth={2} aria-hidden />
        </div>
      </div>
    </div>
  );
};
