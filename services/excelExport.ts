import { Patient, Invoice, InventoryItem } from '../types';
import { getFrameLines, getLensLines, invoiceRevenueSplit } from './invoiceUtils';

function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('vi-VN');
}
function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

type Row = Record<string, string | number>;

async function loadXlsx() {
    // Tải xlsx động để không nằm trong bundle chính (chỉ nạp khi cần xuất Excel)
    return import('xlsx');
}

function makeSheet(XLSX: typeof import('xlsx'), rows: Row[], widths: number[]) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Thông báo': 'Không có dữ liệu trong kỳ' }]);
    ws['!cols'] = widths.map(w => ({ wch: w }));
    return ws;
}

const sortByDate = (invoices: Invoice[]) => [...invoices].sort((a, b) => a.date - b.date);

export function buildFrameRows(invoices: Invoice[], inventory: InventoryItem[]): Row[] {
    const rows: Row[] = [];
    let total = 0;
    let qty = 0;
    sortByDate(invoices).forEach(inv => {
        getFrameLines(inv, inventory).forEach(line => {
            total += line.amount;
            qty += line.quantity;
            rows.push({
                STT: rows.length + 1,
                'Ngày': formatDate(inv.date),
                'Giờ': formatTime(inv.date),
                'Khách hàng': inv.patientName,
                'SĐT': inv.patientPhone || '',
                'Tên gọng': line.name,
                'Mã gọng': line.code,
                'Chất liệu': line.material,
                'Số lượng': line.quantity,
                'Giá bán': line.amount,
            });
        });
    });
    if (rows.length) {
        rows.push({ STT: '', 'Ngày': '', 'Giờ': '', 'Khách hàng': 'TỔNG CỘNG', 'SĐT': '', 'Tên gọng': '', 'Mã gọng': '', 'Chất liệu': '', 'Số lượng': qty, 'Giá bán': total });
    }
    return rows;
}

export function buildLensRows(invoices: Invoice[], inventory: InventoryItem[]): Row[] {
    const rows: Row[] = [];
    let total = 0;
    sortByDate(invoices).forEach(inv => {
        getLensLines(inv, inventory).forEach(line => {
            total += line.amount;
            rows.push({
                STT: rows.length + 1,
                'Ngày': formatDate(inv.date),
                'Giờ': formatTime(inv.date),
                'Khách hàng': inv.patientName,
                'SĐT': inv.patientPhone || '',
                'Tên tròng': line.name,
                'Chiết suất': line.index,
                'MP Cận/viễn': line.od?.sph || '',
                'MP Loạn': line.od?.cyl || '',
                'MP Trục': line.od?.axis || '',
                'MP ADD': line.od?.add || '',
                'MT Cận/viễn': line.os?.sph || '',
                'MT Loạn': line.os?.cyl || '',
                'MT Trục': line.os?.axis || '',
                'MT ADD': line.os?.add || '',
                'Giá bán': line.amount,
            });
        });
    });
    if (rows.length) {
        const blank: Row = {};
        Object.keys(rows[0]).forEach(k => { blank[k] = ''; });
        rows.push({ ...blank, 'Khách hàng': 'TỔNG CỘNG', 'Giá bán': total });
    }
    return rows;
}

const FRAME_WIDTHS = [5, 11, 7, 24, 13, 26, 14, 14, 9, 13];
const LENS_WIDTHS = [5, 11, 7, 24, 13, 26, 10, 11, 9, 9, 9, 11, 9, 9, 9, 13];

/** Xuất file Excel riêng cho GỌNG KÍNH */
export async function exportFramesExcel(fileTag: string, invoices: Invoice[], inventory: InventoryItem[]) {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, buildFrameRows(invoices, inventory), FRAME_WIDTHS), 'Gọng kính');
    XLSX.writeFile(wb, `HoaDon_Gong_${fileTag}.xlsx`);
}

/** Xuất file Excel riêng cho TRÒNG KÍNH */
export async function exportLensesExcel(fileTag: string, invoices: Invoice[], inventory: InventoryItem[]) {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, buildLensRows(invoices, inventory), LENS_WIDTHS), 'Tròng kính');
    XLSX.writeFile(wb, `HoaDon_Trong_${fileTag}.xlsx`);
}

/** Báo cáo tổng hợp: Tổng quan + Hóa đơn + Gọng + Tròng + Khúc xạ */
export async function exportStatisticsExcel(
    periodLabel: string,
    fileTag: string,
    refractionPatients: Patient[],
    invoices: Invoice[],
    inventory: InventoryItem[]
) {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    // Sheet tổng quan
    let frame = 0, lens = 0, other = 0, discount = 0, surcharge = 0, total = 0;
    invoices.forEach(inv => {
        const s = invoiceRevenueSplit(inv, inventory);
        frame += s.frame; lens += s.lens; other += s.other;
        discount += inv.discount || 0; surcharge += inv.surcharge || 0; total += inv.total || 0;
    });
    const summary: Row[] = [
        { 'Chỉ tiêu': 'Kỳ thống kê', 'Giá trị': periodLabel },
        { 'Chỉ tiêu': 'Số hóa đơn', 'Giá trị': invoices.length },
        { 'Chỉ tiêu': 'Doanh thu gọng', 'Giá trị': frame },
        { 'Chỉ tiêu': 'Doanh thu tròng', 'Giá trị': lens },
        ...(other ? [{ 'Chỉ tiêu': 'Doanh thu khác (hóa đơn cũ)', 'Giá trị': other }] : []),
        { 'Chỉ tiêu': 'Phụ thu', 'Giá trị': surcharge },
        { 'Chỉ tiêu': 'Giảm giá', 'Giá trị': -discount },
        { 'Chỉ tiêu': 'TỔNG DOANH THU', 'Giá trị': total },
    ];
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, summary, [28, 20]), 'Tổng quan');

    // Sheet hóa đơn
    const invoiceRows: Row[] = sortByDate(invoices).map((inv, i) => {
        const s = invoiceRevenueSplit(inv, inventory);
        return {
            STT: i + 1,
            'Ngày': formatDate(inv.date),
            'Giờ': formatTime(inv.date),
            'Khách hàng': inv.patientName,
            'SĐT': inv.patientPhone || '',
            'Gọng': s.frame,
            'Tròng': s.lens,
            'Phụ thu': inv.surcharge || 0,
            'Giảm giá': inv.discount || 0,
            'Tổng cộng': inv.total,
        };
    });
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, invoiceRows, [5, 11, 7, 24, 13, 12, 12, 11, 11, 13]), 'Hóa đơn');
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, buildFrameRows(invoices, inventory), FRAME_WIDTHS), 'Gọng kính');
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, buildLensRows(invoices, inventory), LENS_WIDTHS), 'Tròng kính');

    // Sheet khúc xạ
    const refractionRows: Row[] = refractionPatients.map((p, i) => ({
        STT: i + 1,
        'Ngày': formatDate(p.timestamp),
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
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, refractionRows, [5, 11, 8, 24, 13, 8, 8, 8, 8, 8, 8, 8, 18, 6, 14]), 'Khúc xạ');

    XLSX.writeFile(wb, `ThongKe_TongHop_${fileTag}.xlsx`);
}
