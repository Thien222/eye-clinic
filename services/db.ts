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
    { id: '5', code: 'FRAME002', category: 'frame', name: 'Nhua Deo Han Quoc', specs: { material: 'Plastic' }, costPrice: 150000, price: 300000, quantity: 100, minStock: 20 },
    { id: '6', code: 'MED001', category: 'medicine', name: 'V.Rohto', costPrice: 35000, price: 50000, quantity: 200, minStock: 50 },
    { id: '7', code: 'MED002', category: 'medicine', name: 'Tobradex', costPrice: 60000, price: 85000, quantity: 40, minStock: 10 },
    { id: '8', code: 'MED003', category: 'medicine', name: 'Systane Ultra', costPrice: 85000, price: 120000, quantity: 30, minStock: 10 },
];

const DEFAULT_SETTINGS: ClinicSettings = {
    name: 'Phong Kham Mat Ngoai Gio',
    adminPassword: 'admin123',
    address: 'Vinh Thuan - Kien Giang',
    phone: '0917416421',
    email: 'huatrungkien@gmail.com',
    doctorName: 'BSCKII. Hua Trung Kien',
    printTemplates: {
        receiptHeader: 'HOA DON BAN LE',
        receiptFooter: 'Cam on quy khach!',
        prescriptionHeader: 'DON KINH THUOC',
        prescriptionFooter: 'Bac si / KTV Khuc Xa'
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

    private touchSyncMeta() {
        this._syncMeta.lastUpdated = Date.now();
        this.saveSyncMeta();
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
        return mergePatients(local, remote, this._syncMeta.deletedPatientIds);
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

            // Use script tag to load socket.io client
            if (typeof (window as any).io === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
                script.onload = () => this.initSocket(socketUrl);
                script.onerror = () => {
                    console.log('[Socket] Failed to load socket.io, using polling');
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
                reconnectionDelay: 1000,
                timeout: 10000
            });

            this.socket.on('connect', async () => {
                console.log('[Socket] ✓ Connected to server:', this.socket.id);
                this.setConnectionStatus('connected');
                await this.pushLocalIfNewer();
                this.startHeartbeat();
                setTimeout(() => {
                    if (!this._syncReady) {
                        this._syncReady = true;
                        this.flushPendingPush();
                        console.log('[Socket] Sync ready (timeout fallback)');
                    }
                }, 3000);
            });

            this.socket.on('data-updated', async (data: any) => {
                console.log('[Socket] ⬇ Received data update from server');
                this.setConnectionStatus('syncing');
                await this.importDataAsync(data, true);
                this._syncReady = true;
                this.setConnectionStatus('connected');
                this.notifyUpdate();
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

        if (this.socket && this.socket.connected) {
            console.log('[Socket] ⬆ Sending data update to server, patients:', data.patients.length);
            this.socket.emit('data-changed', data);
        }

        this.pushToServer();
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
        this.dexieDb.settings.put({ ...withTs, id: 'main' });
        this.touchSyncMeta();
        this.emitUpdate();
        this.notifyUpdate();
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
        try {
            await this.ensureReady();
            data = sanitizeIncomingData(data);
            data = applyTombstones(data);

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
                    ? mergeInventory(this._inventoryCache, data.inventory)
                    : data.inventory;
                await this.dexieDb.inventory.clear();
                if (merged.length > 0) await this.dexieDb.inventory.bulkAdd(merged);
                this._inventoryCache = merged;
            }

            if (data.invoices && !isStaleSnapshot) {
                const merged = (fromSocket && !forceReplace)
                    ? mergeInvoices(this._invoicesCache, data.invoices)
                    : data.invoices;
                await this.dexieDb.invoices.clear();
                if (merged.length > 0) await this.dexieDb.invoices.bulkAdd(merged);
                this._invoicesCache = merged;
            }

            if (data.settings) {
                const merged = forceReplace ? data.settings : this.mergeSettings(this._settingsCache, data.settings);
                await this.dexieDb.settings.put({ ...merged, id: 'main' });
                this._settingsCache = merged;
            }

            this._dataHash = this.computeDataHash({ patients: this._patientsCache, syncMeta: this._syncMeta });
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
        this.dexieDb.patients.add(withTs);
        this.emitUpdate();
        this.notifyUpdate();
    }

    updatePatient(patient: Patient): void {
        const withTs = { ...patient, updatedAt: Date.now() };
        const index = this._patientsCache.findIndex(p => p.id === patient.id);
        if (index !== -1) {
            this._patientsCache[index] = withTs;
        }
        this.dexieDb.patients.put(withTs);
        this.emitUpdate();
        this.notifyUpdate();
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
        this.dexieDb.patients.delete(id);
        this.touchSyncMeta();
        this.syncDeletePatient(id).then(ok => {
            if (!ok) {
                console.warn('[DB] Delete API failed — will retry via emitUpdate');
            }
            this.emitUpdate();
        });
        this.notifyUpdate();
    }

    getNextTicketNumber(): number {
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
        this.dexieDb.inventory.add(item);
        this.emitUpdate();
        this.notifyUpdate();
    }

    updateInventory(id: string, updates: Partial<InventoryItem>): void {
        const index = this._inventoryCache.findIndex(i => i.id === id);
        if (index !== -1) {
            this._inventoryCache[index] = { ...this._inventoryCache[index], ...updates };
        }
        this.dexieDb.inventory.update(id, updates);
        this.emitUpdate();
        this.notifyUpdate();
    }

    deleteInventoryItem(id: string): void {
        this._inventoryCache = this._inventoryCache.filter(i => i.id !== id);
        this.dexieDb.inventory.delete(id);
        this.emitUpdate();
        this.notifyUpdate();
    }

    deductStock(items: { itemId: string, quantity: number }[]): void {
        items.forEach(orderItem => {
            const index = this._inventoryCache.findIndex(i => i.id === orderItem.itemId);
            if (index !== -1) {
                const newQty = Math.max(0, this._inventoryCache[index].quantity - orderItem.quantity);
                this._inventoryCache[index].quantity = newQty;
                this.dexieDb.inventory.update(orderItem.itemId, { quantity: newQty });
            }
        });
        this.emitUpdate();
        this.notifyUpdate();
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
        this.dexieDb.invoices.add(invoice);
        this.deductStock(invoice.items);
    }

    updateInvoice(id: string, updates: Partial<Invoice>): void {
        const index = this._invoicesCache.findIndex(i => i.id === id);
        if (index !== -1) {
            this._invoicesCache[index] = { ...this._invoicesCache[index], ...updates };
        }
        this.dexieDb.invoices.update(id, updates);
        this.emitUpdate();
        this.notifyUpdate();
    }

    deleteInvoice(id: string): void {
        this._invoicesCache = this._invoicesCache.filter(i => i.id !== id);
        this.dexieDb.invoices.delete(id);
        this.emitUpdate();
        this.notifyUpdate();
    }
}

export const db = new DatabaseService();
