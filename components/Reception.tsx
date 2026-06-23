import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { getLocalDateString } from '../services/utils';
import { Patient } from '../types';
import { Printer, RefreshCw, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SearchInput } from './ui/SearchInput';
import { Badge } from './ui/Badge';
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
    <div className="max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Tiếp tân & Bốc số"
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

      <Card padding="md">
        <div className="mb-4 flex gap-3 items-center flex-wrap">
          <SearchInput
            containerClassName="flex-1 min-w-[200px]"
            placeholder="Tìm kiếm (Tên, SĐT)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setShowAllDates(false);
              }}
              className="clinic-input w-auto"
            />
            <Button
              variant={showAllDates ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowAllDates(!showAllDates)}
            >
              {showAllDates ? 'Tất cả' : 'Lọc ngày'}
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={loadPatients} aria-label="Làm mới">
            <RefreshCw size={18} />
          </Button>
        </div>

        <div className="mobile-table-wrapper overflow-x-auto">
        <table className="w-full text-left text-sm clinic-table">
          <thead>
            <tr>
              <th className="p-3 w-16">STT</th>
              <th className="p-3 w-16">Ngày</th>
              <th className="p-3">Họ tên</th>
              <th className="p-3 w-20">Năm sinh</th>
              <th className="p-3 w-24">Thị lực</th>
              <th className="p-3">Lý do</th>
              <th className="p-3 w-28">Trạng thái</th>
              <th className="p-3 w-28">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPatients.map((p) => {
              const status = getStatusLabel(p.status);
              return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-bold text-brand-600 tabular-nums">{String(p.ticketNumber).padStart(3, '0')}</td>
                  <td className="p-3 text-slate-500 text-xs">{formatDate(p.timestamp)}</td>
                  <td className="p-3 font-medium text-slate-900">{p.fullName}</td>
                  <td className="p-3">{p.dob}</td>
                  <td className="p-3 text-xs">
                    {p.initialVA?.od || '-'} / {p.initialVA?.os || '-'}
                    {p.hasGlasses && <Badge className="ml-1.5 bg-sky-50 text-sky-700 ring-1 ring-sky-200">K</Badge>}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[150px]">{p.reason}</td>
                  <td className="p-3">
                    <Badge className={status.className}>{status.text}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => printTicketOnly(p)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="In lại phiếu STT"
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        onClick={() => setEditingPatient(p)}
                        className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                        title="Sửa thông tin"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(p)}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        title="Xóa bệnh nhân"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedPatients.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Không có bệnh nhân nào
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-500">
              Trang {currentPage} / {totalPages} ({filteredPatients.length} bệnh nhân)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft size={16} /> Trước
              </button>

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
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-medium ${currentPage === pageNum
                        ? 'bg-brand-600 text-white'
                        : 'border hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        </div>
      </Card>

      {/* New Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-5 border-b border-slate-100 bg-brand-50 flex justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-brand-800">Thêm bệnh nhân mới</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="clinic-input"
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Năm sinh</label>
                <input
                  type="number"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: parseInt(e.target.value) })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Giới tính</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full border rounded p-2"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-bold text-gray-700 mb-2">Thông tin ban đầu</h4>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thị lực (MP - OD)</label>
                <input
                  value={formData.initialVA?.od}
                  onChange={e => setFormData({ ...formData, initialVA: { ...formData.initialVA!, od: e.target.value } })}
                  className="w-full border rounded p-2" placeholder="VD: 10/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thị lực (MT - OS)</label>
                <input
                  value={formData.initialVA?.os}
                  onChange={e => setFormData({ ...formData, initialVA: { ...formData.initialVA!, os: e.target.value } })}
                  className="w-full border rounded p-2" placeholder="VD: 5/10"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasGlasses"
                  checked={formData.hasGlasses}
                  onChange={e => setFormData({ ...formData, hasGlasses: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="hasGlasses" className="text-sm font-medium">Bệnh nhân đang đeo kính?</label>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Loại dịch vụ *</label>
                <div className="flex gap-3">
                  <label className={`flex-1 p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${serviceType === 'refraction'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input
                      type="radio"
                      name="serviceType"
                      value="refraction"
                      checked={serviceType === 'refraction'}
                      onChange={() => setServiceType('refraction')}
                      className="hidden"
                    />
                    <div className="font-bold">Cắt kính</div>
                    <div className="text-xs text-gray-500">Chuyển đến phòng Khúc xạ</div>
                  </label>
                  <label className={`flex-1 p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${serviceType === 'doctor'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input
                      type="radio"
                      name="serviceType"
                      value="doctor"
                      checked={serviceType === 'doctor'}
                      onChange={() => setServiceType('doctor')}
                      className="hidden"
                    />
                    <div className="font-bold">Khám mắt</div>
                    <div className="text-xs text-gray-500">Chuyển đến phòng Bác sĩ</div>
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Lý do chi tiết / Triệu chứng</label>
                <input
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full border rounded p-2"
                  placeholder="Đau mắt, mờ, cộm, thay kính mới..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Ghi chu</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded p-2 h-16" rows={2}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 font-medium">Hủy</button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-brand-600 text-white font-bold rounded shadow hover:bg-brand-700"
              >
                Thêm & In Phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-yellow-50 flex justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-yellow-800">Sửa thông tin bệnh nhân</h3>
              <button onClick={() => setEditingPatient(null)} className="text-gray-500 hover:text-red-500 text-2xl">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1">Họ và tên *</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.fullName}
                  onChange={e => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Năm sinh</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={editingPatient.dob}
                    onChange={e => setEditingPatient({ ...editingPatient, dob: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giới tính</label>
                  <select
                    className="w-full border rounded p-2"
                    value={editingPatient.gender}
                    onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.phone}
                  onChange={e => setEditingPatient({ ...editingPatient, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.address}
                  onChange={e => setEditingPatient({ ...editingPatient, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Thi luc OD</label>
                  <input
                    className="w-full border rounded p-2"
                    value={editingPatient.initialVA?.od || ''}
                    onChange={e => setEditingPatient({ ...editingPatient, initialVA: { ...editingPatient.initialVA!, od: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Thi luc OS</label>
                  <input
                    className="w-full border rounded p-2"
                    value={editingPatient.initialVA?.os || ''}
                    onChange={e => setEditingPatient({ ...editingPatient, initialVA: { ...editingPatient.initialVA!, os: e.target.value } })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lý do khám</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.reason}
                  onChange={e => setEditingPatient({ ...editingPatient, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 flex-shrink-0">
              <button onClick={() => setEditingPatient(null)} className="px-4 py-2 text-gray-600 font-medium">Hủy</button>
              <button
                onClick={handleUpdatePatient}
                className="px-6 py-2 bg-yellow-500 text-white font-bold rounded shadow hover:bg-yellow-600"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

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