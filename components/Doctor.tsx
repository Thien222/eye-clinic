import React, { useState } from 'react';
import { db } from '../services/db';
import { isSameLocalDay, speak } from '../services/utils';
import { Patient } from '../types';
import { Mic, CheckCircle, Trash2, ArrowRight, Clock, Eye, FileText, Glasses, Stethoscope } from 'lucide-react';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';
import { PageHeader, Button, IconButton, Badge, EmptyState } from './ui';

export const Doctor: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useClinicDbUpdated(() => loadPatients());

  const loadPatients = () => {
    const all = db.getPatients();
    setPatients(all.filter(p =>
      (p.status === 'waiting_doctor' || p.status === 'processing_doctor') && isSameLocalDay(p.timestamp)
    ).sort((a, b) => a.ticketNumber - b.ticketNumber));
  };

  const callPatient = (p: Patient) => {
    // 1) Cập nhật trạng thái + UI TRƯỚC — đảm bảo luôn chuyển sang "Đang khám"
    const updated = { ...p, status: 'processing_doctor' as const, updatedAt: Date.now() };
    db.updatePatient(updated);
    setPatients(prev => prev.map(x => x.id === p.id ? updated : x));
    setSelectedPatient(updated);
    // 2) Đọc loa SAU — lỗi giọng nói (iOS...) không làm hỏng việc chuyển phòng
    speak(`Mời bệnh nhân số ${p.ticketNumber} vào phòng khám mắt`);
  };

  const handleComplete = (p: Patient) => {
    if (!confirm(`Xác nhận hoàn thành khám cho ${p.fullName}?`)) return;

    const updated = { ...p, status: 'completed' as const, updatedAt: Date.now() };
    setPatients(prev => prev.filter(x => x.id !== p.id));
    setSelectedPatient(null);
    db.updatePatient(updated);
    alert('Đã hoàn thành khám bệnh!');
  };

  const handleTransferToRefraction = (p: Patient) => {
    if (!confirm(`Chuyển ${p.fullName} sang phòng khúc xạ?`)) return;

    const updated = { ...p, status: 'waiting_refraction' as const, updatedAt: Date.now() };
    setPatients(prev => prev.filter(x => x.id !== p.id));
    setSelectedPatient(null);
    db.updatePatient(updated);
    alert('Đã chuyển sang phòng khúc xạ!');
  };

  const handleDelete = (p: Patient) => {
    if (!confirm(`Xóa bệnh nhân ${p.fullName} khỏi danh sách?`)) return;
    setPatients(prev => prev.filter(x => x.id !== p.id));
    setSelectedPatient(null);
    db.deletePatient(p.id);
  };

  return (
    <div className="page-fill flex flex-col">
      <PageHeader
        title="Khám mắt"
        subtitle="Bệnh nhân chờ khám và thao tác của bác sĩ"
        icon={Stethoscope}
      />

      <div className="fill-y flex flex-col lg:flex-row gap-6 pb-0.5">
        {/* Danh sách chờ khám */}
        <div className="w-full lg:w-80 shrink-0 clinic-card flex flex-col overflow-hidden lg:min-h-0">
          <div className="card-header">
            <div className="min-w-0">
              <h3 className="section-title">
                <Clock size={18} aria-hidden /> Danh sách chờ khám
              </h3>
              <p className="clinic-help mt-0.5">Bệnh nhân đã đăng ký tại tiếp tân</p>
            </div>
            <Badge tone="brand">{patients.length}</Badge>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-3 space-y-2">
            {patients.length === 0 && (
              <EmptyState icon={Clock} title="Không có bệnh nhân chờ khám" />
            )}

            {patients.map(p => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${isSelected
                    ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  onClick={() => setSelectedPatient(p)}
                >
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-lg text-brand-600 tabular-nums">#{p.ticketNumber}</span>
                      {p.status === 'processing_doctor' && (
                        <Badge tone="brand" dot>Đang khám</Badge>
                      )}
                    </div>
                    <IconButton
                      icon={Mic}
                      label="Mời bệnh nhân vào"
                      tone="primary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); callPatient(p); }}
                    />
                  </div>

                  <div className="font-semibold text-sm text-slate-900">{p.fullName}</div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <Eye size={14} aria-hidden />
                    <span>Thị lực: OD {p.initialVA?.od || '-'} / OS {p.initialVA?.os || '-'}</span>
                    {p.hasGlasses && <Badge tone="info">Có kính</Badge>}
                  </div>

                  <div className="mt-1 text-xs text-slate-600 truncate">
                    <span className="font-semibold text-slate-700">Lý do:</span> {p.reason || 'Không ghi'}
                  </div>

                  {p.refraction && (
                    <div className="mt-2">
                      <Badge tone="success"><CheckCircle size={12} aria-hidden /> Có kết quả khúc xạ</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Khu vực thao tác */}
        <div className="flex-1 min-w-0 lg:min-h-0 clinic-card p-6 flex flex-col lg:overflow-y-auto scroll-thin">
          {selectedPatient ? (
            <>
              <div className="border-b border-slate-200 pb-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedPatient.fullName}</h2>
                  {selectedPatient.status === 'processing_doctor' && <Badge tone="brand" dot>Đang khám</Badge>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
                  <span>STT: <strong className="text-brand-600 tabular-nums">{selectedPatient.ticketNumber}</strong></span>
                  <span>Giới tính: {selectedPatient.gender}</span>
                  <span>NS: {selectedPatient.dob}</span>
                  <span>SĐT: {selectedPatient.phone}</span>
                </div>
              </div>

              {/* Thông tin thị lực & lý do */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="subtle-panel p-4">
                  <h4 className="section-title mb-3">
                    <Eye size={18} aria-hidden /> Thị lực ban đầu
                  </h4>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>Mắt phải (OD): <strong className="text-base text-slate-900">{selectedPatient.initialVA?.od || '-'}</strong></p>
                    <p>Mắt trái (OS): <strong className="text-base text-slate-900">{selectedPatient.initialVA?.os || '-'}</strong></p>
                  </div>
                  {selectedPatient.hasGlasses && (
                    <div className="mt-3">
                      <Badge tone="info">Bệnh nhân có kính cũ</Badge>
                    </div>
                  )}
                </div>
                <div className="subtle-panel p-4">
                  <h4 className="section-title mb-3">
                    <FileText size={18} aria-hidden /> Lý do đến khám
                  </h4>
                  <p className="text-base text-slate-900">{selectedPatient.reason || 'Không ghi nhận'}</p>
                  {selectedPatient.notes && (
                    <p className="text-sm text-slate-500 mt-2 italic">Ghi chú: {selectedPatient.notes}</p>
                  )}
                </div>
              </div>

              {/* Kết quả khúc xạ nếu có */}
              {selectedPatient.refraction && (
                <div className="mb-6 subtle-panel p-4">
                  <h4 className="section-title mb-3">
                    <Glasses size={18} aria-hidden /> Kết quả khúc xạ
                    <Badge tone="success" className="ml-1"><CheckCircle size={12} aria-hidden /> Đã đo</Badge>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1">Mắt phải (OD)</p>
                      <p className="tabular-nums">SPH: {selectedPatient.refraction.finalRx.od.sph} | CYL: {selectedPatient.refraction.finalRx.od.cyl} | AXIS: {selectedPatient.refraction.finalRx.od.axis}</p>
                      <p className="tabular-nums">Thị lực: {selectedPatient.refraction.finalRx.od.va} | ADD: {selectedPatient.refraction.finalRx.od.add || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1">Mắt trái (OS)</p>
                      <p className="tabular-nums">SPH: {selectedPatient.refraction.finalRx.os.sph} | CYL: {selectedPatient.refraction.finalRx.os.cyl} | AXIS: {selectedPatient.refraction.finalRx.os.axis}</p>
                      <p className="tabular-nums">Thị lực: {selectedPatient.refraction.finalRx.os.va} | ADD: {selectedPatient.refraction.finalRx.os.add || '-'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                    <span><span className="font-semibold text-slate-900">Loại kính:</span> {selectedPatient.refraction.finalRx.lensType}</span>
                    <span><span className="font-semibold text-slate-900">PD:</span> {selectedPatient.refraction.finalRx.od.pd || '-'} mm</span>
                  </div>
                </div>
              )}

              {/* Nút thao tác */}
              <div className="mt-auto pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" size="lg" icon={ArrowRight} onClick={() => handleTransferToRefraction(selectedPatient)}>
                  Chuyển sang Khúc xạ
                </Button>

                <Button variant="primary" size="lg" icon={CheckCircle} onClick={() => handleComplete(selectedPatient)}>
                  Hoàn thành khám
                </Button>

                <Button variant="secondary" size="lg" icon={Mic} onClick={() => callPatient(selectedPatient)}>
                  Mời vào (Voice)
                </Button>

                <Button variant="danger" size="lg" icon={Trash2} onClick={() => handleDelete(selectedPatient)}>
                  Xóa bệnh nhân
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={Stethoscope}
                title="Chọn bệnh nhân từ danh sách bên trái"
                description="Để mời vào khám hoặc thực hiện các thao tác"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
