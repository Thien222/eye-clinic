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
    return (
        <div className="invoice-print">
            {/* Header Phòng Khám */}
            <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {settings.name || "PHÒNG KHÁM MẮT NGOÀI GIỜ"}
                </div>
                <div style={{ fontWeight: 'bold' }}>{settings.doctorName || "BSCKII. Hứa Trung Kiên"}</div>
                <div>ĐT: {settings.phone || "0917416421"}</div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', margin: '2mm 0' }}>
                HÓA ĐƠN BÁN LẺ
            </div>

            {/* Thông tin khách hàng */}
            <div style={{ marginBottom: '2mm', borderBottom: '1px dashed black', paddingBottom: '2mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span>{new Date().toLocaleTimeString('vi-VN')}</span>
                    <span>{new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <div style={{ marginTop: '1mm' }}>
                    <strong>KH:</strong> {patient.fullName}
                </div>
                {patient.phone && (
                    <div><strong>SĐT:</strong> {patient.phone}</div>
                )}
            </div>

            {/* Danh sách sản phẩm */}
            <div style={{ marginBottom: '2mm' }}>
                {cart.map((c, i) => (
                    <div key={i} style={{ marginBottom: '2mm' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span style={{ marginRight: '1mm' }}>{i + 1}.</span>
                            <span style={{ fontWeight: '500', flex: 1 }}>{c.item.name}</span>
                            <span style={{ fontWeight: 'bold' }}>{(c.item.price * c.qty).toLocaleString()}</span>
                        </div>
                        <div style={{ paddingLeft: '4mm', fontSize: '9px', color: '#333', fontStyle: 'italic' }}>
                            {c.qty} x {c.item.price.toLocaleString()}đ
                        </div>
                    </div>
                ))}
            </div>

            {/* Phần tính tiền */}
            <div style={{ borderTop: '1px dashed black', paddingTop: '2mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tạm tính:</span>
                    <span>{subtotal.toLocaleString()}</span>
                </div>

                {extraCharges.surcharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Phụ thu:</span>
                        <span>+{extraCharges.surcharge.toLocaleString()}</span>
                    </div>
                )}

                {extraCharges.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Giảm giá:</span>
                        <span>-{extraCharges.discount.toLocaleString()}</span>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginTop: '2mm',
                    borderTop: '1px solid black',
                    paddingTop: '1mm'
                }}>
                    <span>TỔNG CỘNG:</span>
                    <span>{finalTotal.toLocaleString()}</span>
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '5mm', fontSize: '9px' }}>
                <div style={{ fontStyle: 'italic' }}>Cảm ơn quý khách!</div>
                <div style={{ fontStyle: 'italic' }}>Hẹn gặp lại</div>
            </div>
        </div>
    );
};
