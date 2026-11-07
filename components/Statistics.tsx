import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { db } from '../services/db';
import { getLocalDateString } from '../services/utils';
import { Invoice, InventoryItem, Patient } from '../types';
import {
    DollarSign, ShoppingCart, Calendar, ArrowUpRight, ArrowDownRight, Printer, FileSpreadsheet, Glasses, Eye,
    Package, BarChart3, ChevronDown, ChevronLeft, ChevronRight, PieChart, ClipboardList, Table2,
} from 'lucide-react';
import { exportStatisticsExcel, exportFramesExcel, exportLensesExcel } from '../services/excelExport';
import { invoiceRevenueSplit } from '../services/invoiceUtils';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { Segmented } from './ui/Tabs';
import { DatePicker, MonthPicker } from './ui/DatePicker';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';

type PeriodType = 'day' | 'week' | 'month' | 'range';

/** 'YYYY-MM-DD' -> Date 00:00 giờ địa phương */
const parseLocalDate = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmt = (d: Date) => d.toLocaleDateString('vi-VN');
/** Chỉ để hiển thị trên màn hình — cùng định dạng dd/mm/yyyy với ô chọn ngày */
const fmt2 = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const pad = (n: number) => String(n).padStart(2, '0');

interface PeriodRange {
    start: Date; // inclusive
    end: Date; // exclusive
    prevStart: Date;
    prevEnd: Date;
    label: string;
    tag: string; // dùng cho tên file
}

/* ===== Màu biểu đồ (đã kiểm tra tương phản) ===== */
const FRAME_COLOR = '#d97706'; // amber-600 — Gọng
const LENS_COLOR = '#0284c7'; // sky-600 — Tròng
const GRID_COLOR = '#e2e8f0'; // slate-200
const AXIS_TEXT = '#64748b'; // slate-500
const HOVER_BAND = '#f1f5f9'; // slate-100
const OTHER_COLOR = '#cbd5e1'; // slate-300 — Khác/điều chỉnh

const money = (n: number) => `${n.toLocaleString('vi-VN')} đ`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const pctText = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

/** Số rút gọn cho trục: 0, 500K, 1Tr, 1,5Tr, 2 Tỷ */
const compact = (n: number) => {
    const t = (v: number) => (Math.round(v * 10) / 10).toLocaleString('vi-VN');
    if (n === 0) return '0';
    if (n >= 1e9) return `${t(n / 1e9)} Tỷ`;
    if (n >= 1e6) return `${t(n / 1e6)}Tr`;
    if (n >= 1e3) return `${t(n / 1e3)}K`;
    return String(n);
};

/** Bước chia trục "tròn" */
const niceStep = (max: number, count = 4) => {
    if (max <= 0) return 1;
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const f = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return f * mag;
};

/** Cột bo 4px đầu trên, vuông ở đáy */
const topRoundedPath = (x: number, y: number, w: number, h: number, radius = 4) => {
    const r = Math.max(0, Math.min(radius, w / 2, h));
    return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
};

interface Bucket {
    key: string;
    label: string; // nhãn trục X
    full: string; // nhãn đầy đủ trong tooltip
    frame: number;
    lens: number;
    total: number;
    count: number;
}

/* =====================================================================
   Biểu đồ cột chồng Gọng (dưới) + Tròng (trên) — SVG tự vẽ
   ===================================================================== */
const RevenueChart: React.FC<{ buckets: Bucket[]; ariaLabel: string }> = ({ buckets, ariaLabel }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(264);
    const [active, setActive] = useState<number | null>(null);

    useLayoutEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        setWidth(el.clientWidth);
        if (el.clientHeight) setHeight(el.clientHeight);
        const ro = new ResizeObserver(entries => {
            const r = entries[0]?.contentRect;
            if (r?.width) setWidth(Math.floor(r.width));
            if (r?.height) setHeight(Math.floor(r.height));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Chiều cao lấy theo khung (khung tự giãn theo thẻ, tối thiểu 264px)
    const HEIGHT = Math.max(264, height);
    const M = { top: 12, right: 8, bottom: 28, left: 52 };
    const plotW = Math.max(0, width - M.left - M.right);
    const plotH = HEIGHT - M.top - M.bottom;
    const n = buckets.length;

    const maxVal = Math.max(0, ...buckets.map(b => b.frame + b.lens));
    const step = niceStep(maxVal);
    const yMax = Math.max(step, Math.ceil(maxVal / step) * step);
    const ticks: number[] = [];
    for (let v = 0; v <= yMax + step / 2; v += step) ticks.push(v);
    const y = (v: number) => M.top + plotH - (v / yMax) * plotH;

    const band = n > 0 ? plotW / n : 0;
    const barW = Math.max(2, Math.min(24, band * 0.64));
    const labelEvery = Math.max(1, Math.ceil((n * 44) / Math.max(1, plotW)));

    const act = active !== null && active < n ? buckets[active] : null;
    const tipLeft = act !== null && active !== null ? M.left + band * active + band / 2 : 0;
    const tipOnLeft = tipLeft > width - 256;

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (n === 0) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); setActive(a => (a === null ? 0 : Math.min(n - 1, a + 1))); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); setActive(a => (a === null ? n - 1 : Math.max(0, a - 1))); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
        else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); }
        else if (e.key === 'Escape') setActive(null);
    };

    return (
        <div ref={wrapRef} className="relative w-full flex-1 min-h-[264px]">
            {width > 0 && (
                <svg
                    style={{ fontFamily: 'inherit', position: 'absolute', inset: 0 }}
                    width={width}
                    height={HEIGHT}
                    role="group"
                    aria-label={`${ariaLabel}. Dùng phím mũi tên trái/phải để xem từng cột.`}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onFocus={() => setActive(a => (a === null ? Math.max(0, buckets.findIndex(b => b.total > 0)) : a))}
                    onBlur={() => setActive(null)}
                    onMouseLeave={() => setActive(null)}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                    {/* Lưới + trục Y */}
                    {ticks.map(t => {
                        const ty = Math.round(y(t)) + 0.5;
                        return (
                            <g key={t}>
                                <line x1={M.left} x2={M.left + plotW} y1={ty} y2={ty} stroke={GRID_COLOR} strokeWidth={1} shapeRendering="crispEdges" />
                                <text x={M.left - 10} y={ty} dy="0.32em" textAnchor="end" fontSize={12} fill={AXIS_TEXT} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {compact(t)}
                                </text>
                            </g>
                        );
                    })}

                    {buckets.map((b, i) => {
                        const bx = M.left + band * i;
                        const x = bx + (band - barW) / 2;
                        const base = y(0);
                        const fTop = y(b.frame);
                        const lTop = y(b.frame + b.lens);
                        const hasF = b.frame > 0;
                        const hasL = b.lens > 0;
                        const fH = hasF ? Math.max(1, base - fTop) : 0;
                        const lBottom = hasF ? base - fH - 2 : base;
                        const lH = hasL ? Math.max(1, lBottom - lTop) : 0;
                        // Ngày chỉ có doanh thu "Khác" (không gọng/tròng): vạch nhỏ để không trông như trống
                        const onlyOther = !hasF && !hasL && b.total > 0;
                        return (
                            <g key={b.key}>
                                {active === i && <rect x={bx} y={M.top} width={band} height={plotH} fill={HOVER_BAND} />}
                                {onlyOther && <rect x={x} y={base - 3} width={barW} height={3} rx={1} fill={OTHER_COLOR} />}
                                {hasF && (hasL
                                    ? <rect x={x} y={base - fH} width={barW} height={fH} fill={FRAME_COLOR} />
                                    : <path d={topRoundedPath(x, base - fH, barW, fH)} fill={FRAME_COLOR} />)}
                                {hasL && <path d={topRoundedPath(x, lBottom - lH, barW, lH)} fill={LENS_COLOR} />}
                                {i % labelEvery === 0 && (
                                    <text x={bx + band / 2} y={M.top + plotH + 18} textAnchor="middle" fontSize={12} fill={AXIS_TEXT} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {b.label}
                                    </text>
                                )}
                                {/* Vùng rê chuột = cả dải cột */}
                                <rect
                                    x={bx}
                                    y={M.top}
                                    width={band}
                                    height={plotH}
                                    fill="transparent"
                                    onMouseEnter={() => setActive(i)}
                                    onMouseMove={() => setActive(i)}
                                />
                            </g>
                        );
                    })}
                    {/* Đường đáy */}
                    <line x1={M.left} x2={M.left + plotW} y1={Math.round(y(0)) + 0.5} y2={Math.round(y(0)) + 0.5} stroke="#cbd5e1" strokeWidth={1} shapeRendering="crispEdges" pointerEvents="none" />
                </svg>
            )}

            {act && (
                <div
                    className="absolute z-10 pointer-events-none bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.14)] px-3 py-2.5 w-60"
                    style={{ top: 4, left: tipOnLeft ? tipLeft - 12 - 240 : tipLeft + 12 }}
                    role="status"
                >
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">{act.full}</div>
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-slate-600"><span className="w-3 h-0.5 rounded-full" style={{ background: FRAME_COLOR }} aria-hidden />Gọng</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{money(act.frame)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-slate-600"><span className="w-3 h-0.5 rounded-full" style={{ background: LENS_COLOR }} aria-hidden />Tròng</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{money(act.lens)}</span>
                        </div>
                        {act.total - act.frame - act.lens !== 0 && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-slate-600"><span className="w-3 h-0.5 rounded-full" style={{ background: OTHER_COLOR }} aria-hidden />Khác / điều chỉnh</span>
                                <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                    {act.total - act.frame - act.lens > 0 ? '+' : '−'}{money(Math.abs(act.total - act.frame - act.lens))}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-slate-100">
                            <span className="text-slate-600">Tổng thu</span>
                            <span className="font-bold text-slate-900 tabular-nums">{money(act.total)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">Số hóa đơn</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{act.count}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* =====================================================================
   Nút "Xuất Excel" + menu thả xuống
   ===================================================================== */
const ExportMenu: React.FC<{ onFrames: () => void; onLenses: () => void; onSummary: () => void }> = ({ onFrames, onLenses, onSummary }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const menuItems = (): HTMLButtonElement[] => {
        const list = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        return list ? Array.from(list) : [];
    };

    // Mở menu -> đưa focus vào mục đầu tiên
    useEffect(() => {
        if (open) menuItems()[0]?.focus();
    }, [open]);

    const onMenuKeyDown = (e: React.KeyboardEvent) => {
        const items = menuItems();
        if (items.length === 0) return;
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        let next = -1;
        if (e.key === 'ArrowDown') next = i < 0 ? 0 : (i + 1) % items.length;
        else if (e.key === 'ArrowUp') next = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = items.length - 1;
        else if (e.key === 'Tab') { setOpen(false); return; }
        if (next >= 0) { e.preventDefault(); items[next].focus(); }
    };

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const run = (fn: () => void) => { setOpen(false); fn(); };
    const itemCls = 'w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-slate-100';

    return (
        <div ref={wrapRef} className="relative">
            <button
                ref={btnRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold rounded-lg whitespace-nowrap border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
                <FileSpreadsheet size={16} aria-hidden />
                Xuất Excel
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {open && (
                <div ref={menuRef} role="menu" aria-label="Xuất Excel" onKeyDown={onMenuKeyDown} className="absolute right-0 top-full mt-1.5 z-[60] w-56 bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.14)] p-1.5 animate-modal-in no-print">
                    <button type="button" role="menuitem" tabIndex={-1} className={itemCls} onClick={() => run(onFrames)}>
                        <Glasses size={16} className="text-amber-600" aria-hidden />Hóa đơn gọng
                    </button>
                    <button type="button" role="menuitem" tabIndex={-1} className={itemCls} onClick={() => run(onLenses)}>
                        <Eye size={16} className="text-sky-600" aria-hidden />Hóa đơn tròng
                    </button>
                    <div className="my-1 border-t border-slate-100" role="separator" />
                    <button type="button" role="menuitem" tabIndex={-1} className={itemCls} onClick={() => run(onSummary)}>
                        <FileSpreadsheet size={16} className="text-brand-600" aria-hidden />Báo cáo tổng hợp
                    </button>
                </div>
            )}
        </div>
    );
};

/* Ô KPI */
const Kpi: React.FC<{ label: string; value: string; icon: React.ElementType; tone: string; children?: React.ReactNode }> = ({ label, value, icon: Icon, tone, children }) => (
    <div className="clinic-card p-5 h-full flex flex-col">
        <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{label}</p>
            <span className={`w-10 h-10 shrink-0 rounded-xl ring-1 ring-inset flex items-center justify-center ${tone}`}>
                <Icon size={20} aria-hidden />
            </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums mt-1 truncate" title={value}>{value}</p>
        <div className="mt-auto pt-1.5 text-sm text-slate-500 whitespace-nowrap truncate">{children}</div>
    </div>
);

export const Statistics: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const today = getLocalDateString();
    const [periodType, setPeriodType] = useState<PeriodType>('month');
    const [selectedDay, setSelectedDay] = useState<string>(today);
    const [selectedWeekDay, setSelectedWeekDay] = useState<string>(today);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => today.slice(0, 7));
    const [fromDate, setFromDate] = useState<string>(() => today.slice(0, 8) + '01');
    const [toDate, setToDate] = useState<string>(today);
    const [printMode, setPrintMode] = useState(false);
    const settings = db.getSettings();

    const refreshData = () => {
        setInvoices(db.getInvoices());
        setInventory(db.getInventory());
        setPatients(db.getPatients());
    };

    useClinicDbUpdated(refreshData);

    const range: PeriodRange = useMemo(() => {
        if (periodType === 'day') {
            const start = parseLocalDate(selectedDay || today);
            const end = addDays(start, 1);
            return { start, end, prevStart: addDays(start, -1), prevEnd: start, label: `Ngày ${fmt(start)}`, tag: getLocalDateString(start) };
        }
        if (periodType === 'week') {
            const d = parseLocalDate(selectedWeekDay || today);
            const start = addDays(d, -((d.getDay() + 6) % 7)); // Thứ 2
            const end = addDays(start, 7);
            return {
                start, end, prevStart: addDays(start, -7), prevEnd: start,
                label: `Tuần ${fmt(start)} - ${fmt(addDays(end, -1))}`,
                tag: `Tuan_${getLocalDateString(start)}_${getLocalDateString(addDays(end, -1))}`,
            };
        }
        if (periodType === 'month') {
            const [y, m] = (selectedMonth || today.slice(0, 7)).split('-').map(Number);
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 1);
            return { start, end, prevStart: new Date(y, m - 2, 1), prevEnd: start, label: `Tháng ${pad(m)}/${y}`, tag: `${y}-${pad(m)}` };
        }
        // Từ ngày -> đến ngày (bao gồm cả 2 đầu)
        let a = parseLocalDate(fromDate || today);
        let b = parseLocalDate(toDate || today);
        if (a > b) [a, b] = [b, a];
        const end = addDays(b, 1);
        const len = end.getTime() - a.getTime();
        return {
            start: a, end, prevStart: new Date(a.getTime() - len), prevEnd: a,
            label: `Từ ${fmt(a)} đến ${fmt(b)}`,
            tag: `${getLocalDateString(a)}_den_${getLocalDateString(b)}`,
        };
    }, [periodType, selectedDay, selectedWeekDay, selectedMonth, fromDate, toDate, today]);

    const inRange = (ts: number, s: Date, e: Date) => ts >= s.getTime() && ts < e.getTime();

    const filteredInvoices = useMemo(
        () => invoices.filter(inv => inRange(inv.date, range.start, range.end)),
        [invoices, range]
    );
    const prevInvoices = useMemo(
        () => invoices.filter(inv => inRange(inv.date, range.prevStart, range.prevEnd)),
        [invoices, range]
    );
    const refractionPatients = useMemo(
        () => patients.filter(p => p.refraction && inRange(p.timestamp, range.start, range.end)),
        [patients, range]
    );

    // ===== Tổng hợp doanh thu =====
    const stats = useMemo(() => {
        let frame = 0, lens = 0, other = 0, frameCount = 0, lensCount = 0;
        let total = 0, discount = 0, surcharge = 0;
        const daily: Record<string, { frame: number; lens: number; total: number; count: number }> = {};
        filteredInvoices.forEach(inv => {
            const s = invoiceRevenueSplit(inv, inventory);
            frame += s.frame; lens += s.lens; other += s.other;
            frameCount += s.frameCount; lensCount += s.lensCount;
            total += inv.total || 0;
            discount += inv.discount || 0;
            surcharge += inv.surcharge || 0;
            const key = getLocalDateString(inv.date);
            daily[key] = daily[key] || { frame: 0, lens: 0, total: 0, count: 0 };
            daily[key].frame += s.frame;
            daily[key].lens += s.lens;
            daily[key].total += inv.total || 0;
            daily[key].count += 1;
        });
        return { frame, lens, other, frameCount, lensCount, total, discount, surcharge, daily };
    }, [filteredInvoices, inventory]);

    const prevRevenue = prevInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const revenueChange = prevRevenue > 0 ? ((stats.total - prevRevenue) / prevRevenue * 100) : 0;
    const dailyRows = (Object.entries(stats.daily) as [string, { frame: number; lens: number; total: number; count: number }][])
        .sort((a, b) => a[0].localeCompare(b[0]));

    // Top sản phẩm (gom theo tên)
    const topItems = useMemo(() => {
        const map: Record<string, { name: string; qty: number; revenue: number }> = {};
        filteredInvoices.forEach(inv => inv.items.forEach(item => {
            const key = item.name;
            map[key] = map[key] || { name: item.name, qty: 0, revenue: 0 };
            map[key].qty += item.quantity;
            map[key].revenue += item.price * item.quantity;
        }));
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [filteredInvoices]);

    const lensInvoiceCount = useMemo(
        () => filteredInvoices.filter(i => invoiceRevenueSplit(i, inventory).lensCount > 0).length,
        [filteredInvoices, inventory]
    );

    // ===== Dữ liệu biểu đồ (chỉ trình bày lại số liệu đã tính) =====
    const chart = useMemo(() => {
        const buckets: Bucket[] = [];
        if (periodType === 'day') {
            const byHour: Record<number, Bucket> = {};
            const mk = (h: number): Bucket => ({ key: `h${h}`, label: `${h}h`, full: `${pad(h)}:00 – ${pad(h + 1)}:00, ${fmt2(range.start)}`, frame: 0, lens: 0, total: 0, count: 0 });
            for (let h = 7; h <= 21; h++) byHour[h] = mk(h);
            filteredInvoices.forEach(inv => {
                const h = new Date(inv.date).getHours();
                const s = invoiceRevenueSplit(inv, inventory);
                const b = byHour[h] || (byHour[h] = mk(h));
                b.frame += s.frame; b.lens += s.lens; b.total += inv.total || 0; b.count += 1;
            });
            Object.keys(byHour).map(Number).sort((a, b) => a - b).forEach(h => buckets.push(byHour[h]));
            return { title: 'Doanh thu theo giờ', unit: 'giờ', buckets };
        }
        const days = Math.round((range.end.getTime() - range.start.getTime()) / 86400000);
        if (days > 92) {
            const byMonth: Record<string, Bucket> = {};
            for (let d = new Date(range.start.getFullYear(), range.start.getMonth(), 1); d < range.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
                const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
                byMonth[key] = { key, label: `${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`, full: `Tháng ${pad(d.getMonth() + 1)}/${d.getFullYear()}`, frame: 0, lens: 0, total: 0, count: 0 };
                buckets.push(byMonth[key]);
            }
            dailyRows.forEach(([day, r]) => {
                const b = byMonth[day.slice(0, 7)];
                if (!b) return;
                b.frame += r.frame; b.lens += r.lens; b.total += r.total; b.count += r.count;
            });
            return { title: 'Doanh thu theo tháng', unit: 'tháng', buckets };
        }
        for (let d = range.start; d < range.end; d = addDays(d, 1)) {
            const key = getLocalDateString(d);
            const r = stats.daily[key];
            buckets.push({
                key,
                label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
                full: d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
                frame: r?.frame || 0, lens: r?.lens || 0, total: r?.total || 0, count: r?.count || 0,
            });
        }
        return { title: 'Doanh thu theo ngày', unit: 'ngày', buckets };
    }, [periodType, range, filteredInvoices, inventory, stats.daily, dailyRows]);

    const chartHasData = chart.buckets.some(b => b.frame + b.lens > 0);
    const chartHasOtherOnly = chart.buckets.some(b => b.frame + b.lens === 0 && b.total > 0);
    const peak = chart.buckets.reduce<Bucket | null>((m, b) => (!m || b.total > m.total ? b : m), null);
    const chartAria = chartHasData && peak
        ? `${chart.title}, ${range.label}: Gọng ${money(stats.frame)}, Tròng ${money(stats.lens)}. Cao nhất ${peak.full}: ${money(peak.total)}.`
        : `${chart.title}: chưa có dữ liệu.`;

    // ===== Điều hướng kỳ =====
    const shiftPeriod = (dir: 1 | -1) => {
        if (periodType === 'day') setSelectedDay(getLocalDateString(addDays(parseLocalDate(selectedDay || today), dir)));
        else if (periodType === 'week') setSelectedWeekDay(getLocalDateString(addDays(parseLocalDate(selectedWeekDay || today), dir * 7)));
        else if (periodType === 'month') {
            const [y, m] = (selectedMonth || today.slice(0, 7)).split('-').map(Number);
            const d = new Date(y, m - 1 + dir, 1);
            setSelectedMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
        }
    };
    const goCurrent = () => {
        if (periodType === 'day') setSelectedDay(today);
        else if (periodType === 'week') setSelectedWeekDay(today);
        else if (periodType === 'month') setSelectedMonth(today.slice(0, 7));
    };
    const todayTs = parseLocalDate(today).getTime();
    const isCurrent = periodType !== 'range' && todayTs >= range.start.getTime() && todayTs < range.end.getTime();
    const currentLabel = periodType === 'day' ? 'Hôm nay' : periodType === 'week' ? 'Tuần này' : 'Tháng này';
    const unitLabel = periodType === 'day' ? 'ngày' : periodType === 'week' ? 'tuần' : 'tháng';

    // Nhãn kỳ để hiển thị (range.label giữ nguyên cho Excel/in)
    const lastDay = addDays(range.end, -1);
    const weekShort = `${fmtDm(range.start)} – ${fmtDm(lastDay)}/${lastDay.getFullYear()}`;
    const displayLabel = periodType === 'day' ? `Ngày ${fmt2(range.start)}`
        : periodType === 'week' ? `Tuần ${fmt2(range.start)} – ${fmt2(lastDay)}`
            : periodType === 'month' ? range.label
                : `Từ ${fmt2(range.start)} đến ${fmt2(lastDay)}`;

    const handlePrint = () => {
        setPrintMode(true);
        setTimeout(() => { window.print(); setPrintMode(false); }, 300);
    };

    const cell: React.CSSProperties = { border: '1px solid #ccc', padding: '5px' };

    const fl = stats.frame + stats.lens;
    const frameShare = pct(stats.frame, fl);
    const lensShare = fl > 0 ? Math.round((100 - frameShare) * 10) / 10 : 0;
    const avgPerInvoice = filteredInvoices.length > 0 ? Math.round(stats.total / filteredInvoices.length) : 0;
    const up = revenueChange >= 0;
    const refractionCompleted = refractionPatients.filter(p => p.status === 'completed').length;
    const completionRate = pct(refractionCompleted, refractionPatients.length);

    const breakdownRow = (label: React.ReactNode, value: string, muted = false) => (
        <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-slate-600 whitespace-nowrap">{label}</dt>
            <dd className={`tabular-nums text-right whitespace-nowrap ${muted ? 'text-slate-600' : 'font-medium text-slate-900'}`}>{value}</dd>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto w-full page-fill">
            <PageHeader
                title="Thống kê doanh thu"
                icon={BarChart3}
                subtitle={`${displayLabel} · ${filteredInvoices.length} hóa đơn`}
                actions={
                    <>
                        <ExportMenu
                            onFrames={() => void exportFramesExcel(range.tag, filteredInvoices, inventory)}
                            onLenses={() => void exportLensesExcel(range.tag, filteredInvoices, inventory)}
                            onSummary={() => void exportStatisticsExcel(range.label, range.tag, refractionPatients, filteredInvoices, inventory)}
                        />
                        <Button size="md" icon={Printer} onClick={handlePrint}>In báo cáo</Button>
                    </>
                }
            />

            {/* Bộ lọc kỳ thống kê */}
            <div className="clinic-card p-4 flex flex-wrap items-center gap-3 shrink-0 mb-6">
                <Segmented<PeriodType>
                    className="shrink-0 overflow-visible"
                    value={periodType}
                    onChange={setPeriodType}
                    items={[
                        { value: 'day', label: 'Ngày' },
                        { value: 'week', label: 'Tuần' },
                        { value: 'month', label: 'Tháng' },
                        { value: 'range', label: 'Khoảng ngày' },
                    ]}
                />

                <div className="flex flex-wrap items-center gap-2">
                    {periodType !== 'range' && (
                        <IconButton icon={ChevronLeft} label={`${unitLabel[0].toUpperCase()}${unitLabel.slice(1)} trước`} onClick={() => shiftPeriod(-1)} />
                    )}
                    {periodType === 'day' && (
                        <DatePicker value={selectedDay} onChange={v => setSelectedDay(v || today)} aria-label="Chọn ngày" className="w-auto" />
                    )}
                    {periodType === 'week' && (
                        <>
                            <DatePicker value={selectedWeekDay} onChange={v => setSelectedWeekDay(v || today)} aria-label={`Chọn một ngày bất kỳ trong tuần (đang chọn tuần ${weekShort})`} className="w-auto" />
                            <span className="inline-flex items-center h-10 px-3 rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 tabular-nums whitespace-nowrap" aria-live="polite">
                                Tuần {weekShort}
                            </span>
                        </>
                    )}
                    {periodType === 'month' && (
                        <MonthPicker value={selectedMonth} onChange={v => setSelectedMonth(v || today.slice(0, 7))} aria-label="Chọn tháng" className="w-auto" />
                    )}
                    {periodType === 'range' && (
                        <>
                            <DatePicker value={fromDate} onChange={v => setFromDate(v || today)} max={toDate} aria-label="Từ ngày" className="w-auto" />
                            <span className="text-slate-400" aria-hidden>–</span>
                            <DatePicker value={toDate} onChange={v => setToDate(v || today)} min={fromDate} aria-label="Đến ngày" className="w-auto" />
                        </>
                    )}
                    {periodType !== 'range' && (
                        <>
                            <IconButton icon={ChevronRight} label={`${unitLabel[0].toUpperCase()}${unitLabel.slice(1)} sau`} onClick={() => shiftPeriod(1)} />
                            <Button variant="ghost" size="sm" onClick={goCurrent} disabled={isCurrent}>{currentLabel}</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Vùng nội dung cuộn bên trong (lg+): tiêu đề + bộ lọc đứng yên */}
            <div className="page-scroll space-y-6 lg:-mx-1 lg:px-1 lg:pt-0.5 lg:pb-1">
                {/* KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Kpi label="Tổng doanh thu" value={money(stats.total)} icon={DollarSign} tone="text-brand-600 bg-brand-50 ring-brand-100">
                        {prevRevenue > 0 ? (
                            <span className="inline-flex items-center gap-1">
                                <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${up ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {up ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
                                    {up ? '+' : ''}{revenueChange.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                </span>
                                so với kỳ trước
                            </span>
                        ) : (
                            <span><span className="font-semibold text-slate-400">—</span> so với kỳ trước</span>
                        )}
                    </Kpi>
                    <Kpi label="Doanh thu gọng" value={money(stats.frame)} icon={Glasses} tone="text-amber-600 bg-amber-50 ring-amber-100">
                        <span className="tabular-nums">{stats.frameCount} gọng · {pctText(frameShare)}</span>
                    </Kpi>
                    <Kpi label="Doanh thu tròng" value={money(stats.lens)} icon={Eye} tone="text-sky-600 bg-sky-50 ring-sky-100">
                        <span className="tabular-nums">{stats.lensCount} cặp · {pctText(lensShare)}</span>
                    </Kpi>
                    <Kpi label="Số hóa đơn" value={filteredInvoices.length.toLocaleString('vi-VN')} icon={ShoppingCart} tone="text-slate-600 bg-slate-100 ring-slate-200">
                        <span className="tabular-nums">TB {money(avgPerInvoice)}/đơn</span>
                    </Kpi>
                </div>

                {/* Biểu đồ + cơ cấu */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card
                        className="xl:col-span-2 min-w-0 flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:flex [&>div:last-child]:flex-col"
                        title={chart.title}
                        icon={BarChart3}
                        actions={
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: FRAME_COLOR }} aria-hidden />Gọng</span>
                                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LENS_COLOR }} aria-hidden />Tròng</span>
                            </div>
                        }
                    >
                        {chartHasData ? (
                            <>
                                <RevenueChart buckets={chart.buckets} ariaLabel={chartAria} />
                                <p className="clinic-help mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span>Cột = doanh thu gọng + tròng trước giảm giá/phụ thu.</span>
                                    {chartHasOtherOnly && (
                                        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-sm" style={{ background: OTHER_COLOR }} aria-hidden />Vạch xám: chỉ có doanh thu khác</span>
                                    )}
                                </p>
                            </>
                        ) : (
                            <EmptyState icon={BarChart3} title="Chưa có doanh thu trong kỳ này" description="Chọn kỳ khác hoặc lùi về kỳ trước để xem số liệu." className="flex-1 min-h-[264px] py-0" />
                        )}
                    </Card>

                    <Card title="Cơ cấu doanh thu" icon={PieChart} className="min-w-0">
                        <div
                            className="flex h-3 w-full gap-0.5 rounded-full overflow-hidden bg-slate-100"
                            role="img"
                            aria-label={fl > 0 ? `Gọng ${pctText(frameShare)} (${money(stats.frame)}), Tròng ${pctText(lensShare)} (${money(stats.lens)})` : 'Chưa có doanh thu gọng và tròng'}
                        >
                            {stats.frame > 0 && <div className="h-full" style={{ width: `${frameShare}%`, background: FRAME_COLOR }} />}
                            {stats.lens > 0 && <div className="h-full flex-1" style={{ background: LENS_COLOR }} />}
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: FRAME_COLOR }} aria-hidden />Gọng
                                    <span className="ml-auto font-semibold text-slate-900 tabular-nums">{pctText(frameShare)}</span>
                                </div>
                                <div className="mt-1 text-base font-semibold text-slate-900 tabular-nums whitespace-nowrap">{money(stats.frame)}</div>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: LENS_COLOR }} aria-hidden />Tròng
                                    <span className="ml-auto font-semibold text-slate-900 tabular-nums">{pctText(lensShare)}</span>
                                </div>
                                <div className="mt-1 text-base font-semibold text-slate-900 tabular-nums whitespace-nowrap">{money(stats.lens)}</div>
                            </div>
                        </div>

                        <dl className="text-sm mt-5 pt-3 border-t border-slate-100">
                            {breakdownRow('Gọng + Tròng', money(fl))}
                            {breakdownRow('Phụ thu', `+${money(stats.surcharge)}`, true)}
                            {breakdownRow('Giảm giá', `−${money(stats.discount)}`, true)}
                            {stats.other > 0 && breakdownRow('Khác (hóa đơn cũ)', money(stats.other), true)}
                            <div className="flex items-center justify-between gap-4 pt-3 mt-1 border-t border-slate-200">
                                <dt className="font-semibold text-slate-900 whitespace-nowrap">Tổng doanh thu</dt>
                                <dd className="text-base font-bold text-slate-900 tabular-nums text-right whitespace-nowrap">{money(stats.total)}</dd>
                            </div>
                        </dl>
                    </Card>
                </div>

                {/* Sản phẩm + khúc xạ */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <Card title="Sản phẩm bán chạy" icon={Package} className="xl:col-span-3 min-w-0">
                        {topItems.length === 0 ? (
                            <EmptyState icon={Package} title="Chưa có sản phẩm bán ra trong kỳ" className="py-8" />
                        ) : (
                            <div className="table-wrap">
                                <table className="clinic-table">
                                    <thead>
                                        <tr>
                                            <th className="w-10">#</th>
                                            <th>Sản phẩm</th>
                                            <th className="num">SL</th>
                                            <th className="num">Doanh thu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topItems.map((item, i) => {
                                            const isFrame = item.name.startsWith('Gọng:');
                                            const isLens = item.name.startsWith('Tròng:');
                                            const shown = isFrame || isLens ? item.name.replace(/^(Gọng|Tròng):\s*/, '') : item.name;
                                            return (
                                                <tr key={i}>
                                                    <td className="text-slate-500 tabular-nums">{i + 1}</td>
                                                    <td className="max-w-0 w-full">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {isFrame && <Badge tone="frame">Gọng</Badge>}
                                                            {isLens && <Badge tone="lens">Tròng</Badge>}
                                                            <span className="truncate font-medium text-slate-800" title={item.name}>{shown}</span>
                                                        </div>
                                                    </td>
                                                    <td className="num">{item.qty}</td>
                                                    <td className="num font-semibold text-slate-900 whitespace-nowrap">{money(item.revenue)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <Card title="Khúc xạ" icon={ClipboardList} className="xl:col-span-2 min-w-0 h-full">
                        <dl className="grid grid-cols-3 divide-x divide-slate-200 subtle-panel">
                            {[
                                { label: 'BN cắt kính', value: refractionPatients.length },
                                { label: 'Đã hoàn thành', value: refractionCompleted },
                                { label: 'Hóa đơn có tròng', value: lensInvoiceCount },
                            ].map(m => (
                                <div key={m.label} className="px-4 py-4 min-w-0 flex flex-col">
                                    <dt className="text-sm text-slate-500 leading-snug">{m.label}</dt>
                                    <dd className="text-2xl font-bold text-slate-900 tabular-nums mt-auto pt-1">{m.value.toLocaleString('vi-VN')}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="mt-5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-600">Tỉ lệ hoàn thành</span>
                                <span className="font-semibold text-slate-900 tabular-nums">
                                    {refractionPatients.length > 0 ? pctText(completionRate) : '—'}
                                </span>
                            </div>
                            <div
                                className="mt-2 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden"
                                role="progressbar"
                                aria-label="Tỉ lệ hoàn thành khúc xạ"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={completionRate}
                            >
                                <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${completionRate}%` }} />
                            </div>
                            <p className="clinic-help mt-2 tabular-nums">
                                {refractionPatients.length > 0
                                    ? `${refractionCompleted.toLocaleString('vi-VN')}/${refractionPatients.length.toLocaleString('vi-VN')} bệnh nhân đã hoàn thành khám khúc xạ trong kỳ.`
                                    : 'Chưa có bệnh nhân khúc xạ trong kỳ này.'}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Bảng chi tiết theo ngày */}
                <Card title="Chi tiết theo ngày" icon={Table2}>
                    {dailyRows.length === 0 ? (
                        <EmptyState icon={Calendar} title="Chưa có dữ liệu trong kỳ này" className="py-8" />
                    ) : (
                        <div className="table-wrap">
                            <table className="clinic-table">
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th className="num">Số HĐ</th>
                                        <th className="num">Gọng</th>
                                        <th className="num">Tròng</th>
                                        <th className="num">Tổng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyRows.map(([day, r]) => (
                                        <tr key={day}>
                                            <td className="tabular-nums">{fmt2(parseLocalDate(day))}</td>
                                            <td className="num">{r.count}</td>
                                            <td className="num">{r.frame.toLocaleString('vi-VN')}</td>
                                            <td className="num">{r.lens.toLocaleString('vi-VN')}</td>
                                            <td className="num font-semibold text-slate-900">{r.total.toLocaleString('vi-VN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                                    <tr>
                                        <td className="text-slate-900">Tổng</td>
                                        <td className="num text-slate-900">{filteredInvoices.length}</td>
                                        <td className="num text-slate-900">{stats.frame.toLocaleString('vi-VN')}</td>
                                        <td className="num text-slate-900">{stats.lens.toLocaleString('vi-VN')}</td>
                                        <td className="num font-bold text-slate-900">{stats.total.toLocaleString('vi-VN')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {printMode && (
                <div className="print-area">
                    <div style={{ fontFamily: 'Arial, sans-serif', padding: '10mm', textAlign: 'left' }}>
                        <h2 style={{ textAlign: 'center' }}>{settings.name} - Báo cáo doanh thu</h2>
                        <p style={{ textAlign: 'center', fontSize: '12px' }}>{range.label} | In lúc: {new Date().toLocaleString('vi-VN')}</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '5mm' }}>
                            <tbody>
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>Doanh thu gọng ({stats.frameCount} gọng)</td><td style={cell}>{money(stats.frame)}</td></tr>
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>Doanh thu tròng ({stats.lensCount} cặp/tròng)</td><td style={cell}>{money(stats.lens)}</td></tr>
                                {stats.other > 0 && <tr><td style={{ ...cell, fontWeight: 'bold' }}>Khác (hóa đơn cũ)</td><td style={cell}>{money(stats.other)}</td></tr>}
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>Phụ thu</td><td style={cell}>+{money(stats.surcharge)}</td></tr>
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>Giảm giá</td><td style={cell}>-{money(stats.discount)}</td></tr>
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>TỔNG DOANH THU</td><td style={{ ...cell, fontWeight: 'bold' }}>{money(stats.total)}</td></tr>
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>Số hóa đơn</td><td style={cell}>{filteredInvoices.length}</td></tr>
                                <tr><td style={{ ...cell, fontWeight: 'bold' }}>BN cắt kính</td><td style={cell}>{refractionPatients.length}</td></tr>
                            </tbody>
                        </table>
                        <h3 style={{ marginTop: '8mm', fontSize: '14px' }}>Doanh thu theo ngày</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '3mm' }}>
                            <thead><tr style={{ background: '#f3f4f6' }}>
                                <th style={cell}>Ngày</th>
                                <th style={cell}>Số HĐ</th>
                                <th style={cell}>Gọng</th>
                                <th style={cell}>Tròng</th>
                                <th style={cell}>Tổng</th>
                            </tr></thead>
                            <tbody>
                                {dailyRows.map(([day, r]) => (
                                    <tr key={day}>
                                        <td style={cell}>{fmt(parseLocalDate(day))}</td>
                                        <td style={cell}>{r.count}</td>
                                        <td style={cell}>{r.frame.toLocaleString('vi-VN')}</td>
                                        <td style={cell}>{r.lens.toLocaleString('vi-VN')}</td>
                                        <td style={cell}>{r.total.toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
