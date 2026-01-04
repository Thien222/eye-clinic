import Dexie, { Table } from 'dexie';
import { Patient, InventoryItem, Invoice, ClinicSettings } from '../types';

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

    constructor() {
        this.dexieDb = new EyeClinicDatabase();
        this._initPromise = this.initialize();
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
                            await table.bulkAdd(parsed);
                            console.log(`[DB] Migrated ${parsed.length} ${type} from localStorage`);
                        }
                    } catch (e) {
                        console.error(`[DB] Failed to migrate ${type}:`, e);
                    }
                }
            }
        }

        // Migrate settings
        const settingsData = localStorage.getItem('clinic_settings');
        if (settingsData) {
            try {
                const settings = JSON.parse(settingsData);
                const count = await this.dexieDb.settings.count();
                if (count === 0) {
                    await this.dexieDb.settings.add({ ...settings, id: 'main' });
                }
            } catch (e) { }
        }
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

            this.socket.on('connect', () => {
                console.log('[Socket] ✓ Connected to server:', this.socket.id);
            });

            this.socket.on('data-updated', async (data: any) => {
                console.log('[Socket] ⬇ Received data update from server');
                await this.importDataAsync(data, true); // fromSocket = true, don't emit back
                this.notifyUpdate();
            });

            this.socket.on('disconnect', (reason: string) => {
                console.log('[Socket] ✗ Disconnected:', reason);
            });

            this.socket.on('connect_error', (error: any) => {
                console.log('[Socket] Connection error:', error.message);
            });
        } catch (e) {
            console.log('[DB] Socket init failed, using polling');
            this.startPolling();
        }
    }

    private startPolling() {
        // Fallback polling every 3 seconds
        setInterval(async () => {
            try {
                const res = await fetch('/api/database');
                if (!res.ok) return;
                const data = await res.json();

                // Only update if server has data and it's different
                if (data.patients && data.patients.length > 0) {
                    const localPatientIds = this._patientsCache.map(p => p.id).sort().join(',');
                    const remotePatientIds = data.patients.map((p: Patient) => p.id).sort().join(',');

                    if (localPatientIds !== remotePatientIds) {
                        await this.importDataAsync(data);
                        this.notifyUpdate();
                    }
                }
            } catch (e) { /* offline */ }
        }, 3000);
    }

    // Emit update via socket
    private emitUpdate() {
        const data = {
            patients: this._patientsCache,
            inventory: this._inventoryCache,
            invoices: this._invoicesCache,
            settings: this._settingsCache
        };

        if (this.socket && this.socket.connected) {
            console.log('[Socket] ⬆ Sending data update to server, patients:', this._patientsCache.length);
            this.socket.emit('data-changed', data);
        } else {
            console.log('[Socket] Not connected, pushing via REST API');
        }

        // Also push to REST API as backup
        this.pushToServer();
    }

    private async pushToServer() {
        try {
            const data = await this.exportDataAsync();
            await fetch('/api/database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data
            });
        } catch (e) { /* offline */ }
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
        this._settingsCache = settings;
        this.dexieDb.settings.put({ ...settings, id: 'main' });
        this.emitUpdate();
        this.notifyUpdate();
    }

    // ============ EXPORT/IMPORT ============
    exportData(): string {
        return JSON.stringify({
            patients: this._patientsCache,
            inventory: this._inventoryCache,
            invoices: this._invoicesCache,
            settings: this._settingsCache
        });
    }

    async exportDataAsync(): Promise<string> {
        await this.ensureReady();
        const [patients, inventory, invoices, settings] = await Promise.all([
            this.dexieDb.patients.toArray(),
            this.dexieDb.inventory.toArray(),
            this.dexieDb.invoices.toArray(),
            this.dexieDb.settings.get('main')
        ]);
        return JSON.stringify({ patients, inventory, invoices, settings });
    }

    importData(jsonString: string): boolean {
        try {
            const data = JSON.parse(jsonString);
            this.importDataAsync(data);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async importDataAsync(data: any, fromSocket: boolean = false): Promise<boolean> {
        try {
            await this.ensureReady();

            if (data.patients) {
                await this.dexieDb.patients.clear();
                await this.dexieDb.patients.bulkAdd(data.patients);
                this._patientsCache = data.patients;
            }
            if (data.inventory) {
                await this.dexieDb.inventory.clear();
                await this.dexieDb.inventory.bulkAdd(data.inventory);
                this._inventoryCache = data.inventory;
            }
            if (data.invoices) {
                await this.dexieDb.invoices.clear();
                await this.dexieDb.invoices.bulkAdd(data.invoices);
                this._invoicesCache = data.invoices;
            }
            if (data.settings) {
                await this.dexieDb.settings.put({ ...data.settings, id: 'main' });
                this._settingsCache = data.settings;
            }

            console.log('[DB] Imported data successfully');

            // Only sync to server if NOT from socket (to prevent infinite loop)
            if (!fromSocket) {
                this.emitUpdate();
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
        this._patientsCache.push(patient);
        this.dexieDb.patients.add(patient);
        this.emitUpdate();
        this.notifyUpdate();
    }

    updatePatient(patient: Patient): void {
        const index = this._patientsCache.findIndex(p => p.id === patient.id);
        if (index !== -1) {
            this._patientsCache[index] = patient;
        }
        this.dexieDb.patients.put(patient);
        this.emitUpdate();
        this.notifyUpdate();
    }

    deletePatient(id: string): void {
        this._patientsCache = this._patientsCache.filter(p => p.id !== id);
        this.dexieDb.patients.delete(id);
        this.emitUpdate();
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
