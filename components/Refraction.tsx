import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { Patient, RefractionData } from '../types';
import { Mic, Save, Printer, Search, UserCheck, Clock, CheckCircle, Trash2, Eye, Stethoscope } from 'lucide-react';
import { getLocalDateString, isSameLocalDay, speak } from '../services/utils';
import { RefractionPrintSheet } from './RefractionPrintSheet';
import { PageHeader, Button, IconButton, Badge, Tabs, Field, EmptyState, SearchInput } from './ui';

const EMPTY_METRIC = { sph: '', cyl: '', axis: '', va: '', add: '' };

// Lưới thống nhất cho 3 nhóm đo: cột "Mắt" cố định + các cột số đều nhau
const GRID_4 = 'grid grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] gap-2 items-center';
const GRID_5 = 'grid grid-cols-[7.5rem_repeat(4,minmax(0,1fr))] gap-2 items-center';
const GRID_6 = 'grid grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] gap-2 items-center';
const METRIC_INPUT = 'clinic-input clinic-input-sm text-center tabular-nums';
const EYE_LABEL = 'text-sm font-semibold text-slate-700';
const COL_HEAD = 'text-xs font-semibold text-slate-500 text-center leading-tight';

// Tiêu đề nhóm đo (số thứ tự + tên)
const GroupTitle = ({ index, title, right }: { index: number, title: string, right?: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
    <h3 className="section-title">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold tabular-nums">{index}</span>
      {title}
    </h3>
    {right}
  </div>
);

// ===== MOVED OUTSIDE to prevent re-creation on each render =====
// Component hiển thị input cho Skiascopy (không có VA)
const SkiascopyInput = ({ label, value, onChange }: { label: string, value: any, onChange: (val: any) => void }) => (
  <div className={GRID_4}>
    <div className={EYE_LABEL}>{label}</div>
    <input
      placeholder="SPH"
      className={METRIC_INPUT}
      value={value.sph || ''}
      onChange={e => onChange({ ...value, sph: e.target.value })}
    />
    <input
      placeholder="CYL"
      className={METRIC_INPUT}
      value={value.cyl || ''}
      onChange={e => onChange({ ...value, cyl: e.target.value })}
    />
    <input
      placeholder="AXIS"
      className={METRIC_INPUT}
      value={value.axis || ''}
      onChange={e => onChange({ ...value, axis: e.target.value })}
    />
  </div>
);

// Component hiển thị input cho Subjective (có VA)
const SubjectiveInput = ({ label, value, onChange }: { label: string, value: any, onChange: (val: any) => void }) => (
  <div className={GRID_5}>
    <div className={EYE_LABEL}>{label}</div>
    <input
      placeholder="SPH"
      className={METRIC_INPUT}
      value={value.sph || ''}
      onChange={e => onChange({ ...value, sph: e.target.value })}
    />
    <input
      placeholder="CYL"
      className={METRIC_INPUT}
      value={value.cyl || ''}
      onChange={e => onChange({ ...value, cyl: e.target.value })}
    />
    <input
      placeholder="AXIS"
      className={METRIC_INPUT}
      value={value.axis || ''}
      onChange={e => onChange({ ...value, axis: e.target.value })}
    />
    <input
      placeholder="VA"
      className={METRIC_INPUT}
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
    <div className="flex flex-col page-fill">
      <PageHeader
        title="Đo khúc xạ"
        subtitle="Bệnh nhân trong ngày: chờ đo, đang đo và đã đo xong"
        icon={Eye}
      />

      <div className="flex flex-col lg:flex-row gap-6 fill-y lg:pb-1">
        {/* Sidebar List */}
        <div className="w-full lg:w-80 shrink-0 clinic-card flex flex-col min-h-0 max-h-[60vh] lg:max-h-none">
          {/* Search Box */}
          <div className="p-4 border-b border-slate-200 shrink-0 relative z-20">
            <div className="relative">
              <SearchInput
                placeholder="Tìm BN theo tên, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-card max-h-60 overflow-y-auto">
                  {searchResults.map(p => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <div className="font-medium text-sm text-slate-900">
                        <span className="text-brand-700 tabular-nums">#{p.ticketNumber}</span> - {p.fullName}
                      </div>
                      <div className="text-xs text-slate-500">{p.phone} | NS: {p.dob}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            fill
            className="px-2 shrink-0"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'waiting', label: 'Chờ đo', icon: Clock },
              { value: 'processing', label: 'Đang đo', icon: UserCheck },
              { value: 'completed', label: 'Xong', icon: CheckCircle },
            ]}
          />

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 space-y-2">
            {getFilteredList().length === 0 && (
              <EmptyState icon={UserCheck} title="Không có bệnh nhân" className="py-10" />
            )}
            {getFilteredList().map(p => (
              <div
                key={p.id}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedPatient?.id === p.id
                  ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                onClick={() => handleSelectPatient(p)}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-lg text-brand-700 tabular-nums">#{p.ticketNumber}</span>
                  <div className="flex gap-1 -mr-1">
                    {(activeTab === 'waiting' || activeTab === 'processing') && (
                      <IconButton
                        icon={Mic}
                        tone="primary"
                        size="sm"
                        label="Mời bệnh nhân vào (Voice)"
                        onClick={(e) => { e.stopPropagation(); startRefraction(p); }}
                      />
                    )}
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      size="sm"
                      label="Xóa bệnh nhân"
                      onClick={(e) => { e.stopPropagation(); handleDeletePatient(p); }}
                    />
                  </div>
                </div>
                <div className="font-semibold text-sm text-slate-900">{p.fullName}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="tabular-nums">VA: {p.initialVA?.od || '-'} / {p.initialVA?.os || '-'}</span>
                  {p.hasGlasses && <Badge tone="info">Kính</Badge>}
                </div>
                {p.reason && <div className="text-xs text-slate-600 mt-1 truncate">{p.reason}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 min-w-0 lg:min-h-0 clinic-card p-6 lg:overflow-y-auto scroll-thin">
          {selectedPatient ? (
            <>
              {/* Header với thông tin BN */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-5 pb-5 border-b border-slate-200">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-brand-700 tabular-nums">#{selectedPatient.ticketNumber}</span>
                    <h2 className="text-xl font-bold text-slate-900">{selectedPatient.fullName}</h2>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
                    <span>Giới tính: {selectedPatient.gender}</span>
                    <span>NS: {selectedPatient.dob}</span>
                    <span>SĐT: {selectedPatient.phone}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Địa chỉ: {selectedPatient.address}</p>
                  <p className="text-sm text-slate-700 mt-2">
                    <span className="font-semibold">Lý do:</span> {selectedPatient.reason}
                  </p>
                </div>
                <div className="subtle-panel px-4 py-3 md:min-w-[14rem] shrink-0">
                  <p className="text-xs font-medium text-slate-500">Thị lực không kính (UCVA):</p>
                  <p className="font-bold text-slate-900 tabular-nums mt-0.5">OD: {selectedPatient.initialVA?.od || '-'} | OS: {selectedPatient.initialVA?.os || '-'}</p>
                  {selectedPatient.hasGlasses && <Badge tone="info" className="mt-2">Có kính cũ</Badge>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {activeTab !== 'completed' && (
                    <>
                      <Button icon={Save} onClick={handleSave}>Lưu & Chuyển Hóa Đơn</Button>
                      <Button variant="outline" icon={Stethoscope} onClick={handleTransferToDoctor}>Chuyển Khám Mắt</Button>
                    </>
                  )}
                  <Button variant="outline" icon={Printer} onClick={handlePrint}>In Phiếu Khúc Xạ</Button>
                </div>
                <Button variant="danger" icon={Trash2} onClick={() => handleDeletePatient(selectedPatient)}>Xóa Bệnh Nhân</Button>
              </div>

              <div className={`space-y-4 ${activeTab === 'completed' ? 'opacity-80 pointer-events-none' : ''}`}>
                {/* 1. Khúc xạ Khách quan (Skiascopy) */}
                <section className="subtle-panel p-4">
                  <GroupTitle
                    index={1}
                    title="Khúc xạ Khách quan (Skiascopy)"
                    right={
                      <label className="flex items-center text-sm gap-2 pointer-events-auto cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={data.skiascopy.cycloplegia}
                          onChange={e => setData({ ...data, skiascopy: { ...data.skiascopy, cycloplegia: e.target.checked } })}
                          className="h-4 w-4"
                        />
                        <span className={data.skiascopy.cycloplegia ? 'text-red-600 font-semibold' : ''}>
                          Có liệt điều tiết
                        </span>
                      </label>
                    }
                  />
                  <div className="overflow-x-auto">
                    <div className="min-w-[28rem] space-y-2">
                      <div className={GRID_4}>
                        <div className={`${COL_HEAD} text-left`}>Mắt</div>
                        <div className={COL_HEAD}>Độ cận/viễn (SPH)</div>
                        <div className={COL_HEAD}>Độ loạn (CYL)</div>
                        <div className={COL_HEAD}>Trục (AXIS)</div>
                      </div>
                      <SkiascopyInput label="Mắt phải (OD)" value={data.skiascopy.od} onChange={v => setData({ ...data, skiascopy: { ...data.skiascopy, od: v } })} />
                      <SkiascopyInput label="Mắt trái (OS)" value={data.skiascopy.os} onChange={v => setData({ ...data, skiascopy: { ...data.skiascopy, os: v } })} />
                    </div>
                  </div>
                </section>

                {/* 2. Khúc xạ Chủ quan (Subjective) */}
                <section className="subtle-panel p-4">
                  <GroupTitle index={2} title="Khúc xạ Chủ quan (Subj. Refraction)" />
                  <div className="overflow-x-auto">
                    <div className="min-w-[34rem] space-y-2">
                      <div className={GRID_5}>
                        <div className={`${COL_HEAD} text-left`}>Mắt</div>
                        <div className={COL_HEAD}>Độ cận/viễn (SPH)</div>
                        <div className={COL_HEAD}>Độ loạn (CYL)</div>
                        <div className={COL_HEAD}>Trục (AXIS)</div>
                        <div className={COL_HEAD}>Thị lực (BCVA)</div>
                      </div>
                      <SubjectiveInput label="Mắt phải (OD)" value={data.subjective.od} onChange={v => handleSubjectiveChange('od', v)} />
                      <SubjectiveInput label="Mắt trái (OS)" value={data.subjective.os} onChange={v => handleSubjectiveChange('os', v)} />
                    </div>
                  </div>
                </section>

                {/* 3. Kính điều chỉnh (Prescription) */}
                <section className="subtle-panel p-4 !border-brand-200 !bg-brand-50/40">
                  <GroupTitle index={3} title="Kính điều chỉnh (Prescription)" />

                  <div className="overflow-x-auto">
                    <div className="min-w-[40rem] space-y-2">
                      <div className={GRID_6}>
                        <div className={`${COL_HEAD} text-left`}>Mắt</div>
                        <div className={COL_HEAD}>Độ cận/viễn (SPH)</div>
                        <div className={COL_HEAD}>Độ loạn (CYL)</div>
                        <div className={COL_HEAD}>Trục (AXIS)</div>
                        <div className={COL_HEAD}>Thị lực</div>
                        <div className={COL_HEAD}>ADD</div>
                      </div>

                      <div className={GRID_6}>
                        <div className={EYE_LABEL}>Mắt phải (OD)</div>
                        <input className={METRIC_INPUT} value={data.finalRx.od.sph || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, sph: e.target.value } } })} />
                        <input className={METRIC_INPUT} value={data.finalRx.od.cyl || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, cyl: e.target.value } } })} />
                        <input className={METRIC_INPUT} value={data.finalRx.od.axis || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, axis: e.target.value } } })} />
                        <input className={METRIC_INPUT} value={data.finalRx.od.va || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, va: e.target.value } } })} />
                        <input className={METRIC_INPUT} placeholder="ADD" value={data.finalRx.od.add || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, od: { ...data.finalRx.od, add: e.target.value } } })} />
                      </div>
                      <div className={GRID_6}>
                        <div className={EYE_LABEL}>Mắt trái (OS)</div>
                        <input className={METRIC_INPUT} value={data.finalRx.os.sph || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, sph: e.target.value } } })} />
                        <input className={METRIC_INPUT} value={data.finalRx.os.cyl || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, cyl: e.target.value } } })} />
                        <input className={METRIC_INPUT} value={data.finalRx.os.axis || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, axis: e.target.value } } })} />
                        <input className={METRIC_INPUT} value={data.finalRx.os.va || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, va: e.target.value } } })} />
                        <input className={METRIC_INPUT} placeholder="ADD" value={data.finalRx.os.add || ''} onChange={e => setData({ ...data, finalRx: { ...data.finalRx, os: { ...data.finalRx.os, add: e.target.value } } })} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-brand-100">
                    <Field label="Khoảng cách đồng tử (PD)">
                      <input
                        className="clinic-input"
                        value={pd}
                        onChange={e => setPd(e.target.value)}
                        placeholder="mm"
                      />
                    </Field>
                    <Field label="Loại kính">
                      <select
                        className="clinic-input"
                        value={data.finalRx.lensType}
                        onChange={e => setData({ ...data, finalRx: { ...data.finalRx, lensType: e.target.value } })}
                      >
                        <option>Đơn tròng - nhìn xa</option>
                        <option>Đơn tròng - nhìn gần</option>
                        <option>Kính 2 tròng (Bifocal)</option>
                        <option>Kính đa tròng (Progressive)</option>
                      </select>
                    </Field>
                  </div>
                </section>

                {/* Ghi chú */}
                <Field label="Ghi chú:">
                  <textarea
                    className="clinic-input"
                    value={data.note}
                    onChange={e => setData({ ...data, note: e.target.value })}
                    placeholder="Ghi chú thêm..."
                  />
                </Field>
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
            <div className="h-full min-h-[20rem] flex items-center justify-center">
              <EmptyState
                icon={Search}
                title="Chưa chọn bệnh nhân"
                description="Chọn bệnh nhân từ danh sách hoặc tìm kiếm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
