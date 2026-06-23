import { Patient, Invoice, InventoryItem } from '../types';

function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('vi-VN');
}

export async function exportStatisticsExcel(
    periodLabel: string,
    refractionPatients: Patient[],
    invoices: Invoice[],
    inventory: InventoryItem[]
) {
    // Tải xlsx động để không nằm trong bundle chính (chỉ nạp khi cần xuất Excel)
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Sheet 1: Khúc xạ
    const refractionRows = refractionPatients.map((p, i) => ({
        STT: i + 1,
        Ngày: formatDate(p.timestamp),
        'Số thứ tự': p.ticketNumber,
        'Họ tên': p.fullName,
        'Số điện thoại': p.phone,
        'Năm sinh': p.dob,
        'OD SPH': p.refraction?.finalRx.od.sph || '',
        'OD CYL': p.refraction?.finalRx.od.cyl || '',
        'OD ADD': p.refraction?.finalRx.od.add || '',
        'OS SPH': p.refraction?.finalRx.os.sph || '',
        'OS CYL': p.refraction?.finalRx.os.cyl || '',
        'OS ADD': p.refraction?.finalRx.os.add || '',
        'Loại kính': p.refraction?.finalRx.lensType || '',
        'PD': p.refraction?.finalRx.od.pd || '',
        'Trạng thái': p.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refractionRows), 'Khúc xạ');

    // Sheet 2: Hóa đơn
    const invoiceRows = invoices.map((inv, i) => ({
        STT: i + 1,
        Ngày: formatDate(inv.date),
        'Mã HĐ': inv.id,
        'Khách hàng': inv.patientName,
        'Số điện thoại': inv.patientPhone || '',
        'Tạm tính': inv.subtotal,
        'Giảm giá': inv.discount || 0,
        'Phụ thu': inv.surcharge || 0,
        'Tổng cộng': inv.total,
        'Lợi nhuận': inv.profit || 0,
        'Số sản phẩm': inv.items.length,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), 'Hóa đơn');

    // Sheet 3: Tròng kính (từ hóa đơn)
    const lensRows: Record<string, string | number>[] = [];
    let lensIdx = 0;
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const invItem = inventory.find(i => i.id === item.itemId);
            if (item.isLens || invItem?.category === 'lens') {
                lensIdx++;
                lensRows.push({
                    STT: lensIdx,
                    Ngày: formatDate(inv.date),
                    'Khách hàng': inv.patientName,
                    'Mã SP': invItem?.code || item.itemId,
                    'Tên tròng': item.name,
                    'Mắt': item.eye || '',
                    'Số lượng': item.quantity,
                    'Đơn giá': item.price,
                    'Thành tiền': item.price * item.quantity,
                    'SPH': invItem?.specs?.sph ?? '',
                    'CYL': invItem?.specs?.cyl ?? '',
                });
            }
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lensRows.length ? lensRows : [{ 'Thông báo': 'Không có dữ liệu' }]), 'Tròng kính');

    // Sheet 4: Gọng kính (từ hóa đơn)
    const frameRows: Record<string, string | number>[] = [];
    let frameIdx = 0;
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const invItem = inventory.find(i => i.id === item.itemId);
            if (invItem?.category === 'frame') {
                frameIdx++;
                frameRows.push({
                    STT: frameIdx,
                    Ngày: formatDate(inv.date),
                    'Khách hàng': inv.patientName,
                    'Mã gọng': invItem.code,
                    'Tên gọng': item.name,
                    'Chất liệu': invItem.specs?.material || '',
                    'Số lượng': item.quantity,
                    'Đơn giá': item.price,
                    'Thành tiền': item.price * item.quantity,
                });
            }
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(frameRows.length ? frameRows : [{ 'Thông báo': 'Không có dữ liệu' }]), 'Gọng kính');

    const filename = `ThongKe_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
}
