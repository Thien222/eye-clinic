// ====== COPY TẤT CẢ CODE NÀY VÀO BROWSER CONSOLE (F12) ======
// Script tạo DỮ LIỆU LỚN để test thống kê doanh thu, backup, etc.
// - 100 bệnh nhân
// - 56 sản phẩm (tròng kính, gọng kính, thuốc)
// - 250 hóa đơn trải đều trong 12 tháng

(function () {
    const vietnameseNames = [
        'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Đức', 'Hoàng Thị Em',
        'Vũ Quang Phú', 'Đặng Thị Giang', 'Bùi Văn Hùng', 'Đỗ Thị Lan', 'Ngô Đình Khoa',
        'Dương Thị Mai', 'Lý Văn Nam', 'Trịnh Thị Oanh', 'Phan Quốc Phong', 'Hồ Thị Quế',
        'Võ Văn Rồng', 'Mai Thị Sen', 'Cao Đức Tài', 'Lưu Thị Uyên', 'Đinh Văn Việt',
        'Nguyễn Thị Hương', 'Trần Văn Minh', 'Lê Thị Ngọc', 'Phạm Quốc Anh', 'Hoàng Thanh Tùng',
        'Vũ Thị Kim', 'Đặng Hữu Phước', 'Bùi Thị Thanh', 'Đỗ Minh Tuấn', 'Ngô Thị Yến',
        'Dương Văn Lâm', 'Lý Thị Như', 'Trịnh Quang Hải', 'Phan Thị Thảo', 'Hồ Văn Đông',
        'Võ Thị Hạnh', 'Mai Quốc Việt', 'Cao Thị Nhung', 'Lưu Văn Hà', 'Đinh Thị Liên',
        'Nguyễn Hữu Thắng', 'Trần Thị Phương', 'Lê Văn Đạt', 'Phạm Thị Vân', 'Hoàng Văn Sơn',
        'Vũ Thị Bích', 'Đặng Văn Tâm', 'Bùi Thị Diệu', 'Đỗ Văn Khang', 'Ngô Thị Hằng'
    ];

    const addresses = [
        'Thị trấn Vĩnh Thuận, Kiên Giang',
        '123 Trần Hưng Đạo, Rạch Giá',
        '45 Nguyễn Trãi, An Biên',
        '78 Lý Thường Kiệt, Vĩnh Long',
        '56 Hùng Vương, Tân Châu, An Giang',
        '12 Nguyễn Du, Long Xuyên',
        '89 Lê Lợi, Châu Thành, An Giang',
        '34 Pasteur, Cần Thơ',
        '67 Hai Bà Trưng, Ninh Kiều',
        '23 Võ Văn Tần, Sóc Trăng',
        '156 Nguyễn Văn Linh, Bình Thủy',
        '234 Mậu Thân, Cái Răng',
        '45 Hoàng Văn Thụ, Phú Quốc',
        '89 Trưng Nữ Vương, Hà Tiên',
        '12 Đinh Tiên Hoàng, Kiên Lương'
    ];

    const reasons = ['Mờ mắt xa', 'Nhức mắt', 'Thay kính mới', 'Khám định kỳ', 'Đau đầu khi nhìn gần', 'Mỏi mắt khi làm việc', 'Đau mắt đỏ', 'Tái khám', 'Cắt kính'];
    const lensTypes = ['Đơn tròng - nhìn xa', 'Đơn tròng - nhìn gần', 'Hai tròng', 'Đa tròng lũy tiến'];
    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomPhone = () => ['091', '093', '097', '098', '090', '035', '036', '037', '038', '039'][randomBetween(0, 9)] + randomBetween(1000000, 9999999);
    const randomVA = () => ['10/10', '9/10', '8/10', '7/10', '6/10', '5/10', '4/10', '3/10'][randomBetween(0, 7)];
    const randomSph = () => { const v = (randomBetween(-80, 40) / 10).toFixed(2); return parseFloat(v) >= 0 ? '+' + v : v; };
    const randomCyl = () => { const v = (randomBetween(-35, 0) / 10).toFixed(2); return v === '0.00' ? '' : v; };
    const generateId = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);

    // ============ TẠO 100 BỆNH NHÂN ============
    const patients = [];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
        const name = vietnameseNames[i % vietnameseNames.length] + (i >= vietnameseNames.length ? ` ${Math.floor(i / vietnameseNames.length) + 1}` : '');
        const isComplete = Math.random() > 0.2;
        const monthsAgo = Math.floor(Math.random() * 12); // 0-11 tháng trước
        const daysAgo = Math.floor(Math.random() * 28);
        const timestamp = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate() - daysAgo,
            8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)).getTime();

        const p = {
            id: generateId(),
            ticketNumber: i + 1,
            fullName: name,
            dob: randomBetween(1945, 2015),
            phone: randomPhone(),
            address: addresses[i % addresses.length],
            gender: Math.random() > 0.5 ? 'Nam' : 'Nữ',
            reason: reasons[randomBetween(0, reasons.length - 1)],
            hasGlasses: Math.random() > 0.4,
            initialVA: { od: randomVA(), os: randomVA() },
            notes: '',
            status: isComplete ? 'completed' : ['waiting_refraction', 'waiting_doctor', 'processing_refraction'][randomBetween(0, 2)],
            timestamp
        };

        if (isComplete) {
            p.refraction = {
                skiascopy: {
                    od: { sph: randomSph(), cyl: randomCyl(), axis: randomBetween(0, 180).toString(), va: '' },
                    os: { sph: randomSph(), cyl: randomCyl(), axis: randomBetween(0, 180).toString(), va: '' },
                    cycloplegia: Math.random() > 0.7
                },
                subjective: {
                    od: { sph: randomSph(), cyl: randomCyl(), axis: randomBetween(0, 180).toString(), va: randomVA() },
                    os: { sph: randomSph(), cyl: randomCyl(), axis: randomBetween(0, 180).toString(), va: randomVA() }
                },
                finalRx: {
                    od: { sph: randomSph(), cyl: randomCyl(), axis: randomBetween(0, 180).toString(), va: '10/10', add: Math.random() > 0.6 ? '+1.50' : '' },
                    os: { sph: randomSph(), cyl: randomCyl(), axis: randomBetween(0, 180).toString(), va: '10/10', add: Math.random() > 0.6 ? '+1.50' : '' },
                    lensType: lensTypes[randomBetween(0, 3)],
                    distance: true,
                    near: Math.random() > 0.5
                },
                note: ''
            };
        }
        patients.push(p);
    }

    // ============ TẠO KHO HÀNG (56 sản phẩm) ============
    const inventory = [
        // TRÒNG KÍNH - Cận nhẹ
        { id: generateId(), code: 'TK001', category: 'lens', name: 'Essilor Crizal Alize', specs: { sph: -0.50, cyl: 0, material: '1.56', type: 'single' }, costPrice: 150000, price: 280000, quantity: 20, minStock: 5 },
        { id: generateId(), code: 'TK002', category: 'lens', name: 'Essilor Crizal Alize', specs: { sph: -1.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 150000, price: 280000, quantity: 25, minStock: 5 },
        { id: generateId(), code: 'TK003', category: 'lens', name: 'Essilor Crizal Alize', specs: { sph: -1.50, cyl: 0, material: '1.56', type: 'single' }, costPrice: 150000, price: 280000, quantity: 18, minStock: 5 },
        { id: generateId(), code: 'TK004', category: 'lens', name: 'Essilor Crizal Alize', specs: { sph: -2.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 150000, price: 280000, quantity: 22, minStock: 5 },
        // TRÒNG KÍNH - Cận trung bình
        { id: generateId(), code: 'TK005', category: 'lens', name: 'Chemi U2 Blue Cut', specs: { sph: -2.50, cyl: 0, material: '1.60', type: 'single' }, costPrice: 200000, price: 380000, quantity: 15, minStock: 5 },
        { id: generateId(), code: 'TK006', category: 'lens', name: 'Chemi U2 Blue Cut', specs: { sph: -3.00, cyl: 0, material: '1.60', type: 'single' }, costPrice: 200000, price: 380000, quantity: 20, minStock: 5 },
        { id: generateId(), code: 'TK007', category: 'lens', name: 'Chemi U2 Blue Cut', specs: { sph: -3.50, cyl: 0, material: '1.60', type: 'single' }, costPrice: 200000, price: 380000, quantity: 12, minStock: 5 },
        { id: generateId(), code: 'TK008', category: 'lens', name: 'Chemi U2 Blue Cut', specs: { sph: -4.00, cyl: 0, material: '1.60', type: 'single' }, costPrice: 200000, price: 380000, quantity: 10, minStock: 5 },
        // TRÒNG KÍNH - Cận nặng
        { id: generateId(), code: 'TK009', category: 'lens', name: 'Hoya BlueControl 1.67', specs: { sph: -4.50, cyl: 0, material: '1.67', type: 'single' }, costPrice: 450000, price: 750000, quantity: 8, minStock: 3 },
        { id: generateId(), code: 'TK010', category: 'lens', name: 'Hoya BlueControl 1.67', specs: { sph: -5.00, cyl: 0, material: '1.67', type: 'single' }, costPrice: 450000, price: 750000, quantity: 10, minStock: 3 },
        { id: generateId(), code: 'TK011', category: 'lens', name: 'Hoya BlueControl 1.74', specs: { sph: -6.00, cyl: 0, material: '1.74', type: 'single' }, costPrice: 650000, price: 1100000, quantity: 5, minStock: 2 },
        { id: generateId(), code: 'TK012', category: 'lens', name: 'Hoya BlueControl 1.74', specs: { sph: -8.00, cyl: 0, material: '1.74', type: 'single' }, costPrice: 650000, price: 1100000, quantity: 3, minStock: 2 },
        // TRÒNG KÍNH - Có loạn
        { id: generateId(), code: 'TK013', category: 'lens', name: 'Essilor Varilux', specs: { sph: -2.00, cyl: -0.50, material: '1.60', type: 'single' }, costPrice: 220000, price: 420000, quantity: 12, minStock: 5 },
        { id: generateId(), code: 'TK014', category: 'lens', name: 'Essilor Varilux', specs: { sph: -2.50, cyl: -0.75, material: '1.60', type: 'single' }, costPrice: 220000, price: 420000, quantity: 10, minStock: 5 },
        { id: generateId(), code: 'TK015', category: 'lens', name: 'Essilor Varilux', specs: { sph: -3.00, cyl: -1.00, material: '1.60', type: 'single' }, costPrice: 250000, price: 480000, quantity: 8, minStock: 3 },
        { id: generateId(), code: 'TK016', category: 'lens', name: 'Zeiss SmartLife', specs: { sph: -3.50, cyl: -1.25, material: '1.67', type: 'single' }, costPrice: 350000, price: 620000, quantity: 6, minStock: 3 },
        // TRÒNG KÍNH - Đa tròng
        { id: generateId(), code: 'TK017', category: 'lens', name: 'Essilor Varilux Comfort', specs: { sph: -1.50, cyl: 0, add: 1.50, material: '1.60', type: 'pal' }, costPrice: 800000, price: 1500000, quantity: 4, minStock: 2 },
        { id: generateId(), code: 'TK018', category: 'lens', name: 'Essilor Varilux Comfort', specs: { sph: -2.00, cyl: 0, add: 2.00, material: '1.60', type: 'pal' }, costPrice: 800000, price: 1500000, quantity: 5, minStock: 2 },
        { id: generateId(), code: 'TK019', category: 'lens', name: 'Hoya ID MyStyle', specs: { sph: -2.50, cyl: -0.50, add: 1.75, material: '1.67', type: 'pal' }, costPrice: 1200000, price: 2200000, quantity: 3, minStock: 2 },
        // TRÒNG KÍNH - Viễn thị
        { id: generateId(), code: 'TK020', category: 'lens', name: 'Rodenstock Pure Life', specs: { sph: 1.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 320000, quantity: 10, minStock: 3 },
        { id: generateId(), code: 'TK021', category: 'lens', name: 'Rodenstock Pure Life', specs: { sph: 1.50, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 320000, quantity: 8, minStock: 3 },
        { id: generateId(), code: 'TK022', category: 'lens', name: 'Rodenstock Pure Life', specs: { sph: 2.00, cyl: 0, material: '1.56', type: 'single' }, costPrice: 180000, price: 320000, quantity: 6, minStock: 3 },
        // TRÒNG KÍNH - Đọc sách
        { id: generateId(), code: 'TK023', category: 'lens', name: 'Tròng đọc sách', specs: { sph: 1.00, cyl: 0, material: '1.50', type: 'single' }, costPrice: 80000, price: 150000, quantity: 30, minStock: 10 },
        { id: generateId(), code: 'TK024', category: 'lens', name: 'Tròng đọc sách', specs: { sph: 1.50, cyl: 0, material: '1.50', type: 'single' }, costPrice: 80000, price: 150000, quantity: 35, minStock: 10 },
        { id: generateId(), code: 'TK025', category: 'lens', name: 'Tròng đọc sách', specs: { sph: 2.00, cyl: 0, material: '1.50', type: 'single' }, costPrice: 80000, price: 150000, quantity: 40, minStock: 10 },

        // GỌNG KÍNH - Cao cấp
        { id: generateId(), code: 'GK001', category: 'frame', name: 'Rayban RB3025 Aviator', specs: { material: 'Kim loại Titanium' }, costPrice: 1800000, price: 3200000, quantity: 5, minStock: 2 },
        { id: generateId(), code: 'GK002', category: 'frame', name: 'Rayban RB4171 Erika', specs: { material: 'Kim loại/Nhựa' }, costPrice: 1500000, price: 2800000, quantity: 6, minStock: 2 },
        { id: generateId(), code: 'GK003', category: 'frame', name: 'Gucci GG0010O', specs: { material: 'Titanium cao cấp' }, costPrice: 3500000, price: 6500000, quantity: 3, minStock: 1 },
        { id: generateId(), code: 'GK004', category: 'frame', name: 'Prada VPR01V', specs: { material: 'Kim loại Italy' }, costPrice: 2800000, price: 4800000, quantity: 4, minStock: 1 },
        // GỌNG KÍNH - Nhựa dẻo
        { id: generateId(), code: 'GK005', category: 'frame', name: 'Gọng nhựa Hàn Quốc A01', specs: { material: 'Nhựa dẻo TR90' }, costPrice: 120000, price: 280000, quantity: 50, minStock: 10 },
        { id: generateId(), code: 'GK006', category: 'frame', name: 'Gọng nhựa Hàn Quốc A02', specs: { material: 'Nhựa dẻo TR90' }, costPrice: 130000, price: 300000, quantity: 45, minStock: 10 },
        { id: generateId(), code: 'GK007', category: 'frame', name: 'Gọng nhựa Hàn Quốc A03', specs: { material: 'Nhựa dẻo TR90' }, costPrice: 140000, price: 320000, quantity: 40, minStock: 10 },
        { id: generateId(), code: 'GK008', category: 'frame', name: 'Gọng trong suốt B01', specs: { material: 'Nhựa trong' }, costPrice: 100000, price: 220000, quantity: 60, minStock: 15 },
        { id: generateId(), code: 'GK009', category: 'frame', name: 'Gọng trong suốt B02', specs: { material: 'Nhựa trong' }, costPrice: 110000, price: 250000, quantity: 55, minStock: 15 },
        // GỌNG KÍNH - Thời trang
        { id: generateId(), code: 'GK010', category: 'frame', name: 'Gọng vuông vintage C01', specs: { material: 'Acetate Italy' }, costPrice: 250000, price: 480000, quantity: 25, minStock: 5 },
        { id: generateId(), code: 'GK011', category: 'frame', name: 'Gọng tròn retro C02', specs: { material: 'Acetate Italy' }, costPrice: 260000, price: 500000, quantity: 20, minStock: 5 },
        { id: generateId(), code: 'GK012', category: 'frame', name: 'Gọng cat-eye nữ C03', specs: { material: 'Acetate Italy' }, costPrice: 280000, price: 520000, quantity: 18, minStock: 5 },
        // GỌNG KÍNH - Trẻ em
        { id: generateId(), code: 'GK013', category: 'frame', name: 'Gọng trẻ em siêu dẻo D01', specs: { material: 'Silicon an toàn' }, costPrice: 80000, price: 180000, quantity: 35, minStock: 10 },
        { id: generateId(), code: 'GK014', category: 'frame', name: 'Gọng trẻ em siêu dẻo D02', specs: { material: 'Silicon an toàn' }, costPrice: 90000, price: 200000, quantity: 30, minStock: 10 },
        // GỌNG KÍNH - Thể thao
        { id: generateId(), code: 'GK015', category: 'frame', name: 'Gọng thể thao Oakley E01', specs: { material: 'O-Matter siêu nhẹ' }, costPrice: 800000, price: 1500000, quantity: 8, minStock: 3 },
        { id: generateId(), code: 'GK016', category: 'frame', name: 'Gọng thể thao Nike E02', specs: { material: 'Flexon bền bỉ' }, costPrice: 700000, price: 1300000, quantity: 10, minStock: 3 },

        // THUỐC MẮT - Nhỏ mắt thông thường
        { id: generateId(), code: 'TH001', category: 'medicine', name: 'V.Rohto Nhỏ Mắt', specs: { type: 'Nhỏ mắt' }, costPrice: 35000, price: 55000, quantity: 100, minStock: 20 },
        { id: generateId(), code: 'TH002', category: 'medicine', name: 'Rohto Cool', specs: { type: 'Nhỏ mắt mát lạnh' }, costPrice: 38000, price: 60000, quantity: 80, minStock: 20 },
        { id: generateId(), code: 'TH003', category: 'medicine', name: 'Rohto Lycee Contact', specs: { type: 'Dùng cho kính áp tròng' }, costPrice: 55000, price: 85000, quantity: 50, minStock: 15 },
        // THUỐC MẮT - Nước mắt nhân tạo
        { id: generateId(), code: 'TH004', category: 'medicine', name: 'Systane Ultra', specs: { type: 'Nước mắt nhân tạo' }, costPrice: 85000, price: 130000, quantity: 40, minStock: 10 },
        { id: generateId(), code: 'TH005', category: 'medicine', name: 'Refresh Tears', specs: { type: 'Nước mắt nhân tạo' }, costPrice: 75000, price: 115000, quantity: 45, minStock: 10 },
        { id: generateId(), code: 'TH006', category: 'medicine', name: 'Optive Fusion', specs: { type: 'Nước mắt nhân tạo cao cấp' }, costPrice: 120000, price: 180000, quantity: 25, minStock: 8 },
        // THUỐC MẮT - Kháng viêm
        { id: generateId(), code: 'TH007', category: 'medicine', name: 'Tobradex', specs: { type: 'Kháng sinh + Corticoid' }, costPrice: 65000, price: 95000, quantity: 60, minStock: 15 },
        { id: generateId(), code: 'TH008', category: 'medicine', name: 'Tobrex', specs: { type: 'Kháng sinh' }, costPrice: 55000, price: 85000, quantity: 70, minStock: 20 },
        { id: generateId(), code: 'TH009', category: 'medicine', name: 'Maxitrol', specs: { type: 'Kháng viêm mạnh' }, costPrice: 80000, price: 120000, quantity: 40, minStock: 10 },
        // THUỐC MẮT - Bổ mắt
        { id: generateId(), code: 'TH010', category: 'medicine', name: 'Ocuvite Lutein', specs: { type: 'Viên uống bổ mắt' }, costPrice: 180000, price: 280000, quantity: 30, minStock: 10 },
        { id: generateId(), code: 'TH011', category: 'medicine', name: 'Preservision AREDS', specs: { type: 'Viên uống cao cấp' }, costPrice: 350000, price: 520000, quantity: 15, minStock: 5 },
        // THUỐC MẮT - Dị ứng
        { id: generateId(), code: 'TH012', category: 'medicine', name: 'Patanol', specs: { type: 'Chống dị ứng' }, costPrice: 95000, price: 145000, quantity: 35, minStock: 10 },
        { id: generateId(), code: 'TH013', category: 'medicine', name: 'Zaditen', specs: { type: 'Chống dị ứng' }, costPrice: 85000, price: 130000, quantity: 40, minStock: 10 },
        // THUỐC MẮT - Gel/Mỡ
        { id: generateId(), code: 'TH014', category: 'medicine', name: 'Vidisic Gel', specs: { type: 'Gel bôi mắt ban đêm' }, costPrice: 90000, price: 140000, quantity: 30, minStock: 10 },
        { id: generateId(), code: 'TH015', category: 'medicine', name: 'Lacri-Lube', specs: { type: 'Mỡ tra mắt' }, costPrice: 100000, price: 155000, quantity: 25, minStock: 8 }
    ];

    // ============ TẠO 250 HÓA ĐƠN ============
    const lenses = inventory.filter(i => i.category === 'lens');
    const frames = inventory.filter(i => i.category === 'frame');
    const medicines = inventory.filter(i => i.category === 'medicine');
    const invoices = [];

    for (let i = 0; i < 250; i++) {
        const monthsAgo = Math.floor(Math.random() * 12); // 0-11 tháng trước
        const daysAgo = Math.floor(Math.random() * 28);
        const hour = 8 + Math.floor(Math.random() * 10); // 8AM - 6PM
        const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate() - daysAgo,
            hour, Math.floor(Math.random() * 60)).getTime();

        const patient = patients[Math.floor(Math.random() * patients.length)];
        const items = [];

        // Random loại hóa đơn
        const invoiceType = Math.random();

        if (invoiceType < 0.50) {
            // 50% - Hóa đơn cắt kính (tròng + gọng)
            const lens1 = lenses[Math.floor(Math.random() * lenses.length)];
            const lens2 = lenses[Math.floor(Math.random() * lenses.length)];
            const frame = frames[Math.floor(Math.random() * frames.length)];

            items.push({ itemId: lens1.id, name: lens1.name, quantity: 1, costPrice: lens1.costPrice, price: lens1.price, isLens: true });
            items.push({ itemId: lens2.id, name: lens2.name, quantity: 1, costPrice: lens2.costPrice, price: lens2.price, isLens: true });
            items.push({ itemId: frame.id, name: frame.name, quantity: 1, costPrice: frame.costPrice, price: frame.price, isLens: false });
        } else if (invoiceType < 0.75) {
            // 25% - Hóa đơn chỉ thuốc
            const numMeds = 1 + Math.floor(Math.random() * 4);
            for (let j = 0; j < numMeds; j++) {
                const med = medicines[Math.floor(Math.random() * medicines.length)];
                items.push({ itemId: med.id, name: med.name, quantity: 1 + Math.floor(Math.random() * 3), costPrice: med.costPrice, price: med.price, isLens: false });
            }
        } else {
            // 25% - Hóa đơn hỗn hợp (kính + thuốc)
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
        const surcharge = Math.random() > 0.92 ? 50000 : 0; // 8% cơ hội phụ thu
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

    // Sắp xếp hóa đơn theo thời gian mới nhất
    invoices.sort((a, b) => b.date - a.date);
    patients.sort((a, b) => b.timestamp - a.timestamp);

    // ============ LƯU VÀO LOCALSTORAGE ============
    localStorage.setItem('eyeclinic_patients', JSON.stringify(patients));
    localStorage.setItem('eyeclinic_inventory', JSON.stringify(inventory));
    localStorage.setItem('eyeclinic_invoices', JSON.stringify(invoices));

    // Tính toán thống kê
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);

    console.log('✅ Đã tạo ' + patients.length + ' bệnh nhân');
    console.log('✅ Đã tạo ' + inventory.length + ' sản phẩm trong kho');
    console.log('✅ Đã tạo ' + invoices.length + ' hóa đơn');
    console.log('');
    console.log('📊 THỐNG KÊ:');
    console.log('   💰 Tổng doanh thu: ' + totalRevenue.toLocaleString('vi-VN') + ' VNĐ');
    console.log('   📈 Tổng lợi nhuận: ' + totalProfit.toLocaleString('vi-VN') + ' VNĐ');
    console.log('');
    console.log('🔄 Hãy refresh trang (F5) để thấy dữ liệu mới!');

    alert('✅ ĐÃ TẠO DỮ LIỆU MẪU LỚN!\n\n' +
        '👥 ' + patients.length + ' bệnh nhân\n' +
        '📦 ' + inventory.length + ' sản phẩm\n' +
        '🧾 ' + invoices.length + ' hóa đơn\n\n' +
        '💰 Tổng doanh thu: ' + totalRevenue.toLocaleString('vi-VN') + ' VNĐ\n' +
        '📈 Tổng lợi nhuận: ' + totalProfit.toLocaleString('vi-VN') + ' VNĐ\n\n' +
        '⏱️ Dữ liệu trải đều 12 tháng để test thống kê!\n\n' +
        'Nhấn OK và F5 để refresh trang.');
})();
