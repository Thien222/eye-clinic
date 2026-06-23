import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { Patient, RefractionData } from '../types';
import { Mic, Save, Printer, Search, UserCheck, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { getLocalDateString, isSameLocalDay, speak } from '../services/utils';
import { RefractionPrintSheet } from './RefractionPrintSheet';

const EMPTY_METRIC = { sph: '', cyl: '', axis: '', va: '', add: '' };

// ===== MOVED OUTSIDE to prevent re-creation on each render =====
// Component hiển thị input cho Skiascopy (không có VA)
const SkiascopyInput = ({ label, value, onChange }: { label: string, value: any, onChange: (val: any) => void }) => (
  <div className="grid grid-cols-4 gap-2 mb-2">
    <div className="font-bold text-gray-500 self-center text-sm">{label}</div>
    <input
      placeholder="SPH"
      className="border p-1.5 rounded text-sm text-center"
      value={value.sph || ''}
      onChange={e => onChange({ ...value, sph: e.target.value })}
    />
    <input
      placeholder="CYL"
      className="border p-1.5 rounded text-sm text-center"
      value={value.cyl || ''}
      onChange={e => onChange({ ...value, cyl: e.target.value })}
    />
    <input
      placeholder="AXIS"
      className="border p-1.5 rounded text-sm text-center"
      value={value.axis || ''}
      onChange={e => onChange({ ...value, axis: e.target.value })}
    />
  </div>
);

// Component hiển thị input cho Subjective (có VA)
const SubjectiveInput = ({ label, value, onChange }: { label: string, value: any, onChange: (val: any) => void }) => (
  <div className="grid grid-cols-5 gap-2 mb-2">
    <div className="font-bold text-gray-500 self-center text-sm">{label}</div>
    <input
      placeholder="SPH"
      className="border p-1.5 rounded text-sm text-center"
      value={value.sph || ''}
      onChange={e => onChange({ ...value, sph: e.target.value })}
    />
    <input
      placeholder="CYL"
      className="border p-1.5 rounded text-sm text-center"
      value={value.cyl || ''}
      onChange={e => onChange({ ...value, cyl: e.target.value })}
    />
    <input
      placeholder="AXIS"
      className="border p-1.5 rounded text-sm text-center"
      value={value.axis || ''}
      onChange={e => onChange({ ...value, axis: e.target.value })}
    />
    <input
      placeholder="VA"
      className="border p-1.5 rounded text-sm text-center"
      value={value.va || ''}
      onChange={e => onChange({ ...value, va: e.target.value })}
    />
  </div>
);
// ===== END MOVED COMPONENTS =====

export const Refraction: React.FC = () => {
  // Initialize state from localStorage or default to 'waiting'
  const [activeTab, setActiveTab] = useState<'waiting' | 'processing' | 'completed'>(() => {
    const saved = localStorage.getItem('refraction_active_tab');
    return (saved as 'waiting' | 'processing' | 'completed') || 'waiting';
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [data, setData] = useState<RefractionData>({
    skiascopy: { od: { ...EMPTY_METRIC }, os: { ...EMPTY_METRIC }, cycloplegia: false },
    subjective: { od: { ...EMPTY_METRIC }, os: { ...EMPTY_METRIC } },
    finalRx: { od: { ...EMPTY_METRIC }, os: { ...EMPTY_METRIC }, lensType: 'Đơn tròng - nhìn xa', distance: true, near: false },
    note: ''
  });

  const [pd, setPd] = useState(''); // PD riêng cho cả hai mắt

  // Persist activeTab whenever it changes
  useEffect(() => {
    localStorage.setItem('refraction_active_tab', activeTab);
  }, [activeTab]);

  useClinicDbUpdated(() => loadPatients());

  // Update form data when selected patient changes
  useEffect(() => {
    if (selectedPatient && selectedPatient.refraction) {
      setData(selectedPatient.refraction);
      setPd(selectedPatient.refraction.finalRx.od.pd || '');
    } else if (selectedPatient) {
      // Reset form for new patient
      setData({
        skiascopy: { od: { ...EMPTY_METRIC }, os: { ...EMPTY_METRIC }, cycloplegia: false },
        subjective: { od: { ...EMPTY_METRIC }, os: { ...EMPTY_METRIC } },
        finalRx: { od: { ...EMPTY_METRIC }, os: { ...EMPTY_METRIC }, lensType: 'Đơn tròng - nhìn xa', distance: true, near: false },
        note: ''
      });
      setPd('');
    }
  }, [selectedPatient]);

  const loadPatients = () => {
    setPatients(db.getPatients());
  };

  const isTodayPatient = (p: Patient) => isSameLocalDay(p.timestamp);

  const getFilteredList = () => {
    switch (activeTab) {
      case 'waiting':
        return patients.filter(p => p.status === 'waiting_refraction' && isTodayPatient(p))
          .sort((a, b) => a.ticketNumber - b.ticketNumber);
      case 'processing':
        return patients.filter(p => p.status === 'processing_refraction' && isTodayPatient(p));
      case 'completed':
        return patients.filter(p => p.refraction && p.status !== 'waiting_refraction' && p.status !== 'processing_refraction' && isTodayPatient(p))
          .sort((a, b) => b.timestamp - a.timestamp);
      default:
        return [];
    }
  };

  const handleDeletePatient = (p: Patient) => {
    if (!confirm(`Bạn có chắc muốn xóa bệnh nhân "${p.fullName}"?`)) return;
    db.deletePatient(p.id);
    if (selectedPatient?.id === p.id) setSelectedPatient(null);
    loadPatients();
    alert('Đã xóa bệnh nhân!');
  };

  const searchResults = searchTerm.length > 1
    ? patients.filter(p =>
      isTodayPatient(p) && (
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm)
      )
    ).slice(0, 10)
    : [];

  const startRefraction = (p: Patient) => {
    // 1) Cập nhật trạng thái + UI TRƯỚC — đảm bảo luôn chuyển sang "Đang đo"
    const updated = { ...p, status: 'processing_refraction' as const, updatedAt: Date.now() };
    db.updatePatient(updated);
    setPatients(prev => prev.map(x => x.id === p.id ? updated : x));
    setSelectedPatient(updated);
    setActiveTab('processing');
    // 2) Đọc loa SAU — lỗi giọng nói (iOS...) không làm hỏng việc chuyển phòng
    speak(`Mời bệnh nhân số ${p.ticketNumber} vào phòng khúc xạ`);
  };

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchTerm('');
  };

  const handleSave = () => {
    if (!selectedPatient) return;

    // Update PD trong finalRx
    const finalRxWithPd = {
      ...data.finalRx,
      od: { ...data.finalRx.od, pd },
      os: { ...data.finalRx.os, pd }
    };

    const updated = {
      ...selectedPatient,
      refraction: { ...data, finalRx: finalRxWithPd },
      status: 'waiting_billing' as const,
      updatedAt: Date.now()
    };
    setPatients(prev => prev.map(x => x.id === selectedPatient.id ? updated : x));
    setSelectedPatient(null);
    setActiveTab('waiting');
    db.updatePatient(updated);
    alert('Đã lưu kết quả khúc xạ! Chuyển sang phần hóa đơn.');
  };

  const handleTransferToDoctor = () => {
    if (!selectedPatient) return;

    // Update PD trong finalRx
    const finalRxWithPd = {
      ...data.finalRx,
      od: { ...data.finalRx.od, pd },
      os: { ...data.finalRx.os, pd }
    };

    const updated = {
      ...selectedPatient,
      refraction: { ...data, finalRx: finalRxWithPd },
      status: 'waiting_doctor' as const,
      updatedAt: Date.now()
    };
    setPatients(prev => prev.map(x => x.id === selectedPatient.id ? updated : x));
    setSelectedPatient(null);
    setActiveTab('waiting');
    db.updatePatient(updated);
    alert('Đã lưu kết quả khúc xạ! Chuyển sang phòng khám mắt.');
  };

  // Nhập khúc xạ chủ quan -> tự đổ sang kính điều chỉnh (vẫn cho sửa tay sau đó)
  const handleSubjectiveChange = (eye: 'od' | 'os', v: any) => {
    setData(prev => ({
      ...prev,
      subjective: { ...prev.subjective, [eye]: v },
      finalRx: {
        ...prev.finalRx,
        [eye]: {
          ...prev.finalRx[eye],
          sph: v.sph || '',
          cyl: v.cyl || '',
          axis: v.axis || '',
          va: v.va || ''
        }
      }
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const [settings, setSettings] = useState(db.getSettings());

  useClinicDbUpdated(() => setSettings(db.getSettings()), false);
  const today = new Date();

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar List */}
      <div className="w-1/4 clinic-card flex flex-col overflow-hidden">
        {/* Search Box */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm BN theo tên, SĐT..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map(p => (
                <div
                  key={p.id}
                  className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleSelectPatient(p)}
                >
                  <div className="font-medium text-sm">#{p.ticketNumber} - {p.fullName}</div>
                  <div className="text-xs text-gray-500">{p.phone} | NS: {p.dob}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-1 ${activeTab === 'waiting' ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Clock size={14} /> Chờ đo
          </button>
          <button
            onClick={() => setActiveTab('processing')}
            className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-1 ${activeTab === 'processing' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <UserCheck size={14} /> Đang đo
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-1 ${activeTab === 'completed' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <CheckCircle size={14} /> Xong
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {getFilteredList().length === 0 && (
            <div className="text-center text-gray-400 mt-10 italic text-sm">Không có bệnh nhân</div>
          )}
          {getFilteredList().map(p => (
            <div
              key={p.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'hover:bg-gray-50'
                }`}
              onClick={() => handleSelectPatient(p)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-lg text-brand-600">#{p.ticketNumber}</span>
                <div className="flex gap-1">
                  {(activeTab === 'waiting' || activeTab === 'processing') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startRefraction(p); }}
                      className="p-1.5 bg-brand-100 text-brand-600 rounded-full hover:bg-brand-200"
                      title="Mời bệnh nhân vào (Voice)"
                    >
                      <Mic size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePatient(p); }}
                    className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                    title="Xóa bệnh nhân"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="font-medium text-sm">{p.fullName}</div>
              <div className="text-xs text-gray-500 mt-1">
                VA: {p.initialVA?.od || '-'} / {p.initialVA?.os || '-'}
                {p.hasGlasses && <span className="ml-1 bg-blue-100 text-blue-600 px-1 rounded">Kính</span>}
              </div>
              <div className="text-xs text-red-500 mt-1 truncate">{p.reason}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Work Area */}
      <div className="flex-1 clinic-card p-6 overflow-y-auto">
        {selectedPatient ? (
          <>
            {/* Header với thông tin BN */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedPatient.fullName}</h2>
                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                  <span>Giới tính: {selectedPatient.gender}</span>
                  <span>NS: {selectedPatient.dob}</span>
                  <span>SĐT: {selectedPatient.phone}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Địa chỉ: {selectedPatient.address}</p>
              </div>
              <div className="text-right">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                  <p className="text-sm font-medium text-gray-700">Thị lực không kính (UCVA):</p>
                  <p className="font-bold">OD: {selectedPatient.initialVA?.od || '-'} | OS: {selectedPatient.initialVA?.os || '-'}</p>
                  {selectedPatient.hasGlasses && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Có kính cũ</span>}
                </div>
                <p className="text-red-600 text-sm font-medium">Lý do: {selectedPatient.reason}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={handlePrint} className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2">
                <Printer size={18} /> In Phiếu Khúc Xạ
              </button>
              <button onClick={() => handleDeletePatient(selectedPatient)} className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-2">
                <Trash2 size={18} /> Xóa Bệnh Nhân
              </button>
              {activeTab !== 'completed' && (
                <>
                  <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 flex items-center gap-2">
                    <Save size={18} /> Lưu & Chuyển Hóa Đơn
                  </button>
                  <button onClick={handleTransferToDoctor} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                    <UserCheck size={18} /> Chuyển Khám Mắt
                  </button>
                </>
              )}
            </div>

            <div className={`space-y-6 ${activeTab === 'completed' ? 'opacity-80 pointer-events-none' : ''}`}>
              {/* 1. Khúc xạ Khách quan (Skiascopy) */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-3">
                  <h4 className="font-bold text-gray-700">1. Khúc xạ Khách quan (Skiascopy)</h4>
                  <label className="flex items-center text-sm gap-2 pointer-events-auto cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.skiascopy.cycloplegia}
                      onChange={e => setData({ ...data, skiascopy: { ...data.skiascopy, cycloplegia: e.target.checked } })}
                      className="h-4 w-4"
                    />
                    <span className={data.skiascopy.cycloplegia ? 'text-red-600 font-medium' : ''}>
                      Có liệt điều tiết
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-1 text-xs font-bold text-gray-500 text-center">
                  <div className="text-left pl-2">Mắt</div>
                  <div>Độ cầu (SPH)</div>
                  <div>Độ loạn (CYL)</div>
                  <div>Trục (AXIS)</div>
                </div>
                <SkiascopyInput label="Mắt phải (OD)" value={data.skiascopy.od} onChange={v => setData({ ...data, skiascopy: { ...data.skiascopy, od: v } })} />
                <SkiascopyInput label="Mắt trái (OS)" value={data.skiascopy.os} onChange={v => setData({ ...data, skiascopy: { ...data.skiascopy, os: v } })} />
              </div>

              {/* 2. Khúc xạ Chủ quan (Subjective) */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-3">2. Khúc xạ Chủ quan (Subj. Refraction)</h4>
                <div className="grid grid-cols-5 gap-2 mb-1 text-xs font-bold text-gray-500 text-center">
                  <div className="text-left pl-2">Mắt</div>
                  <div>Độ cầu (SPH)</div>
                  <div>Độ loạn (CYL)</div>
                  <div>Trục (AXIS)</div>
                  <div>Thị lực (BCVA)</div>
                </div>
                <SubjectiveInput label="Mắt phải (OD)" value={data.subjective.od} onChange={v => handleSubjectiveChange('od', v)} />
                <SubjectiveInput label="Mắt trái (OS)" value={data.subjective.os} onChange={v => handleSubjectiveChange('os', v)} />
              </div>

              {/* 3. Kính điều chỉnh (Prescription) */}
              <div className="border-2 border-brand-200 p-4 rounded-lg bg-brand-50/30">
                <h4 className="font-bold text-brand-700 mb-3">3. Kính điều chỉnh (Prescription)</h4>

                <div className="grid grid-cols-6 gap-2 mb-1 text-xs font-bold text-gray-500 text-center">
                  <div className="text-left pl-2">Mắt</div>
                  <div>SPH</div><div>CYL</div><div>AXIS</div><div>Thị lực</div><div>ADD</div>
                </div>


                <div className="grid grid-cols-6 gap-2 mb-2">
                  <div className="font-bold text-gray-600 self-center text-sm">OD</div>
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.od.sph || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, sph: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.od.cyl || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, cyl: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.od.axis || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, axis: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.od.va || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, va: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" placeholder="ADD" value={data.finalRx.od.add || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, add: e.target.value } } })} />
                </div>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  <div className="font-bold text-gray-600 self-center text-sm">OS</div>
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.os.sph || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, sph: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.os.cyl || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, cyl: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.os.axis || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, axis: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" value={data.finalRx.os.va || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, va: e.target.value } } })} />
                  <input className="border p-1.5 rounded text-center text-sm" placeholder="ADD" value={data.finalRx.os.add || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, add: e.target.value } } })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Khoảng cách đồng tử (PD)</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={pd}
                      onChange={e => setPd(e.target.value)}
                      placeholder="mm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Loại kính</label>
                    <select
                      className="border p-2 rounded w-full"
                      value={data.finalRx.lensType}
                      onChange={e => setData({ ...data, finalRx: { ...data.finalRx, lensType: e.target.value } })}
                    >
                      <option>Đơn tròng - nhìn xa</option>
                      <option>Đơn tròng - nhìn gần</option>
                      <option>Kính 2 tròng (Bifocal)</option>
                      <option>Kính đa tròng (Progressive)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú:</label>
                <textarea
                  className="w-full border rounded p-2 h-20"
                  value={data.note}
                  onChange={e => setData({ ...data, note: e.target.value })}
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </div>

            {/* Print View A5 - mẫu chuẩn print-a5 */}
            {selectedPatient && (
              <div className="print-area">
                <RefractionPrintSheet
                  settings={settings}
                  patient={selectedPatient}
                  refraction={data}
                  pd={pd}
                  performedDate={today}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Search size={48} className="mx-auto mb-2 opacity-50" />
              <p>Chọn bệnh nhân từ danh sách hoặc tìm kiếm</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};