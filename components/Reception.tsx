import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { getLocalDateString } from '../services/utils';
import { Patient } from '../types';
import { Printer, RefreshCw, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Ticket, UserPlus, Users } from 'lucide-react';
import { PageHeader, Card, Button, IconButton, SearchInput, Badge, Modal, Field, EmptyState, DatePicker } from './ui';
import { getPatientStatus } from '../services/statusStyles';

// UUID generator that works on HTTP
const generateId = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);

// Items per page - fit without scrolling
const ITEMS_PER_PAGE = 8;

export const Reception: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Date filter state
  const [filterDate, setFilterDate] = useState<string>(() => getLocalDateString());
  const [showAllDates, setShowAllDates] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Service type: 'refraction' = Cat kinh, 'doctor' = Kham mat
  const [serviceType, setServiceType] = useState<'refraction' | 'doctor'>('refraction');

  // New Patient Form State
  const [formData, setFormData] = useState<Partial<Patient>>({
    fullName: '',
    dob: 2000,
    phone: '',
    address: '',
    gender: 'Nam',
    reason: '',
    hasGlasses: false,
    notes: '',
    initialVA: { od: '', os: '' }
  });

  const [lastPrintedTicket, setLastPrintedTicket] = useState<{ number: number, name: string } | null>(null);

  useClinicDbUpdated(() => loadPatients());

  useEffect(() => {
    db.runEndOfDayCleanup();
    const eodInterval = setInterval(() => db.runEndOfDayCleanup(), 60 * 60 * 1000);
    return () => clearInterval(eodInterval);
  }, []);

  const loadPatients = () => {
    setPatients(db.getPatients().sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleDeletePatient = (patient: Patient) => {
    if (!confirm(`Bạn có chắc muốn xóa bệnh nhân "${patient.fullName}"?`)) return;
    setPatients(prev => prev.filter(p => p.id !== patient.id));
    db.deletePatient(patient.id);
    alert('Đã xóa bệnh nhân!');
  };

  const handleUpdatePatient = () => {
    if (!editingPatient) return;
    setPatients(prev => prev.map(p => p.id === editingPatient.id ? editingPatient : p));
    db.updatePatient(editingPatient);
    setEditingPatient(null);
    alert('Đã cập nhật thông tin!');
  };

  const handleSubmit = async () => {
    if (!formData.fullName) return;

    const ticketNumber = await db.getNextTicketNumber();
    const initialStatus = serviceType === 'doctor' ? 'waiting_doctor' : 'waiting_refraction';
    const reasonText = serviceType === 'doctor' ? 'Khám mắt' : 'Cắt kính';

    const newPatient: Patient = {
      id: generateId(),
      ticketNumber,
      fullName: formData.fullName!,
      dob: formData.dob || 2000,
      phone: formData.phone || '',
      address: formData.address || '',
      gender: (formData.gender as 'Nam' | 'Nữ') || 'Nam',
      reason: formData.reason || reasonText,
      hasGlasses: formData.hasGlasses || false,
      notes: formData.notes || '',
      initialVA: formData.initialVA || { od: '', os: '' },
      status: initialStatus,
      timestamp: Date.now(),
    };

    db.addPatient(newPatient);
    setPatients(prev => [newPatient, ...prev].sort((a, b) => b.timestamp - a.timestamp));
    setLastPrintedTicket({ number: ticketNumber, name: newPatient.fullName });

    setTimeout(() => {
      window.print();
    }, 500);

    setFormData({
      fullName: '', dob: 2000, phone: '', address: '', gender: 'Nam',
      reason: '', hasGlasses: false, notes: '', initialVA: { od: '', os: '' }
    });
    setServiceType('refraction');
    setShowForm(false);
  };

  const printTicketOnly = (patient: Patient) => {
    setLastPrintedTicket({ number: patient.ticketNumber, name: patient.fullName });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Filter patients by date and search
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Search filter
      const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm);

      // Date filter
      if (showAllDates) {
        return matchesSearch;
      }

      const patientDate = getLocalDateString(p.timestamp);
      return matchesSearch && patientDate === filterDate;
    });
  }, [patients, searchTerm, filterDate, showAllDates]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, showAllDates]);

  const getStatusLabel = (status: Patient['status']) => getPatientStatus(status);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const [settings, setSettings] = useState(db.getSettings());
  const today = new Date();

  useClinicDbUpdated(() => setSettings(db.getSettings()), false);
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  const ticketSettings = settings.ticket;

  return (
    // Màn rộng (lg+): trang vừa khung, không cuộn tổng — chỉ bảng cuộn bên trong
    <div className="page-fill">
      <PageHeader
        title="Tiếp tân & Bốc số"
        icon={Ticket}
        subtitle={showAllDates
          ? `Tất cả: ${filteredPatients.length} bệnh nhân`
          : `Ngày ${filterDate.split('-').reverse().join('/')}: ${filteredPatients.length} bệnh nhân`
        }
        actions={
          <Button icon={Plus} onClick={() => setShowForm(true)}>
            Bệnh nhân mới
          </Button>
        }
      />

      <Card padding="md" className="flex flex-col fill-y">
        <div className="mb-4 flex gap-3 items-center flex-wrap shrink-0">
          <SearchInput
            containerClassName="flex-1 min-w-[200px]"
            placeholder="Tìm kiếm (Tên, SĐT)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker
              value={filterDate}
              onChange={(v) => {
                setFilterDate(v);
                setShowAllDates(false);
              }}
              className="w-auto"
              aria-label="Lọc theo ngày"
            />
            <Button
              variant={showAllDates ? 'secondary' : 'outline'}
              onClick={() => setShowAllDates(!showAllDates)}
            >
              {showAllDates ? 'Tất cả' : 'Lọc ngày'}
            </Button>
            <IconButton icon={RefreshCw} label="Làm mới" onClick={loadPatients} />
          </div>
        </div>

        <div className="table-wrap mobile-table-wrapper lg:overflow-y-auto fill-y">
          <table className="clinic-table">
            <thead className="sticky top-0 z-10">
              <tr className="[&>th]:bg-slate-50">
                <th className="w-16">STT</th>
                <th className="w-16 hidden xl:table-cell">Ngày</th>
                <th>Họ tên</th>
                <th className="w-24 whitespace-nowrap">Năm sinh</th>
                <th className="w-28">Thị lực</th>
                <th>Lý do</th>
                <th className="w-32 whitespace-nowrap">Trạng thái</th>
                <th className="w-px whitespace-nowrap text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((p) => {
                const status = getStatusLabel(p.status);
                return (
                  <tr key={p.id}>
                    <td className="font-bold text-brand-600 tabular-nums">{String(p.ticketNumber).padStart(3, '0')}</td>
                    <td className="text-slate-500 tabular-nums whitespace-nowrap hidden xl:table-cell">{formatDate(p.timestamp)}</td>
                    <td className="font-medium text-slate-900 whitespace-nowrap">{p.fullName}</td>
                    <td className="tabular-nums whitespace-nowrap">{p.dob}</td>
                    <td className="whitespace-nowrap">
                      <span className="tabular-nums">{p.initialVA?.od || '-'} / {p.initialVA?.os || '-'}</span>
                      {p.hasGlasses && <Badge tone="info" className="ml-1.5">K</Badge>}
                    </td>
                    <td className="text-slate-500 truncate max-w-[150px]">{p.reason}</td>
                    <td className="whitespace-nowrap">
                      <Badge tone={status.tone} dot>{status.text}</Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <IconButton icon={Printer} label="In lại phiếu STT" size="sm" onClick={() => printTicketOnly(p)} />
                        <IconButton icon={Edit2} label="Sửa thông tin" size="sm" tone="primary" onClick={() => setEditingPatient(p)} />
                        <IconButton icon={Trash2} label="Xóa bệnh nhân" size="sm" tone="danger" onClick={() => handleDeletePatient(p)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedPatients.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState icon={Users} title="Không có bệnh nhân nào" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 shrink-0">
            <div className="text-sm text-slate-500">
              Trang {currentPage} / {totalPages} ({filteredPatients.length} bệnh nhân)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Trước
              </Button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={currentPage === pageNum ? 'primary' : 'ghost'}
                      className="w-8 px-0 tabular-nums"
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={ChevronRight}
                iconPosition="right"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* New Patient Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Thêm bệnh nhân mới"
        icon={<UserPlus size={20} aria-hidden />}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Hủy</Button>
            <Button icon={Printer} onClick={handleSubmit}>Thêm & In Phiếu</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Họ và tên" required htmlFor="new-fullName" className="sm:col-span-2">
            <input
              id="new-fullName"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              className="clinic-input"
              placeholder="Nhập họ và tên"
            />
          </Field>
          <Field label="Năm sinh" htmlFor="new-dob">
            <input
              id="new-dob"
              type="number"
              value={formData.dob}
              onChange={e => setFormData({ ...formData, dob: parseInt(e.target.value) })}
              className="clinic-input"
            />
          </Field>
          <Field label="Giới tính" htmlFor="new-gender">
            <select
              id="new-gender"
              value={formData.gender}
              onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
              className="clinic-input"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </Field>
          <Field label="Số điện thoại" htmlFor="new-phone">
            <input
              id="new-phone"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="clinic-input"
            />
          </Field>
          <Field label="Địa chỉ" htmlFor="new-address" className="sm:col-span-2">
            <input
              id="new-address"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="clinic-input"
            />
          </Field>

          <div className="sm:col-span-2 subtle-panel p-4 space-y-4">
            <h4 className="section-title">Thông tin ban đầu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Thị lực (MP - OD)" htmlFor="new-va-od">
                <input
                  id="new-va-od"
                  value={formData.initialVA?.od}
                  onChange={e => setFormData({ ...formData, initialVA: { ...formData.initialVA!, od: e.target.value } })}
                  className="clinic-input" placeholder="VD: 10/10"
                />
              </Field>
              <Field label="Thị lực (MT - OS)" htmlFor="new-va-os">
                <input
                  id="new-va-os"
                  value={formData.initialVA?.os}
                  onChange={e => setFormData({ ...formData, initialVA: { ...formData.initialVA!, os: e.target.value } })}
                  className="clinic-input" placeholder="VD: 5/10"
                />
              </Field>
            </div>
            <label htmlFor="hasGlasses" className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                id="hasGlasses"
                checked={formData.hasGlasses}
                onChange={e => setFormData({ ...formData, hasGlasses: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">Bệnh nhân đang đeo kính?</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <span className="clinic-label">Loại dịch vụ<span className="text-red-500 ml-0.5">*</span></span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-3 border rounded-xl cursor-pointer text-center transition-colors duration-150 ${serviceType === 'refraction'
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="serviceType"
                  value="refraction"
                  checked={serviceType === 'refraction'}
                  onChange={() => setServiceType('refraction')}
                  className="hidden"
                />
                <div className="font-semibold">Cắt kính</div>
                <div className="text-xs text-slate-500">Chuyển đến phòng Khúc xạ</div>
              </label>
              <label className={`p-3 border rounded-xl cursor-pointer text-center transition-colors duration-150 ${serviceType === 'doctor'
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="serviceType"
                  value="doctor"
                  checked={serviceType === 'doctor'}
                  onChange={() => setServiceType('doctor')}
                  className="hidden"
                />
                <div className="font-semibold">Khám mắt</div>
                <div className="text-xs text-slate-500">Chuyển đến phòng Bác sĩ</div>
              </label>
            </div>
          </div>
          <Field label="Lý do chi tiết / Triệu chứng" htmlFor="new-reason" className="sm:col-span-2">
            <input
              id="new-reason"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="clinic-input"
              placeholder="Đau mắt, mờ, cộm, thay kính mới..."
            />
          </Field>
          <Field label="Ghi chú" htmlFor="new-notes" className="sm:col-span-2">
            <textarea
              id="new-notes"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="clinic-input h-20 resize-y" rows={2}
            />
          </Field>
        </div>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        open={!!editingPatient}
        onClose={() => setEditingPatient(null)}
        title="Sửa thông tin bệnh nhân"
        icon={<Edit2 size={20} aria-hidden />}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingPatient(null)}>Hủy</Button>
            <Button onClick={handleUpdatePatient}>Lưu thay đổi</Button>
          </>
        }
      >
        {editingPatient && (
          <div className="space-y-4">
            <Field label="Họ và tên" required htmlFor="edit-fullName">
              <input
                id="edit-fullName"
                className="clinic-input"
                value={editingPatient.fullName}
                onChange={e => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Năm sinh" htmlFor="edit-dob">
                <input
                  id="edit-dob"
                  type="number"
                  className="clinic-input"
                  value={editingPatient.dob}
                  onChange={e => setEditingPatient({ ...editingPatient, dob: parseInt(e.target.value) })}
                />
              </Field>
              <Field label="Giới tính" htmlFor="edit-gender">
                <select
                  id="edit-gender"
                  className="clinic-input"
                  value={editingPatient.gender}
                  onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </Field>
            </div>
            <Field label="Số điện thoại" htmlFor="edit-phone">
              <input
                id="edit-phone"
                className="clinic-input"
                value={editingPatient.phone}
                onChange={e => setEditingPatient({ ...editingPatient, phone: e.target.value })}
              />
            </Field>
            <Field label="Địa chỉ" htmlFor="edit-address">
              <input
                id="edit-address"
                className="clinic-input"
                value={editingPatient.address}
                onChange={e => setEditingPatient({ ...editingPatient, address: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Thị lực OD" htmlFor="edit-va-od">
                <input
                  id="edit-va-od"
                  className="clinic-input"
                  value={editingPatient.initialVA?.od || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, initialVA: { ...editingPatient.initialVA!, od: e.target.value } })}
                />
              </Field>
              <Field label="Thị lực OS" htmlFor="edit-va-os">
                <input
                  id="edit-va-os"
                  className="clinic-input"
                  value={editingPatient.initialVA?.os || ''}
                  onChange={e => setEditingPatient({ ...editingPatient, initialVA: { ...editingPatient.initialVA!, os: e.target.value } })}
                />
              </Field>
            </div>
            <Field label="Lý do khám" htmlFor="edit-reason">
              <input
                id="edit-reason"
                className="clinic-input"
                value={editingPatient.reason}
                onChange={e => setEditingPatient({ ...editingPatient, reason: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Hidden Print Area - Thermal Ticket 57mm x 50mm */}
      <div className="print-area">
        {lastPrintedTicket && (
          <div className="print-ticket">
            {settings.logoUrl && settings.invoice?.showLogo !== false && (
              <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '12mm', margin: '0 auto 2mm', display: 'block' }} />
            )}
            <div className="clinic-name">{ticketSettings?.header || settings.name || 'PHÒNG KHÁM MẮT NGOÀI GIỜ'}</div>
            <div className="doctor-name">{ticketSettings?.subHeader || settings.doctorName || ''}</div>
            <div className="ticket-number">{String(lastPrintedTicket.number).padStart(3, '0')}</div>
            <div className="patient-name">{lastPrintedTicket.name}</div>
            <div className="ticket-note">{ticketSettings?.note || 'Khách hàng vui lòng chờ đến STT'}</div>
            <div className="ticket-date">
              {ticketSettings?.footer
                ? `${ticketSettings.footer} ${formattedDate}`
                : `Phiếu có hiệu lực trong ngày ${formattedDate}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};