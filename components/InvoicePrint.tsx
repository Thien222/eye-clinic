import React from 'react';
import { Patient, InventoryItem, ClinicSettings } from '../types';

interface InvoicePrintProps {
    settings: ClinicSettings;
    patient: Patient;
    cart: { item: InventoryItem; qty: number }[];
    subtotal: number;
    extraCharges: { discount: number; surcharge: number };
    finalTotal: number;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({
    settings,
    patient,
    cart,
    subtotal,
    extraCharges,
    finalTotal,
}) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN');

    return (
        <div className="invoice-print">
            {/* Header */}
            <div className="invoice-header">
                {settings.logoUrl && settings.invoice?.showLogo !== false && (
                    <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '15mm', margin: '0 auto 2mm', display: 'block' }} />
                )}
                <div className="clinic-name">{settings.name || "PHÒNG KHÁM MẮT NGOÀI GIỜ"}</div>
                <div className="doctor-name">{settings.doctorName || ""}</div>
                <div className="clinic-phone">DT: {settings.phone || ""}</div>
                {settings.address && <div className="clinic-address">DC: {settings.address}</div>}
            </div>

            <div className="invoice-title">{settings.invoice?.header || settings.printTemplates?.receiptHeader || "HÓA ĐƠN BÁN LẺ"}</div>

            {/* Thông tin khách hàng */}
            <div className="invoice-info">
                <div className="invoice-datetime">
                    <span>{timeStr}</span>
                    <span>{dateStr}</span>
                </div>
                <div className="invoice-customer">
                    <div><strong>KH:</strong> {patient.fullName}</div>
                    {patient.phone && <div><strong>SDT:</strong> {patient.phone}</div>}
                </div>
            </div>

            <div className="invoice-divider"></div>

            {/* Danh sach san pham */}
            <div className="invoice-items">
                {cart.map((c, i) => (
                    <div key={i} className="invoice-item">
                        <div className="item-line">
                            <span className="item-num">{i + 1}.</span>
                            <span className="item-name">{c.item.name}</span>
                        </div>
                        <div className="item-detail">
                            <span className="item-qty">{c.qty} x {c.item.price.toLocaleString()}d</span>
                            <span className="item-total">{(c.item.price * c.qty).toLocaleString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="invoice-divider"></div>

            {/* Phan tinh tien */}
            <div className="invoice-summary">
                <div className="summary-row">
                    <span>Tạm tính:</span>
                    <span>{subtotal.toLocaleString()}</span>
                </div>

                {extraCharges.surcharge > 0 && (
                    <div className="summary-row">
                        <span>Phụ thu:</span>
                        <span>+{extraCharges.surcharge.toLocaleString()}</span>
                    </div>
                )}

                {extraCharges.discount > 0 && (
                    <div className="summary-row">
                        <span>Giảm giá:</span>
                        <span>-{extraCharges.discount.toLocaleString()}</span>
                    </div>
                )}

                <div className="summary-total">
                    <span>TỔNG CỘNG:</span>
                    <span>{finalTotal.toLocaleString()}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="invoice-footer">
                <div>{settings.invoice?.footer || settings.printTemplates?.receiptFooter || "Cảm ơn quý khách!"}</div>
            </div>
        </div>
    );
};
