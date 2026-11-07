import type { Invoice, InvoiceFrame, InvoiceItem, InvoiceLens, InventoryItem, LensRx } from '../types';

export const emptyRx = (): LensRx => ({ sph: '', cyl: '', axis: '', add: '' });

/** Trạng thái form nhập gọng/tròng tại thu ngân (giá giữ dạng chuỗi để cho phép ô trống) */
export interface GlassesFormState {
    frameEnabled: boolean;
    frame: { name: string; code: string; price: string; material: string };
    lensEnabled: boolean;
    lens: { name: string; price: string; index: string; od: LensRx; os: LensRx };
    /** Gọng / tròng mua thêm (khách mua 2-3 cái) */
    extraFrames: GlassesFormState['frame'][];
    extraLenses: GlassesFormState['lens'][];
}

export const emptyFrameForm = (): GlassesFormState['frame'] => ({ name: '', code: '', price: '', material: '' });

export const emptyGlassesForm = (): GlassesFormState => ({
    frameEnabled: true,
    frame: { name: '', code: '', price: '', material: '' },
    lensEnabled: true,
    lens: { name: '', price: '', index: '', od: emptyRx(), os: emptyRx() },
    extraFrames: [],
    extraLenses: [],
});

export const parseMoney = (v: string | number | undefined | null): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const digits = String(v ?? '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
};

export const formatMoney = (n: number | undefined | null): string => (n || 0).toLocaleString('vi-VN');

/** Lỗi theo từng ô bắt buộc — key dạng 'frame.name', 'lens.price'... */
export function validateGlassesForm(f: GlassesFormState): { errors: Set<string>; message: string } {
    const errors = new Set<string>();
    if (!f.frameEnabled && !f.lensEnabled) {
        return { errors, message: 'Vui lòng chọn ít nhất Gọng kính hoặc Tròng kính.' };
    }
    if (f.frameEnabled) {
        if (!f.frame.name.trim()) errors.add('frame.name');
        if (!f.frame.code.trim()) errors.add('frame.code');
        if (!f.frame.price.trim()) errors.add('frame.price');
    }
    if (f.lensEnabled) {
        if (!f.lens.name.trim()) errors.add('lens.name');
        if (!f.lens.price.trim()) errors.add('lens.price');
    }
    if (f.frameEnabled) {
        f.extraFrames.forEach((fr, i) => {
            if (!fr.name.trim()) errors.add(`xf.${i}.name`);
            if (!fr.code.trim()) errors.add(`xf.${i}.code`);
            if (!fr.price.trim()) errors.add(`xf.${i}.price`);
        });
    }
    if (f.lensEnabled) {
        f.extraLenses.forEach((ln, i) => {
            if (!ln.name.trim()) errors.add(`xl.${i}.name`);
            if (!ln.price.trim()) errors.add(`xl.${i}.price`);
        });
    }
    return { errors, message: errors.size ? 'Vui lòng điền đủ các ô bắt buộc (viền đỏ).' : '' };
}

const trimRx = (rx: LensRx): LensRx => ({
    sph: rx.sph.trim(), cyl: rx.cyl.trim(), axis: rx.axis.trim(), add: rx.add.trim(),
});

const toFrame = (fr: GlassesFormState['frame']): InvoiceFrame => ({
    name: fr.name.trim(),
    code: fr.code.trim(),
    price: parseMoney(fr.price),
    material: fr.material.trim(),
});
const toLens = (ln: GlassesFormState['lens']): InvoiceLens => ({
    name: ln.name.trim(),
    price: parseMoney(ln.price),
    index: ln.index.trim(),
    od: trimRx(ln.od),
    os: trimRx(ln.os),
});

export function formToFrameLens(f: GlassesFormState): {
    frame?: InvoiceFrame; lens?: InvoiceLens; extraFrames: InvoiceFrame[]; extraLenses: InvoiceLens[];
} {
    return {
        frame: f.frameEnabled ? toFrame(f.frame) : undefined,
        lens: f.lensEnabled ? toLens(f.lens) : undefined,
        extraFrames: f.frameEnabled ? f.extraFrames.map(toFrame) : [],
        extraLenses: f.lensEnabled ? f.extraLenses.map(toLens) : [],
    };
}

/** Tổng tiền gọng / tròng trên form (gồm cả gọng, tròng mua thêm) */
export function glassesFormPrices(f: GlassesFormState): { framePrice: number; lensPrice: number } {
    const framePrice = f.frameEnabled
        ? parseMoney(f.frame.price) + f.extraFrames.reduce((s, fr) => s + parseMoney(fr.price), 0) : 0;
    const lensPrice = f.lensEnabled
        ? parseMoney(f.lens.price) + f.extraLenses.reduce((s, ln) => s + parseMoney(ln.price), 0) : 0;
    return { framePrice, lensPrice };
}

export function invoiceToForm(inv: Invoice): GlassesFormState {
    const base = emptyGlassesForm();
    return {
        frameEnabled: !!inv.frame,
        frame: inv.frame ? {
            name: inv.frame.name, code: inv.frame.code,
            price: String(inv.frame.price ?? ''), material: inv.frame.material || '',
        } : base.frame,
        lensEnabled: !!inv.lens,
        lens: inv.lens ? {
            name: inv.lens.name, price: String(inv.lens.price ?? ''), index: inv.lens.index || '',
            od: { ...emptyRx(), ...inv.lens.od }, os: { ...emptyRx(), ...inv.lens.os },
        } : base.lens,
        extraFrames: (inv.extraFrames || []).map(fr => ({
            name: fr.name || '', code: fr.code || '', price: String(fr.price ?? ''), material: fr.material || '',
        })),
        extraLenses: (inv.extraLenses || []).map(ln => ({
            name: ln.name || '', price: String(ln.price ?? ''), index: ln.index || '',
            od: { ...emptyRx(), ...ln.od }, os: { ...emptyRx(), ...ln.os },
        })),
    };
}

export const frameItemName = (fr: InvoiceFrame) => `Gọng: ${fr.name}${fr.code ? ` (${fr.code})` : ''}`;
export const lensItemName = (ln: InvoiceLens) => `Tròng: ${ln.name}${ln.index ? ` - CS ${ln.index}` : ''}`;

/** Sinh mảng items (tương thích lịch sử/thống kê cũ) từ gọng + tròng */
export function buildInvoiceItems(
    frame?: InvoiceFrame, lens?: InvoiceLens, extraFrames: InvoiceFrame[] = [], extraLenses: InvoiceLens[] = [],
): InvoiceItem[] {
    const items: InvoiceItem[] = [];
    if (frame) {
        items.push({ itemId: '', name: frameItemName(frame), quantity: 1, costPrice: 0, price: frame.price, category: 'frame' });
    }
    if (lens) {
        items.push({ itemId: '', name: lensItemName(lens), quantity: 1, costPrice: 0, price: lens.price, isLens: true, category: 'lens' });
    }
    extraFrames.forEach(fr => items.push({ itemId: '', name: frameItemName(fr), quantity: 1, costPrice: 0, price: fr.price, category: 'frame' }));
    extraLenses.forEach(ln => items.push({ itemId: '', name: lensItemName(ln), quantity: 1, costPrice: 0, price: ln.price, isLens: true, category: 'lens' }));
    return items;
}

/** Hóa đơn mới (nhập form) hay hóa đơn cũ (chọn từ kho) */
export const isFormInvoice = (inv: Invoice) => !!(inv.frame || inv.lens);

/** Phân loại 1 dòng hàng — hóa đơn cũ tra theo kho để biết là gọng/tròng */
export function classifyItem(item: InvoiceItem, inventory: InventoryItem[]): 'frame' | 'lens' | 'other' {
    if (item.category) return item.category;
    if (item.isLens) return 'lens';
    const inv = inventory.find(i => i.id === item.itemId);
    if (inv?.category === 'lens') return 'lens';
    if (inv?.category === 'frame') return 'frame';
    return 'other';
}

export interface RevenueSplit { frame: number; lens: number; other: number; frameCount: number; lensCount: number }

export function invoiceRevenueSplit(inv: Invoice, inventory: InventoryItem[]): RevenueSplit {
    const r: RevenueSplit = { frame: 0, lens: 0, other: 0, frameCount: 0, lensCount: 0 };
    (inv.items || []).forEach(item => {
        const amount = (item.price || 0) * (item.quantity || 0);
        const cat = classifyItem(item, inventory);
        r[cat] += amount;
        if (cat === 'frame') r.frameCount += item.quantity || 0;
        if (cat === 'lens') r.lensCount += item.quantity || 0;
    });
    // Hóa đơn mới: 1 cặp tròng tính là 1
    if (inv.lens) r.lensCount = 1 + (inv.extraLenses || []).length;
    return r;
}

export interface FrameLine { name: string; code: string; material: string; quantity: number; price: number; amount: number }
export interface LensLine { name: string; index: string; eye: string; od?: LensRx; os?: LensRx; quantity: number; price: number; amount: number }

export function getFrameLines(inv: Invoice, inventory: InventoryItem[]): FrameLine[] {
    if (inv.frame) {
        return [inv.frame, ...(inv.extraFrames || [])].map(fr => ({
            name: fr.name, code: fr.code, material: fr.material, quantity: 1, price: fr.price, amount: fr.price,
        }));
    }
    if (isFormInvoice(inv)) return [];
    return (inv.items || []).filter(it => classifyItem(it, inventory) === 'frame').map(it => {
        const src = inventory.find(i => i.id === it.itemId);
        return {
            name: it.name, code: src?.code || '', material: src?.specs?.material || '',
            quantity: it.quantity, price: it.price, amount: it.price * it.quantity,
        };
    });
}

export function getLensLines(inv: Invoice, inventory: InventoryItem[]): LensLine[] {
    if (inv.lens) {
        return [inv.lens, ...(inv.extraLenses || [])].map(ln => ({
            name: ln.name, index: ln.index, eye: '2 mắt', od: ln.od, os: ln.os,
            quantity: 1, price: ln.price, amount: ln.price,
        }));
    }
    if (isFormInvoice(inv)) return [];
    return (inv.items || []).filter(it => classifyItem(it, inventory) === 'lens').map(it => {
        const src = inventory.find(i => i.id === it.itemId);
        const rx: LensRx = { sph: String(src?.specs?.sph ?? ''), cyl: String(src?.specs?.cyl ?? ''), axis: '', add: String(src?.specs?.add ?? '') };
        return {
            name: it.name, index: src?.specs?.material || '', eye: it.eye || '',
            od: it.eye === 'OD' ? rx : undefined, os: it.eye === 'OS' ? rx : undefined,
            quantity: it.quantity, price: it.price, amount: it.price * it.quantity,
        };
    });
}

/** "-2.00 / -0.75 x 180 / ADD +1.50" — bỏ qua phần trống */
export function formatRx(rx?: LensRx): string {
    if (!rx) return '';
    const parts: string[] = [];
    if (rx.sph) parts.push(`SPH ${rx.sph}`);
    if (rx.cyl) parts.push(`CYL ${rx.cyl}`);
    if (rx.axis) parts.push(`AX ${rx.axis}`);
    if (rx.add) parts.push(`ADD ${rx.add}`);
    return parts.join(' ');
}

/* ===== Gợi ý gọng / tròng từ các hóa đơn đã lưu ===== */
export interface FrameSuggestionData { name: string; code: string; price: number; material: string }
export interface LensSuggestionData { name: string; price: number; index: string }
export interface GlassesSuggestions {
    frames: { key: string; name: string; code: string; detail: string; data: FrameSuggestionData }[];
    lenses: { key: string; name: string; detail: string; data: LensSuggestionData }[];
}

const keyOf = (...parts: string[]) => parts.map(p => (p || '').trim().toLowerCase()).join('|');

/** Gom gọng/tròng đã từng bán — trùng thì lấy lần bán gần nhất, xếp theo số lần bán rồi mới nhất */
export function buildGlassesSuggestions(invoices: Invoice[], inventory: InventoryItem[] = []): GlassesSuggestions {
    const frames = new Map<string, { data: FrameSuggestionData; date: number; count: number }>();
    const lenses = new Map<string, { data: LensSuggestionData; date: number; count: number }>();
    const addFrame = (data: FrameSuggestionData, date: number) => {
        const k = keyOf(data.name, data.code);
        const prev = frames.get(k);
        if (!prev) frames.set(k, { data, date, count: 1 });
        else { prev.count++; if (date >= prev.date) { prev.data = data; prev.date = date; } }
    };
    const addLens = (data: LensSuggestionData, date: number) => {
        const k = keyOf(data.name, data.index);
        const prev = lenses.get(k);
        if (!prev) lenses.set(k, { data, date, count: 1 });
        else { prev.count++; if (date >= prev.date) { prev.data = data; prev.date = date; } }
    };
    for (const inv of invoices) {
        const date = inv.date || 0;
        if (!inv.frame && !inv.lens) {
            // Hóa đơn kiểu cũ (lập từ kho): lấy tên từ các dòng hàng
            const lensGroups = new Map<string, LensSuggestionData>();
            for (const it of inv.items || []) {
                const cat = classifyItem(it, inventory);
                const stock = inventory.find(x => x.id === it.itemId);
                if (cat === 'frame' && it.name?.trim()) {
                    addFrame({ name: it.name.trim(), code: (stock?.code || '').trim(), price: it.price || 0, material: (stock?.specs?.material || '').trim() }, date);
                } else if (cat === 'lens' && it.name?.trim()) {
                    // "Essilor Crizal (OD)" + "Essilor Crizal (OS)" = 1 cặp tròng, giá = tổng 2 mắt
                    const name = it.name.replace(/\s*\((OD|OS|MP|MT)\)\s*$/i, '').trim();
                    const g = lensGroups.get(name.toLowerCase());
                    const amount = (it.price || 0) * (it.quantity || 1);
                    // Kho cũ để chiết suất ở specs.material — chỉ lấy khi là số (1.56, 1.60...)
                    const idx = (stock?.specs?.material || '').trim();
                    if (g) g.price += amount;
                    else lensGroups.set(name.toLowerCase(), { name, price: amount, index: /^\d/.test(idx) ? idx : '' });
                }
            }
            lensGroups.forEach(l => addLens(l, date));
            continue;
        }
        const fr = inv.frame;
        if (fr && fr.name?.trim()) {
            addFrame({ name: fr.name.trim(), code: (fr.code || '').trim(), price: fr.price || 0, material: (fr.material || '').trim() }, date);
        }
        const ln = inv.lens;
        if (ln && ln.name?.trim()) {
            addLens({ name: ln.name.trim(), price: ln.price || 0, index: (ln.index || '').trim() }, date);
        }
    }
    const order = <V extends { date: number; count: number }>(a: V, b: V) => b.count - a.count || b.date - a.date;
    const money = (n: number) => (n ? `${formatMoney(n)} đ` : '');
    return {
        frames: [...frames.entries()].map(([key, v]) => ({ key, ...v })).sort(order).map(v => ({
            key: v.key, name: v.data.name, code: v.data.code, data: v.data,
            detail: [v.data.code && `Mã ${v.data.code}`, money(v.data.price), v.data.material].filter(Boolean).join(' · '),
        })),
        lenses: [...lenses.entries()].map(([key, v]) => ({ key, ...v })).sort(order).map(v => ({
            key: v.key, name: v.data.name, data: v.data,
            detail: [v.data.index && `Chiết suất ${v.data.index}`, money(v.data.price)].filter(Boolean).join(' · '),
        })),
    };
}
