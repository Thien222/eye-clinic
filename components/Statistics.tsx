import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { getLocalDateString } from '../services/utils';
import { Invoice, InventoryItem, Patient } from '../types';
import { TrendingUp, DollarSign, Package, ShoppingCart, Calendar, ArrowUp, ArrowDown, Printer, FileSpreadsheet } from 'lucide-react';
import { exportStatisticsExcel } from '../services/excelExport';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';

export const Statistics: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [periodType, setPeriodType] = useState<'day' | 'week' | 'month'>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [printMode, setPrintMode] = useState(false);
    const settings = db.getSettings();

    const refreshData = () => {
        setInvoices(db.getInvoices());
        setInventory(db.getInventory());
        setPatients(db.getPatients());
    };

    useEffect(() => {
        refreshData();
        const handleDbUpdate = () => refreshData();
        window.addEventListener('clinic-db-updated', handleDbUpdate);
        return () => window.removeEventListener('clinic-db-updated', handleDbUpdate);
    }, []);

    const isInPeriod = (timestamp: number) => {
        const d = new Date(timestamp);
        const now = new Date();
        if (periodType === 'day') return getLocalDateString(d) === getLocalDateString(now);
        if (periodType === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return d >= weekAgo;
        }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
    };

    const filteredInvoices = useMemo(() => invoices.filter(inv => isInPeriod(inv.date)), [invoices, periodType, selectedMonth]);

    const refractionPatients = useMemo(() =>
        patients.filter(p => p.refraction && isInPeriod(p.timestamp)),
        [patients, periodType, selectedMonth]
    );

    // Calculate statistics
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalDiscount = filteredInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);
    const totalSurcharge = filteredInvoices.reduce((sum, inv) => sum + (inv.surcharge || 0), 0);

    // Calculate profit (revenue - cost)
    const totalCost = filteredInvoices.reduce((sum, inv) => {
        return sum + inv.items.reduce((itemSum, item) => {
            // Try to find cost price from inventory or stored in invoice
            const invItem = inventory.find(i => i.id === item.itemId);
            const costPrice = item.costPrice || invItem?.costPrice || 0;
            return itemSum + (costPrice * item.quantity);
        }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;

    // Item statistics  
    const totalItemsSold = filteredInvoices.reduce((sum, inv) =>
        sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    const prevMonth = new Date(selectedMonth + '-01');
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthInvoices = periodType === 'month' ? invoices.filter(inv => {
        const d = new Date(inv.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === prevMonthStr;
    }) : [];
    const prevRevenue = prevMonthInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

    const periodLabel = periodType === 'day' ? 'Hôm nay' : periodType === 'week' ? '7 ngày gần nhất' : `Thang ${selectedMonth}`;

    const handlePrint = () => {
        setPrintMode(true);
        setTimeout(() => { window.print(); setPrintMode(false); }, 300);
    };

    const handleExportExcel = () => {
        exportStatisticsExcel(periodLabel, refractionPatients, filteredInvoices, inventory);
    };

    // Low stock items
    const lowStockItems = inventory.filter(i => i.quantity <= i.minStock);

    // Top selling items
    const itemSales: { [key: string]: { name: string, qty: number, revenue: number } } = {};
    filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
            if (!itemSales[item.itemId]) {
                itemSales[item.itemId] = { name: item.name, qty: 0, revenue: 0 };
            }
            itemSales[item.itemId].qty += item.quantity;
            itemSales[item.itemId].revenue += item.price * item.quantity;
        });
    });
    const topItems = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Daily revenue chart data
    const dailyRevenue: { [key: string]: number } = {};
    filteredInvoices.forEach(inv => {
        const day = new Date(inv.date).toLocaleDateString('vi-VN');
        dailyRevenue[day] = (dailyRevenue[day] || 0) + inv.total;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Thống kê doanh thu"
                subtitle={`${filteredInvoices.length} hóa đơn trong kỳ`}
                actions={
                    <>
                        <select className="clinic-input w-auto" value={periodType} onChange={e => setPeriodType(e.target.value as any)}>
                            <option value="day">Ngày</option>
                            <option value="week">Tuần</option>
                            <option value="month">Tháng</option>
                        </select>
                        {periodType === 'month' && (
                            <input type="month" className="clinic-input w-auto" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                        )}
                        <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={handleExportExcel}>Xuất Excel</Button>
                        <Button size="sm" icon={Printer} onClick={handlePrint}>In báo cáo</Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="clinic-card p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-card">
                    <p className="text-emerald-100 text-sm font-medium">Tổng doanh thu</p>
                    <p className="text-3xl font-bold mt-1 tabular-nums">{totalRevenue.toLocaleString('vi-VN')} đ</p>
                    <p className="mt-2 text-sm text-emerald-100 flex items-center gap-1">
                        {revenueChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}% so với kỳ trước
                    </p>
                </div>
                <div className="clinic-card p-5 bg-gradient-to-br from-brand-600 to-brand-700 text-white border-0 shadow-card">
                    <p className="text-brand-100 text-sm font-medium">Lợi nhuận</p>
                    <p className="text-3xl font-bold mt-1 tabular-nums">{totalProfit.toLocaleString('vi-VN')} đ</p>
                    <p className="mt-2 text-sm text-brand-100">Tỷ suất: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="clinic-card p-5 bg-gradient-to-br from-sky-500 to-sky-600 text-white border-0 shadow-card">
                    <p className="text-sky-100 text-sm font-medium">Số hóa đơn</p>
                    <p className="text-3xl font-bold mt-1 tabular-nums">{filteredInvoices.length}</p>
                    <p className="mt-2 text-sm text-sky-100">TB: {filteredInvoices.length > 0 ? Math.round(totalRevenue / filteredInvoices.length).toLocaleString('vi-VN') : 0} đ/đơn</p>
                </div>
                <div className="clinic-card p-5 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-card">
                    <p className="text-amber-100 text-sm font-medium">Sản phẩm bán ra</p>
                    <p className="text-3xl font-bold mt-1 tabular-nums">{totalItemsSold}</p>
                    <p className="mt-2 text-sm text-amber-100">Giảm giá: {totalDiscount.toLocaleString('vi-VN')} đ</p>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-6">
                {/* Cost & Profit Breakdown */}
                <div className="clinic-card p-5">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-brand-600" /> Chi tiết thu chi
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Doanh thu gộp:</span>
                            <span className="font-bold text-green-600">{totalRevenue.toLocaleString()} đ</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Giá vốn hàng bán:</span>
                            <span className="font-bold text-red-600">-{totalCost.toLocaleString()} đ</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Giảm giá đã áp dụng:</span>
                            <span className="text-gray-500">-{totalDiscount.toLocaleString()} đ</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Phụ thu:</span>
                            <span className="text-gray-500">+{totalSurcharge.toLocaleString()} đ</span>
                        </div>
                        <div className="flex justify-between py-2 bg-blue-50 rounded px-2">
                            <span className="font-bold">Lợi nhuận ròng:</span>
                            <span className="font-bold text-blue-600">{totalProfit.toLocaleString()} đ</span>
                        </div>
                    </div>
                </div>

                {/* Top Selling Items */}
                <div className="clinic-card p-5">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Package size={18} className="text-brand-600" /> Top sản phẩm bán chạy
                    </h3>
                    {topItems.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">Chưa có dữ liệu</p>
                    ) : (
                        <div className="space-y-2">
                            {topItems.map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'
                                            }`}>{i + 1}</span>
                                        <span className="text-sm truncate max-w-[150px]">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm">{item.revenue.toLocaleString()} đ</div>
                                        <div className="text-xs text-gray-500">{item.qty} sp</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Low Stock Warning */}
                <div className="clinic-card p-5">
                    <h3 className="font-bold text-gray-800 mb-4">⚠️ Cảnh Báo Tồn Kho</h3>
                    {lowStockItems.length === 0 ? (
                        <div className="text-center py-4">
                            <span className="text-green-500 text-4xl">✓</span>
                            <p className="text-gray-500 mt-2">Tồn kho đầy đủ</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {lowStockItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                                    <span className="text-sm truncate max-w-[150px]">{item.name}</span>
                                    <span className="text-red-600 font-bold text-sm">
                                        Còn {item.quantity}/{item.minStock}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Refraction Stats */}
            <div className="clinic-card p-5">
                <h3 className="font-bold text-gray-800 mb-4">👓 Thống Kê Khúc Xạ ({periodLabel})</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{refractionPatients.length}</div>
                        <div className="text-sm text-gray-600">Bệnh nhân cắt kính</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{refractionPatients.filter(p => p.status === 'completed').length}</div>
                        <div className="text-sm text-gray-600">Đã hoàn thành</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">{filteredInvoices.filter(i => i.items.some(it => it.isLens)).length}</div>
                        <div className="text-sm text-gray-600">Hóa đơn có tròng</div>
                    </div>
                </div>
            </div>

            {/* Daily Revenue Table */}
            <div className="clinic-card p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={18} /> Doanh Thu Theo Ngày
                </h3>
                {Object.keys(dailyRevenue).length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Chưa có dữ liệu trong tháng này</p>
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {Object.entries(dailyRevenue).sort((a, b) => {
                            const dateA = a[0].split('/').reverse().join('');
                            const dateB = b[0].split('/').reverse().join('');
                            return dateA.localeCompare(dateB);
                        }).map(([day, revenue]) => (
                            <div key={day} className="p-3 bg-gray-50 rounded text-center">
                                <div className="text-xs text-gray-500">{day}</div>
                                <div className="font-bold text-green-600 text-sm mt-1">
                                    {(revenue / 1000).toFixed(0)}k
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {printMode && (
                <div className="print-area">
                    <div style={{ fontFamily: 'Arial, sans-serif', padding: '10mm' }}>
                        <h2 style={{ textAlign: 'center' }}>{settings.name} - Báo cáo thống kê</h2>
                        <p style={{ textAlign: 'center', fontSize: '12px' }}>{periodLabel} | In lúc: {new Date().toLocaleString('vi-VN')}</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '5mm' }}>
                            <tbody>
                                <tr><td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 'bold' }}>Tổng doanh thu</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{totalRevenue.toLocaleString()} đ</td></tr>
                                <tr><td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 'bold' }}>Lợi nhuận</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{totalProfit.toLocaleString()} đ</td></tr>
                                <tr><td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 'bold' }}>Số hóa đơn</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{filteredInvoices.length}</td></tr>
                                <tr><td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 'bold' }}>Sản phẩm bán ra</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{totalItemsSold}</td></tr>
                                <tr><td style={{ border: '1px solid #ccc', padding: '6px', fontWeight: 'bold' }}>BN cắt kính</td><td style={{ border: '1px solid #ccc', padding: '6px' }}>{refractionPatients.length}</td></tr>
                            </tbody>
                        </table>
                        <h3 style={{ marginTop: '8mm', fontSize: '14px' }}>Doanh thu theo ngày</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '3mm' }}>
                            <thead><tr style={{ background: '#f3f4f6' }}>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Ngày</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Doanh thu</th>
                            </tr></thead>
                            <tbody>
                                {Object.entries(dailyRevenue).sort((a, b) => a[0].localeCompare(b[0])).map(([day, rev]) => (
                                    <tr key={day}><td style={{ border: '1px solid #ccc', padding: '4px' }}>{day}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>{rev.toLocaleString()} đ</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <h3 style={{ marginTop: '8mm', fontSize: '14px' }}>Top sản phẩm</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '3mm' }}>
                            <thead><tr style={{ background: '#f3f4f6' }}>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>#</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Sản phẩm</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>SL</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Doanh thu</th>
                            </tr></thead>
                            <tbody>
                                {topItems.map((item, i) => (
                                    <tr key={i}><td style={{ border: '1px solid #ccc', padding: '4px' }}>{i + 1}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.name}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.qty}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>{item.revenue.toLocaleString()} đ</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
