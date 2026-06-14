/**
 * Tạo file data/test-data.json để test phần mềm
 * Chạy: node scripts/generateTestData.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'data', 'test-data.json');

const id = (n) => `test-${n}`;
const today = new Date();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0).getTime();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const patients = [
  // === HÔM NAY - Tiếp tân / Khúc xạ / Khám / Thu ngân ===
  {
    id: id('p01'), ticketNumber: 1, fullName: 'Nguyen Van An - Cho do KX',
    dob: 1990, phone: '0911111001', address: 'Vinh Thuan, Kien Giang', gender: 'Nam',
    reason: 'Cat kinh', hasGlasses: true, notes: 'Test: cho do khuc xa',
    initialVA: { od: '5/10', os: '6/10' }, status: 'waiting_refraction',
    timestamp: startOfDay(today) + 5 * 60000, updatedAt: Date.now()
  },
  {
    id: id('p02'), ticketNumber: 2, fullName: 'Tran Thi Binh - Dang do',
    dob: 1985, phone: '0911111002', address: 'Rach Gia', gender: 'Nữ',
    reason: 'Cat kinh', hasGlasses: false, notes: 'Test: dang do khuc xa',
    initialVA: { od: '4/10', os: '4/10' }, status: 'processing_refraction',
    timestamp: startOfDay(today) + 15 * 60000, updatedAt: Date.now()
  },
  {
    id: id('p03'), ticketNumber: 3, fullName: 'Le Van Cuong - Cho kham mat',
    dob: 1978, phone: '0911111003', address: 'An Bien', gender: 'Nam',
    reason: 'Kham mat', hasGlasses: true, notes: 'Test: cho kham mat',
    initialVA: { od: '7/10', os: '8/10' }, status: 'waiting_doctor',
    timestamp: startOfDay(today) + 25 * 60000, updatedAt: Date.now()
  },
  {
    id: id('p04'), ticketNumber: 4, fullName: 'Pham Thi Dung - Cho thanh toan',
    dob: 1995, phone: '0911111004', address: 'Ha Tien', gender: 'Nữ',
    reason: 'Cat kinh', hasGlasses: false, notes: 'Test: cho thu ngan - 2 mat KHAC do',
    initialVA: { od: '3/10', os: '5/10' }, status: 'waiting_billing',
    timestamp: startOfDay(today) + 35 * 60000, updatedAt: Date.now(),
    refraction: {
      skiascopy: { od: { sph: '-2.00', cyl: '-0.50', axis: '90', va: '' }, os: { sph: '-1.50', cyl: '0', axis: '', va: '' }, cycloplegia: false },
      subjective: { od: { sph: '-2.00', cyl: '-0.50', axis: '90', va: '10/10' }, os: { sph: '-1.50', cyl: '0', axis: '', va: '10/10' } },
      finalRx: {
        od: { sph: '-2.00', cyl: '-0.50', axis: '90', va: '10/10', add: '', pd: '32' },
        os: { sph: '-1.50', cyl: '0', axis: '', va: '10/10', add: '', pd: '32' },
        lensType: 'Đơn tròng - nhìn xa', distance: true, near: false
      },
      note: 'Test OD/OS khac do'
    }
  },
  {
    id: id('p05'), ticketNumber: 5, fullName: 'Hoang Van Em - Cho thanh toan CUNG do',
    dob: 2000, phone: '0911111005', address: 'Phu Quoc', gender: 'Nam',
    reason: 'Cat kinh', hasGlasses: false, notes: 'Test: 2 mat CUNG do - goi y cap trong',
    initialVA: { od: '6/10', os: '6/10' }, status: 'waiting_billing',
    timestamp: startOfDay(today) + 45 * 60000, updatedAt: Date.now(),
    refraction: {
      skiascopy: { od: { sph: '-2.00', cyl: '0', axis: '', va: '' }, os: { sph: '-2.00', cyl: '0', axis: '', va: '' }, cycloplegia: false },
      subjective: { od: { sph: '-2.00', cyl: '0', axis: '', va: '10/10' }, os: { sph: '-2.00', cyl: '0', axis: '', va: '10/10' } },
      finalRx: {
        od: { sph: '-2.00', cyl: '0', axis: '', va: '10/10', add: '', pd: '64' },
        os: { sph: '-2.00', cyl: '0', axis: '', va: '10/10', add: '', pd: '64' },
        lensType: 'Đơn tròng - nhìn xa', distance: true, near: false
      },
      note: 'Test cap trong cung gia'
    }
  },
  {
    id: id('p06'), ticketNumber: 6, fullName: 'Vo Thi Phuong - Da hoan thanh',
    dob: 1988, phone: '0911111006', address: 'Can Tho', gender: 'Nữ',
    reason: 'Cat kinh', hasGlasses: true, notes: 'Test: da hoan thanh hom nay',
    initialVA: { od: '8/10', os: '9/10' }, status: 'completed',
    timestamp: startOfDay(today) + 55 * 60000, updatedAt: Date.now(),
    refraction: {
      skiascopy: { od: { sph: '-1.00', cyl: '0', axis: '', va: '' }, os: { sph: '-1.25', cyl: '0', axis: '', va: '' }, cycloplegia: false },
      subjective: { od: { sph: '-1.00', cyl: '0', axis: '', va: '10/10' }, os: { sph: '-1.25', cyl: '0', axis: '', va: '10/10' } },
      finalRx: {
        od: { sph: '-1.00', cyl: '0', axis: '', va: '10/10', add: '', pd: '32' },
        os: { sph: '-1.25', cyl: '0', axis: '', va: '10/10', add: '', pd: '32' },
        lensType: 'Đơn tròng - nhìn xa', distance: true, near: false
      },
      note: ''
    }
  },
  // === HÔM QUA - Không được hiện hôm nay (sau EOD auto-complete) ===
  {
    id: id('p07'), ticketNumber: 99, fullName: 'CU - Hom qua cho do (KHONG hien)',
    dob: 1970, phone: '0911111999', address: 'Test cu', gender: 'Nam',
    reason: 'Cat kinh', hasGlasses: false, notes: 'BN hom qua - phai auto complete',
    initialVA: { od: '5/10', os: '5/10' }, status: 'waiting_refraction',
    timestamp: startOfDay(yesterday) + 30 * 60000, updatedAt: startOfDay(yesterday)
  },
  {
    id: id('p08'), ticketNumber: 98, fullName: 'CU - Hom qua cho thanh toan',
    dob: 1975, phone: '0911111998', address: 'Test cu', gender: 'Nữ',
    reason: 'Cat kinh', hasGlasses: false, notes: 'BN hom qua',
    initialVA: { od: '4/10', os: '4/10' }, status: 'waiting_billing',
    timestamp: startOfDay(yesterday) + 60 * 60000, updatedAt: startOfDay(yesterday),
    refraction: {
      skiascopy: { od: { sph: '-3.00', cyl: '0', axis: '', va: '' }, os: { sph: '-3.00', cyl: '0', axis: '', va: '' }, cycloplegia: false },
      subjective: { od: { sph: '-3.00', cyl: '0', axis: '', va: '10/10' }, os: { sph: '-3.00', cyl: '0', axis: '', va: '10/10' } },
      finalRx: {
        od: { sph: '-3.00', cyl: '0', axis: '', va: '10/10', add: '', pd: '62' },
        os: { sph: '-3.00', cyl: '0', axis: '', va: '10/10', add: '', pd: '62' },
        lensType: 'Đơn tròng - nhìn xa', distance: true, near: false
      },
      note: ''
    }
  }
];

const inventory = [
  // Cap trong cung ma + cung gia (280k) - SPH -2.00
  { id: id('lens-od'), code: 'LENS-OD-200', category: 'lens', name: 'Essilor Crizal OD', specs: { sph: -2.00, cyl: -0.50, material: '1.56', type: 'single' }, costPrice: 180000, price: 280000, quantity: 20, minStock: 5 },
  { id: id('lens-os'), code: 'LENS-OS-150', category: 'lens', name: 'Essilor Crizal OS', specs: { sph: -1.50, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 280000, quantity: 20, minStock: 5 },
  // Cap cung gia 280k - SPH -2.00 ca 2 mat (cung ma gia)
  { id: id('lens-pair-a'), code: 'LENS-PAIR-A', category: 'lens', name: 'Chemi U2 Cap A', specs: { sph: -2.00, cyl: 0, material: '1.60', type: 'single' }, costPrice: 120000, price: 280000, quantity: 15, minStock: 5 },
  { id: id('lens-pair-b'), code: 'LENS-PAIR-B', category: 'lens', name: 'Chemi U2 Cap B', specs: { sph: -2.00, cyl: 0, material: '1.60', type: 'single' }, costPrice: 120000, price: 280000, quantity: 15, minStock: 5 },
  // Cung do -2.00 nhung KHAC gia
  { id: id('lens-cheap'), code: 'LENS-CHEAP', category: 'lens', name: 'Trong gia re -2.00', specs: { sph: -2.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 80000, price: 150000, quantity: 30, minStock: 5 },
  { id: id('lens-premium'), code: 'LENS-PREMIUM', category: 'lens', name: 'Hoya Premium -2.00', specs: { sph: -2.00, cyl: 0, material: '1.67', type: 'single' }, costPrice: 400000, price: 650000, quantity: 10, minStock: 3 },
  // Gong kinh
  { id: id('frame-1'), code: 'GONG-001', category: 'frame', name: 'Gong Titan Xanh', specs: { material: 'Titan' }, costPrice: 200000, price: 450000, quantity: 8, minStock: 2 },
  { id: id('frame-2'), code: 'GONG-002', category: 'frame', name: 'Gong Nhua Den', specs: { material: 'Plastic' }, costPrice: 80000, price: 250000, quantity: 15, minStock: 3 },
  // Thuoc
  { id: id('med-1'), code: 'MED-001', category: 'medicine', name: 'V.Rohto', costPrice: 35000, price: 50000, quantity: 50, minStock: 10 },
];

const invoices = [
  {
    id: id('inv-1'), patientId: id('p06'), patientName: 'Vo Thi Phuong', patientPhone: '0911111006',
    items: [
      { itemId: id('lens-od'), name: 'Essilor Crizal OD (OD)', quantity: 1, costPrice: 180000, price: 280000, isLens: true, eye: 'OD' },
      { itemId: id('frame-1'), name: 'Gong Titan Xanh', quantity: 1, costPrice: 200000, price: 450000, isLens: false },
    ],
    subtotal: 730000, discount: 30000, surcharge: 50000, total: 750000, profit: 300000,
    date: startOfDay(today) + 70 * 60000
  },
  {
    id: id('inv-2'), patientId: id('p08'), patientName: 'CU - Hom qua', patientPhone: '0911111998',
    items: [
      { itemId: id('lens-pair-a'), name: 'Chemi U2 Cap A (OD)', quantity: 1, costPrice: 120000, price: 280000, isLens: true, eye: 'OD' },
      { itemId: id('lens-pair-b'), name: 'Chemi U2 Cap B (OS)', quantity: 1, costPrice: 120000, price: 280000, isLens: true, eye: 'OS' },
      { itemId: id('frame-2'), name: 'Gong Nhua Den', quantity: 1, costPrice: 80000, price: 250000, isLens: false },
    ],
    subtotal: 810000, discount: 0, surcharge: 0, total: 810000, profit: 370000,
    date: startOfDay(yesterday) + 90 * 60000
  }
];

const settings = {
  settingsUpdatedAt: Date.now(),
  name: 'PHONG KHAM MAT TEST',
  doctorName: 'BSCKII. Test Bac Si',
  address: 'Vinh Thuan - Kien Giang (TEST)',
  phone: '0917-TEST-001',
  email: 'test@eyeclinic.local',
  workingHours: '8h-19h, T2-CN',
  logoUrl: '',
  vat: { enabled: false, rate: 10 },
  invoice: { header: 'HOA DON TEST', footer: 'Cam on quy khach - TEST!', showLogo: false },
  ticket: { header: 'PK MAT TEST', subHeader: 'BS. Test', note: 'Vui long cho den STT', footer: 'Phieu co hieu luc trong ngay' },
  refraction: {
    header: 'PHONG KHAM MAT TEST',
    rightHeader: 'KHAM KHUC XA - TEST',
    disclaimer1: 'Luu y test 1: Khach hang da duoc deo thu kinh.',
    disclaimer2: 'Luu y test 2: Khach hang da duoc tu van do kinh.'
  },
  backup: { path: '', maxFiles: 20, autoBackupOnClose: true, autoBackupInterval: 4 },
  printTemplates: { receiptHeader: 'HOA DON TEST', receiptFooter: 'Cam on!', prescriptionHeader: 'PHIEU KX', prescriptionFooter: 'Bac si' }
};

const data = {
  patients,
  inventory,
  invoices,
  settings,
  syncMeta: { version: 1, lastUpdated: Date.now(), deletedPatientIds: [] }
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Da tao: ${OUT}`);
console.log(`   - ${patients.length} benh nhan (${patients.filter(p => new Date(p.timestamp).toDateString() === today.toDateString()).length} hom nay)`);
console.log(`   - ${inventory.length} san pham kho`);
console.log(`   - ${invoices.length} hoa don`);
console.log('\n📥 Nap du lieu: Settings → Khôi phục dữ liệu → chon file data/test-data.json');
console.log('   Hoac chay: node scripts/loadTestData.js (can server dang chay)');
