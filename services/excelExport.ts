import * as XLSX from 'xlsx';
import { Patient, Invoice, InventoryItem } from '../types';

function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('vi-VN');
}

export function exportStatisticsExcel(
    periodLabel: string,
    refractionPatients: Patient[],
    invoices: Invoice[],
    inventory: InventoryItem[]
) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Khúc xạ
    const refractionRows = refractionPatients.map((p, i) => ({
        STT: i + 1,
        Ngay: formatDate(p.timestamp),
        'So thu tu': p.ticketNumber,
        'Ho ten': p.fullName,
        'So dien thoai': p.phone,
        'Nam sinh': p.dob,
        'OD SPH': p.refraction?.finalRx.od.sph || '',
        'OD CYL': p.refraction?.finalRx.od.cyl || '',
        'OD ADD': p.refraction?.finalRx.od.add || '',
        'OS SPH': p.refraction?.finalRx.os.sph || '',
        'OS CYL': p.refraction?.finalRx.os.cyl || '',
        'OS ADD': p.refraction?.finalRx.os.add || '',
        'Loai kinh': p.refraction?.finalRx.lensType || '',
        'PD': p.refraction?.finalRx.od.pd || '',
        'Trang thai': p.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refractionRows), 'Khuc xa');

    // Sheet 2: Hóa đơn
    const invoiceRows = invoices.map((inv, i) => ({
        STT: i + 1,
        Ngay: formatDate(inv.date),
        'Ma HD': inv.id,
        'Khach hang': inv.patientName,
        'So dien thoai': inv.patientPhone || '',
        'Tam tinh': inv.subtotal,
        'Giam gia': inv.discount || 0,
        'Phu thu': inv.surcharge || 0,
        'Tong cong': inv.total,
        'Loi nhuan': inv.profit || 0,
        'So san pham': inv.items.length,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), 'Hoa don');

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
                    Ngay: formatDate(inv.date),
                    'Khach hang': inv.patientName,
                    'Ma SP': invItem?.code || item.itemId,
                    'Ten trong': item.name,
                    'Mat': item.eye || '',
                    'So luong': item.quantity,
                    'Don gia': item.price,
                    'Thanh tien': item.price * item.quantity,
                    'SPH': invItem?.specs?.sph ?? '',
                    'CYL': invItem?.specs?.cyl ?? '',
                });
            }
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lensRows.length ? lensRows : [{ 'Thong bao': 'Khong co du lieu' }]), 'Trong kinh');

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
                    Ngay: formatDate(inv.date),
                    'Khach hang': inv.patientName,
                    'Ma gong': invItem.code,
                    'Ten gong': item.name,
                    'Chat lieu': invItem.specs?.material || '',
                    'So luong': item.quantity,
                    'Don gia': item.price,
                    'Thanh tien': item.price * item.quantity,
                });
            }
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(frameRows.length ? frameRows : [{ 'Thong bao': 'Khong co du lieu' }]), 'Gong kinh');

    const filename = `ThongKe_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
}
