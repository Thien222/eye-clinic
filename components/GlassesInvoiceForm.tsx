import React, { useMemo } from 'react';
import { Glasses, Eye, Plus, Trash2 } from 'lucide-react';
import type { LensRx } from '../types';
import { formatMoney, emptyFrameForm } from '../services/invoiceUtils';
import type { GlassesFormState, GlassesSuggestions, FrameSuggestionData, LensSuggestionData } from '../services/invoiceUtils';
import { Badge, SuggestInput } from './ui';
import type { Suggestion } from './ui';

interface Props {
    value: GlassesFormState;
    onChange: (next: GlassesFormState) => void;
    /** Các ô bắt buộc đang thiếu — hiển thị viền đỏ */
    errors?: Set<string>;
    /** Dòng ghi chú dưới tiêu đề Tròng (vd: "Đã điền sẵn từ kết quả khúc xạ") */
    lensHint?: string;
    compact?: boolean;
    /** Gợi ý từ các hóa đơn đã lưu (gõ tên/mã là xổ ra) */
    suggestions?: GlassesSuggestions;
}

/** Ghép class ô nhập chuẩn + viền đỏ khi thiếu */
const inputCls = (invalid?: boolean) => `clinic-input${invalid ? ' is-invalid' : ''}`;

/** Một dòng form: nhãn trái (cố định) + ô nhập phải; xếp dọc trên màn hình hẹp */
const FormRow: React.FC<{
    label: string;
    required?: boolean;
    active: boolean;
    children: React.ReactNode;
    className?: string;
    short?: boolean;
}> = ({ label, required, active, children, className, short }) => (
    <label className={`grid grid-cols-1 sm:grid-cols-[128px_1fr] sm:items-center gap-1.5 sm:gap-4 ${className || ''}`}>
        <span className={`text-sm font-medium ${active ? 'text-slate-700' : 'text-slate-400'}`}>
            {label}{required && active && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        <div className={short ? 'sm:max-w-[260px]' : ''}>{children}</div>
    </label>
);

/** Ô nhập tiền: hiển thị 1.250.000, lưu chuỗi chữ số */
export const MoneyInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, disabled, placeholder, className }) => {
    const digits = (value || '').replace(/[^\d]/g, '');
    const display = digits ? parseInt(digits, 10).toLocaleString('vi-VN') : '';
    return (
        <div className="relative">
            <input
                type="text"
                inputMode="numeric"
                className={`clinic-input pr-8 text-right font-semibold tabular-nums ${className || ''}`}
                value={display}
                disabled={disabled}
                placeholder={placeholder ?? '0'}
                onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">đ</span>
        </div>
    );
};

const RX_FIELDS: { key: keyof LensRx; label: string; hint: string }[] = [
    { key: 'sph', label: 'Độ cận/viễn', hint: 'SPH' },
    { key: 'cyl', label: 'Độ loạn', hint: 'CYL' },
    { key: 'axis', label: 'Trục loạn', hint: 'AXIS' },
    { key: 'add', label: 'Độ ADD (nếu có)', hint: 'ADD' },
];

export const GlassesInvoiceForm: React.FC<Props> = ({ value, onChange, errors, lensHint, compact, suggestions }) => {
    const f = value;
    const err = (k: string) => !!errors?.has(k);
    const setFrame = (patch: Partial<GlassesFormState['frame']>) => onChange({ ...f, frame: { ...f.frame, ...patch } });
    const setLens = (patch: Partial<GlassesFormState['lens']>) => onChange({ ...f, lens: { ...f.lens, ...patch } });
    const setRx = (eye: 'od' | 'os', key: keyof LensRx, v: string) =>
        onChange({ ...f, lens: { ...f.lens, [eye]: { ...f.lens[eye], [key]: v } } });

    const frameByName = useMemo<Suggestion<FrameSuggestionData>[]>(() => (suggestions?.frames || []).map(s => ({
        key: s.key, match: s.name, label: s.name, detail: s.detail, data: s.data,
    })), [suggestions]);
    const frameByCode = useMemo<Suggestion<FrameSuggestionData>[]>(() => (suggestions?.frames || []).filter(s => s.code).map(s => ({
        key: s.key, match: s.code, label: s.code, detail: [s.name, s.data.price ? `${formatMoney(s.data.price)} đ` : '', s.data.material].filter(Boolean).join(' · '), data: s.data,
    })), [suggestions]);
    const lensByName = useMemo<Suggestion<LensSuggestionData>[]>(() => (suggestions?.lenses || []).map(s => ({
        key: s.key, match: s.name, label: s.name, detail: s.detail, data: s.data,
    })), [suggestions]);

    /** Chọn gọng cũ: điền tên, mã, giá, chất liệu (vẫn sửa được) */
    const pickFrame = (s: Suggestion<FrameSuggestionData>) => setFrame({
        name: s.data.name, code: s.data.code,
        price: s.data.price ? String(s.data.price) : f.frame.price,
        material: s.data.material || f.frame.material,
    });
    /** Chọn tròng cũ: điền tên, giá, chiết suất — KHÔNG đụng độ mắt */
    const pickLens = (s: Suggestion<LensSuggestionData>) => setLens({
        name: s.data.name,
        price: s.data.price ? String(s.data.price) : f.lens.price,
        index: s.data.index || f.lens.index,
    });

    /* ----- Gọng / tròng mua thêm ----- */
    type FrameForm = GlassesFormState['frame'];
    type LensForm = GlassesFormState['lens'];
    const setExtraFrame = (i: number, patch: Partial<FrameForm>) =>
        onChange({ ...f, extraFrames: f.extraFrames.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
    const setExtraLens = (i: number, patch: Partial<LensForm>) =>
        onChange({ ...f, extraLenses: f.extraLenses.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
    const addFrame = () => onChange({ ...f, extraFrames: [...f.extraFrames, emptyFrameForm()] });
    /** Tròng thêm: điền sẵn độ giống tròng chính (sửa được) */
    const addLens = () => onChange({
        ...f, extraLenses: [...f.extraLenses, { name: '', price: '', index: '', od: { ...f.lens.od }, os: { ...f.lens.os } }],
    });
    const removeFrame = (i: number) => onChange({ ...f, extraFrames: f.extraFrames.filter((_, k) => k !== i) });
    const removeLens = (i: number) => onChange({ ...f, extraLenses: f.extraLenses.filter((_, k) => k !== i) });
    const pickExtraFrame = (i: number) => (s: Suggestion<FrameSuggestionData>) => setExtraFrame(i, {
        name: s.data.name, code: s.data.code,
        price: s.data.price ? String(s.data.price) : f.extraFrames[i].price,
        material: s.data.material || f.extraFrames[i].material,
    });
    const pickExtraLens = (i: number) => (s: Suggestion<LensSuggestionData>) => setExtraLens(i, {
        name: s.data.name,
        price: s.data.price ? String(s.data.price) : f.extraLenses[i].price,
        index: s.data.index || f.extraLenses[i].index,
    });

    const extraHeader = (title: string, on: boolean, tone: 'frame' | 'lens', onRemove: () => void) => (
        <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${on ? (tone === 'frame' ? 'text-amber-800' : 'text-sky-800') : 'text-slate-400'}`}>{title}</span>
            <button type="button" onClick={onRemove}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
                <Trash2 size={14} aria-hidden /> Xóa
            </button>
        </div>
    );

    const addBtnCls = (tone: 'frame' | 'lens') =>
        `mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition-colors ${tone === 'frame'
            ? 'border-amber-400 text-amber-700 hover:bg-amber-100'
            : 'border-sky-400 text-sky-700 hover:bg-sky-100'}`;

    const rxTable = (rx: { od: LensRx; os: LensRx }, on: boolean, setEyeRx: (eye: 'od' | 'os', key: keyof LensRx, v: string) => void) => (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className={on ? 'text-slate-500' : 'text-slate-400'}>
                        <th className="text-left font-semibold px-3 py-2 w-28"></th>
                        {RX_FIELDS.map(c => (
                            <th key={c.key} className="font-semibold px-1.5 py-2 text-center">
                                <div className="text-xs">{c.label}</div>
                                <div className="text-xs font-normal">({c.hint})</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {(['od', 'os'] as const).map(eye => (
                        <tr key={eye} className="border-b border-slate-100 last:border-b-0">
                            <td className={`px-3 py-2 font-semibold whitespace-nowrap ${on ? 'text-slate-700' : 'text-slate-400'}`}>
                                {eye === 'od' ? 'Mắt phải' : 'Mắt trái'} <span className="text-xs font-normal text-slate-500">({eye.toUpperCase()})</span>
                            </td>
                            {RX_FIELDS.map(c => (
                                <td key={c.key} className="px-1.5 py-2">
                                    <input
                                        className="clinic-input clinic-input-sm text-center tabular-nums"
                                        disabled={!on}
                                        value={rx[eye][c.key]}
                                        onChange={e => setEyeRx(eye, c.key, e.target.value)}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // Gọng = amber, Tròng = sky (design-system/MASTER.md)
    const sectionCls = (on: boolean, tone: 'frame' | 'lens') =>
        `rounded-xl border p-5 transition-colors ${on
            ? tone === 'frame' ? 'border-amber-200 bg-amber-50/40' : 'border-sky-200 bg-sky-50/40'
            : 'border-slate-200 bg-slate-50'}`;

    const iconCls = (on: boolean, tone: 'frame' | 'lens') =>
        `w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ring-1 ring-inset ${on
            ? tone === 'frame' ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-sky-100 text-sky-700 ring-sky-200'
            : 'bg-slate-100 text-slate-400 ring-slate-200'}`;

    return (
        <div className={compact ? 'space-y-4' : 'space-y-6'}>
            {/* ===== GỌNG KÍNH ===== */}
            <section className={sectionCls(f.frameEnabled, 'frame')}>
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4 w-fit">
                    <input
                        type="checkbox"
                        className="h-5 w-5 accent-amber-600 cursor-pointer"
                        checked={f.frameEnabled}
                        onChange={e => onChange({ ...f, frameEnabled: e.target.checked })}
                    />
                    <span className={iconCls(f.frameEnabled, 'frame')}><Glasses size={18} aria-hidden /></span>
                    <span className={`text-base font-semibold ${f.frameEnabled ? 'text-amber-800' : 'text-slate-400 line-through'}`}>Gọng kính</span>
                    {!f.frameEnabled && <span className="text-xs text-slate-500">(không mua gọng)</span>}
                </label>
                <div className="grid grid-cols-1 gap-4 max-w-2xl">
                    <FormRow label="Tên gọng" required active={f.frameEnabled}>
                        <SuggestInput className={inputCls(err('frame.name'))} disabled={!f.frameEnabled} value={f.frame.name}
                            onChange={v => setFrame({ name: v })} onPick={pickFrame} suggestions={frameByName} placeholder="VD: Rayban RB5154" />
                    </FormRow>
                    <FormRow label="Mã gọng" required active={f.frameEnabled}>
                        <SuggestInput className={inputCls(err('frame.code'))} disabled={!f.frameEnabled} value={f.frame.code}
                            onChange={v => setFrame({ code: v })} onPick={pickFrame} suggestions={frameByCode} placeholder="VD: G-0123" />
                    </FormRow>
                    <FormRow short label="Giá bán" required active={f.frameEnabled}>
                        <MoneyInput disabled={!f.frameEnabled} value={f.frame.price} onChange={v => setFrame({ price: v })}
                            className={err('frame.price') ? 'is-invalid' : ''} />
                    </FormRow>
                    <FormRow short label="Chất liệu" active={f.frameEnabled}>
                        <input className={inputCls()} disabled={!f.frameEnabled} value={f.frame.material}
                            onChange={e => setFrame({ material: e.target.value })} placeholder="Nhựa, kim loại, titan..." />
                    </FormRow>
                </div>

                {f.extraFrames.map((fr, i) => (
                    <div key={i} className="mt-5 pt-4 border-t border-amber-200 grid grid-cols-1 gap-4 max-w-2xl">
                        {extraHeader(`Gọng kính #${i + 2}`, f.frameEnabled, 'frame', () => removeFrame(i))}
                        <FormRow label="Tên gọng" required active={f.frameEnabled}>
                            <SuggestInput className={inputCls(err(`xf.${i}.name`))} disabled={!f.frameEnabled} value={fr.name}
                                onChange={v => setExtraFrame(i, { name: v })} onPick={pickExtraFrame(i)} suggestions={frameByName} placeholder="VD: Rayban RB5154" />
                        </FormRow>
                        <FormRow label="Mã gọng" required active={f.frameEnabled}>
                            <SuggestInput className={inputCls(err(`xf.${i}.code`))} disabled={!f.frameEnabled} value={fr.code}
                                onChange={v => setExtraFrame(i, { code: v })} onPick={pickExtraFrame(i)} suggestions={frameByCode} placeholder="VD: G-0123" />
                        </FormRow>
                        <FormRow short label="Giá bán" required active={f.frameEnabled}>
                            <MoneyInput disabled={!f.frameEnabled} value={fr.price} onChange={v => setExtraFrame(i, { price: v })}
                                className={err(`xf.${i}.price`) ? 'is-invalid' : ''} />
                        </FormRow>
                        <FormRow short label="Chất liệu" active={f.frameEnabled}>
                            <input className={inputCls()} disabled={!f.frameEnabled} value={fr.material}
                                onChange={e => setExtraFrame(i, { material: e.target.value })} placeholder="Nhựa, kim loại, titan..." />
                        </FormRow>
                    </div>
                ))}
                {f.frameEnabled && (
                    <button type="button" className={addBtnCls('frame')} onClick={addFrame}>
                        <Plus size={16} aria-hidden /> Thêm gọng kính
                    </button>
                )}
            </section>

            {/* ===== TRÒNG KÍNH ===== */}
            <section className={sectionCls(f.lensEnabled, 'lens')}>
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4 w-fit">
                    <input
                        type="checkbox"
                        className="h-5 w-5 accent-sky-600 cursor-pointer"
                        checked={f.lensEnabled}
                        onChange={e => onChange({ ...f, lensEnabled: e.target.checked })}
                    />
                    <span className={iconCls(f.lensEnabled, 'lens')}><Eye size={18} aria-hidden /></span>
                    <span className={`text-base font-semibold ${f.lensEnabled ? 'text-sky-800' : 'text-slate-400 line-through'}`}>Tròng kính</span>
                    {!f.lensEnabled && <span className="text-xs text-slate-500">(không mua tròng)</span>}
                </label>
                <div className="grid grid-cols-1 gap-4 max-w-2xl">
                    <FormRow label="Tên tròng" required active={f.lensEnabled}>
                        <SuggestInput className={inputCls(err('lens.name'))} disabled={!f.lensEnabled} value={f.lens.name}
                            onChange={v => setLens({ name: v })} onPick={pickLens} suggestions={lensByName} placeholder="VD: Essilor Crizal" />
                    </FormRow>
                    <FormRow short label="Giá bán" required active={f.lensEnabled}>
                        <MoneyInput disabled={!f.lensEnabled} value={f.lens.price} onChange={v => setLens({ price: v })}
                            className={err('lens.price') ? 'is-invalid' : ''} />
                    </FormRow>
                </div>

                <div className={`mt-5 pt-4 border-t max-w-2xl ${f.lensEnabled ? 'border-sky-100' : 'border-slate-200'}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h4 className={`text-sm font-semibold ${f.lensEnabled ? 'text-slate-700' : 'text-slate-400'}`}>Thông số tròng</h4>
                        {lensHint && f.lensEnabled && <Badge tone="success">{lensHint}</Badge>}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className={f.lensEnabled ? 'text-slate-500' : 'text-slate-400'}>
                                    <th className="text-left font-semibold px-3 py-2 w-28"></th>
                                    {RX_FIELDS.map(c => (
                                        <th key={c.key} className="font-semibold px-1.5 py-2 text-center">
                                            <div className="text-xs">{c.label}</div>
                                            <div className="text-xs font-normal">({c.hint})</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(['od', 'os'] as const).map(eye => (
                                    <tr key={eye} className="border-b border-slate-100 last:border-b-0">
                                        <td className={`px-3 py-2 font-semibold whitespace-nowrap ${f.lensEnabled ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {eye === 'od' ? 'Mắt phải' : 'Mắt trái'} <span className="text-xs font-normal text-slate-500">({eye.toUpperCase()})</span>
                                        </td>
                                        {RX_FIELDS.map(c => (
                                            <td key={c.key} className="px-1.5 py-2">
                                                <input
                                                    className="clinic-input clinic-input-sm text-center tabular-nums"
                                                    disabled={!f.lensEnabled}
                                                    value={f.lens[eye][c.key]}
                                                    onChange={e => setRx(eye, c.key, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4">
                        <FormRow short label="Chiết suất" active={f.lensEnabled}>
                            <input className={inputCls()} disabled={!f.lensEnabled} value={f.lens.index}
                                onChange={e => setLens({ index: e.target.value })} placeholder="1.56, 1.60, 1.67..." />
                        </FormRow>
                    </div>
                </div>

                {f.extraLenses.map((ln, i) => (
                    <div key={i} className="mt-5 pt-4 border-t border-sky-200 grid grid-cols-1 gap-4 max-w-2xl">
                        {extraHeader(`Tròng kính #${i + 2}`, f.lensEnabled, 'lens', () => removeLens(i))}
                        <FormRow label="Tên tròng" required active={f.lensEnabled}>
                            <SuggestInput className={inputCls(err(`xl.${i}.name`))} disabled={!f.lensEnabled} value={ln.name}
                                onChange={v => setExtraLens(i, { name: v })} onPick={pickExtraLens(i)} suggestions={lensByName} placeholder="VD: Essilor Crizal" />
                        </FormRow>
                        <FormRow short label="Giá bán" required active={f.lensEnabled}>
                            <MoneyInput disabled={!f.lensEnabled} value={ln.price} onChange={v => setExtraLens(i, { price: v })}
                                className={err(`xl.${i}.price`) ? 'is-invalid' : ''} />
                        </FormRow>
                        {rxTable(ln, f.lensEnabled, (eye, key, v) => setExtraLens(i, { [eye]: { ...ln[eye], [key]: v } }))}
                        <FormRow short label="Chiết suất" active={f.lensEnabled}>
                            <input className={inputCls()} disabled={!f.lensEnabled} value={ln.index}
                                onChange={e => setExtraLens(i, { index: e.target.value })} placeholder="1.56, 1.60, 1.67..." />
                        </FormRow>
                    </div>
                ))}
                {f.lensEnabled && (
                    <button type="button" className={addBtnCls('lens')} onClick={addLens}>
                        <Plus size={16} aria-hidden /> Thêm tròng kính
                    </button>
                )}
            </section>
        </div>
    );
};
