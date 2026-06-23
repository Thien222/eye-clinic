/**
 * Tạo file data/test-data.json để test phần mềm (dữ liệu HÔM NAY)
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
const dateLabel = today.toLocaleDateString('vi-VN');

const patients = [
  {
    id: id('p01'), ticketNumber: 1, fullName: 'Nguyễn Văn An — Chờ đo KX',
    dob: 1990, phone: '0911111001', address: 'Vĩnh Thuận, Kiên Giang', gender: 'Nam',
    reason: 'Cắt kính', hasGlasses: true, notes: 'Test: chờ đo khúc xạ',
    initialVA: { od: '5/10', os: '6/10' }, status: 'waiting_refraction',
    timestamp: startOfDay(today) + 5 * 60000, updatedAt: Date.now()
  },
  {
    id: id('p02'), ticketNumber: 2, fullName: 'Trần Thị Bình — Đang đo',
    dob: 1985, phone: '0911111002', address: 'Rạch Giá', gender: 'Nữ',
    reason: 'Cắt kính', hasGlasses: false, notes: 'Test: đang đo khúc xạ',
    initialVA: { od: '4/10', os: '4/10' }, status: 'processing_refraction',
    timestamp: startOfDay(today) + 15 * 60000, updatedAt: Date.now()
  },
  {
    id: id('p03'), ticketNumber: 3, fullName: 'Lê Văn Cường — Chờ khám mắt',
    dob: 1978, phone: '0911111003', address: 'An Biên', gender: 'Nam',
    reason: 'Khám mắt', hasGlasses: true, notes: 'Test: chờ khám mắt',
    initialVA: { od: '7/10', os: '8/10' }, status: 'waiting_doctor',
    timestamp: startOfDay(today) + 25 * 60000, updatedAt: Date.now()
  },
  {
    id: id('p04'), ticketNumber: 4, fullName: 'Phạm Thị Dung — Chờ thanh toán',
    dob: 1995, phone: '0911111004', address: 'Hà Tiên', gender: 'Nữ',
    reason: 'Cắt kính', hasGlasses: false, notes: 'Test: 2 mắt KHÁC độ',
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
      note: 'Test OD/OS khác độ'
    }
  },
  {
    id: id('p05'), ticketNumber: 5, fullName: 'Hoàng Văn Em — Chờ TT cùng độ',
    dob: 2000, phone: '0911111005', address: 'Phú Quốc', gender: 'Nam',
    reason: 'Cắt kính', hasGlasses: false, notes: 'Test: 2 mắt CÙNG độ',
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
      note: 'Test cặp tròng cùng giá'
    }
  },
  {
    id: id('p06'), ticketNumber: 6, fullName: 'Võ Thị Phương — Đã hoàn thành',
    dob: 1988, phone: '0911111006', address: 'Cần Thơ', gender: 'Nữ',
    reason: 'Cắt kính', hasGlasses: true, notes: 'Test: đã hoàn thành hôm nay',
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
  {
    id: id('p07'), ticketNumber: 99, fullName: 'CŨ — Hôm qua chờ đo (KHÔNG hiện)',
    dob: 1970, phone: '0911111999', address: 'Test cũ', gender: 'Nam',
    reason: 'Cắt kính', hasGlasses: false, notes: 'BN hôm qua — auto complete',
    initialVA: { od: '5/10', os: '5/10' }, status: 'waiting_refraction',
    timestamp: startOfDay(yesterday) + 30 * 60000, updatedAt: startOfDay(yesterday)
  },
  {
    id: id('p08'), ticketNumber: 98, fullName: 'CŨ — Hôm qua chờ thanh toán',
    dob: 1975, phone: '0911111998', address: 'Test cũ', gender: 'Nữ',
    reason: 'Cắt kính', hasGlasses: false, notes: 'BN hôm qua',
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
  { id: id('lens-od'), code: 'LENS-OD-200', category: 'lens', name: 'Essilor Crizal OD', specs: { sph: -2.00, cyl: -0.50, material: '1.56', type: 'single' }, costPrice: 180000, price: 280000, quantity: 20, minStock: 5 },
  { id: id('lens-os'), code: 'LENS-OS-150', category: 'lens', name: 'Essilor Crizal OS', specs: { sph: -1.50, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 280000, quantity: 20, minStock: 5 },
  { id: id('lens-pair-a'), code: 'LENS-PAIR-A', category: 'lens', name: 'Chemi U2 Cặp A', specs: { sph: -2.00, cyl: 0, material: '1.60', type: 'single' }, costPrice: 120000, price: 280000, quantity: 15, minStock: 5 },
  { id: id('lens-pair-b'), code: 'LENS-PAIR-B', category: 'lens', name: 'Chemi U2 Cặp B', specs: { sph: -2.00, cyl: 0, material: '1.60', type: 'single' }, costPrice: 120000, price: 280000, quantity: 15, minStock: 5 },
  { id: id('lens-cheap'), code: 'LENS-CHEAP', category: 'lens', name: 'Tròng giá rẻ -2.00', specs: { sph: -2.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 80000, price: 150000, quantity: 30, minStock: 5 },
  { id: id('lens-premium'), code: 'LENS-PREMIUM', category: 'lens', name: 'Hoya Premium -2.00', specs: { sph: -2.00, cyl: 0, material: '1.67', type: 'single' }, costPrice: 400000, price: 650000, quantity: 10, minStock: 3 },
  { id: id('frame-1'), code: 'GONG-001', category: 'frame', name: 'Gọng Titan Xanh', specs: { material: 'Titan' }, costPrice: 200000, price: 450000, quantity: 8, minStock: 2 },
  { id: id('frame-2'), code: 'GONG-002', category: 'frame', name: 'Gọng Nhựa Đen', specs: { material: 'Nhựa' }, costPrice: 80000, price: 250000, quantity: 15, minStock: 3 },
  { id: id('med-1'), code: 'MED-001', category: 'medicine', name: 'V.Rohto', costPrice: 35000, price: 50000, quantity: 50, minStock: 10 },
];

const invoices = [
  {
    id: id('inv-1'), patientId: id('p06'), patientName: 'Võ Thị Phương — Đã hoàn thành', patientPhone: '0911111006',
    items: [
      { itemId: id('lens-od'), name: 'Essilor Crizal OD (OD)', quantity: 1, costPrice: 180000, price: 280000, isLens: true, eye: 'OD' },
      { itemId: id('frame-1'), name: 'Gọng Titan Xanh', quantity: 1, costPrice: 200000, price: 450000, isLens: false },
    ],
    subtotal: 730000, discount: 30000, surcharge: 50000, total: 750000, profit: 300000,
    date: startOfDay(today) + 70 * 60000
  },
  {
    id: id('inv-2'), patientId: id('p08'), patientName: 'CŨ — Hôm qua', patientPhone: '0911111998',
    items: [
      { itemId: id('lens-pair-a'), name: 'Chemi U2 Cặp A (OD)', quantity: 1, costPrice: 120000, price: 280000, isLens: true, eye: 'OD' },
      { itemId: id('lens-pair-b'), name: 'Chemi U2 Cặp B (OS)', quantity: 1, costPrice: 120000, price: 280000, isLens: true, eye: 'OS' },
      { itemId: id('frame-2'), name: 'Gọng Nhựa Đen', quantity: 1, costPrice: 80000, price: 250000, isLens: false },
    ],
    subtotal: 810000, discount: 0, surcharge: 0, total: 810000, profit: 370000,
    date: startOfDay(yesterday) + 90 * 60000
  }
];

const settings = {
  settingsUpdatedAt: Date.now(),
  name: 'PHÒNG KHÁM MẮT TEST',
  doctorName: 'BSCKII. Bác Sĩ Test',
  address: 'Vĩnh Thuận - Kiên Giang (TEST)',
  phone: '0917-TEST-001',
  email: 'test@eyeclinic.local',
  workingHours: '8h–19h, Thứ hai đến Chủ nhật',
  logoUrl: '',
  vat: { enabled: false, rate: 10 },
  invoice: { header: 'HÓA ĐƠN TEST', footer: 'Cảm ơn quý khách — TEST!', showLogo: false },
  ticket: {
    header: 'PHÒNG KHÁM MẮT TEST',
    subHeader: 'BS. Bác Sĩ Test',
    note: 'Khách hàng vui lòng chờ đến STT',
    footer: 'Phiếu có hiệu lực trong ngày'
  },
  refraction: {
    header: 'PHÒNG KHÁM MẮT TEST',
    rightHeader: 'KHÁM KHÚC XẠ — TEST',
    disclaimer1: 'Lưu ý test 1: Khách hàng đã được đeo thử kính.',
    disclaimer2: 'Lưu ý test 2: Khách hàng đã được tư vấn độ kính.'
  },
  backup: { path: '', maxFiles: 20, autoBackupOnClose: true, autoBackupInterval: 4 },
  printTemplates: {
    receiptHeader: 'HÓA ĐƠN TEST',
    receiptFooter: 'Cảm ơn!',
    prescriptionHeader: 'PHIẾU KX',
    prescriptionFooter: 'Bác sĩ'
  }
};

const data = {
  patients,
  inventory,
  invoices,
  settings,
  syncMeta: { version: 1, lastUpdated: Date.now(), deletedPatientIds: [] },
  generatedAt: dateLabel
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8');
const todayCount = patients.filter(p => new Date(p.timestamp).toDateString() === today.toDateString()).length;
console.log(`✅ Đã tạo: ${OUT}`);
console.log(`   📅 Ngày: ${dateLabel}`);
console.log(`   👤 ${patients.length} bệnh nhân (${todayCount} hôm nay)`);
console.log(`   📦 ${inventory.length} sản phẩm kho`);
console.log(`   🧾 ${invoices.length} hóa đơn`);
console.log('\n📥 Nạp dữ liệu: Cài đặt → Sao lưu → Nạp dữ liệu TEST');
console.log('   Hoặc: node scripts/loadTestData.js (cần server đang chạy)');
