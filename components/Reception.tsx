import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Patient } from '../types';
import { Printer, RefreshCw, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

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
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
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

  useEffect(() => {
    loadPatients();

    // Listen for DB updates from auto-sync
    const handleDbUpdate = () => loadPatients();
    window.addEventListener('clinic-db-updated', handleDbUpdate);

    return () => window.removeEventListener('clinic-db-updated', handleDbUpdate);
  }, []);

  const loadPatients = () => {
    setPatients(db.getPatients().sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleDeletePatient = (patient: Patient) => {
    if (!confirm(`Ban co chac muon xoa benh nhan "${patient.fullName}"?`)) return;
    db.deletePatient(patient.id);
    loadPatients();
    alert('Da xoa benh nhan!');
  };

  const handleUpdatePatient = () => {
    if (!editingPatient) return;
    db.updatePatient(editingPatient);
    setEditingPatient(null);
    loadPatients();
    alert('Da cap nhat thong tin!');
  };

  const handleSubmit = () => {
    if (!formData.fullName) return;

    const ticketNumber = db.getNextTicketNumber();
    const initialStatus = serviceType === 'doctor' ? 'waiting_doctor' : 'waiting_refraction';
    const reasonText = serviceType === 'doctor' ? 'Kham mat' : 'Cat kinh';

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
    loadPatients();
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

      const patientDate = new Date(p.timestamp).toISOString().split('T')[0];
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

  const getStatusLabel = (status: Patient['status']) => {
    switch (status) {
      case 'waiting_refraction': return { text: 'Cho do K.Xa', color: 'bg-yellow-100 text-yellow-700' };
      case 'processing_refraction': return { text: 'Dang do', color: 'bg-blue-100 text-blue-700' };
      case 'waiting_doctor': return { text: 'Cho kham', color: 'bg-orange-100 text-orange-700' };
      case 'processing_doctor': return { text: 'Dang kham', color: 'bg-purple-100 text-purple-700' };
      case 'waiting_billing': return { text: 'Cho thanh toan', color: 'bg-pink-100 text-pink-700' };
      case 'completed': return { text: 'Hoan thanh', color: 'bg-green-100 text-green-700' };
      default: return { text: '---', color: 'bg-gray-100' };
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tiep Tan & Boc So</h2>
          <p className="text-sm text-gray-500">
            {showAllDates
              ? `Tat ca: ${filteredPatients.length} benh nhan`
              : `Ngay ${filterDate.split('-').reverse().join('/')}: ${filteredPatients.length} benh nhan`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700"
          >
            <Plus size={20} /> Benh Nhan Moi
          </button>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        {/* Search and Filter Bar */}
        <div className="mb-4 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tim kiem (Ten, SDT)..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setShowAllDates(false);
              }}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => setShowAllDates(!showAllDates)}
              className={`px-3 py-2 rounded-lg font-medium text-sm ${showAllDates
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {showAllDates ? 'Tat ca' : 'Loc ngay'}
            </button>
          </div>

          <button onClick={loadPatients} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="p-2 w-16">STT</th>
              <th className="p-2 w-16">Ngay</th>
              <th className="p-2">Ho Ten</th>
              <th className="p-2 w-20">Nam Sinh</th>
              <th className="p-2 w-24">Thi luc</th>
              <th className="p-2">Ly do</th>
              <th className="p-2 w-28">Trang thai</th>
              <th className="p-2 w-24">Hanh dong</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedPatients.map((p) => {
              const status = getStatusLabel(p.status);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-2 font-bold text-brand-600">{String(p.ticketNumber).padStart(3, '0')}</td>
                  <td className="p-2 text-gray-500 text-xs">{formatDate(p.timestamp)}</td>
                  <td className="p-2 font-medium">{p.fullName}</td>
                  <td className="p-2">{p.dob}</td>
                  <td className="p-2 text-xs">
                    {p.initialVA?.od || '-'} / {p.initialVA?.os || '-'}
                    {p.hasGlasses && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1 rounded">K</span>}
                  </td>
                  <td className="p-2 text-gray-500 truncate max-w-[150px]">{p.reason}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => printTicketOnly(p)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                        title="In lai phieu STT"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        onClick={() => setEditingPatient(p)}
                        className="p-1.5 bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-600"
                        title="Sua thong tin"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(p)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 rounded text-red-600"
                        title="Xoa benh nhan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedPatients.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Khong co benh nhan nao
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-500">
              Trang {currentPage} / {totalPages} ({filteredPatients.length} benh nhan)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft size={16} /> Truoc
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

      {/* New Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-brand-50 flex justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-brand-800">Them Benh Nhan Moi</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Ho va ten *</label>
                <input
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border rounded p-2"
                  placeholder="Nhap ho va ten"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nam sinh</label>
                <input
                  type="number"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: parseInt(e.target.value) })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gioi tinh</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full border rounded p-2"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nu">Nu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">So dien thoai</label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Dia chi</label>
                <input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-bold text-gray-700 mb-2">Thong tin ban dau</h4>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thi luc (MP - OD)</label>
                <input
                  value={formData.initialVA?.od}
                  onChange={e => setFormData({ ...formData, initialVA: { ...formData.initialVA!, od: e.target.value } })}
                  className="w-full border rounded p-2" placeholder="VD: 10/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thi luc (MT - OS)</label>
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
                <label htmlFor="hasGlasses" className="text-sm font-medium">Benh nhan dang deo kinh?</label>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Loai dich vu *</label>
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
                    <div className="font-bold">Cat kinh</div>
                    <div className="text-xs text-gray-500">Chuyen den phong Khuc xa</div>
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
                    <div className="font-bold">Kham mat</div>
                    <div className="text-xs text-gray-500">Chuyen den phong Bac si</div>
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Ly do chi tiet / Trieu chung</label>
                <input
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full border rounded p-2"
                  placeholder="Dau mat, mo, com, thay kinh moi..."
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
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 font-medium">Huy</button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-brand-600 text-white font-bold rounded shadow hover:bg-brand-700"
              >
                Them & In Phieu
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
              <h3 className="text-xl font-bold text-yellow-800">Sua Thong Tin Benh Nhan</h3>
              <button onClick={() => setEditingPatient(null)} className="text-gray-500 hover:text-red-500 text-2xl">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1">Ho va ten *</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.fullName}
                  onChange={e => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nam sinh</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={editingPatient.dob}
                    onChange={e => setEditingPatient({ ...editingPatient, dob: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gioi tinh</label>
                  <select
                    className="w-full border rounded p-2"
                    value={editingPatient.gender}
                    onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nu">Nu</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">So dien thoai</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.phone}
                  onChange={e => setEditingPatient({ ...editingPatient, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dia chi</label>
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
                <label className="block text-sm font-medium mb-1">Ly do kham</label>
                <input
                  className="w-full border rounded p-2"
                  value={editingPatient.reason}
                  onChange={e => setEditingPatient({ ...editingPatient, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 flex-shrink-0">
              <button onClick={() => setEditingPatient(null)} className="px-4 py-2 text-gray-600 font-medium">Huy</button>
              <button
                onClick={handleUpdatePatient}
                className="px-6 py-2 bg-yellow-500 text-white font-bold rounded shadow hover:bg-yellow-600"
              >
                Luu Thay Doi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Area - Thermal Ticket 57mm x 50mm */}
      <div className="print-area">
        {lastPrintedTicket && (
          <div className="print-ticket">
            <div className="clinic-name">PHONG KHAM MAT NGOAI GIO</div>
            <div className="doctor-name">BSCKII. Hua Trung Kien</div>
            <div className="ticket-number">{String(lastPrintedTicket.number).padStart(3, '0')}</div>
            <div className="patient-name">{lastPrintedTicket.name}</div>
            <div className="ticket-note">Khach hang vui long cho den STT</div>
            <div className="ticket-date">Phieu co hieu luc trong ngay {formattedDate}</div>
          </div>
        )}
      </div>
    </div>
  );
};