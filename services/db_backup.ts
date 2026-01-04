import { Patient, InventoryItem, Invoice, ClinicSettings } from '../types';

// Initial Mock Data
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', code: 'LENS001', category: 'lens', name: 'Essilor Crizal', specs: { sph: -2.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 280000, quantity: 50, minStock: 10, image: 'https://picsum.photos/100/100' },
  { id: '2', code: 'LENS002', category: 'lens', name: 'Chemi U2', specs: { sph: -2.00, cyl: -0.50, material: '1.60', type: 'single' }, costPrice: 120000, price: 180000, quantity: 7, minStock: 10, image: 'https://picsum.photos/100/100' },
  { id: '3', code: 'LENS003', category: 'lens', name: 'Hoya BlueControl', specs: { sph: -4.00, cyl: 0, material: '1.67', type: 'single' }, costPrice: 550000, price: 850000, quantity: 20, minStock: 5 },
  { id: '4', code: 'FRAME001', category: 'frame', name: 'Rayban Aviator', specs: { material: 'Metal' }, costPrice: 900000, price: 1500000, quantity: 12, minStock: 3 },
  { id: '5', code: 'FRAME002', category: 'frame', name: 'Nhựa Dẻo HA�n Quốc', specs: { material: 'Plastic' }, costPrice: 150000, price: 300000, quantity: 100, minStock: 20 },
  { id: '6', code: 'MED001', category: 'medicine', name: 'V.Rohto', costPrice: 35000, price: 50000, quantity: 200, minStock: 50 },
  { id: '7', code: 'MED002', category: 'medicine', name: 'Tobradex', costPrice: 60000, price: 85000, quantity: 40, minStock: 10 },
  { id: '8', code: 'MED003', category: 'medicine', name: 'Systane Ultra', costPrice: 85000, price: 120000, quantity: 30, minStock: 10 },
  { id: '9', code: 'LENS004', category: 'lens', name: 'Plano Blue Light', specs: { sph: 0, cyl: 0, material: '1.56', type: 'single' }, costPrice: 150000, price: 250000, quantity: 25, minStock: 5 },
  { id: '10', code: 'LENS005', category: 'lens', name: 'Plano Anti-Glare', specs: { sph: 0, cyl: -0.50, material: '1.61', type: 'single' }, costPrice: 200000, price: 320000, quantity: 15, minStock: 5 },
  { id: '11', code: 'LENS006', category: 'lens', name: 'Plano UV Protection', specs: { sph: 0, cyl: -1.00, material: '1.67', type: 'single' }, costPrice: 280000, price: 450000, quantity: 10, minStock: 3 },
];

const DEFAULT_SETTINGS: ClinicSettings = {
  name: 'PhA�ng KhA�m Mắt NgoA�i Giờ',
  adminPassword: 'admin123',
  address: 'Vĩnh Thuận - KiA�n Giang',
  phone: '0917416421',
  email: 'huatrungkien@gmail.com',
  printTemplates: {
    receiptHeader: 'HA�A ĐƠN BA�N LẺ',
    receiptFooter: 'Cảm ơn quA� khA�ch vA� hẹn gặp lại!\nVui lA�ng giữ lại hA�a đơn để bảo hA�nh.',
    prescriptionHeader: 'ĐƠN KA�NH THUỐC',
    prescriptionFooter: 'BA�c sĩ / KTV KhA�c Xạ'
  }
};

class DatabaseService {
  private patientsKey = 'clinic_patients';
  private inventoryKey = 'clinic_inventory';
  private invoicesKey = 'clinic_invoices';
  private ticketKey = 'clinic_daily_ticket';
  private settingsKey = 'clinic_settings';

  constructor() {
    if (!localStorage.getItem(this.inventoryKey)) {
      localStorage.setItem(this.inventoryKey, JSON.stringify(INITIAL_INVENTORY));
    }
    if (!localStorage.getItem(this.settingsKey)) {
      localStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
    }
    // Start auto-sync
    this.startSync();
  }

  // ========== SYNC METHODS ==========
  private startSync() {
    this.pullFromServer();
    setInterval(() => this.pullFromServer(), 5000);
  }

  private async pullFromServer() {
    try {
      const res = await fetch('/api/database');
      if (!res.ok) return;
      const remote = await res.json();
      if (remote.patients && remote.patients.length > 0) {
        const local = this.exportData();
        if (JSON.stringify(remote) !== local) {
          this.importData(JSON.stringify(remote));
          window.dispatchEvent(new Event('clinic-db-updated'));
        }
      } else {
        // Server empty, push local data
        const local = JSON.parse(this.exportData());
        if (local.patients.length > 0 || local.inventory.length > 0) {
          this.pushToServer();
        }
      }
    } catch (e) { /* offline */ }
  }

  private async pushToServer() {
    try {
      await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.exportData()
      });
    } catch (e) { /* offline */ }
  }

  getSettings(): ClinicSettings {
    const data = localStorage.getItem(this.settingsKey);
    const parsed = data ? JSON.parse(data) : DEFAULT_SETTINGS;
    // Merge with defaults to ensure new fields exist
    return { ...DEFAULT_SETTINGS, ...parsed, printTemplates: { ...DEFAULT_SETTINGS.printTemplates, ...parsed.printTemplates } };
  }

  saveSettings(settings: ClinicSettings): void {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    this.pushToServer();
  }

  // Backup & Restore
  exportData(): string {
    const data = {
      patients: this.getPatients(),
      inventory: this.getInventory(),
      invoices: this.getInvoices(),
      settings: this.getSettings()
    };
    return JSON.stringify(data);
  }

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.patients) localStorage.setItem(this.patientsKey, JSON.stringify(data.patients));
      if (data.inventory) localStorage.setItem(this.inventoryKey, JSON.stringify(data.inventory));
      if (data.invoices) localStorage.setItem(this.invoicesKey, JSON.stringify(data.invoices));
      if (data.settings) localStorage.setItem(this.settingsKey, JSON.stringify(data.settings));

      // QUAN TR?NG: Push ngay l�n server sau khi restore d? tr�nh b? sync ngu?c
      this.pushToServer();
      console.log('[DB] Imported data and pushed to server');

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  getPatients(): Patient[] {
    const data = localStorage.getItem(this.patientsKey);
    return data ? JSON.parse(data) : [];
  }

  addPatient(patient: Patient): void {
    const patients = this.getPatients();
    patients.push(patient);
    localStorage.setItem(this.patientsKey, JSON.stringify(patients));
    this.pushToServer();
  }

  updatePatient(patient: Patient): void {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === patient.id);
    if (index !== -1) {
      patients[index] = patient;
      localStorage.setItem(this.patientsKey, JSON.stringify(patients));
      this.pushToServer();
    }
  }

  deletePatient(id: string): void {
    const patients = this.getPatients().filter(p => p.id !== id);
    localStorage.setItem(this.patientsKey, JSON.stringify(patients));
    this.pushToServer();
  }

  getNextTicketNumber(): number {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(this.ticketKey);
    let data = stored ? JSON.parse(stored) : { date: today, count: 0 };

    if (data.date !== today) {
      data = { date: today, count: 0 };
    }

    const ticket = data.count + 1;
    data.count = ticket;
    localStorage.setItem(this.ticketKey, JSON.stringify(data));
    return ticket;
  }

  getInventory(): InventoryItem[] {
    const data = localStorage.getItem(this.inventoryKey);
    return data ? JSON.parse(data) : [];
  }

  addInventoryItem(item: InventoryItem): void {
    const items = this.getInventory();
    items.push(item);
    localStorage.setItem(this.inventoryKey, JSON.stringify(items));
    this.pushToServer();
  }

  updateInventory(id: string, updates: Partial<InventoryItem>): void {
    const items = this.getInventory();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem(this.inventoryKey, JSON.stringify(items));
      this.pushToServer();
    }
  }

  deleteInventoryItem(id: string): void {
    const items = this.getInventory().filter(i => i.id !== id);
    localStorage.setItem(this.inventoryKey, JSON.stringify(items));
    this.pushToServer();
  }

  deductStock(items: { itemId: string, quantity: number }[]): void {
    const inventory = this.getInventory();
    items.forEach(orderItem => {
      const itemIndex = inventory.findIndex(i => i.id === orderItem.itemId);
      if (itemIndex !== -1) {
        inventory[itemIndex].quantity = Math.max(0, inventory[itemIndex].quantity - orderItem.quantity);
      }
    });
    localStorage.setItem(this.inventoryKey, JSON.stringify(inventory));
    this.pushToServer();
  }

  createInvoice(invoice: Invoice): void {
    const invoices = this.getInvoices();
    invoices.push(invoice);
    localStorage.setItem(this.invoicesKey, JSON.stringify(invoices));
    this.deductStock(invoice.items);
    this.pushToServer();
  }

  getInvoices(): Invoice[] {
    const data = localStorage.getItem(this.invoicesKey);
    return data ? JSON.parse(data) : [];
  }

  updateInvoice(id: string, updates: Partial<Invoice>): void {
    const invoices = this.getInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index !== -1) {
      invoices[index] = { ...invoices[index], ...updates };
      localStorage.setItem(this.invoicesKey, JSON.stringify(invoices));
      this.pushToServer();
    }
  }

  deleteInvoice(id: string): void {
    const invoices = this.getInvoices().filter(i => i.id !== id);
    localStorage.setItem(this.invoicesKey, JSON.stringify(invoices));
    this.pushToServer();
  }
}

export const db = new DatabaseService();

