import React from 'react';
import { Invoice, ClinicSettings } from '../types';
import { formatRx } from '../services/invoiceUtils';

interface InvoicePrintProps {
    settings: ClinicSettings;
    invoice: Invoice;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({ settings, invoice }) => {
    const d = new Date(invoice.date || Date.now());
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN');
    const isForm = !!(invoice.frame || invoice.lens);
    const subtotal = invoice.subtotal ?? (invoice.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
    const odRx = formatRx(invoice.lens?.od);
    const osRx = formatRx(invoice.lens?.os);

    let lineNo = 0;

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
                    <div><strong>KH:</strong> {invoice.patientName || 'Khách lẻ'}</div>
                    {invoice.patientPhone && <div><strong>SDT:</strong> {invoice.patientPhone}</div>}
                </div>
            </div>

            <div className="invoice-divider"></div>

            {/* Danh sách sản phẩm */}
            <div className="invoice-items">
                {isForm ? (
                    <>
                        {invoice.frame && (
                            <div className="invoice-item">
                                <div className="item-line">
                                    <span className="item-num">{++lineNo}.</span>
                                    <span className="item-name">Gọng: {invoice.frame.name}</span>
                                </div>
                                <div className="item-sub">
                                    Mã: {invoice.frame.code}{invoice.frame.material ? ` - ${invoice.frame.material}` : ''}
                                </div>
                                <div className="item-detail">
                                    <span className="item-qty"></span>
                                    <span className="item-total">{invoice.frame.price.toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                        )}
                        {invoice.lens && (
                            <div className="invoice-item">
                                <div className="item-line">
                                    <span className="item-num">{++lineNo}.</span>
                                    <span className="item-name">Tròng: {invoice.lens.name}</span>
                                </div>
                                {invoice.lens.index && <div className="item-sub">Chiết suất: {invoice.lens.index}</div>}
                                {odRx && <div className="item-sub">MP: {odRx}</div>}
                                {osRx && <div className="item-sub">MT: {osRx}</div>}
                                <div className="item-detail">
                                    <span className="item-qty"></span>
                                    <span className="item-total">{invoice.lens.price.toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                        )}
                        {(invoice.extraFrames || []).map((fr, i) => (
                            <div key={`xf${i}`} className="invoice-item">
                                <div className="item-line">
                                    <span className="item-num">{++lineNo}.</span>
                                    <span className="item-name">Gọng: {fr.name}</span>
                                </div>
                                <div className="item-sub">Mã: {fr.code}{fr.material ? ` - ${fr.material}` : ''}</div>
                                <div className="item-detail">
                                    <span className="item-qty"></span>
                                    <span className="item-total">{(fr.price || 0).toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                        ))}
                        {(invoice.extraLenses || []).map((ln, i) => (
                            <div key={`xl${i}`} className="invoice-item">
                                <div className="item-line">
                                    <span className="item-num">{++lineNo}.</span>
                                    <span className="item-name">Tròng: {ln.name}</span>
                                </div>
                                {ln.index && <div className="item-sub">Chiết suất: {ln.index}</div>}
                                {formatRx(ln.od) && <div className="item-sub">MP: {formatRx(ln.od)}</div>}
                                {formatRx(ln.os) && <div className="item-sub">MT: {formatRx(ln.os)}</div>}
                                <div className="item-detail">
                                    <span className="item-qty"></span>
                                    <span className="item-total">{(ln.price || 0).toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    (invoice.items || []).map((it, i) => (
                        <div key={i} className="invoice-item">
                            <div className="item-line">
                                <span className="item-num">{i + 1}.</span>
                                <span className="item-name">{it.name}</span>
                            </div>
                            <div className="item-detail">
                                <span className="item-qty">{it.quantity} x {it.price.toLocaleString('vi-VN')}d</span>
                                <span className="item-total">{(it.price * it.quantity).toLocaleString('vi-VN')}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="invoice-divider"></div>

            {/* Phần tính tiền */}
            <div className="invoice-summary">
                <div className="summary-row">
                    <span>Tạm tính:</span>
                    <span>{subtotal.toLocaleString('vi-VN')}</span>
                </div>

                {invoice.surcharge > 0 && (
                    <div className="summary-row">
                        <span>Phụ thu:</span>
                        <span>+{invoice.surcharge.toLocaleString('vi-VN')}</span>
                    </div>
                )}

                {invoice.discount > 0 && (
                    <div className="summary-row">
                        <span>Giảm giá:</span>
                        <span>-{invoice.discount.toLocaleString('vi-VN')}</span>
                    </div>
                )}

                <div className="summary-total">
                    <span>TỔNG CỘNG:</span>
                    <span>{invoice.total.toLocaleString('vi-VN')}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="invoice-footer">
                <div>{settings.invoice?.footer || settings.printTemplates?.receiptFooter || "Cảm ơn quý khách!"}</div>
            </div>
        </div>
    );
};
