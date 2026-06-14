import type { InventoryItem } from '../types';

/** Local date as YYYY-MM-DD (avoids UTC timezone bugs) */
export function getLocalDateString(date: Date | number = new Date()): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isSameLocalDay(timestamp: number, dateStr?: string): boolean {
    return getLocalDateString(timestamp) === (dateStr || getLocalDateString());
}

export function isPatientActiveToday(p: { timestamp: number; status: string }): boolean {
    if (!isSameLocalDay(p.timestamp)) return false;
    return p.status !== 'completed';
}

/** Detect seed/mock data from scripts/seedData.js */
export function isLikelySeedData(patients: { fullName?: string; phone?: string }[]): boolean {
    if (patients.length < 50) return false;
    const seedNames = ['Nguyễn Văn An', 'Nguyen Van An', 'Trần Thị Bình'];
    const seedCount = patients.filter(p =>
        seedNames.some(n => p.fullName?.includes(n))
    ).length;
    return seedCount >= 3;
}

export function parseRxValue(val: string | number | undefined): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'string' && val.toLowerCase() === 'plano') return 0;
    return parseFloat(String(val)) || 0;
}

export function rxMatches(
    itemSph: number, itemCyl: number, itemAdd: number,
    rxSph: number, rxCyl: number, rxAdd: number
): boolean {
    const sphMatch = Math.abs(itemSph - rxSph) <= 0.25;
    const cylMatch = Math.abs(itemCyl - rxCyl) <= 0.25;
    const addMatch = rxAdd === 0 || Math.abs(itemAdd - rxAdd) <= 0.25;
    return sphMatch && cylMatch && addMatch;
}

export function findSamePriceLensPairs(odLenses: InventoryItem[], osLenses: InventoryItem[]) {
    const priceMap = new Map<number, { od: InventoryItem[]; os: InventoryItem[] }>();
    for (const od of odLenses) {
        for (const os of osLenses) {
            if (od.price !== os.price) continue;
            const g = priceMap.get(od.price) || { od: [], os: [] };
            if (!g.od.some(l => l.id === od.id)) g.od.push(od);
            if (!g.os.some(l => l.id === os.id)) g.os.push(os);
            priceMap.set(od.price, g);
        }
    }
    return Array.from(priceMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([price, groups]) => ({ price, ...groups }));
}

export function groupLensesByPrice(lenses: { id: string; code: string; name: string; price: number; specs?: any; quantity: number }[]) {
    const groups = new Map<number, typeof lenses>();
    for (const lens of lenses) {
        const list = groups.get(lens.price) || [];
        list.push(lens);
        groups.set(lens.price, list);
    }
    return Array.from(groups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([price, items]) => ({ price, items }));
}

export function parseLensSpecs(specs: { sph?: string | number; cyl?: string | number; add?: string | number } | undefined) {
    let itemSph = 0;
    if (specs?.sph !== undefined) {
        if (typeof specs.sph === 'string' && specs.sph.toLowerCase() === 'plano') {
            itemSph = 0;
        } else {
            itemSph = parseFloat(String(specs.sph)) || 0;
        }
    }
    const itemCyl = parseRxValue(specs?.cyl);
    const itemAdd = parseRxValue(specs?.add);
    return { itemSph, itemCyl, itemAdd };
}
