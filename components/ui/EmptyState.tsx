import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Trạng thái trống thống nhất: icon tròn + tiêu đề + mô tả */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
      <Icon size={22} aria-hidden />
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
