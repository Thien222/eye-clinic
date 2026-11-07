import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
}

/** Tab gạch chân — chuyển giữa các phần của cùng một trang */
export function Tabs<T extends string>({ items, value, onChange, className = '', fill }: {
  items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string;
  /** Chia đều chiều rộng (cột hẹp) — không bao giờ hiện thanh cuộn */
  fill?: boolean;
}) {
  return (
    <div role="tablist" className={`tab-list ${fill ? 'is-fill' : ''} ${className}`}>
      {items.map(it => (
        <button key={it.value} type="button" role="tab" aria-selected={value === it.value} className="tab" onClick={() => onChange(it.value)}>
          {it.icon && <it.icon size={16} aria-hidden />}
          {it.label}
          {it.count !== undefined && (
            <span className={`ml-0.5 px-1.5 min-w-[1.25rem] text-center rounded-full text-xs ${value === it.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Segmented control — chọn chế độ / bộ lọc (Khách đã khám / Khách lẻ, Ngày / Tuần / Tháng...) */
export function Segmented<T extends string>({ items, value, onChange, className = '' }: {
  items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={`segmented ${className}`}>
      {items.map(it => (
        <button key={it.value} type="button" aria-pressed={value === it.value} className="segmented-item" onClick={() => onChange(it.value)}>
          {it.icon && <it.icon size={16} aria-hidden />}
          {it.label}
          {it.count !== undefined && <span className="text-xs text-slate-400">({it.count})</span>}
        </button>
      ))}
    </div>
  );
}
