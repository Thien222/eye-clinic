import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { getLocalDateString } from '../services/utils';
import { Patient } from '../types';
import { Search, Eye, FileText, Calendar, Glasses, Printer, ChevronLeft, ChevronRight, ClipboardList, UserRound } from 'lucide-react';
import { PageHeader, Button, IconButton, Badge, Modal, Tabs, Segmented, EmptyState, SearchInput, Pagination } from './ui';
import type { TabItem } from './ui';
import { RefractionPrintSheet } from './RefractionPrintSheet';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';

const ITEMS_PER_PAGE = 15;

export const History: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'refraction' | 'all'>('refraction');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'day' | 'week' | 'month'>('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [printList, setPrintList] = useState(false);
  const settings = db.getSettings();

  useClinicDbUpdated(() => loadPatients());

  const loadPatients = () => {
    const all = db.getPatients();
    setPatients(all.sort((a, b) => b.timestamp - a.timestamp));
  };

  const isInPeriod = (timestamp: number) => {
    if (periodFilter === 'all') return true;
    const d = new Date(timestamp);
    const now = new Date();
    if (periodFilter === 'day') return getLocalDateString(d) === getLocalDateString(now);
    if (periodFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const filtered = useMemo(() => patients.filter(p => {
    const matchSearch = searchTerm === '' ||
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm);
    const matchPeriod = isInPeriod(p.timestamp);
    if (activeTab === 'refraction') {
      return matchSearch && matchPeriod && p.refraction;
    }
    return matchSearch && matchPeriod;
  }), [patients, searchTerm, activeTab, periodFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab, periodFilter]);

  const handlePrintList = () => {
    setPrintList(true);
    setTimeout(() => { window.print(); setPrintList(false); }, 300);
  };

  const handlePrintRefraction = (p: Patient) => {
    setSelectedPatient(p);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const today = new Date();

  const periodItems: TabItem<'all' | 'day' | 'week' | 'month'>[] = [
    { value: 'day', label: 'Hôm nay' },
    { value: 'week', label: '7 ngày' },
    { value: 'month', label: 'Tháng này' },
    { value: 'all', label: 'Tất cả' },
  ];

  const tabItems: TabItem<'refraction' | 'all'>[] = [
    { value: 'refraction', label: 'Lịch sử Khúc xạ', icon: Glasses },
    { value: 'all', label: 'Tất cả bệnh nhân', icon: FileText },
  ];

  return (
    // Màn rộng (lg+): trang vừa khung (không cuộn ngoài), chỉ bảng cuộn bên trong
    <div className="page-fill max-w-7xl mx-auto w-full flex flex-col">
      <PageHeader
        title="Lịch sử khám"
        subtitle={`${filtered.length} bệnh nhân`}
        icon={ClipboardList}
        actions={
          <Button variant="outline" icon={Printer} onClick={handlePrintList}>In bảng</Button>
        }
      />

      <div className="clinic-card fill-y flex flex-col">
        {/* Tabs */}
        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} className="px-5 pt-2 shrink-0" />

        <div className="p-5 flex flex-col gap-4 fill-y">
          {/* Bộ lọc */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 shrink-0">
            <SearchInput
              containerClassName="flex-1 min-w-0"
              placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Segmented items={periodItems} value={periodFilter} onChange={setPeriodFilter} />
          </div>

          {/* Bảng */}
          <div className="table-wrap overflow-y-auto fill-y">
            <table className="clinic-table">
              <thead className="sticky top-0 z-10">
                <tr className="[&>th]:bg-slate-50">
                  <th>Ngày</th>
                  <th>STT</th>
                  <th>Họ Tên</th>
                  <th className="hidden xl:table-cell">Năm sinh</th>
                  <th>SĐT</th>
                  {activeTab === 'refraction' && <th>Kính điều chỉnh</th>}
                  <th className="text-right w-px whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => (
                  <tr key={p.id}>
                    <td className="tabular-nums whitespace-nowrap">{new Date(p.timestamp).toLocaleDateString('vi-VN')}</td>
                    <td className="font-bold text-brand-600 tabular-nums">{p.ticketNumber}</td>
                    <td className="font-medium text-slate-900 whitespace-nowrap">{p.fullName}</td>
                    <td className="tabular-nums hidden xl:table-cell">{p.dob}</td>
                    <td className="tabular-nums whitespace-nowrap">{p.phone}</td>
                    {activeTab === 'refraction' && (
                      <td className="text-xs tabular-nums whitespace-nowrap">
                        {p.refraction && (
                          <div className="flex flex-wrap gap-x-3">
                            <span><span className="font-semibold text-slate-500">OD:</span> {p.refraction.finalRx.od.sph}/{p.refraction.finalRx.od.cyl}</span>
                            <span><span className="font-semibold text-slate-500">OS:</span> {p.refraction.finalRx.os.sph}/{p.refraction.finalRx.os.cyl}</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="w-px whitespace-nowrap">
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setSelectedPatient(p)} className="!text-brand-600 hover:!text-brand-700 hover:!bg-brand-50">
                          Xem
                        </Button>
                        {p.refraction && (
                          <IconButton icon={Printer} label="In phiếu khúc xạ" size="sm" onClick={() => handlePrintRefraction(p)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'refraction' ? 7 : 6}>
                      <EmptyState
                        icon={searchTerm ? Search : ClipboardList}
                        title={searchTerm ? 'Không tìm thấy bệnh nhân phù hợp' : 'Chưa có dữ liệu lịch sử'}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            className="shrink-0"
            page={Math.min(currentPage, Math.max(1, totalPages))}
            pageSize={ITEMS_PER_PAGE}
            total={filtered.length}
            onChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Patient Detail Modal */}
      <Modal
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        size="xl"
        icon={<UserRound size={20} aria-hidden />}
        title={selectedPatient?.fullName ?? ''}
        subtitle={selectedPatient && (
          <span className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
            <span className="inline-flex items-center gap-1"><Calendar size={14} aria-hidden /> {new Date(selectedPatient.timestamp).toLocaleDateString('vi-VN')}</span>
            <span>{selectedPatient.gender} - {selectedPatient.dob}</span>
            <span>{selectedPatient.phone}</span>
            <span className="basis-full">Địa chỉ: {selectedPatient.address}</span>
          </span>
        )}
        footer={selectedPatient && (
          <>
            <Button variant="outline" onClick={() => setSelectedPatient(null)}>Đóng</Button>
            {selectedPatient.refraction && (
              <Button icon={Printer} onClick={() => handlePrintRefraction(selectedPatient)}>
                In Phiếu Khúc Xạ
              </Button>
            )}
          </>
        )}
      >
        {selectedPatient && (
          <div className="space-y-6">
            {/* Thông tin ban đầu */}
            <div className="subtle-panel p-4">
              <h4 className="section-title mb-3"><Eye size={18} aria-hidden /> Thông tin ban đầu</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                <div className="space-y-1">
                  <p><strong className="text-slate-900">Thị lực (UCVA):</strong> OD {selectedPatient.initialVA?.od || '-'} / OS {selectedPatient.initialVA?.os || '-'}</p>
                  <p><strong className="text-slate-900">Có kính:</strong> {selectedPatient.hasGlasses ? 'Có' : 'Không'}</p>
                </div>
                <div className="space-y-1">
                  <p><strong className="text-slate-900">Lý do khám:</strong> {selectedPatient.reason || '-'}</p>
                  <p><strong className="text-slate-900">Ghi chú:</strong> {selectedPatient.notes || '-'}</p>
                </div>
              </div>
            </div>

            {/* Refraction Data */}
            {selectedPatient.refraction && (
              <div className="rounded-xl border border-slate-200">
                <div className="card-header">
                  <h4 className="section-title"><Glasses size={18} aria-hidden /> Kết quả Khúc Xạ</h4>
                </div>

                <div className="p-5 space-y-4">
                  {/* Skiascopy */}
                  <div>
                    <p className="clinic-label flex flex-wrap items-center gap-2">
                      Khúc xạ khách quan (Skiascopy)
                      {selectedPatient.refraction.skiascopy.cycloplegia &&
                        <Badge tone="danger">Có liệt điều tiết</Badge>
                      }
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700 subtle-panel p-3 tabular-nums">
                      <div>
                        <strong className="text-slate-900">OD:</strong> SPH {selectedPatient.refraction.skiascopy.od.sph || '-'} |
                        CYL {selectedPatient.refraction.skiascopy.od.cyl || '-'} |
                        AXIS {selectedPatient.refraction.skiascopy.od.axis || '-'}
                      </div>
                      <div>
                        <strong className="text-slate-900">OS:</strong> SPH {selectedPatient.refraction.skiascopy.os.sph || '-'} |
                        CYL {selectedPatient.refraction.skiascopy.os.cyl || '-'} |
                        AXIS {selectedPatient.refraction.skiascopy.os.axis || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Subjective */}
                  <div>
                    <p className="clinic-label">Khúc xạ chủ quan (Subj. Refraction)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700 subtle-panel p-3 tabular-nums">
                      <div>
                        <strong className="text-slate-900">OD:</strong> SPH {selectedPatient.refraction.subjective.od.sph || '-'} |
                        CYL {selectedPatient.refraction.subjective.od.cyl || '-'} |
                        AXIS {selectedPatient.refraction.subjective.od.axis || '-'} |
                        VA {selectedPatient.refraction.subjective.od.va || '-'}
                      </div>
                      <div>
                        <strong className="text-slate-900">OS:</strong> SPH {selectedPatient.refraction.subjective.os.sph || '-'} |
                        CYL {selectedPatient.refraction.subjective.os.cyl || '-'} |
                        AXIS {selectedPatient.refraction.subjective.os.axis || '-'} |
                        VA {selectedPatient.refraction.subjective.os.va || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Final Rx */}
                  <div>
                    <p className="clinic-label">Kính điều chỉnh (Prescription)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700 tabular-nums">
                      <div className="bg-brand-50 p-3 rounded-lg border border-brand-200">
                        <p className="font-semibold text-slate-900 mb-1">Mắt Phải (OD)</p>
                        <p>SPH: {selectedPatient.refraction.finalRx.od.sph} | CYL: {selectedPatient.refraction.finalRx.od.cyl} | AXIS: {selectedPatient.refraction.finalRx.od.axis}</p>
                        <p>Thị lực: {selectedPatient.refraction.finalRx.od.va} | ADD: {selectedPatient.refraction.finalRx.od.add || '-'}</p>
                      </div>
                      <div className="bg-brand-50 p-3 rounded-lg border border-brand-200">
                        <p className="font-semibold text-slate-900 mb-1">Mắt Trái (OS)</p>
                        <p>SPH: {selectedPatient.refraction.finalRx.os.sph} | CYL: {selectedPatient.refraction.finalRx.os.cyl} | AXIS: {selectedPatient.refraction.finalRx.os.axis}</p>
                        <p>Thị lực: {selectedPatient.refraction.finalRx.os.va} | ADD: {selectedPatient.refraction.finalRx.os.add || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-700 subtle-panel p-3 space-y-1">
                    <p><strong className="text-slate-900">Loại kính:</strong> {selectedPatient.refraction.finalRx.lensType}</p>
                    <p><strong className="text-slate-900">PD (KCĐT):</strong> {selectedPatient.refraction.finalRx.od.pd || '-'} mm</p>
                    {selectedPatient.refraction.note && <p><strong className="text-slate-900">Ghi chú:</strong> {selectedPatient.refraction.note}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Medical Record */}
            {selectedPatient.medical && (
              <div className="rounded-xl border border-slate-200">
                <div className="card-header">
                  <h4 className="section-title"><FileText size={18} aria-hidden /> Khám Bệnh & Đơn Thuốc</h4>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="clinic-label">Triệu chứng</p>
                      <p className="text-sm text-slate-900">{selectedPatient.medical.symptoms}</p>
                    </div>
                    <div>
                      <p className="clinic-label">Chẩn đoán</p>
                      <p className="text-sm text-slate-900">{selectedPatient.medical.diagnosis}</p>
                    </div>
                  </div>

                  {selectedPatient.medical.prescriptions.length > 0 && (
                    <div className="table-wrap">
                      <table className="clinic-table">
                        <thead>
                          <tr>
                            <th>Thuốc</th>
                            <th className="num">SL</th>
                            <th>Cách dùng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPatient.medical.prescriptions.map((m, i) => (
                            <tr key={i}>
                              <td className="font-medium text-slate-900">{m.medicineName}</td>
                              <td className="num">{m.quantity}</td>
                              <td>{m.usage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Print Area for Refraction Sheet */}
      {selectedPatient?.refraction && (
        <div className="print-area">
          <RefractionPrintSheet
            settings={settings}
            patient={selectedPatient}
            refraction={selectedPatient.refraction}
          />
        </div>
      )}

      {/* Printable list table */}
      {printList && (
        <div className="print-area">
          <div style={{ fontFamily: 'Arial, sans-serif', padding: '10mm' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '5mm' }}>{settings.name} - Lịch sử Khúc xạ</h2>
            <p style={{ textAlign: 'center', fontSize: '12px', marginBottom: '5mm' }}>
              {periodFilter === 'day' ? 'Hôm nay' : periodFilter === 'week' ? '7 ngày gần nhất' : periodFilter === 'month' ? 'Tháng này' : 'Tất cả'} | {filtered.length} bệnh nhân
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>STT</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Ngày</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Họ tên</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>SĐT</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>OD SPH/CYL</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>OS SPH/CYL</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Loại kính</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{new Date(p.timestamp).toLocaleDateString('vi-VN')}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.fullName}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.phone}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.refraction ? `${p.refraction.finalRx.od.sph}/${p.refraction.finalRx.od.cyl}` : '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.refraction ? `${p.refraction.finalRx.os.sph}/${p.refraction.finalRx.os.cyl}` : '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.refraction?.finalRx.lensType || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

