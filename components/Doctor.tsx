import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient } from '../types';
import { Mic, CheckCircle, Trash2, ArrowRight, Clock, Eye } from 'lucide-react';

export const Doctor: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    loadPatients();
    const interval = setInterval(loadPatients, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPatients = () => {
    // Chỉ lấy bệnh nhân đang chờ khám hoặc đang khám
    const all = db.getPatients();
    setPatients(all.filter(p =>
      p.status === 'waiting_doctor' || p.status === 'processing_doctor'
    ).sort((a, b) => a.ticketNumber - b.ticketNumber));
  };

  const callPatient = (p: Patient) => {
    const text = `Mời bệnh nhân số ${p.ticketNumber} vào phòng khám mắt`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);

    // Update status to processing
    const updated = { ...p, status: 'processing_doctor' as const };
    db.updatePatient(updated);
    loadPatients();
    setSelectedPatient(updated);
  };

  const handleComplete = (p: Patient) => {
    if (!confirm(`Xác nhận hoàn thành khám cho ${p.fullName}?`)) return;

    const updated = { ...p, status: 'completed' as const };
    db.updatePatient(updated);
    alert('Đã hoàn thành khám bệnh!');
    setSelectedPatient(null);
    loadPatients();
  };

  const handleTransferToRefraction = (p: Patient) => {
    if (!confirm(`Chuyển ${p.fullName} sang phòng khúc xạ?`)) return;

    const updated = { ...p, status: 'waiting_refraction' as const };
    db.updatePatient(updated);
    alert('Đã chuyển sang phòng khúc xạ!');
    setSelectedPatient(null);
    loadPatients();
  };

  const handleDelete = (p: Patient) => {
    if (!confirm(`Xóa bệnh nhân ${p.fullName} khỏi danh sách?`)) return;

    // Remove patient from list (mark as completed without medical record)
    const updated = { ...p, status: 'completed' as const };
    db.updatePatient(updated);
    setSelectedPatient(null);
    loadPatients();
  };

  return (
    <div className="flex h-full gap-6">
      {/* Patient List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-brand-50">
          <h3 className="font-bold text-brand-800 flex items-center gap-2">
            <Clock size={18} /> Danh sách chờ khám
          </h3>
          <p className="text-sm text-gray-600 mt-1">Bệnh nhân đã đăng ký tại tiếp tân</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {patients.length === 0 && (
            <div className="text-center text-gray-400 mt-10 italic">
              Không có bệnh nhân chờ khám
            </div>
          )}

          {patients.map(p => (
            <div
              key={p.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === p.id
                ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-500'
                : 'hover:bg-gray-50'
                } ${p.status === 'processing_doctor' ? 'border-blue-400 bg-blue-50' : ''}`}
              onClick={() => setSelectedPatient(p)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl text-brand-600">#{p.ticketNumber}</span>
                  {p.status === 'processing_doctor' && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full animate-pulse">Đang khám</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); callPatient(p); }}
                  className="p-2 bg-brand-100 text-brand-600 rounded-full hover:bg-brand-200 transition-colors"
                  title="Mời bệnh nhân vào"
                >
                  <Mic size={18} />
                </button>
              </div>

              <div className="font-medium text-lg">{p.fullName}</div>

              <div className="mt-2 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Eye size={14} />
                  <span>Thị lực: OD {p.initialVA?.od || '-'} / OS {p.initialVA?.os || '-'}</span>
                  {p.hasGlasses && <span className="ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-xs">Có kính</span>}
                </div>
              </div>

              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                <strong>Lý do:</strong> {p.reason || 'Không ghi'}
              </div>

              {p.refraction && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle size={12} /> Có kết quả khúc xạ
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Panel */}
      <div className="flex-1 bg-white rounded-xl shadow-sm p-6 flex flex-col">
        {selectedPatient ? (
          <>
            <div className="border-b pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{selectedPatient.fullName}</h2>
              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                <span>STT: <strong className="text-brand-600">{selectedPatient.ticketNumber}</strong></span>
                <span>Giới tính: {selectedPatient.gender}</span>
                <span>NS: {selectedPatient.dob}</span>
                <span>SĐT: {selectedPatient.phone}</span>
              </div>
            </div>

            {/* Thông tin thị lực & lý do */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  <Eye size={16} /> Thị lực ban đầu
                </h4>
                <div className="text-lg">
                  <p>Mắt phải (OD): <strong>{selectedPatient.initialVA?.od || '-'}</strong></p>
                  <p>Mắt trái (OS): <strong>{selectedPatient.initialVA?.os || '-'}</strong></p>
                </div>
                {selectedPatient.hasGlasses && (
                  <p className="text-sm mt-2 bg-blue-100 text-blue-700 px-2 py-1 rounded inline-block">
                    Bệnh nhân có kính cũ
                  </p>
                )}
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-bold text-red-800 mb-2">Lý do đến khám</h4>
                <p className="text-lg">{selectedPatient.reason || 'Không ghi nhận'}</p>
                {selectedPatient.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">Ghi chú: {selectedPatient.notes}</p>
                )}
              </div>
            </div>

            {/* Kết quả khúc xạ nếu có */}
            {selectedPatient.refraction && (
              <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} /> Kết quả khúc xạ
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-bold text-gray-700 mb-1">Mắt phải (OD)</p>
                    <p>SPH: {selectedPatient.refraction.finalRx.od.sph} | CYL: {selectedPatient.refraction.finalRx.od.cyl} | AXIS: {selectedPatient.refraction.finalRx.od.axis}</p>
                    <p>Thị lực: {selectedPatient.refraction.finalRx.od.va} | ADD: {selectedPatient.refraction.finalRx.od.add || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-bold text-gray-700 mb-1">Mắt trái (OS)</p>
                    <p>SPH: {selectedPatient.refraction.finalRx.os.sph} | CYL: {selectedPatient.refraction.finalRx.os.cyl} | AXIS: {selectedPatient.refraction.finalRx.os.axis}</p>
                    <p>Thị lực: {selectedPatient.refraction.finalRx.os.va} | ADD: {selectedPatient.refraction.finalRx.os.add || '-'}</p>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">Loại kính:</span> {selectedPatient.refraction.finalRx.lensType}
                  <span className="ml-4 font-medium">PD:</span> {selectedPatient.refraction.finalRx.od.pd || '-'} mm
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTransferToRefraction(selectedPatient)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <ArrowRight size={18} /> Chuyển sang Khúc xạ
              </button>

              <button
                onClick={() => handleComplete(selectedPatient)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <CheckCircle size={18} /> Hoàn thành khám
              </button>

              <button
                onClick={() => callPatient(selectedPatient)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium col-span-1"
              >
                <Mic size={18} /> Mời vào (Voice)
              </button>

              <button
                onClick={() => handleDelete(selectedPatient)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
              >
                <Trash2 size={18} /> Xóa bệnh nhân
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Clock size={48} className="mx-auto mb-2 opacity-50" />
              <p>Chọn bệnh nhân từ danh sách bên trái</p>
              <p className="text-sm mt-2">Để mời vào khám hoặc thực hiện các thao tác</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};