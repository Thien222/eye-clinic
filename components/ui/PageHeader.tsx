import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

/** Tiêu đề trang — mọi trang dùng chung để căn lề, cỡ chữ đồng nhất */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, actions }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6">
    <div className="flex items-center gap-3 min-w-0 flex-[1_1_auto]">
      {Icon && (
        <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 items-center justify-center">
          <Icon size={20} aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:whitespace-nowrap">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
  </div>
);
