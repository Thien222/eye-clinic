import { Patient, InventoryItem, Invoice, SyncMeta } from '../types';

export const DEFAULT_SYNC_META: SyncMeta = {
    version: 0,
    lastUpdated: 0,
    deletedPatientIds: []
};

export function mergeSyncMeta(local?: SyncMeta, remote?: SyncMeta): SyncMeta {
    const l = local || DEFAULT_SYNC_META;
    const r = remote || DEFAULT_SYNC_META;
    return {
        version: Math.max(l.version || 0, r.version || 0),
        lastUpdated: Math.max(l.lastUpdated || 0, r.lastUpdated || 0),
        deletedPatientIds: Array.from(new Set([
            ...(l.deletedPatientIds || []),
            ...(r.deletedPatientIds || [])
        ])).slice(-5000)
    };
}

/** Loại BN đã xóa khỏi mọi snapshot trước khi lưu/gửi */
export function applyTombstones<T extends { patients?: Patient[]; syncMeta?: SyncMeta }>(data: T): T {
    const deleted = new Set(data.syncMeta?.deletedPatientIds || []);
    if (deleted.size === 0) return data;
    return {
        ...data,
        patients: (data.patients || []).filter(p => !deleted.has(p.id))
    };
}

export function mergePatients(local: Patient[], remote: Patient[], deletedIds: string[]): Patient[] {
    const deletedSet = new Set(deletedIds || []);
    const map = new Map<string, Patient>();

    for (const p of local || []) {
        if (!deletedSet.has(p.id)) map.set(p.id, p);
    }
    for (const p of remote || []) {
        if (deletedSet.has(p.id)) continue;
        const existing = map.get(p.id);
        const pUpdated = p.updatedAt || p.timestamp || 0;
        const eUpdated = existing ? (existing.updatedAt || existing.timestamp || 0) : 0;
        if (!existing || pUpdated > eUpdated) map.set(p.id, p);
    }
    return Array.from(map.values());
}

/** Không cho mảng rỗng từ client ghi đè kho/hóa đơn server */
export function mergeInventory(local: InventoryItem[], remote?: InventoryItem[]): InventoryItem[] {
    if (!remote || remote.length === 0) return local || [];
    if (!local || local.length === 0) return remote;
    const map = new Map<string, InventoryItem>();
    for (const i of remote) map.set(i.id, i);
    for (const i of local) map.set(i.id, i);
    return Array.from(map.values());
}

export function mergeInvoices(local: Invoice[], remote?: Invoice[]): Invoice[] {
    if (!remote || remote.length === 0) return local || [];
    if (!local || local.length === 0) return remote;
    const map = new Map<string, Invoice>();
    for (const i of remote) map.set(i.id, i);
    for (const i of local) map.set(i.id, i);
    return Array.from(map.values());
}

export function computeDataHash(data: {
    patients?: Patient[];
    inventory?: InventoryItem[];
    invoices?: Invoice[];
    syncMeta?: SyncMeta;
}): string {
    const patients = data.patients || [];
    const ids = patients.map(p => `${p.id}:${p.updatedAt || p.timestamp}:${p.status}`).sort().join('|');
    const deleted = (data.syncMeta?.deletedPatientIds || []).length;
    const invSig = (data.inventory || []).map(i => `${i.id}:${i.quantity}`).sort().join('|');
    const invSig2 = (data.invoices || []).map(i => `${i.id}:${i.total}`).sort().join('|');
    return `${patients.length}:${deleted}:${ids}:${invSig}:${invSig2}:${data.syncMeta?.version || 0}:${data.syncMeta?.lastUpdated || 0}`;
}

export function sanitizeIncomingData(data: any) {
    const { backupTime, backupReason, ...rest } = data || {};
    if (!rest.syncMeta) rest.syncMeta = { ...DEFAULT_SYNC_META };
    return rest;
}
