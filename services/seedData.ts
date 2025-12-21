// Script sinh dữ liệu test cho Eye Clinic
// Bao gồm: Tròng kính, Gọng kính, Thuốc, và Hóa đơn qua nhiều tháng

const generateId = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);

// ============ TRÒNG KÍNH ============
export const SEED_LENSES = [
    // Tròng cận nhẹ (-0.50 đến -2.00)
    { id: generateId(), code: 'TK001', category: 'lens' as const, name: 'Essilor Crizal Alize', specs: { sph: -0.50, cyl: 0, material: '1.56', type: 'single', note: 'Tròng cận nhẹ, phủ chống xước' }, costPrice: 150000, price: 280000, quantity: 20, minStock: 5 },
    { id: generateId(), code: 'TK002', category: 'lens' as const, name: 'Essilor Crizal Alize', specs: { sph: -1.00, cyl: 0, material: '1.56', type: 'single', note: 'Tròng cận nhẹ, phủ chống xước' }, costPrice: 150000, price: 280000, quantity: 25, minStock: 5 },
    { id: generateId(), code: 'TK003', category: 'lens' as const, name: 'Essilor Crizal Alize', specs: { sph: -1.50, cyl: 0, material: '1.56', type: 'single', note: 'Tròng cận nhẹ, phủ chống xước' }, costPrice: 150000, price: 280000, quantity: 18, minStock: 5 },
    { id: generateId(), code: 'TK004', category: 'lens' as const, name: 'Essilor Crizal Alize', specs: { sph: -2.00, cyl: 0, material: '1.56', type: 'single', note: 'Tròng cận nhẹ, phủ chống xước' }, costPrice: 150000, price: 280000, quantity: 22, minStock: 5 },

    // Tròng cận trung bình (-2.50 đến -4.00)
    { id: generateId(), code: 'TK005', category: 'lens' as const, name: 'Chemi U2 Blue Cut', specs: { sph: -2.50, cyl: 0, material: '1.60', type: 'single', note: 'Độ cận -2.50, lọc ánh sáng xanh' }, costPrice: 200000, price: 380000, quantity: 15, minStock: 5 },
    { id: generateId(), code: 'TK006', category: 'lens' as const, name: 'Chemi U2 Blue Cut', specs: { sph: -3.00, cyl: 0, material: '1.60', type: 'single', note: 'Độ cận -3.00, lọc ánh sáng xanh' }, costPrice: 200000, price: 380000, quantity: 20, minStock: 5 },
    { id: generateId(), code: 'TK007', category: 'lens' as const, name: 'Chemi U2 Blue Cut', specs: { sph: -3.50, cyl: 0, material: '1.60', type: 'single', note: 'Độ cận -3.50, lọc ánh sáng xanh' }, costPrice: 200000, price: 380000, quantity: 12, minStock: 5 },
    { id: generateId(), code: 'TK008', category: 'lens' as const, name: 'Chemi U2 Blue Cut', specs: { sph: -4.00, cyl: 0, material: '1.60', type: 'single', note: 'Độ cận -4.00, lọc ánh sáng xanh' }, costPrice: 200000, price: 380000, quantity: 10, minStock: 5 },

    // Tròng cận nặng (-4.50 đến -8.00)
    { id: generateId(), code: 'TK009', category: 'lens' as const, name: 'Hoya BlueControl 1.67', specs: { sph: -4.50, cyl: 0, material: '1.67', type: 'single', note: 'Độ cận cao -4.50, siêu mỏng' }, costPrice: 450000, price: 750000, quantity: 8, minStock: 3 },
    { id: generateId(), code: 'TK010', category: 'lens' as const, name: 'Hoya BlueControl 1.67', specs: { sph: -5.00, cyl: 0, material: '1.67', type: 'single', note: 'Độ cận cao -5.00, siêu mỏng' }, costPrice: 450000, price: 750000, quantity: 10, minStock: 3 },
    { id: generateId(), code: 'TK011', category: 'lens' as const, name: 'Hoya BlueControl 1.74', specs: { sph: -6.00, cyl: 0, material: '1.74', type: 'single', note: 'Độ cận rất cao -6.00, siêu siêu mỏng' }, costPrice: 650000, price: 1100000, quantity: 5, minStock: 2 },
    { id: generateId(), code: 'TK012', category: 'lens' as const, name: 'Hoya BlueControl 1.74', specs: { sph: -8.00, cyl: 0, material: '1.74', type: 'single', note: 'Độ cận rất cao -8.00, siêu siêu mỏng' }, costPrice: 650000, price: 1100000, quantity: 3, minStock: 2 },

    // Tròng có độ loạn
    { id: generateId(), code: 'TK013', category: 'lens' as const, name: 'Essilor Varilux', specs: { sph: -2.00, cyl: -0.50, material: '1.60', type: 'single', note: 'Cận -2.00 loạn -0.50' }, costPrice: 220000, price: 420000, quantity: 12, minStock: 5 },
    { id: generateId(), code: 'TK014', category: 'lens' as const, name: 'Essilor Varilux', specs: { sph: -2.50, cyl: -0.75, material: '1.60', type: 'single', note: 'Cận -2.50 loạn -0.75' }, costPrice: 220000, price: 420000, quantity: 10, minStock: 5 },
    { id: generateId(), code: 'TK015', category: 'lens' as const, name: 'Essilor Varilux', specs: { sph: -3.00, cyl: -1.00, material: '1.60', type: 'single', note: 'Cận -3.00 loạn -1.00' }, costPrice: 250000, price: 480000, quantity: 8, minStock: 3 },
    { id: generateId(), code: 'TK016', category: 'lens' as const, name: 'Zeiss SmartLife', specs: { sph: -3.50, cyl: -1.25, material: '1.67', type: 'single', note: 'Cận -3.50 loạn -1.25' }, costPrice: 350000, price: 620000, quantity: 6, minStock: 3 },

    // Tròng đa tròng (Progressive)
    { id: generateId(), code: 'TK017', category: 'lens' as const, name: 'Essilor Varilux Comfort', specs: { sph: -1.50, cyl: 0, add: 1.50, material: '1.60', type: 'pal', note: 'Đa tròng cận -1.50 ADD +1.50' }, costPrice: 800000, price: 1500000, quantity: 4, minStock: 2 },
    { id: generateId(), code: 'TK018', category: 'lens' as const, name: 'Essilor Varilux Comfort', specs: { sph: -2.00, cyl: 0, add: 2.00, material: '1.60', type: 'pal', note: 'Đa tròng cận -2.00 ADD +2.00' }, costPrice: 800000, price: 1500000, quantity: 5, minStock: 2 },
    { id: generateId(), code: 'TK019', category: 'lens' as const, name: 'Hoya ID MyStyle', specs: { sph: -2.50, cyl: -0.50, add: 1.75, material: '1.67', type: 'pal', note: 'Đa tròng cao cấp' }, costPrice: 1200000, price: 2200000, quantity: 3, minStock: 2 },

    // Tròng viễn thị (positive)
    { id: generateId(), code: 'TK020', category: 'lens' as const, name: 'Rodenstock Pure Life', specs: { sph: 1.00, cyl: 0, material: '1.56', type: 'single', note: 'Viễn thị +1.00' }, costPrice: 180000, price: 320000, quantity: 10, minStock: 3 },
    { id: generateId(), code: 'TK021', category: 'lens' as const, name: 'Rodenstock Pure Life', specs: { sph: 1.50, cyl: 0, material: '1.56', type: 'single', note: 'Viễn thị +1.50' }, costPrice: 180000, price: 320000, quantity: 8, minStock: 3 },
    { id: generateId(), code: 'TK022', category: 'lens' as const, name: 'Rodenstock Pure Life', specs: { sph: 2.00, cyl: 0, material: '1.56', type: 'single', note: 'Viễn thị +2.00' }, costPrice: 180000, price: 320000, quantity: 6, minStock: 3 },

    // Tròng đọc sách (cao tuổi)
    { id: generateId(), code: 'TK023', category: 'lens' as const, name: 'Tròng đọc sách', specs: { sph: 1.00, cyl: 0, material: '1.50', type: 'single', note: 'Tròng nhìn gần +1.00, cho người già' }, costPrice: 80000, price: 150000, quantity: 30, minStock: 10 },
    { id: generateId(), code: 'TK024', category: 'lens' as const, name: 'Tròng đọc sách', specs: { sph: 1.50, cyl: 0, material: '1.50', type: 'single', note: 'Tròng nhìn gần +1.50, cho người già' }, costPrice: 80000, price: 150000, quantity: 35, minStock: 10 },
    { id: generateId(), code: 'TK025', category: 'lens' as const, name: 'Tròng đọc sách', specs: { sph: 2.00, cyl: 0, material: '1.50', type: 'single', note: 'Tròng nhìn gần +2.00, cho người già' }, costPrice: 80000, price: 150000, quantity: 40, minStock: 10 },
];

// ============ GỌNG KÍNH ============
export const SEED_FRAMES = [
    // Gọng kim loại cao cấp
    { id: generateId(), code: 'GK001', category: 'frame' as const, name: 'Rayban RB3025 Aviator', specs: { material: 'Kim loại Titanium' }, costPrice: 1800000, price: 3200000, quantity: 5, minStock: 2 },
    { id: generateId(), code: 'GK002', category: 'frame' as const, name: 'Rayban RB4171 Erika', specs: { material: 'Kim loại/Nhựa' }, costPrice: 1500000, price: 2800000, quantity: 6, minStock: 2 },
    { id: generateId(), code: 'GK003', category: 'frame' as const, name: 'Gucci GG0010O', specs: { material: 'Titanium cao cấp' }, costPrice: 3500000, price: 6500000, quantity: 3, minStock: 1 },
    { id: generateId(), code: 'GK004', category: 'frame' as const, name: 'Prada VPR01V', specs: { material: 'Kim loại Italy' }, costPrice: 2800000, price: 4800000, quantity: 4, minStock: 1 },

    // Gọng nhựa dẻo
    { id: generateId(), code: 'GK005', category: 'frame' as const, name: 'Gọng nhựa Hàn Quốc A01', specs: { material: 'Nhựa dẻo TR90' }, costPrice: 120000, price: 280000, quantity: 50, minStock: 10 },
    { id: generateId(), code: 'GK006', category: 'frame' as const, name: 'Gọng nhựa Hàn Quốc A02', specs: { material: 'Nhựa dẻo TR90' }, costPrice: 130000, price: 300000, quantity: 45, minStock: 10 },
    { id: generateId(), code: 'GK007', category: 'frame' as const, name: 'Gọng nhựa Hàn Quốc A03', specs: { material: 'Nhựa dẻo TR90' }, costPrice: 140000, price: 320000, quantity: 40, minStock: 10 },
    { id: generateId(), code: 'GK008', category: 'frame' as const, name: 'Gọng trong suốt B01', specs: { material: 'Nhựa trong' }, costPrice: 100000, price: 220000, quantity: 60, minStock: 15 },
    { id: generateId(), code: 'GK009', category: 'frame' as const, name: 'Gọng trong suốt B02', specs: { material: 'Nhựa trong' }, costPrice: 110000, price: 250000, quantity: 55, minStock: 15 },

    // Gọng cận thời trang
    { id: generateId(), code: 'GK010', category: 'frame' as const, name: 'Gọng vuông vintage C01', specs: { material: 'Acetate Italy' }, costPrice: 250000, price: 480000, quantity: 25, minStock: 5 },
    { id: generateId(), code: 'GK011', category: 'frame' as const, name: 'Gọng tròn retro C02', specs: { material: 'Acetate Italy' }, costPrice: 260000, price: 500000, quantity: 20, minStock: 5 },
    { id: generateId(), code: 'GK012', category: 'frame' as const, name: 'Gọng cat-eye nữ C03', specs: { material: 'Acetate Italy' }, costPrice: 280000, price: 520000, quantity: 18, minStock: 5 },

    // Gọng trẻ em
    { id: generateId(), code: 'GK013', category: 'frame' as const, name: 'Gọng trẻ em siêu dẻo D01', specs: { material: 'Silicon an toàn' }, costPrice: 80000, price: 180000, quantity: 35, minStock: 10 },
    { id: generateId(), code: 'GK014', category: 'frame' as const, name: 'Gọng trẻ em siêu dẻo D02', specs: { material: 'Silicon an toàn' }, costPrice: 90000, price: 200000, quantity: 30, minStock: 10 },

    // Gọng thể thao
    { id: generateId(), code: 'GK015', category: 'frame' as const, name: 'Gọng thể thao Oakley E01', specs: { material: 'O-Matter siêu nhẹ' }, costPrice: 800000, price: 1500000, quantity: 8, minStock: 3 },
    { id: generateId(), code: 'GK016', category: 'frame' as const, name: 'Gọng thể thao Nike E02', specs: { material: 'Flexon bền bỉ' }, costPrice: 700000, price: 1300000, quantity: 10, minStock: 3 },
];

// ============ THUỐC MẮT ============
export const SEED_MEDICINES = [
    // Thuốc nhỏ mắt thông thường
    { id: generateId(), code: 'TH001', category: 'medicine' as const, name: 'V.Rohto Nhỏ Mắt', specs: { type: 'Nhỏ mắt' }, costPrice: 35000, price: 55000, quantity: 100, minStock: 20 },
    { id: generateId(), code: 'TH002', category: 'medicine' as const, name: 'Rohto Cool', specs: { type: 'Nhỏ mắt mát lạnh' }, costPrice: 38000, price: 60000, quantity: 80, minStock: 20 },
    { id: generateId(), code: 'TH003', category: 'medicine' as const, name: 'Rohto Lycee Contact', specs: { type: 'Dùng cho kính áp tròng' }, costPrice: 55000, price: 85000, quantity: 50, minStock: 15 },

    // Nước mắt nhân tạo
    { id: generateId(), code: 'TH004', category: 'medicine' as const, name: 'Systane Ultra', specs: { type: 'Nước mắt nhân tạo' }, costPrice: 85000, price: 130000, quantity: 40, minStock: 10 },
    { id: generateId(), code: 'TH005', category: 'medicine' as const, name: 'Refresh Tears', specs: { type: 'Nước mắt nhân tạo' }, costPrice: 75000, price: 115000, quantity: 45, minStock: 10 },
    { id: generateId(), code: 'TH006', category: 'medicine' as const, name: 'Optive Fusion', specs: { type: 'Nước mắt nhân tạo cao cấp' }, costPrice: 120000, price: 180000, quantity: 25, minStock: 8 },

    // Thuốc kháng viêm
    { id: generateId(), code: 'TH007', category: 'medicine' as const, name: 'Tobradex', specs: { type: 'Kháng sinh + Corticoid' }, costPrice: 65000, price: 95000, quantity: 60, minStock: 15 },
    { id: generateId(), code: 'TH008', category: 'medicine' as const, name: 'Tobrex', specs: { type: 'Kháng sinh' }, costPrice: 55000, price: 85000, quantity: 70, minStock: 20 },
    { id: generateId(), code: 'TH009', category: 'medicine' as const, name: 'Maxitrol', specs: { type: 'Kháng viêm mạnh' }, costPrice: 80000, price: 120000, quantity: 40, minStock: 10 },

    // Thuốc bổ mắt
    { id: generateId(), code: 'TH010', category: 'medicine' as const, name: 'Ocuvite Lutein', specs: { type: 'Viên uống bổ mắt' }, costPrice: 180000, price: 280000, quantity: 30, minStock: 10 },
    { id: generateId(), code: 'TH011', category: 'medicine' as const, name: 'Preservision AREDS', specs: { type: 'Viên uống cao cấp' }, costPrice: 350000, price: 520000, quantity: 15, minStock: 5 },

    // Thuốc dị ứng
    { id: generateId(), code: 'TH012', category: 'medicine' as const, name: 'Patanol', specs: { type: 'Chống dị ứng' }, costPrice: 95000, price: 145000, quantity: 35, minStock: 10 },
    { id: generateId(), code: 'TH013', category: 'medicine' as const, name: 'Zaditen', specs: { type: 'Chống dị ứng' }, costPrice: 85000, price: 130000, quantity: 40, minStock: 10 },

    // Gel/Mỡ mắt
    { id: generateId(), code: 'TH014', category: 'medicine' as const, name: 'Vidisic Gel', specs: { type: 'Gel bôi mắt ban đêm' }, costPrice: 90000, price: 140000, quantity: 30, minStock: 10 },
    { id: generateId(), code: 'TH015', category: 'medicine' as const, name: 'Lacri-Lube', specs: { type: 'Mỡ tra mắt' }, costPrice: 100000, price: 155000, quantity: 25, minStock: 8 },
];

// ============ BỆNH NHÂN MẪU ============
const PATIENT_NAMES = [
    'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thị Dung', 'Hoàng Văn Em',
    'Vũ Thị Phương', 'Đặng Công Giang', 'Bùi Thị Hoa', 'Đinh Văn Hùng', 'Lý Thị Kim',
    'Ngô Văn Long', 'Đỗ Thị Mai', 'Hồ Văn Nam', 'Trịnh Thị Oanh', 'Phan Quốc Phong',
    'Dương Thị Quỳnh', 'Lương Văn Rạng', 'Tô Thị Sen', 'Lâm Văn Tài', 'Võ Thị Uyên'
];

const REASONS = ['Cắt kính', 'Khám mắt', 'Nhức mắt, mờ', 'Đau mắt đỏ', 'Tái khám', 'Thay kính mới', 'Kiểm tra định kỳ'];

// Hàm tạo bệnh nhân với timestamp ở các tháng khác nhau
export function generatePatients(count: number = 50): any[] {
    const patients: any[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const monthsAgo = Math.floor(Math.random() * 6); // 0-5 tháng trước
        const daysAgo = Math.floor(Math.random() * 28);
        const timestamp = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate() - daysAgo,
            8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)).getTime();

        const gender = Math.random() > 0.5 ? 'Nam' : 'Nữ';
        const hasGlasses = Math.random() > 0.4;

        patients.push({
            id: generateId(),
            ticketNumber: 101 + i,
            fullName: PATIENT_NAMES[i % PATIENT_NAMES.length] + (i >= PATIENT_NAMES.length ? ` ${Math.floor(i / PATIENT_NAMES.length) + 1}` : ''),
            dob: 1950 + Math.floor(Math.random() * 60),
            phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
            address: 'Vĩnh Thuận, Kiên Giang',
            gender,
            reason: REASONS[Math.floor(Math.random() * REASONS.length)],
            hasGlasses,
            initialVA: {
                od: ['10/10', '8/10', '6/10', '4/10', '3/10'][Math.floor(Math.random() * 5)],
                os: ['10/10', '8/10', '6/10', '4/10', '3/10'][Math.floor(Math.random() * 5)]
            },
            notes: '',
            status: 'completed' as const,
            timestamp
        });
    }

    return patients.sort((a, b) => b.timestamp - a.timestamp);
}

// Hàm tạo hóa đơn với timestamp ở các tháng khác nhau
export function generateInvoices(patients: any[], inventory: any[], count: number = 80): any[] {
    const invoices: any[] = [];
    const now = new Date();
    const lenses = inventory.filter((i: any) => i.category === 'lens');
    const frames = inventory.filter((i: any) => i.category === 'frame');
    const medicines = inventory.filter((i: any) => i.category === 'medicine');

    for (let i = 0; i < count; i++) {
        const monthsAgo = Math.floor(Math.random() * 6); // 0-5 tháng trước
        const daysAgo = Math.floor(Math.random() * 28);
        const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate() - daysAgo,
            8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)).getTime();

        const patient = patients[Math.floor(Math.random() * patients.length)];
        const items: any[] = [];

        // Random loại hóa đơn
        const invoiceType = Math.random();

        if (invoiceType < 0.5) {
            // Hóa đơn cắt kính (tròng + gọng)
            const lens1 = lenses[Math.floor(Math.random() * lenses.length)];
            const lens2 = lenses[Math.floor(Math.random() * lenses.length)];
            const frame = frames[Math.floor(Math.random() * frames.length)];

            items.push({ itemId: lens1.id, name: lens1.name, quantity: 1, costPrice: lens1.costPrice, price: lens1.price, isLens: true });
            items.push({ itemId: lens2.id, name: lens2.name, quantity: 1, costPrice: lens2.costPrice, price: lens2.price, isLens: true });
            items.push({ itemId: frame.id, name: frame.name, quantity: 1, costPrice: frame.costPrice, price: frame.price, isLens: false });
        } else if (invoiceType < 0.75) {
            // Hóa đơn chỉ thuốc
            const numMeds = 1 + Math.floor(Math.random() * 3);
            for (let j = 0; j < numMeds; j++) {
                const med = medicines[Math.floor(Math.random() * medicines.length)];
                items.push({ itemId: med.id, name: med.name, quantity: 1 + Math.floor(Math.random() * 3), costPrice: med.costPrice, price: med.price, isLens: false });
            }
        } else {
            // Hóa đơn hỗn hợp (kính + thuốc)
            const lens = lenses[Math.floor(Math.random() * lenses.length)];
            const frame = frames[Math.floor(Math.random() * frames.length)];
            const med = medicines[Math.floor(Math.random() * medicines.length)];

            items.push({ itemId: lens.id, name: lens.name, quantity: 2, costPrice: lens.costPrice, price: lens.price, isLens: true });
            items.push({ itemId: frame.id, name: frame.name, quantity: 1, costPrice: frame.costPrice, price: frame.price, isLens: false });
            items.push({ itemId: med.id, name: med.name, quantity: 1, costPrice: med.costPrice, price: med.price, isLens: false });
        }

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const totalCost = items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
        const discount = Math.random() > 0.8 ? Math.floor(subtotal * 0.05 / 10000) * 10000 : 0; // 20% cơ hội giảm giá 5%
        const surcharge = Math.random() > 0.9 ? 50000 : 0; // 10% cơ hội phụ thu
        const total = subtotal - discount + surcharge;
        const profit = total - totalCost;

        invoices.push({
            id: generateId(),
            patientId: patient.id,
            patientName: patient.fullName,
            patientPhone: patient.phone,
            patientAddress: patient.address,
            items,
            subtotal,
            discount,
            surcharge,
            total,
            profit,
            date
        });
    }

    return invoices.sort((a, b) => b.date - a.date);
}

// Export function để seed data
export function getSeedData() {
    const inventory = [...SEED_LENSES, ...SEED_FRAMES, ...SEED_MEDICINES];
    const patients = generatePatients(50);
    const invoices = generateInvoices(patients, inventory, 80);

    return {
        inventory,
        patients,
        invoices
    };
}
