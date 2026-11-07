import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Danh sách số trang rút gọn: 1 … 4 5 6 … 20 */
function pageList(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach(n => set.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach(n => set.add(n));
  const nums = [...set].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

const navCls = 'w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/** Phân trang chuẩn: "Hiển thị 1–15 / 316" + nút trang */
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onChange, className = '' }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const go = (p: number) => onChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-sm text-slate-500 tabular-nums">
        Hiển thị <span className="font-semibold text-slate-700">{from}–{to}</span> / {total}
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Phân trang">
          <button type="button" className={navCls} disabled={page === 1} onClick={() => go(1)} aria-label="Trang đầu" title="Trang đầu"><ChevronsLeft size={16} /></button>
          <button type="button" className={navCls} disabled={page === 1} onClick={() => go(page - 1)} aria-label="Trang trước" title="Trang trước"><ChevronLeft size={16} /></button>
          {pageList(page, totalPages).map((n, i) => n === '…' ? (
            <span key={`gap-${i}`} className="w-8 text-center text-slate-400 select-none">…</span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? 'page' : undefined}
              onClick={() => go(n)}
              className={`min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg text-sm tabular-nums transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${n === page ? 'bg-brand-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {n}
            </button>
          ))}
          <button type="button" className={navCls} disabled={page === totalPages} onClick={() => go(page + 1)} aria-label="Trang sau" title="Trang sau"><ChevronRight size={16} /></button>
          <button type="button" className={navCls} disabled={page === totalPages} onClick={() => go(totalPages)} aria-label="Trang cuối" title="Trang cuối"><ChevronsRight size={16} /></button>
        </nav>
      )}
    </div>
  );
};
