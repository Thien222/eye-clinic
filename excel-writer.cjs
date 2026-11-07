/**
 * Tự động ghi hóa đơn ra 2 file Excel riêng:
 *   excel/HoaDon_Gong.xlsx   — toàn bộ hóa đơn gọng kính
 *   excel/HoaDon_Trong.xlsx  — toàn bộ hóa đơn tròng kính
 * Mỗi file có 1 sheet cho mỗi tháng (vd "2026-11") + sheet "Tất cả".
 * Nếu thiếu thư viện xlsx hoặc file đang mở trong Excel thì chỉ ghi log, không làm hỏng server.
 */
const fs = require('fs');
const path = require('path');

let XLSX = null;
try {
    XLSX = require('xlsx');
} catch (e) {
    console.warn('[Excel] Chưa cài thư viện "xlsx" — bỏ qua tự động ghi file Excel. Chạy: npm install xlsx');
}

const pad = n => String(n).padStart(2, '0');
const fmtDate = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const monthKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

function classify(item, inventory) {
    if (item.category) return item.category;
    if (item.isLens) return 'lens';
    const src = inventory.find(i => i.id === item.itemId);
    if (src && src.category === 'lens') return 'lens';
    if (src && src.category === 'frame') return 'frame';
    return 'other';
}

function frameRows(invoices, inventory) {
    const rows = [];
    invoices.forEach(inv => {
        const base = { 'Ngày': fmtDate(inv.date), 'Giờ': fmtTime(inv.date), 'Khách hàng': inv.patientName || '', 'SĐT': inv.patientPhone || '' };
        if (inv.frame) {
            rows.push({ _ts: inv.date, ...base, 'Tên gọng': inv.frame.name, 'Mã gọng': inv.frame.code, 'Chất liệu': inv.frame.material || '', 'Số lượng': 1, 'Giá bán': inv.frame.price || 0 });
            (inv.extraFrames || []).forEach(f => rows.push({ _ts: inv.date, ...base, 'Tên gọng': f.name, 'Mã gọng': f.code, 'Chất liệu': f.material || '', 'Số lượng': 1, 'Giá bán': f.price || 0 }));
        } else if (!inv.lens) {
            (inv.items || []).filter(it => classify(it, inventory) === 'frame').forEach(it => {
                const src = inventory.find(i => i.id === it.itemId) || {};
                rows.push({ _ts: inv.date, ...base, 'Tên gọng': it.name, 'Mã gọng': src.code || '', 'Chất liệu': (src.specs && src.specs.material) || '', 'Số lượng': it.quantity, 'Giá bán': (it.price || 0) * (it.quantity || 0) });
            });
        }
    });
    return rows;
}

function lensRows(invoices, inventory) {
    const rows = [];
    invoices.forEach(inv => {
        const base = { 'Ngày': fmtDate(inv.date), 'Giờ': fmtTime(inv.date), 'Khách hàng': inv.patientName || '', 'SĐT': inv.patientPhone || '' };
        if (inv.lens) {
            const od = inv.lens.od || {}, os = inv.lens.os || {};
            rows.push({
                _ts: inv.date, ...base, 'Tên tròng': inv.lens.name, 'Chiết suất': inv.lens.index || '',
                'MP Cận/viễn': od.sph || '', 'MP Loạn': od.cyl || '', 'MP Trục': od.axis || '', 'MP ADD': od.add || '',
                'MT Cận/viễn': os.sph || '', 'MT Loạn': os.cyl || '', 'MT Trục': os.axis || '', 'MT ADD': os.add || '',
                'Giá bán': inv.lens.price || 0,
            });
            (inv.extraLenses || []).forEach(l => {
                const od = l.od || {}, os = l.os || {};
                rows.push({
                    _ts: inv.date, ...base, 'Tên tròng': l.name, 'Chiết suất': l.index || '',
                    'MP Cận/viễn': od.sph || '', 'MP Loạn': od.cyl || '', 'MP Trục': od.axis || '', 'MP ADD': od.add || '',
                    'MT Cận/viễn': os.sph || '', 'MT Loạn': os.cyl || '', 'MT Trục': os.axis || '', 'MT ADD': os.add || '',
                    'Giá bán': l.price || 0,
                });
            });
        } else if (!inv.frame) {
            (inv.items || []).filter(it => classify(it, inventory) === 'lens').forEach(it => {
                const src = inventory.find(i => i.id === it.itemId) || {};
                const sp = src.specs || {};
                const rx = { sph: sp.sph != null ? String(sp.sph) : '', cyl: sp.cyl != null ? String(sp.cyl) : '', add: sp.add != null ? String(sp.add) : '' };
                const od = it.eye === 'OD' ? rx : {}, os = it.eye === 'OS' ? rx : {};
                rows.push({
                    _ts: inv.date, ...base, 'Tên tròng': it.name, 'Chiết suất': sp.material || '',
                    'MP Cận/viễn': od.sph || '', 'MP Loạn': od.cyl || '', 'MP Trục': '', 'MP ADD': od.add || '',
                    'MT Cận/viễn': os.sph || '', 'MT Loạn': os.cyl || '', 'MT Trục': '', 'MT ADD': os.add || '',
                    'Giá bán': (it.price || 0) * (it.quantity || 0),
                });
            });
        }
    });
    return rows;
}

function toSheet(rows, widths) {
    const clean = rows.map((r, i) => {
        const { _ts, ...rest } = r;
        return { STT: i + 1, ...rest };
    });
    if (clean.length) {
        const total = clean.reduce((s, r) => s + (Number(r['Giá bán']) || 0), 0);
        const blank = {};
        Object.keys(clean[0]).forEach(k => { blank[k] = ''; });
        clean.push({ ...blank, 'Khách hàng': 'TỔNG CỘNG', 'Giá bán': total });
    }
    const ws = XLSX.utils.json_to_sheet(clean.length ? clean : [{ 'Thông báo': 'Chưa có dữ liệu' }]);
    ws['!cols'] = widths.map(w => ({ wch: w }));
    return ws;
}

function buildWorkbook(rows, widths) {
    const wb = XLSX.utils.book_new();
    rows.sort((a, b) => a._ts - b._ts);
    XLSX.utils.book_append_sheet(wb, toSheet(rows, widths), 'Tất cả');
    const byMonth = new Map();
    rows.forEach(r => {
        const k = monthKey(r._ts);
        if (!byMonth.has(k)) byMonth.set(k, []);
        byMonth.get(k).push(r);
    });
    [...byMonth.keys()].sort().reverse().forEach(k => {
        XLSX.utils.book_append_sheet(wb, toSheet(byMonth.get(k), widths), k);
    });
    return wb;
}

const FRAME_WIDTHS = [5, 11, 7, 24, 13, 26, 14, 14, 9, 13];
const LENS_WIDTHS = [5, 11, 7, 24, 13, 26, 10, 11, 9, 9, 9, 11, 9, 9, 9, 13];

function writeFileSafe(wb, file) {
    const tmp = file + '.tmp';
    try {
        XLSX.writeFile(wb, tmp, { bookType: 'xlsx' });
        fs.renameSync(tmp, file);
        return true;
    } catch (e) {
        try { fs.existsSync(tmp) && fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        console.warn(`[Excel] Không ghi được ${path.basename(file)} (file đang mở trong Excel?) — sẽ thử lại lần lưu sau.`);
        return false;
    }
}

let lastSignature = '';
let timer = null;

function signature(data) {
    return (data.invoices || []).map(i => `${i.id}:${i.total}:${i.date}:${i.patientName}:${JSON.stringify(i.frame || '')}:${JSON.stringify(i.lens || '')}:${JSON.stringify(i.extraFrames || '')}:${JSON.stringify(i.extraLenses || '')}`).sort().join('|');
}

function exportNow(data, outDir) {
    if (!XLSX) return;
    const sig = signature(data);
    if (sig === lastSignature) return;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const invoices = data.invoices || [];
    const inventory = data.inventory || [];
    const ok1 = writeFileSafe(buildWorkbook(frameRows(invoices, inventory), FRAME_WIDTHS), path.join(outDir, 'HoaDon_Gong.xlsx'));
    const ok2 = writeFileSafe(buildWorkbook(lensRows(invoices, inventory), LENS_WIDTHS), path.join(outDir, 'HoaDon_Trong.xlsx'));
    if (ok1 && ok2) lastSignature = sig;
}

/** Gọi sau mỗi lần dữ liệu thay đổi — tự gộp nhiều thay đổi liên tiếp (debounce 2s) */
function scheduleExcelExport(getData, outDir) {
    if (!XLSX) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        try { exportNow(getData(), outDir); } catch (e) { console.warn('[Excel] Lỗi xuất file:', e.message); }
    }, 2000);
}

module.exports = { scheduleExcelExport, exportNow };
