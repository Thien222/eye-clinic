import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

/* =====================================================================
   DatePicker / MonthPicker — thay cho ô ngày/tháng mặc định của trình duyệt
   để lịch cùng ngôn ngữ thiết kế với app. Giá trị giữ nguyên định dạng
   của input gốc: ngày 'YYYY-MM-DD', tháng 'YYYY-MM'.
   ===================================================================== */

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s?: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Popover đặt bằng portal + position: fixed — không bị cắt bởi thẻ cha overflow-hidden */
function usePopover(open: boolean, setOpen: (v: boolean) => void, align: 'left' | 'right', width: number) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelH = panelRef.current?.offsetHeight || 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, vw - width - 8));
    const below = r.bottom + 6;
    const top = below + panelH > vh - 8 && r.top - 6 - panelH > 8 ? r.top - 6 - panelH : below;
    setPos({ top, left });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    const onMove = () => place();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return { triggerRef, panelRef, pos };
}

const triggerCls = (open: boolean, className = '') =>
  `clinic-input inline-flex items-center gap-2 text-left cursor-pointer whitespace-nowrap ${open ? 'border-brand-600 ring-[3px] ring-brand-600/20' : ''} ${className}`;

const navBtn = 'w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const footBtn = 'h-8 px-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const Panel = React.forwardRef<HTMLDivElement, { pos: { top: number; left: number } | null; width: number; children: React.ReactNode; label: string }>(
  ({ pos, width, children, label }, ref) => createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="fixed z-[60] bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-3 animate-modal-in no-print"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
    >
      {children}
    </div>,
    document.body
  )
);

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  /** Cho phép xoá về rỗng */
  clearable?: boolean;
  min?: string;
  max?: string;
  'aria-label'?: string;
}

/** Chọn ngày — value 'YYYY-MM-DD' */
export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, id, placeholder = 'Chọn ngày', className, align = 'left', clearable, min, max, ...rest }) => {
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [view, setView] = useState(() => {
    const d = selected || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const WIDTH = 288;
  const { triggerRef, panelRef, pos } = usePopover(open, setOpen, align as 'left' | 'right', WIDTH);

  useEffect(() => {
    if (open) {
      const d = parseYmd(value) || new Date();
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayStr = toYmd(new Date());
  const minD = parseYmd(min), maxD = parseYmd(max);
  const disabled = (d: Date) => (!!minD && d < minD) || (!!maxD && d > maxD);

  // Lưới 6 tuần, bắt đầu thứ Hai
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));

  const pick = (d: Date) => { onChange(toYmd(d)); setOpen(false); triggerRef.current?.focus(); };
  const display = selected ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()}` : '';

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        className={triggerCls(open, className)}
        onClick={() => setOpen(o => !o)}
      >
        <Calendar size={16} className="text-slate-400 shrink-0" aria-hidden />
        <span className={`tabular-nums ${display ? 'text-slate-900' : 'text-slate-400'}`}>{display || placeholder}</span>
      </button>
      {open && (
        <Panel ref={panelRef} pos={pos} width={WIDTH} label="Chọn ngày">
          <div className="flex items-center justify-between mb-2">
            <button type="button" className={navBtn} aria-label="Tháng trước" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-semibold text-slate-900">Tháng {view.getMonth() + 1}, {view.getFullYear()}</div>
            <button type="button" className={navBtn} aria-label="Tháng sau" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className={`h-8 flex items-center justify-center text-xs font-semibold ${w === 'CN' ? 'text-red-600' : 'text-slate-500'}`}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map(d => {
              const ymd = toYmd(d);
              const inMonth = d.getMonth() === view.getMonth();
              const isSel = ymd === value;
              const isToday = ymd === todayStr;
              const off = disabled(d);
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={off}
                  aria-pressed={isSel}
                  aria-label={`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`}
                  onClick={() => pick(d)}
                  className={[
                    'h-9 w-9 mx-auto inline-flex items-center justify-center rounded-lg text-sm tabular-nums transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    isSel ? 'bg-brand-600 text-white font-semibold hover:bg-brand-700'
                      : isToday ? 'text-brand-700 font-semibold ring-1 ring-inset ring-brand-300 hover:bg-brand-50'
                        : inMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            {clearable ? (
              <button type="button" className={`${footBtn} text-slate-500 hover:bg-slate-100`} onClick={() => { onChange(''); setOpen(false); }}>Xoá</button>
            ) : <span />}
            <button type="button" disabled={disabled(parseYmd(todayStr)!)} className={`${footBtn} text-brand-700 hover:bg-brand-50 disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed`} onClick={() => { const t = parseYmd(todayStr)!; if (!disabled(t)) pick(t); }}>Hôm nay</button>
          </div>
        </Panel>
      )}
    </>
  );
};

interface MonthPickerProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  className?: string;
  align?: 'left' | 'right';
  'aria-label'?: string;
}

/** Chọn tháng — value 'YYYY-MM' */
export const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, id, className, align = 'left', ...rest }) => {
  const [open, setOpen] = useState(false);
  const [sy, sm] = (value || '').split('-').map(Number);
  const [year, setYear] = useState(() => sy || new Date().getFullYear());
  const WIDTH = 264;
  const { triggerRef, panelRef, pos } = usePopover(open, setOpen, align as 'left' | 'right', WIDTH);

  useEffect(() => { if (open) setYear(sy || new Date().getFullYear()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const pick = (y: number, m: number) => { onChange(`${y}-${pad(m)}`); setOpen(false); triggerRef.current?.focus(); };
  const display = sy && sm ? `Tháng ${pad(sm)}/${sy}` : 'Chọn tháng';

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        className={triggerCls(open, className)}
        onClick={() => setOpen(o => !o)}
      >
        <CalendarDays size={16} className="text-slate-400 shrink-0" aria-hidden />
        <span className="tabular-nums text-slate-900">{display}</span>
      </button>
      {open && (
        <Panel ref={panelRef} pos={pos} width={WIDTH} label="Chọn tháng">
          <div className="flex items-center justify-between mb-2">
            <button type="button" className={navBtn} aria-label="Năm trước" onClick={() => setYear(y => y - 1)}><ChevronLeft size={18} /></button>
            <div className="text-sm font-semibold text-slate-900 tabular-nums">Năm {year}</div>
            <button type="button" className={navBtn} aria-label="Năm sau" onClick={() => setYear(y => y + 1)}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const isSel = year === sy && m === sm;
              const isNow = year === now.getFullYear() && m === now.getMonth() + 1;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => pick(year, m)}
                  className={[
                    'h-10 rounded-lg text-sm transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    isSel ? 'bg-brand-600 text-white font-semibold hover:bg-brand-700'
                      : isNow ? 'text-brand-700 font-semibold ring-1 ring-inset ring-brand-300 hover:bg-brand-50'
                        : 'text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  Th {m}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
            <button type="button" className={`${footBtn} text-brand-700 hover:bg-brand-50`} onClick={() => pick(now.getFullYear(), now.getMonth() + 1)}>Tháng này</button>
          </div>
        </Panel>
      )}
    </>
  );
};
