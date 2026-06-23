import Dexie, { Table } from 'dexie';
import { Patient, InventoryItem, Invoice, ClinicSettings, SyncMeta } from '../types';
import { getLocalDateString, isLikelySeedData } from './utils';
import {
    DEFAULT_SYNC_META,
    mergeSyncMeta,
    applyTombstones,
    mergePatients,
    mergeInventory,
    mergeInvoices,
    computeDataHash,
    sanitizeIncomingData
} from './syncHelpers';

export type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'offline';

const SYNC_META_KEY = 'syncMeta';

// ============ INITIAL DATA ============
const INITIAL_INVENTORY: InventoryItem[] = [
    { id: '1', code: 'LENS001', category: 'lens', name: 'Essilor Crizal', specs: { sph: -2.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 280000, quantity: 50, minStock: 10 },
    { id: '2', code: 'LENS002', category: 'lens', name: 'Chemi U2', specs: { sph: -2.00, cyl: -0.50, material: '1.60', type: 'single' }, costPrice: 120000, price: 180000, quantity: 7, minStock: 10 },
    { id: '3', code: 'LENS003', category: 'lens', name: 'Hoya BlueControl', specs: { sph: -4.00, cyl: 0, material: '1.67', type: 'single' }, costPrice: 550000, price: 850000, quantity: 20, minStock: 5 },
    { id: '4', code: 'FRAME001', category: 'frame', name: 'Rayban Aviator', specs: { material: 'Metal' }, costPrice: 900000, price: 1500000, quantity: 12, minStock: 3 },
    { id: '5', code: 'FRAME002', category: 'frame', name: 'Nhựa Dẻo Hàn Quốc', specs: { material: 'Plastic' }, costPrice: 150000, price: 300000, quantity: 100, minStock: 20 },
    { id: '6', code: 'MED001', category: 'medicine', name: 'V.Rohto', costPrice: 35000, price: 50000, quantity: 200, minStock: 50 },
    { id: '7', code: 'MED002', category: 'medicine', name: 'Tobradex', costPrice: 60000, price: 85000, quantity: 40, minStock: 10 },
    { id: '8', code: 'MED003', category: 'medicine', name: 'Systane Ultra', costPrice: 85000, price: 120000, quantity: 30, minStock: 10 },
];

const DEFAULT_SETTINGS: ClinicSettings = {
    name: 'Phòng Khám Mắt Ngoài Giờ',
    adminPassword: 'admin123',
    address: 'Vinh Thuan - Kien Giang',
    phone: '0917416421',
    email: 'huatrungkien@gmail.com',
    doctorName: 'BSCKII. Hua Trung Kien',
    printTemplates: {
        receiptHeader: 'HÓA ĐƠN BÁN LẺ',
        receiptFooter: 'Cảm ơn quý khách!',
        prescriptionHeader: 'ĐƠN KÍNH THUỐC',
        prescriptionFooter: 'Bác sĩ / KTV Khúc Xạ'
    }
};

// ============ DEXIE DATABASE CLASS ============
class EyeClinicDatabase extends Dexie {
    patients!: Table<Patient, string>;
    inventory!: Table<InventoryItem, string>;
    invoices!: Table<Invoice, string>;
    settings!: Table<ClinicSettings & { id: string }, string>;
    dailyTicket!: Table<{ id: string; date: string; count: number }, string>;

    constructor() {
        super('EyeClinicDB');
        this.version(1).stores({
            patients: 'id, ticketNumber, fullName, phone, status, timestamp',
            inventory: 'id, code, category, name',
            invoices: 'id, patientId, date',
            settings: 'id',
            dailyTicket: 'id'
        });
    }
}

// ============ DATABASE SERVICE ============
class DatabaseService {
    private dexieDb: EyeClinicDatabase;
    private _initialized = false;
    private _initPromise: Promise<void> | null = null;

    // Memory cache for sync reads
    private _patientsCache: Patient[] = [];
    private _inventoryCache: InventoryItem[] = [];
    private _invoicesCache: Invoice[] = [];
    private _settingsCache: ClinicSettings | null = null;

    // Socket.io connection
    private socket: any = null;
    private _syncReady = false;
    private _syncMeta: SyncMeta = { ...DEFAULT_SYNC_META };
    private _connectionStatus: ConnectionStatus = 'offline';
    private _dataHash = '';
    private _pollingInterval: ReturnType<typeof setInterval> | null = null;
    private _heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private _pendingPush = false;
    private _pushInFlight = false;
    private _importQueue: Promise<void> = Promise.resolve();
    private _lastImportedVersion = 0;
    /** Sửa cục bộ chưa kịp lên server — snapshot socket không được ghi đè */
    private _localEdits = new Map<string, number>();
    private static readonly LOCAL_EDIT_TTL_MS = 8000;

    constructor() {
        this.dexieDb = new EyeClinicDatabase();
        this._initPromise = this.initialize();
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flushToServerSync());
        }
    }

    private async initialize() {
        if (this._initialized) return;

        try {
            await this.dexieDb.open();
            await this.migrateFromLocalStorage();

            // Load initial inventory if empty
            const inventoryCount = await this.dexieDb.inventory.count();
            if (inventoryCount === 0) {
                await this.dexieDb.inventory.bulkAdd(INITIAL_INVENTORY);
            }

            // Load initial settings if empty
            const settingsCount = await this.dexieDb.settings.count();
            if (settingsCount === 0) {
                await this.dexieDb.settings.add({ ...DEFAULT_SETTINGS, id: 'main' });
            }

            await this.refreshCache();
            await this.loadSyncMeta();
            this.touchLocalDataHash();
            this.runEndOfDayCleanup();
            this._initialized = true;
            console.log('[DB] IndexedDB initialized successfully');

            // Connect to Socket.io for real-time sync
            this.connectSocket();
        } catch (e) {
            console.error('[DB] Failed to initialize:', e);
        }
    }

    private async migrateFromLocalStorage() {
        const prefixes = ['clinic_', 'eyeclinic_'];
        const dataTypes = ['patients', 'inventory', 'invoices'];
        const keysToRemove: string[] = [];

        for (const prefix of prefixes) {
            for (const type of dataTypes) {
                const key = prefix + type;
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        const table = (this.dexieDb as any)[type];
                        const count = await table.count();
                        if (count === 0 && parsed.length > 0) {
                            if (type === 'patients' && isLikelySeedData(parsed)) {
                                console.warn('[DB] Skipped seed/mock patient migration');
                                keysToRemove.push(key);
                                continue;
                            }
                            await table.bulkAdd(parsed);
                            console.log(`[DB] Migrated ${parsed.length} ${type} from localStorage`);
                        }
                        keysToRemove.push(key);
                    } catch (e) {
                        console.error(`[DB] Failed to migrate ${type}:`, e);
                    }
                }
            }
        }

        const settingsData = localStorage.getItem('clinic_settings');
        if (settingsData) {
            try {
                const settings = JSON.parse(settingsData);
                const count = await this.dexieDb.settings.count();
                if (count === 0) {
                    await this.dexieDb.settings.add({ ...settings, id: 'main' });
                }
                keysToRemove.push('clinic_settings');
            } catch (e) { }
        }

        keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    private async loadSyncMeta() {
        try {
            const stored = await this.dexieDb.settings.get(SYNC_META_KEY);
            if (stored) {
                const { id, ...meta } = stored as any;
                this._syncMeta = { ...DEFAULT_SYNC_META, ...meta };
            }
        } catch (e) { }
    }

    private async saveSyncMeta() {
        await this.dexieDb.settings.put({ ...this._syncMeta, id: SYNC_META_KEY });
    }

    private setConnectionStatus(status: ConnectionStatus) {
        if (this._connectionStatus !== status) {
            this._connectionStatus = status;
            window.dispatchEvent(new CustomEvent('clinic-connection-status', { detail: status }));
        }
    }

    getConnectionStatus(): ConnectionStatus {
        return this._connectionStatus;
    }

    private computeDataHash(data: any): string {
        return computeDataHash(data);
    }

    private touchLocalDataHash() {
        this._dataHash = this.computeDataHash({
            patients: this._patientsCache,
            inventory: this._inventoryCache,
            invoices: this._invoicesCache,
            syncMeta: this._syncMeta
        });
    }

    private localEditKey(scope: 'patient' | 'inventory' | 'invoice' | 'settings', id: string): string {
        return `${scope}:${id}`;
    }

    private markLocalEdit(scope: 'patient' | 'inventory' | 'invoice' | 'settings', id: string) {
        this._localEdits.set(this.localEditKey(scope, id), Date.now() + DatabaseService.LOCAL_EDIT_TTL_MS);
    }

    private isLocalEditGuarded(scope: 'patient' | 'inventory' | 'invoice' | 'settings', id: string): boolean {
        const key = this.localEditKey(scope, id);
        const expiry = this._localEdits.get(key);
        if (!expiry) return false;
        if (Date.now() > expiry) {
            this._localEdits.delete(key);
            return false;
        }
        return true;
    }

    private pruneExpiredLocalEdits() {
        const now = Date.now();
        for (const [key, expiry] of this._localEdits) {
            if (now > expiry) this._localEdits.delete(key);
        }
    }

    private applyEditGuards<T extends { id: string }>(
        merged: T[],
        localCache: T[],
        scope: 'patient' | 'inventory' | 'invoice'
    ): T[] {
        this.pruneExpiredLocalEdits();
        const prefix = `${scope}:`;
        const guardedIds: string[] = [];
        for (const [key, expiry] of this._localEdits) {
            if (key.startsWith(prefix) && Date.now() <= expiry) {
                guardedIds.push(key.slice(prefix.length));
            }
        }
        if (guardedIds.length === 0) return merged;

        const map = new Map(merged.map(item => [item.id, item]));
        for (const id of guardedIds) {
            const local = localCache.find(item => item.id === id);
            if (local) map.set(id, local);
            else map.delete(id);
        }
        return Array.from(map.values());
    }

    private afterLocalMutation(
        edits: Array<{ scope: 'patient' | 'inventory' | 'invoice' | 'settings'; id: string }>,
        persist?: Promise<unknown>
    ) {
        for (const { scope, id } of edits) this.markLocalEdit(scope, id);
        this.touchLocalDataHash();
        this.notifyUpdate();
        if (persist !== undefined) this.scheduleEmitAfterDexie(persist);
    }

    private touchSyncMeta() {
        this._syncMeta.version = (this._syncMeta.version || 0) + 1;
        this._syncMeta.lastUpdated = Date.now();
        this.saveSyncMeta();
    }

    /** UI cập nhật ngay; đẩy server sau khi Dexie ghi xong */
    private scheduleEmitAfterDexie(persist: Promise<unknown>): void {
        void persist
            .then(() => this.emitUpdate())
            .catch((e) => {
                console.error('[DB] Dexie write failed:', e);
                this.emitUpdate();
            });
    }

    private stopPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    }

    private buildExportPayload() {
        return applyTombstones({
            patients: this._patientsCache,
            inventory: this._inventoryCache,
            invoices: this._invoicesCache,
            settings: this._settingsCache,
            syncMeta: this._syncMeta
        });
    }

    private flushToServerSync() {
        try {
            const payload = this.buildExportPayload();
            navigator.sendBeacon('/api/database', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        } catch { /* ignore */ }
    }

    /** Auto-complete unfinished patients from previous days */
    runEndOfDayCleanup() {
        const today = getLocalDateString();
        const lastEod = localStorage.getItem('clinic_last_eod');

        if (lastEod === today) return;

        const activeStatuses = ['waiting_refraction', 'processing_refraction', 'waiting_doctor', 'processing_doctor', 'waiting_billing'];
        let changed = false;

        this._patientsCache = this._patientsCache.map(p => {
            const patientDay = getLocalDateString(p.timestamp);
            if (patientDay < today && activeStatuses.includes(p.status)) {
                changed = true;
                return { ...p, status: 'completed' as const, updatedAt: Date.now() };
            }
            return p;
        });

        if (changed) {
            this._patientsCache.forEach(p => this.dexieDb.patients.put(p));
            this.touchSyncMeta();
            this.emitUpdate();
            this.notifyUpdate();
            console.log('[DB] End-of-day: auto-completed stale patients');
        }

        localStorage.setItem('clinic_last_eod', today);
    }

    private mergePatientsLocal(local: Patient[], remote: Patient[]): Patient[] {
        const merged = mergePatients(local, remote, this._syncMeta.deletedPatientIds);
        return this.applyEditGuards(merged, this._patientsCache, 'patient');
    }

    private mergeInventoryLocal(local: InventoryItem[], remote: InventoryItem[]): InventoryItem[] {
        const merged = mergeInventory(local, remote);
        return this.applyEditGuards(merged, this._inventoryCache, 'inventory');
    }

    private mergeInvoicesLocal(local: Invoice[], remote: Invoice[]): Invoice[] {
        const merged = mergeInvoices(local, remote);
        return this.applyEditGuards(merged, this._invoicesCache, 'invoice');
    }

    private applyIncomingSyncMeta(remote?: SyncMeta) {
        if (!remote) return;
        this._syncMeta = mergeSyncMeta(this._syncMeta, remote);
        this.saveSyncMeta();
    }

    private async refreshCache() {
        this._patientsCache = await this.dexieDb.patients.toArray();
        this._inventoryCache = await this.dexieDb.inventory.toArray();
        this._invoicesCache = await this.dexieDb.invoices.toArray();
        const settings = await this.dexieDb.settings.get('main');
        this._settingsCache = settings || DEFAULT_SETTINGS;
    }

    private async ensureReady() {
        if (!this._initialized && this._initPromise) {
            await this._initPromise;
        }
    }

    // ============ SOCKET.IO CONNECTION ============
    private connectSocket() {
        try {
            // Determine socket URL based on current location
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const host = window.location.hostname;
            const port = window.location.port || '3001';

            // Always connect to port 3001 (sync server)
            const socketUrl = `${protocol}//${host}:3001`;
            console.log('[Socket] Connecting to:', socketUrl);

            // Socket.io client từ server local (không phụ thuộc CDN — nhanh hơn trên LAN)
            const socketScriptUrl = `${socketUrl}/socket.io/socket.io.min.js`;

            if (typeof (window as any).io === 'undefined') {
                const script = document.createElement('script');
                script.src = socketScriptUrl;
                script.onload = () => this.initSocket(socketUrl);
                script.onerror = () => {
                    console.log('[Socket] Failed to load local socket.io, using polling');
                    this.startPolling();
                };
                document.head.appendChild(script);
            } else {
                this.initSocket(socketUrl);
            }
        } catch (e) {
            console.log('[DB] Socket.io not available, using polling');
            this.startPolling();
        }
    }

    private initSocket(url: string) {
        try {
            console.log('[Socket] Initializing connection to:', url);

            this.socket = (window as any).io(url, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 500,
                reconnectionDelayMax: 3000,
                timeout: 8000
            });

            this.socket.on('connect', async () => {
                console.log('[Socket] ✓ Connected to server:', this.socket.id);
                this.setConnectionStatus('connected');
                this.stopPolling();
                await this.pushLocalIfNewer();
                this.startHeartbeat();
                setTimeout(() => {
                    if (!this._syncReady) {
                        this._syncReady = true;
                        this.flushPendingPush();
                        console.log('[Socket] Sync ready (timeout fallback)');
                    }
                }, 500);
            });

            this.socket.on('data-updated', async (data: any) => {
                console.log('[Socket] ⬇ Received data update from server');
                this.setConnectionStatus('syncing');
                await this.importDataAsync(data, true);
                this._syncReady = true;
                this.setConnectionStatus('connected');
            });

            this.socket.on('disconnect', (reason: string) => {
                console.log('[Socket] ✗ Disconnected:', reason);
                this.setConnectionStatus('disconnected');
                this.stopHeartbeat();
                if (!this._pollingInterval) this.startPolling();
            });

            this.socket.on('connect_error', (error: any) => {
                console.log('[Socket] Connection error:', error.message);
                this.setConnectionStatus('offline');
                if (!this._pollingInterval) this.startPolling();
            });
        } catch (e) {
            console.log('[DB] Socket init failed, using polling');
            this.startPolling();
        }
    }

    private startHeartbeat() {
        if (this._heartbeatInterval) return;
        this._heartbeatInterval = setInterval(() => this.sendHeartbeat(), 60000);
    }

    private stopHeartbeat() {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
    }

    private async sendHeartbeat() {
        try {
            const payload = this.buildExportPayload();
            await fetch('/api/sync/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, lastUpdated: this._syncMeta.lastUpdated })
            });
        } catch { /* offline */ }
    }

    /** Đẩy dữ liệu local lên server nếu mới hơn (tránh bị snapshot cũ ghi đè) */
    private async pushLocalIfNewer() {
        try {
            const res = await fetch('/api/database');
            if (!res.ok) return;
            const server = sanitizeIncomingData(await res.json());
            const localNewer = (this._syncMeta.lastUpdated || 0) > (server.syncMeta?.lastUpdated || 0)
                || (this._syncMeta.deletedPatientIds?.length || 0) > (server.syncMeta?.deletedPatientIds?.length || 0);
            if (localNewer) {
                console.log('[DB] Local newer than server — pushing before accept');
                await this.pushToServer();
            }
        } catch { /* server offline */ }
    }

    private flushPendingPush() {
        if (this._pendingPush) {
            this._pendingPush = false;
            this.emitUpdate();
        }
    }

    private startPolling() {
        if (this._pollingInterval) return;
        this._pollingInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/database');
                if (!res.ok) {
                    this.setConnectionStatus('offline');
                    return;
                }
                const data = await res.json();
                if (!this._syncReady) {
                    this._syncReady = true;
                }
                const hash = this.computeDataHash(data);

                if (hash !== this._dataHash) {
                    this.setConnectionStatus('syncing');
                    await this.importDataAsync(data, true);
                    this._syncReady = true;
                    this.setConnectionStatus(this.socket?.connected ? 'connected' : 'disconnected');
                    this.notifyUpdate();
                } else if (!this.socket?.connected) {
                    this.setConnectionStatus('disconnected');
                }
            } catch (e) {
                this.setConnectionStatus('offline');
            }
        }, 3000);
    }

    // Emit update via socket
    private emitUpdate() {
        this.touchSyncMeta();

        if (!this._syncReady) {
            this._pendingPush = true;
            console.log('[Socket] Queued push — waiting for initial server sync');
            return;
        }

        const data = this.buildExportPayload();
        this._dataHash = this.computeDataHash(data);

        // Chọn 1 kênh chính để tránh server xử lý/lưu/broadcast 2 lần:
        // - Socket khi đã kết nối (realtime, broadcast tức thì).
        // - REST chỉ làm fallback khi socket chưa kết nối (offline/đang reconnect).
        if (this.socket && this.socket.connected) {
            console.log('[Socket] ⬆ Sending data update to server, patients:', data.patients.length);
            this.socket.emit('data-changed', data);
        } else {
            this.pushToServer();
        }
    }

    private async pushToServer() {
        if (this._pushInFlight) return;
        this._pushInFlight = true;
        try {
            const payload = this.buildExportPayload();
            const res = await fetch('/api/database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const result = await res.json();
                if (result.syncMeta) {
                    this._syncMeta = mergeSyncMeta(this._syncMeta, result.syncMeta);
                    this.saveSyncMeta();
                }
            }
        } catch { /* offline */ }
        finally {
            this._pushInFlight = false;
        }
    }

    /** Xóa BN — gọi API server trước, retry 3 lần */
    private async syncDeletePatient(id: string): Promise<boolean> {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const res = await fetch(`/api/sync/delete-patient/${encodeURIComponent(id)}`, { method: 'POST' });
                if (res.ok) {
                    const result = await res.json();
                    if (result.syncMeta) {
                        this._syncMeta = mergeSyncMeta(this._syncMeta, result.syncMeta);
                        this.saveSyncMeta();
                    }
                    return true;
                }
            } catch { /* retry */ }
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
        return false;
    }

    // Notify UI of updates
    private notifyUpdate() {
        window.dispatchEvent(new Event('clinic-db-updated'));
    }

    // ============ SETTINGS ============
    getSettings(): ClinicSettings {
        return this._settingsCache || DEFAULT_SETTINGS;
    }

    async getSettingsAsync(): Promise<ClinicSettings> {
        await this.ensureReady();
        const settings = await this.dexieDb.settings.get('main');
        return settings || DEFAULT_SETTINGS;
    }

    saveSettings(settings: ClinicSettings): void {
        const withTs = { ...settings, settingsUpdatedAt: Date.now() };
        this._settingsCache = withTs;
        this.afterLocalMutation([{ scope: 'settings', id: 'main' }], this.dexieDb.settings.put({ ...withTs, id: 'main' }));
    }

    private mergeSettings(local: ClinicSettings | null, remote: ClinicSettings): ClinicSettings {
        const localTs = local?.settingsUpdatedAt || 0;
        const remoteTs = remote.settingsUpdatedAt || 0;
        return remoteTs >= localTs ? remote : (local || remote);
    }

    // ============ EXPORT/IMPORT ============
    exportData(): string {
        return JSON.stringify(this.buildExportPayload());
    }

    async exportDataAsync(): Promise<string> {
        await this.ensureReady();
        const [patients, inventory, invoices, settings] = await Promise.all([
            this.dexieDb.patients.toArray(),
            this.dexieDb.inventory.toArray(),
            this.dexieDb.invoices.toArray(),
            this.dexieDb.settings.get('main')
        ]);
        return JSON.stringify(applyTombstones({
            patients,
            inventory,
            invoices,
            settings,
            syncMeta: this._syncMeta
        }));
    }

    importData(jsonString: string): boolean {
        try {
            const data = JSON.parse(jsonString);
            this.importDataAsync(data, false, true);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /** Như importData nhưng ĐỢI ghi xong IndexedDB rồi mới trả về — dùng trước khi reload trang. */
    async importDataAndWait(jsonString: string): Promise<boolean> {
        try {
            const data = JSON.parse(jsonString);
            return await this.importDataAsync(data, false, true);
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /** Nạp dữ liệu test từ server hoặc file */
    async loadTestData(): Promise<boolean> {
        try {
            const res = await fetch('/api/test-data/load', { method: 'POST' });
            if (res.ok) {
                const result = await res.json();
                if (result.data) {
                    await this.importDataAsync(result.data, true, true);
                    return true;
                }
            }
            const fileRes = await fetch('/data/test-data.json');
            if (fileRes.ok) {
                const data = await fileRes.json();
                await this.importDataAsync(data, false, true);
                return true;
            }
        } catch (e) {
            console.error('[DB] loadTestData failed:', e);
        }
        return false;
    }

    private sanitizeIncomingData(data: any) {
        return sanitizeIncomingData(data);
    }

    async importDataAsync(data: any, fromSocket: boolean = false, forceReplace: boolean = false): Promise<boolean> {
        let result = false;
        this._importQueue = this._importQueue
            .then(() => this.importDataAsyncImpl(data, fromSocket, forceReplace))
            .then((ok) => { result = ok; })
            .catch((e) => {
                console.error('[DB] Import queue error:', e);
                result = false;
            });
        await this._importQueue;
        return result;
    }

    private async importDataAsyncImpl(data: any, fromSocket: boolean = false, forceReplace: boolean = false): Promise<boolean> {
        try {
            await this.ensureReady();
            data = sanitizeIncomingData(data);
            data = applyTombstones(data);

            const incomingVersion = data.syncMeta?.version || 0;
            const incomingHash = this.computeDataHash({
                patients: data.patients,
                inventory: data.inventory,
                invoices: data.invoices,
                syncMeta: data.syncMeta
            });

            // Bỏ qua snapshot trùng — tránh ghi đè local & giảm độ trễ UI
            if (fromSocket && !forceReplace) {
                if (incomingVersion <= this._lastImportedVersion && incomingHash === this._dataHash) {
                    console.log('[DB] Skipped duplicate snapshot v' + incomingVersion);
                    this._syncReady = true;
                    return true;
                }
                if (incomingHash === this._dataHash) {
                    this.applyIncomingSyncMeta(data.syncMeta);
                    this._lastImportedVersion = Math.max(this._lastImportedVersion, incomingVersion);
                    this._syncReady = true;
                    return true;
                }
            }

            this.applyIncomingSyncMeta(data.syncMeta);

            const isStaleSnapshot = fromSocket && !forceReplace
                && data.syncMeta?.lastUpdated != null
                && data.syncMeta.lastUpdated < this._syncMeta.lastUpdated
                && data.syncMeta.version <= this._syncMeta.version;

            if (isStaleSnapshot) {
                console.log('[DB] Skipped stale snapshot (local lastUpdated newer)');
            }

            const deletedSet = new Set(this._syncMeta.deletedPatientIds);

            if (data.patients && !isStaleSnapshot) {
                const filteredRemote = data.patients.filter((p: Patient) => !deletedSet.has(p.id));
                const merged = (fromSocket && !forceReplace)
                    ? this.mergePatientsLocal(this._patientsCache, filteredRemote)
                    : filteredRemote;

                await this.dexieDb.patients.clear();
                if (merged.length > 0) await this.dexieDb.patients.bulkAdd(merged);
                this._patientsCache = merged;
            }

            if (data.inventory && !isStaleSnapshot) {
                const merged = (fromSocket && !forceReplace)
                    ? this.mergeInventoryLocal(this._inventoryCache, data.inventory)
                    : data.inventory;
                await this.dexieDb.inventory.clear();
                if (merged.length > 0) await this.dexieDb.inventory.bulkAdd(merged);
                this._inventoryCache = merged;
            }

            if (data.invoices && !isStaleSnapshot) {
                const merged = (fromSocket && !forceReplace)
                    ? this.mergeInvoicesLocal(this._invoicesCache, data.invoices)
                    : data.invoices;
                await this.dexieDb.invoices.clear();
                if (merged.length > 0) await this.dexieDb.invoices.bulkAdd(merged);
                this._invoicesCache = merged;
            }

            if (data.settings) {
                const settingsGuarded = fromSocket && !forceReplace && this.isLocalEditGuarded('settings', 'main');
                let merged: ClinicSettings;
                if (forceReplace) {
                    merged = data.settings;
                } else if (settingsGuarded && this._settingsCache) {
                    merged = this._settingsCache;
                } else {
                    merged = this.mergeSettings(this._settingsCache, data.settings);
                }
                await this.dexieDb.settings.put({ ...merged, id: 'main' });
                this._settingsCache = merged;
            }

            this._dataHash = this.computeDataHash({
                patients: this._patientsCache,
                inventory: this._inventoryCache,
                invoices: this._invoicesCache,
                syncMeta: this._syncMeta
            });
            this._lastImportedVersion = Math.max(this._lastImportedVersion, this._syncMeta.version || 0);
            console.log('[DB] Imported data successfully');

            if (!fromSocket || forceReplace) {
                this._syncReady = true;
                this.emitUpdate();
            } else {
                this._syncReady = true;
                this.flushPendingPush();
            }
            this.notifyUpdate();

            return true;
        } catch (e) {
            console.error('[DB] Import failed:', e);
            return false;
        }
    }

    // ============ PATIENTS ============
    getPatients(): Patient[] {
        return this._patientsCache;
    }

    async getPatientsAsync(): Promise<Patient[]> {
        await this.ensureReady();
        return this.dexieDb.patients.toArray();
    }

    addPatient(patient: Patient): void {
        const withTs = { ...patient, updatedAt: Date.now() };
        this._patientsCache.push(withTs);
        this.afterLocalMutation([{ scope: 'patient', id: withTs.id }], this.dexieDb.patients.put(withTs));
    }

    updatePatient(patient: Patient): void {
        const withTs = { ...patient, updatedAt: Date.now() };
        const index = this._patientsCache.findIndex(p => p.id === patient.id);
        if (index !== -1) {
            this._patientsCache[index] = withTs;
        } else {
            this._patientsCache.push(withTs);
        }
        this.afterLocalMutation([{ scope: 'patient', id: withTs.id }], this.dexieDb.patients.put(withTs));
    }

    deletePatient(id: string): void {
        if (!this._syncMeta.deletedPatientIds.includes(id)) {
            this._syncMeta.deletedPatientIds.push(id);
            if (this._syncMeta.deletedPatientIds.length > 5000) {
                this._syncMeta.deletedPatientIds = this._syncMeta.deletedPatientIds.slice(-5000);
            }
            this.saveSyncMeta();
        }
        this._patientsCache = this._patientsCache.filter(p => p.id !== id);
        this.afterLocalMutation([{ scope: 'patient', id }]);
        void this.dexieDb.patients.delete(id).then(() => {
            this.touchSyncMeta();
            this.syncDeletePatient(id).then(ok => {
                if (!ok) {
                    console.warn('[DB] Delete API failed — will retry via emitUpdate');
                }
                this.emitUpdate();
            });
        });
    }

    /**
     * Cấp số thứ tự (STT) trong ngày. Ưu tiên server để tránh trùng số giữa
     * nhiều máy cùng đăng ký. Khi mất kết nối server thì fallback đếm cục bộ.
     */
    async getNextTicketNumber(): Promise<number> {
        try {
            const res = await fetch('/api/ticket/next', { method: 'POST' });
            if (res.ok) {
                const result = await res.json();
                if (typeof result.number === 'number' && result.number > 0) {
                    return result.number;
                }
            }
        } catch { /* offline → fallback cục bộ */ }
        return this.getNextTicketNumberLocal();
    }

    /** Fallback chỉ dùng khi mất kết nối server. */
    private getNextTicketNumberLocal(): number {
        const today = new Date().toDateString();
        const ticketKey = 'clinic_daily_ticket';
        const stored = localStorage.getItem(ticketKey);
        let data = stored ? JSON.parse(stored) : { date: today, count: 0 };

        if (data.date !== today) {
            data = { date: today, count: 0 };
        }

        const ticket = data.count + 1;
        data.count = ticket;
        localStorage.setItem(ticketKey, JSON.stringify(data));
        return ticket;
    }

    // ============ INVENTORY ============
    getInventory(): InventoryItem[] {
        return this._inventoryCache;
    }

    async getInventoryAsync(): Promise<InventoryItem[]> {
        await this.ensureReady();
        return this.dexieDb.inventory.toArray();
    }

    addInventoryItem(item: InventoryItem): void {
        this._inventoryCache.push(item);
        this.afterLocalMutation([{ scope: 'inventory', id: item.id }], this.dexieDb.inventory.put(item));
    }

    updateInventory(id: string, updates: Partial<InventoryItem>): void {
        const index = this._inventoryCache.findIndex(i => i.id === id);
        if (index !== -1) {
            this._inventoryCache[index] = { ...this._inventoryCache[index], ...updates };
        }
        this.afterLocalMutation([{ scope: 'inventory', id }], this.dexieDb.inventory.update(id, updates));
    }

    deleteInventoryItem(id: string): void {
        this._inventoryCache = this._inventoryCache.filter(i => i.id !== id);
        this.afterLocalMutation([{ scope: 'inventory', id }], this.dexieDb.inventory.delete(id));
    }

    private applyStockDeduction(items: { itemId: string, quantity: number }[]): string[] {
        const touched: string[] = [];
        items.forEach(orderItem => {
            const index = this._inventoryCache.findIndex(i => i.id === orderItem.itemId);
            if (index !== -1) {
                const newQty = Math.max(0, this._inventoryCache[index].quantity - orderItem.quantity);
                this._inventoryCache[index].quantity = newQty;
                touched.push(orderItem.itemId);
                void this.dexieDb.inventory.update(orderItem.itemId, { quantity: newQty });
            }
        });
        return touched;
    }

    deductStock(items: { itemId: string, quantity: number }[]): void {
        const touched = this.applyStockDeduction(items);
        this.afterLocalMutation(
            touched.map(id => ({ scope: 'inventory' as const, id })),
            Promise.resolve()
        );
    }

    // ============ INVOICES ============
    getInvoices(): Invoice[] {
        return this._invoicesCache;
    }

    async getInvoicesAsync(): Promise<Invoice[]> {
        await this.ensureReady();
        return this.dexieDb.invoices.toArray();
    }

    createInvoice(invoice: Invoice): void {
        this._invoicesCache.push(invoice);
        const stockTouched = this.applyStockDeduction(invoice.items);
        this.afterLocalMutation(
            [
                { scope: 'invoice', id: invoice.id },
                ...stockTouched.map(id => ({ scope: 'inventory' as const, id }))
            ],
            this.dexieDb.invoices.put(invoice)
        );
    }

    updateInvoice(id: string, updates: Partial<Invoice>): void {
        const index = this._invoicesCache.findIndex(i => i.id === id);
        if (index !== -1) {
            this._invoicesCache[index] = { ...this._invoicesCache[index], ...updates };
        }
        this.afterLocalMutation([{ scope: 'invoice', id }], this.dexieDb.invoices.update(id, updates));
    }

    deleteInvoice(id: string): void {
        this._invoicesCache = this._invoicesCache.filter(i => i.id !== id);
        this.afterLocalMutation([{ scope: 'invoice', id }], this.dexieDb.invoices.delete(id));
    }
}

export const db = new DatabaseService();
