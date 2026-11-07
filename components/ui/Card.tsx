import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Tiêu đề thẻ (tùy chọn) — hiển thị theo chuẩn section-title */
  title?: React.ReactNode;
  icon?: LucideIcon;
  /** Nút/hành động bên phải tiêu đề */
  actions?: React.ReactNode;
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md', title, icon: Icon, actions }) => (
  <div className={`clinic-card ${title ? '' : paddingMap[padding]} ${className}`}>
    {title ? (
      <>
        <div className="card-header">
          <h3 className="section-title">{Icon && <Icon size={18} aria-hidden />}{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className={paddingMap[padding]}>{children}</div>
      </>
    ) : children}
  </div>
);
