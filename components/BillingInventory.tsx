import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { isSameLocalDay } from '../services/utils';
import { Patient, Invoice } from '../types';
import { Printer, Edit, Save, FilePlus, Glasses, Eye, Trash2, Wallet, Receipt, History, Users } from 'lucide-react';
import { PageHeader, Tabs, Segmented, Button, IconButton, Badge, Field, EmptyState, SearchInput, Modal, MonthPicker } from './ui';
import { InvoicePrint } from './InvoicePrint';
import { GlassesInvoiceForm, MoneyInput } from './GlassesInvoiceForm';
import {
   GlassesFormState, emptyGlassesForm, emptyRx, validateGlassesForm, formToFrameLens,
   buildInvoiceItems, invoiceToForm, glassesFormPrices, isFormInvoice, parseMoney, formatMoney, formatRx, buildGlassesSuggestions,
} from '../services/invoiceUtils';

// UUID generator that works on HTTP
const generateId = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);

type Tab = 'billing' | 'invoices';

/** Form trống, tự điền sẵn độ tròng từ "Kính điều chỉnh" nếu khách đã đo khúc xạ */
const formForPatient = (p?: Patient | null): GlassesFormState => {
   const f = emptyGlassesForm();
   const rx = p?.refraction?.finalRx;
   if (rx) {
      const pick = (e: typeof rx.od) => ({ ...emptyRx(), sph: e?.sph || '', cyl: e?.cyl || '', axis: e?.axis || '', add: e?.add || '' });
      f.lens.od = pick(rx.od);
      f.lens.os = pick(rx.os);
   }
   return f;
};

/** Tính tiền từ form */
const computeTotals = (f: GlassesFormState, surcharge: number, discount: number) => {
   const { framePrice, lensPrice } = glassesFormPrices(f);
   const subtotal = framePrice + lensPrice;
   const total = Math.max(0, subtotal + surcharge - discount);
   return { framePrice, lensPrice, subtotal, total };
};

export const BillingInventory: React.FC = () => {
   const [activeTab, setActiveTab] = useState<Tab>(() => {
      const saved = localStorage.getItem('billing_active_tab');
      return saved === 'invoices' ? 'invoices' : 'billing';
   });

   // Billing State
   const [billingMode, setBillingMode] = useState<'exam' | 'walkin'>('exam');
   const [waitingPatients, setWaitingPatients] = useState<Patient[]>([]);
   const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
   const [walkInName, setWalkInName] = useState('');
   const [walkInPhone, setWalkInPhone] = useState('');
   const [form, setForm] = useState<GlassesFormState>(emptyGlassesForm);
   const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
   const [surcharge, setSurcharge] = useState('');
   const [discount, setDiscount] = useState('');

   // Invoice History State
   const [invoices, setInvoices] = useState<Invoice[]>([]);
   const [invoiceSearch, setInvoiceSearch] = useState('');
   /** Gợi ý gọng/tròng từ các hóa đơn đã lưu */
   const glassesSuggestions = useMemo(() => buildGlassesSuggestions(invoices, db.getInventory()), [invoices]);
   const [invoiceMonth, setInvoiceMonth] = useState<string>(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
   });
   const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
   const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
   const [editForm, setEditForm] = useState<GlassesFormState | null>(null);
   const [editErrors, setEditErrors] = useState<Set<string>>(new Set());
   const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
   const [settings, setSettings] = useState(db.getSettings());

   useEffect(() => {
      localStorage.setItem('billing_active_tab', activeTab);
   }, [activeTab]);

   const refreshData = () => {
      setWaitingPatients(db.getPatients().filter(p => p.status === 'waiting_billing' && isSameLocalDay(p.timestamp)));
      setInvoices(db.getInvoices());
   };

   useClinicDbUpdated(() => {
      refreshData();
      setSettings(db.getSettings());
   });

   // ============ BILLING ============
   const resetBilling = () => {
      setForm(emptyGlassesForm());
      setFormErrors(new Set());
      setSurcharge('');
      setDiscount('');
   };

   const handleSelectPatient = (p: Patient) => {
      setSelectedPatient(p);
      setForm(formForPatient(p));
      setFormErrors(new Set());
      setSurcharge('');
      setDiscount('');
   };

   const switchBillingMode = (mode: 'exam' | 'walkin') => {
      if (mode === billingMode) return;
      setBillingMode(mode);
      setSelectedPatient(null);
      setWalkInName('');
      setWalkInPhone('');
      resetBilling();
   };

   const updateForm = (next: GlassesFormState) => {
      setForm(next);
      // Xóa viền đỏ khi người dùng bắt đầu sửa
      if (formErrors.size) setFormErrors(validateGlassesForm(next).errors);
   };

   const printInvoice = (invoice: Invoice, after?: () => void) => {
      setPrintingInvoice(invoice);
      setTimeout(() => {
         window.print();
         setPrintingInvoice(null);
         after?.();
      }, 150);
   };

   const handleSave = (withPrint: boolean) => {
      if (billingMode === 'exam' && !selectedPatient) {
         alert('Vui lòng chọn bệnh nhân trước khi lưu hóa đơn.');
         return;
      }
      const { errors, message } = validateGlassesForm(form);
      setFormErrors(errors);
      if (message) {
         alert(message);
         return;
      }

      const sur = parseMoney(surcharge);
      const dis = parseMoney(discount);
      const { subtotal, total } = computeTotals(form, sur, dis);
      const { frame, lens, extraFrames, extraLenses } = formToFrameLens(form);

      const invoice: Invoice = {
         id: generateId(),
         patientId: selectedPatient?.id || '',
         patientName: selectedPatient ? selectedPatient.fullName : (walkInName.trim() || 'Khách lẻ'),
         patientPhone: selectedPatient ? selectedPatient.phone : walkInPhone.trim(),
         patientAddress: selectedPatient?.address || '',
         customerType: billingMode,
         frame,
         lens,
         extraFrames,
         extraLenses,
         items: buildInvoiceItems(frame, lens, extraFrames, extraLenses),
         subtotal,
         discount: dis,
         surcharge: sur,
         total,
         date: Date.now(),
      };

      db.createInvoice(invoice);

      if (selectedPatient) {
         const completedPatient = { ...selectedPatient, status: 'completed' as const, updatedAt: Date.now() };
         setWaitingPatients(prev => prev.filter(p => p.id !== selectedPatient.id));
         db.updatePatient(completedPatient);
         setSelectedPatient(null);
      } else {
         setWalkInName('');
         setWalkInPhone('');
      }
      resetBilling();
      setInvoices(db.getInvoices());

      const msg = `Đã lưu hóa đơn: ${formatMoney(total)} đ`;
      if (withPrint) printInvoice(invoice, () => alert(msg));
      else alert(msg);
   };

   // ============ INVOICE HISTORY ============
   const handleDeleteInvoice = (invoiceId: string) => {
      if (confirm('Bạn có chắc muốn xóa hóa đơn này? Hành động này không thể hoàn tác.')) {
         db.deleteInvoice(invoiceId);
         refreshData();
         alert('Đã xóa hóa đơn!');
      }
   };

   const openEdit = (inv: Invoice) => {
      setEditingInvoice({ ...inv, items: (inv.items || []).map(i => ({ ...i })) });
      setEditForm(isFormInvoice(inv) ? invoiceToForm(inv) : null);
      setEditErrors(new Set());
   };

   const closeEdit = () => {
      setEditingInvoice(null);
      setEditForm(null);
      setEditErrors(new Set());
   };

   const handleUpdateInvoice = () => {
      if (!editingInvoice) return;
      if (editForm) {
         const { errors, message } = validateGlassesForm(editForm);
         setEditErrors(errors);
         if (message) {
            alert(message);
            return;
         }
         const { frame, lens, extraFrames, extraLenses } = formToFrameLens(editForm);
         const { subtotal, total } = computeTotals(editForm, editingInvoice.surcharge || 0, editingInvoice.discount || 0);
         db.updateInvoice(editingInvoice.id, {
            ...editingInvoice, frame, lens, extraFrames, extraLenses,
            items: buildInvoiceItems(frame, lens, extraFrames, extraLenses), subtotal, total,
         });
      } else {
         // Hóa đơn cũ (từ kho) — chỉ sửa số lượng / giảm giá / phụ thu như trước
         const subtotal = editingInvoice.items.reduce((s, i) => s + (i.quantity * i.price), 0);
         const total = Math.max(0, subtotal - (editingInvoice.discount || 0) + (editingInvoice.surcharge || 0));
         db.updateInvoice(editingInvoice.id, { ...editingInvoice, subtotal, total });
      }
      closeEdit();
      refreshData();
      alert('Đã cập nhật hóa đơn!');
   };

   const editTotal = (() => {
      if (!editingInvoice) return 0;
      if (editForm) return computeTotals(editForm, editingInvoice.surcharge || 0, editingInvoice.discount || 0).total;
      return Math.max(0, editingInvoice.items.reduce((s, i) => s + (i.quantity * i.price), 0)
         - (editingInvoice.discount || 0) + (editingInvoice.surcharge || 0));
   })();

   const monthKey = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
   };
   const monthInvoices = invoices.filter(inv => monthKey(inv.date) === invoiceMonth);
   const visibleInvoices = monthInvoices
      .filter(inv => (inv.patientName || '').toLowerCase().includes(invoiceSearch.toLowerCase()))
      .sort((a, b) => b.date - a.date);

   // ============ RENDER ============
   const sur = parseMoney(surcharge);
   const dis = parseMoney(discount);
   const totals = computeTotals(form, sur, dis);
   const canBill = billingMode === 'walkin' || !!selectedPatient;
   const customerName = selectedPatient ? selectedPatient.fullName : (walkInName.trim() || 'Khách lẻ');
   const hasRefraction = !!selectedPatient?.refraction;

   const detailRow = (label: string, value: React.ReactNode) => (
      <div className="flex justify-between gap-4 py-2.5">
         <dt className="text-slate-500">{label}</dt>
         <dd className="text-slate-900 text-right">{value}</dd>
      </div>
   );

   return (
      <div className="h-full flex flex-col page-fill">
         <PageHeader
            title="Thu ngân"
            subtitle="Lập hóa đơn kính và quản lý lịch sử hóa đơn"
            icon={Wallet}
         />

         <Tabs<Tab>
            className="mb-6 shrink-0"
            value={activeTab}
            onChange={setActiveTab}
            items={[
               { value: 'billing', label: 'Thanh toán & Hóa đơn', icon: Receipt },
               { value: 'invoices', label: 'Lịch sử hóa đơn', icon: History, count: invoices.length },
            ]}
         />

         {activeTab === 'billing' && (
            <div className="flex flex-col flex-1 min-h-0">
               {/* Mode toggle: khách đã khám / khách lẻ */}
               <Segmented<'exam' | 'walkin'>
                  className="mb-4 self-start shrink-0"
                  value={billingMode}
                  onChange={switchBillingMode}
                  items={[
                     { value: 'exam', label: 'Khách đã khám', icon: Eye },
                     { value: 'walkin', label: 'Khách lẻ', icon: FilePlus },
                  ]}
               />

               <div className="flex gap-6 flex-1 min-h-0 overflow-hidden fill-y">
                  {/* Left panel */}
                  {billingMode === 'exam' ? (
                     <div className="w-80 shrink-0 clinic-card flex flex-col overflow-hidden">
                        <div className="card-header shrink-0">
                           <h3 className="section-title">
                              <Glasses size={18} aria-hidden /> Chờ tạo hóa đơn
                           </h3>
                           <Badge tone="brand">{waitingPatients.length}</Badge>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 space-y-2">
                           {waitingPatients.length === 0 && (
                              <EmptyState icon={Users} title="Không có bệnh nhân" className="py-10" />
                           )}
                           {waitingPatients.map(p => {
                              const active = selectedPatient?.id === p.id;
                              return (
                                 <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => handleSelectPatient(p)}
                                    className={`w-full text-left p-3 rounded-lg border cursor-pointer transition-colors ${active
                                       ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500'
                                       : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                                 >
                                    <div className="flex items-center gap-2 min-w-0">
                                       <span className="shrink-0 font-bold text-lg text-brand-700 tabular-nums">
                                          #{p.ticketNumber}
                                       </span>
                                       <span className="font-semibold text-slate-900 truncate">{p.fullName}</span>
                                    </div>
                                    {p.refraction && (
                                       <div className="mt-2">
                                          <Badge tone="success"><Eye size={12} aria-hidden /> Có kết quả khúc xạ</Badge>
                                       </div>
                                    )}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  ) : (
                     <div className="w-80 shrink-0 clinic-card flex flex-col overflow-hidden">
                        <div className="card-header shrink-0">
                           <h3 className="section-title">
                              <FilePlus size={18} aria-hidden /> Thông tin khách lẻ
                           </h3>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-5 space-y-4">
                           <Field label="Tên khách hàng" htmlFor="walkin-name">
                              <input
                                 id="walkin-name"
                                 placeholder="Khách lẻ"
                                 className="clinic-input"
                                 value={walkInName}
                                 onChange={e => setWalkInName(e.target.value)}
                              />
                           </Field>
                           <Field label="Số điện thoại" htmlFor="walkin-phone">
                              <input
                                 id="walkin-phone"
                                 placeholder="SĐT (tùy chọn)"
                                 className="clinic-input"
                                 value={walkInPhone}
                                 onChange={e => setWalkInPhone(e.target.value)}
                              />
                           </Field>
                        </div>
                     </div>
                  )}

                  {/* Checkout Area */}
                  <div className="flex-1 min-w-0 clinic-card flex flex-col overflow-hidden">
                     {canBill ? (
                        <>
                           {/* Header: tiêu đề + 2 nút lưu */}
                           <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
                              <div className="min-w-0">
                                 <h2 className="section-title text-lg">
                                    <Receipt size={18} aria-hidden /> Hóa đơn
                                 </h2>
                                 <p className="text-sm text-slate-500 mt-0.5">
                                    Khách hàng: <span className="font-semibold text-slate-700">{customerName}</span>
                                    {selectedPatient?.phone && <> · {selectedPatient.phone}</>}
                                 </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 <Button variant="outline" icon={Save} onClick={() => handleSave(false)}>
                                    Lưu hóa đơn
                                 </Button>
                                 <Button variant="primary" icon={Printer} onClick={() => handleSave(true)}>
                                    Lưu và in hóa đơn
                                 </Button>
                              </div>
                           </div>

                           <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-6">
                              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                                 <GlassesInvoiceForm
                                    value={form}
                                    onChange={updateForm}
                                    suggestions={glassesSuggestions}
                                    errors={formErrors}
                                    lensHint={hasRefraction ? 'Đã điền sẵn từ kết quả khúc xạ (có thể sửa)' : undefined}
                                 />

                                 {/* Tổng tiền */}
                                 <div className="subtle-panel p-5 space-y-4 xl:sticky xl:top-0">
                                    <h4 className="section-title">
                                       <Wallet size={18} aria-hidden /> Thanh toán
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                       <div className={`flex justify-between items-center ${form.frameEnabled ? 'text-slate-700' : 'text-slate-400'}`}>
                                          <span className="flex items-center gap-2">
                                             <span className={`w-2 h-2 rounded-full ${form.frameEnabled ? 'bg-amber-500' : 'bg-slate-300'}`} aria-hidden />
                                             Gọng kính
                                          </span>
                                          <span className="font-medium tabular-nums">{formatMoney(totals.framePrice)} đ</span>
                                       </div>
                                       <div className={`flex justify-between items-center ${form.lensEnabled ? 'text-slate-700' : 'text-slate-400'}`}>
                                          <span className="flex items-center gap-2">
                                             <span className={`w-2 h-2 rounded-full ${form.lensEnabled ? 'bg-sky-500' : 'bg-slate-300'}`} aria-hidden />
                                             Tròng kính
                                          </span>
                                          <span className="font-medium tabular-nums">{formatMoney(totals.lensPrice)} đ</span>
                                       </div>
                                       <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-slate-700">
                                          <span>Tạm tính</span>
                                          <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(totals.subtotal)} đ</span>
                                       </div>
                                    </div>
                                    <Field label="Phụ thu (khám, thủ thuật)">
                                       <MoneyInput value={surcharge} onChange={setSurcharge} />
                                    </Field>
                                    <Field label="Giảm giá / Voucher">
                                       <MoneyInput value={discount} onChange={setDiscount} className="text-red-600" />
                                    </Field>
                                    <div className="flex justify-between items-baseline border-t border-slate-200 pt-4">
                                       <span className="text-base font-semibold text-slate-900">Tổng cộng</span>
                                       <span className="text-2xl font-bold text-emerald-700 tabular-nums">{formatMoney(totals.total)} đ</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </>
                     ) : (
                        <div className="flex-1 flex items-center justify-center">
                           <EmptyState
                              icon={Glasses}
                              title="Chọn bệnh nhân để tạo hóa đơn kính"
                              description="Chọn một bệnh nhân trong danh sách chờ bên trái."
                           />
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* Invoice History Tab */}
         {activeTab === 'invoices' && (
            <div className="clinic-card flex-1 flex flex-col min-h-0 overflow-hidden">
               <div className="card-header shrink-0">
                  <h3 className="section-title">
                     <History size={18} aria-hidden /> Lịch sử hóa đơn
                  </h3>
               </div>

               <div className="p-6 flex flex-col lg:flex-1 lg:min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end shrink-0">
                     <Field label="Tìm kiếm" htmlFor="invoice-search">
                        <SearchInput
                           id="invoice-search"
                           placeholder="Tên khách hàng..."
                           value={invoiceSearch}
                           onChange={e => setInvoiceSearch(e.target.value)}
                        />
                     </Field>
                     <Field label="Tháng" htmlFor="invoice-month">
                        <MonthPicker
                           id="invoice-month"
                           className="w-full"
                           value={invoiceMonth}
                           onChange={setInvoiceMonth}
                        />
                     </Field>
                     <div className="subtle-panel px-4 py-2 flex items-center gap-3 min-h-[2.5rem]">
                        <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 flex items-center justify-center">
                           <Receipt size={18} aria-hidden />
                        </div>
                        <div className="min-w-0">
                           <div className="text-xs font-medium text-slate-500">Tổng hóa đơn tháng</div>
                           <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{monthInvoices.length} hóa đơn</div>
                        </div>
                     </div>
                  </div>

                  {monthInvoices.length === 0 ? (
                     <div className="subtle-panel">
                        <EmptyState icon={Receipt} title="Không có hóa đơn nào trong tháng này" />
                     </div>
                  ) : (
                     <div className="table-wrap overflow-y-auto lg:flex-1 lg:min-h-0">
                        <table className="clinic-table">
                           <thead className="sticky top-0 z-10">
                              <tr className="[&>th]:bg-slate-50">
                                 <th className="whitespace-nowrap w-px">Ngày</th>
                                 <th className="whitespace-nowrap min-w-[8rem]">Khách hàng</th>
                                 <th className="w-full">Sản phẩm</th>
                                 <th className="num whitespace-nowrap w-px">Tổng tiền</th>
                                 <th className="text-right whitespace-nowrap w-px">Tác vụ</th>
                              </tr>
                           </thead>
                           <tbody>
                              {visibleInvoices.map(inv => (
                                 <tr key={inv.id} className="align-top">
                                    <td className="whitespace-nowrap w-px">
                                       <div className="text-slate-900 tabular-nums">{new Date(inv.date).toLocaleDateString('vi-VN')}</div>
                                       <div className="text-xs text-slate-500 tabular-nums">
                                          {new Date(inv.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                       </div>
                                    </td>
                                    <td className="min-w-[8rem] max-w-[12rem] break-words">
                                       <div className="font-semibold text-slate-900">{inv.patientName}</div>
                                       {inv.patientPhone && <div className="text-xs text-slate-500">{inv.patientPhone}</div>}
                                    </td>
                                    <td className="w-full min-w-[9rem]">
                                       <div className="space-y-1">
                                          {inv.items.map((item, i) => (
                                             <div key={i} className="flex items-start gap-2 min-w-0">
                                                {item.category === 'frame' && <Badge tone="frame">Gọng</Badge>}
                                                {item.category === 'lens' && <Badge tone="lens">Tròng</Badge>}
                                                <span className="text-slate-700 min-w-0 break-words line-clamp-2" title={item.name}>{item.name}{!isFormInvoice(inv) && ` x${item.quantity}`}</span>
                                             </div>
                                          ))}
                                       </div>
                                       {inv.lens && (formatRx(inv.lens.od) || formatRx(inv.lens.os)) && (
                                          <div className="text-xs text-slate-500 mt-1 tabular-nums">
                                             {formatRx(inv.lens.od) && <div>MP: {formatRx(inv.lens.od)}</div>}
                                             {formatRx(inv.lens.os) && <div>MT: {formatRx(inv.lens.os)}</div>}
                                          </div>
                                       )}
                                    </td>
                                    <td className="num whitespace-nowrap w-px">
                                       <div className="font-semibold text-emerald-700">{formatMoney(inv.total)} đ</div>
                                       {inv.discount > 0 && (
                                          <div className="text-xs text-slate-500">Giảm: {formatMoney(inv.discount)}</div>
                                       )}
                                    </td>
                                    <td className="whitespace-nowrap w-px">
                                       <div className="grid grid-cols-2 gap-1 justify-items-end xl:flex xl:justify-end">
                                          <IconButton icon={Eye} label="Xem chi tiết" size="sm" onClick={() => setViewingInvoice(inv)} />
                                          <IconButton icon={Edit} label="Sửa hóa đơn" size="sm" tone="primary" onClick={() => openEdit(inv)} />
                                          <IconButton icon={Printer} label="In lại hóa đơn" size="sm" onClick={() => printInvoice(inv)} />
                                          <IconButton icon={Trash2} label="Xóa hóa đơn" size="sm" tone="danger" onClick={() => handleDeleteInvoice(inv.id)} />
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* Modal Xem Chi Tiết Hóa Đơn */}
         {viewingInvoice && (
            <Modal
               open
               onClose={() => setViewingInvoice(null)}
               title="Chi tiết hóa đơn"
               icon={<Receipt size={20} aria-hidden />}
               footer={<Button onClick={() => setViewingInvoice(null)}>Đóng</Button>}
            >
               <dl className="divide-y divide-slate-100 text-sm mb-4">
                  {detailRow('Mã hóa đơn:', <span className="font-mono">{viewingInvoice.id.slice(0, 8)}...</span>)}
                  {detailRow('Khách hàng:', <span className="font-semibold">{viewingInvoice.patientName}</span>)}
                  {viewingInvoice.patientPhone && detailRow('SĐT:', viewingInvoice.patientPhone)}
                  {detailRow('Ngày tạo:', new Date(viewingInvoice.date).toLocaleString('vi-VN'))}
               </dl>

               {isFormInvoice(viewingInvoice) ? (
                  <div className="space-y-3 mb-4">
                     {viewingInvoice.frame && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-slate-700 space-y-1">
                           <div className="flex justify-between items-center font-semibold text-amber-800 mb-1">
                              <span className="flex items-center gap-2"><Glasses size={16} aria-hidden /> Gọng kính</span>
                              <span className="tabular-nums">{formatMoney(viewingInvoice.frame.price)} đ</span>
                           </div>
                           <div>Tên gọng: {viewingInvoice.frame.name}</div>
                           <div>Mã gọng: {viewingInvoice.frame.code}</div>
                           {viewingInvoice.frame.material && <div>Chất liệu: {viewingInvoice.frame.material}</div>}
                        </div>
                     )}
                     {viewingInvoice.lens && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm text-slate-700 space-y-1">
                           <div className="flex justify-between items-center font-semibold text-sky-800 mb-1">
                              <span className="flex items-center gap-2"><Eye size={16} aria-hidden /> Tròng kính</span>
                              <span className="tabular-nums">{formatMoney(viewingInvoice.lens.price)} đ</span>
                           </div>
                           <div>Tên tròng: {viewingInvoice.lens.name}</div>
                           {viewingInvoice.lens.index && <div>Chiết suất: {viewingInvoice.lens.index}</div>}
                           <div className="tabular-nums">Mắt phải: {formatRx(viewingInvoice.lens.od) || '-'}</div>
                           <div className="tabular-nums">Mắt trái: {formatRx(viewingInvoice.lens.os) || '-'}</div>
                        </div>
                     )}
                     {(viewingInvoice.extraFrames || []).map((fr, i) => (
                        <div key={`xf${i}`} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-slate-700 space-y-1">
                           <div className="flex justify-between items-center font-semibold text-amber-800 mb-1">
                              <span className="flex items-center gap-2"><Glasses size={16} aria-hidden /> Gọng kính #{i + 2}</span>
                              <span className="tabular-nums">{formatMoney(fr.price)} đ</span>
                           </div>
                           <div>Tên gọng: {fr.name}</div>
                           <div>Mã gọng: {fr.code}</div>
                           {fr.material && <div>Chất liệu: {fr.material}</div>}
                        </div>
                     ))}
                     {(viewingInvoice.extraLenses || []).map((ln, i) => (
                        <div key={`xl${i}`} className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm text-slate-700 space-y-1">
                           <div className="flex justify-between items-center font-semibold text-sky-800 mb-1">
                              <span className="flex items-center gap-2"><Eye size={16} aria-hidden /> Tròng kính #{i + 2}</span>
                              <span className="tabular-nums">{formatMoney(ln.price)} đ</span>
                           </div>
                           <div>Tên tròng: {ln.name}</div>
                           {ln.index && <div>Chiết suất: {ln.index}</div>}
                           <div className="tabular-nums">Mắt phải: {formatRx(ln.od) || '-'}</div>
                           <div className="tabular-nums">Mắt trái: {formatRx(ln.os) || '-'}</div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="subtle-panel p-4 mb-4 text-sm">
                     <h4 className="font-semibold text-slate-700 mb-2">Sản phẩm:</h4>
                     {viewingInvoice.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-1 text-slate-700">
                           <span>{item.name} x{item.quantity}</span>
                           <span className="tabular-nums">{formatMoney(item.price * item.quantity)} đ</span>
                        </div>
                     ))}
                  </div>
               )}

               <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
                  <div className="flex justify-between text-slate-700">
                     <span>Tạm tính:</span>
                     <span className="tabular-nums">{formatMoney(viewingInvoice.subtotal)} đ</span>
                  </div>
                  {viewingInvoice.discount > 0 && (
                     <div className="flex justify-between text-red-600">
                        <span>Giảm giá:</span>
                        <span className="tabular-nums">-{formatMoney(viewingInvoice.discount)} đ</span>
                     </div>
                  )}
                  {viewingInvoice.surcharge > 0 && (
                     <div className="flex justify-between text-amber-700">
                        <span>Phụ thu:</span>
                        <span className="tabular-nums">+{formatMoney(viewingInvoice.surcharge)} đ</span>
                     </div>
                  )}
                  <div className="flex justify-between items-baseline border-t border-slate-200 pt-3">
                     <span className="text-base font-semibold text-slate-900">Tổng cộng:</span>
                     <span className="text-xl font-bold text-emerald-700 tabular-nums">{formatMoney(viewingInvoice.total)} đ</span>
                  </div>
               </div>
            </Modal>
         )}

         {/* Modal Sửa Hóa Đơn */}
         {editingInvoice && (
            <Modal
               open
               onClose={closeEdit}
               size={editForm ? 'xl' : 'md'}
               title="Sửa hóa đơn"
               icon={<Edit size={20} aria-hidden />}
               footer={
                  <>
                     <Button variant="outline" onClick={closeEdit}>Hủy</Button>
                     <Button variant="primary" icon={Save} onClick={handleUpdateInvoice}>Lưu thay đổi</Button>
                  </>
               }
            >
               <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Field label="Tên khách hàng" htmlFor="edit-inv-name">
                        <input
                           id="edit-inv-name"
                           className="clinic-input"
                           value={editingInvoice.patientName}
                           onChange={e => setEditingInvoice({ ...editingInvoice, patientName: e.target.value })}
                        />
                     </Field>
                     <Field label="Số điện thoại" htmlFor="edit-inv-phone">
                        <input
                           id="edit-inv-phone"
                           className="clinic-input"
                           value={editingInvoice.patientPhone || ''}
                           onChange={e => setEditingInvoice({ ...editingInvoice, patientPhone: e.target.value })}
                        />
                     </Field>
                  </div>

                  {editForm ? (
                     <GlassesInvoiceForm
                        value={editForm}
                        compact
                        suggestions={glassesSuggestions}
                        errors={editErrors}
                        onChange={next => {
                           setEditForm(next);
                           if (editErrors.size) setEditErrors(validateGlassesForm(next).errors);
                        }}
                     />
                  ) : (
                     <div>
                        <span className="clinic-label">Sản phẩm:</span>
                        <div className="space-y-2">
                           {editingInvoice.items.map((item, i) => (
                              <div key={i} className="subtle-panel flex gap-3 items-center px-3 py-2">
                                 <span className="flex-1 min-w-0 text-sm text-slate-700">{item.name}</span>
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">SL:</span>
                                    <input
                                       type="number"
                                       className="clinic-input clinic-input-sm w-16 text-center tabular-nums"
                                       value={item.quantity}
                                       min="1"
                                       onChange={e => {
                                          const newItems = editingInvoice.items.map((it, idx) =>
                                             idx === i ? { ...it, quantity: parseInt(e.target.value) || 1 } : it);
                                          setEditingInvoice({ ...editingInvoice, items: newItems });
                                       }}
                                    />
                                 </div>
                                 <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatMoney(item.price * item.quantity)}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Field label="Phụ thu (đ)">
                        <MoneyInput
                           value={String(editingInvoice.surcharge || '')}
                           onChange={v => setEditingInvoice({ ...editingInvoice, surcharge: parseMoney(v) })}
                        />
                     </Field>
                     <Field label="Giảm giá (đ)">
                        <MoneyInput
                           value={String(editingInvoice.discount || '')}
                           onChange={v => setEditingInvoice({ ...editingInvoice, discount: parseMoney(v) })}
                           className="text-red-600"
                        />
                     </Field>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                     <div className="flex justify-between items-baseline">
                        <span className="text-base font-semibold text-emerald-800">Tổng cộng:</span>
                        <span className="text-xl font-bold text-emerald-700 tabular-nums">{formatMoney(editTotal)} đ</span>
                     </div>
                  </div>
               </div>
            </Modal>
         )}

         {/* Vùng in hóa đơn (ẩn trên màn hình, chỉ hiện khi in) */}
         <div className="print-area">
            {printingInvoice && <InvoicePrint settings={settings} invoice={printingInvoice} />}
         </div>
      </div>
   );
};
