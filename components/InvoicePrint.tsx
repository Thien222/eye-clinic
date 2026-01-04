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
                <div className="clinic-name">{settings.name || "PHONG KHAM MAT NGOAI GIO"}</div>
                <div className="doctor-name">{settings.doctorName || "BSCKII. Hua Trung Kien"}</div>
                <div className="clinic-phone">DT: {settings.phone || "0917416421"}</div>
            </div>

            <div className="invoice-title">HOA DON BAN LE</div>

            {/* Thong tin khach hang */}
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
                    <span>Tam tinh:</span>
                    <span>{subtotal.toLocaleString()}</span>
                </div>

                {extraCharges.surcharge > 0 && (
                    <div className="summary-row">
                        <span>Phu thu:</span>
                        <span>+{extraCharges.surcharge.toLocaleString()}</span>
                    </div>
                )}

                {extraCharges.discount > 0 && (
                    <div className="summary-row">
                        <span>Giam gia:</span>
                        <span>-{extraCharges.discount.toLocaleString()}</span>
                    </div>
                )}

                <div className="summary-total">
                    <span>TONG CONG:</span>
                    <span>{finalTotal.toLocaleString()}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="invoice-footer">
                <div>Cam on quy khach!</div>
                <div>Hen gap lai</div>
            </div>
        </div>
    );
};
