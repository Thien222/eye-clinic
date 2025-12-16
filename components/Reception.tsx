import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient } from '../types';
import { Printer, RefreshCw, Plus, Search, Edit2, Trash2, X } from 'lucide-react';

// UUID generator that works on HTTP
const generateId = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);

export const Reception: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Service type: 'refraction' = Cắt kính, 'doctor' = Khám mắt
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
    if (!confirm(`Bạn có chắc muốn xóa bệnh nhân "${patient.fullName}"?`)) return;
    db.deletePatient(patient.id);
    loadPatients();
    alert('Đã xóa bệnh nhân!');
  };

  const handleUpdatePatient = () => {
    if (!editingPatient) return;
    db.updatePatient(editingPatient);
    setEditingPatient(null);
    loadPatients();
    alert('Đã cập nhật thông tin!');
  };

  const handleSubmit = () => {
    if (!formData.fullName) return;

    const ticketNumber = db.getNextTicketNumber();
    // Chuyển đến phòng tương ứng dựa trên loại dịch vụ
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
    setLastPrintedTicket({ number: ticketNumber, name: newPatient.fullName });

    // Auto print trigger (simulated)
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

  const filteredPatients = patients.filter(p =>
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const getStatusLabel = (status: Patient['status']) => {
    switch (status) {
      case 'waiting_refraction': return { text: 'Chờ đo K.Xạ', color: 'bg-yellow-100 text-yellow-700' };
      case 'processing_refraction': return { text: 'Đang đo', color: 'bg-blue-100 text-blue-700' };
      case 'waiting_doctor': return { text: 'Chờ khám', color: 'bg-orange-100 text-orange-700' };
      case 'processing_doctor': return { text: 'Đang khám', color: 'bg-purple-100 text-purple-700' };
      case 'waiting_billing': return { text: 'Chờ thanh toán', color: 'bg-pink-100 text-pink-700' };
      case 'completed': return { text: 'Hoàn thành', color: 'bg-green-100 text-green-700' };
      default: return { text: '---', color: 'bg-gray-100' };
    }
  };

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Tiếp Tân & Bốc Số</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700"
        >
          <Plus size={20} /> Bệnh Nhân Mới
        </button>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm bệnh nhân (Tên, SĐT)..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={loadPatients} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RefreshCw size={20} />
          </button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="p-3">STT</th>
              <th className="p-3">Họ Tên</th>
              <th className="p-3">Năm Sinh</th>
              <th className="p-3">Thị lực (OD/OS)</th>
              <th className="p-3">Lý do khám</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPatients.map((p) => {
              const status = getStatusLabel(p.status);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold text-brand-600">{String(p.ticketNumber).padStart(3, '0')}</td>
                  <td className="p-3">{p.fullName}</td>
                  <td className="p-3">{p.dob}</td>
                  <td className="p-3 text-sm">
                    {p.initialVA?.od || '-'} / {p.initialVA?.os || '-'}
                    {p.hasGlasses && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1 rounded">Kính</span>}
                  </td>
                  <td className="p-3 text-gray-500">{p.reason}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => printTicketOnly(p)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                        title="In lại phiếu STT"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => setEditingPatient(p)}
                        className="p-1.5 bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-600"
                        title="Sửa thông tin"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(p)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 rounded text-red-600"
                        title="Xóa bệnh nhân"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-brand-50 flex justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-brand-800">Thêm Bệnh Nhân Mới</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Họ và tên *</label>
                <input
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border rounded p-2"
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
                    <div className="font-bold">👓 Cắt kính</div>
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
                    <div className="font-bold">🩺 Khám mắt</div>
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
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
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
              <h3 className="text-xl font-bold text-yellow-800">✏️ Sửa Thông Tin Bệnh Nhân</h3>
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
                  <label className="block text-sm font-medium mb-1">Thị lực OD</label>
                  <input
                    className="w-full border rounded p-2"
                    value={editingPatient.initialVA?.od || ''}
                    onChange={e => setEditingPatient({ ...editingPatient, initialVA: { ...editingPatient.initialVA!, od: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Thị lực OS</label>
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
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Area - Thermal Ticket 57mm x 50mm */}
      <div className="print-area">
        {lastPrintedTicket && (
          <div className="print-ticket">
            <div className="clinic-name">PHÒNG KHÁM MẮT NGOÀI GIỜ</div>
            <div className="doctor-name">BSCKII. Hứa Trung Kiên</div>
            <div className="ticket-number">{String(lastPrintedTicket.number).padStart(3, '0')}</div>
            <div className="patient-name">{lastPrintedTicket.name}</div>
            <div className="ticket-note">Khách hàng vui lòng chờ đến STT</div>
            <div className="ticket-date">Phiếu có hiệu lực trong ngày {formattedDate}</div>
          </div>
        )}
      </div>
    </div>
  );
};