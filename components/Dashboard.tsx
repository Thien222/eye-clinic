import React, { useState } from 'react';
import { db } from '../services/db';
import { isSameLocalDay } from '../services/utils';
import { Glasses, Stethoscope, FileText, Users, Calendar, Clock, MapPin } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { StatCard } from './ui/StatCard';
import { Card } from './ui/Card';
import { useClinicDbUpdated } from '../hooks/useClinicDbUpdated';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    refractionToday: 0,
    examinationToday: 0,
    invoicesToday: 0,
    waitingRefraction: 0
  });

  const loadStats = () => {
    const patients = db.getPatients();
    const invoices = db.getInvoices();
    const todayPatients = patients.filter(p => isSameLocalDay(p.timestamp));

    setStats({
      refractionToday: todayPatients.filter(p => p.refraction).length,
      examinationToday: todayPatients.filter(p => p.medical).length,
      invoicesToday: invoices.filter(inv => isSameLocalDay(inv.date)).length,
      waitingRefraction: todayPatients.filter(p => p.status === 'waiting_refraction').length
    });
  };

  useClinicDbUpdated(loadStats);

  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Tổng quan phòng khám"
        subtitle={`Hôm nay — ${todayLabel}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Khúc xạ hôm nay" value={stats.refractionToday} icon={Glasses} accent="teal" />
        <StatCard label="Khám bệnh hôm nay" value={stats.examinationToday} icon={Stethoscope} accent="emerald" />
        <StatCard label="Hóa đơn hôm nay" value={stats.invoicesToday} icon={FileText} accent="sky" />
        <StatCard label="Chờ đo khúc xạ" value={stats.waitingRefraction} icon={Users} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" padding="lg">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Hoạt động hôm nay</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Khúc xạ', value: stats.refractionToday, color: 'text-brand-600' },
              { label: 'Khám', value: stats.examinationToday, color: 'text-emerald-600' },
              { label: 'Hóa đơn', value: stats.invoicesToday, color: 'text-sky-600' },
              { label: 'Đang chờ', value: stats.waitingRefraction, color: 'text-amber-600' },
            ].map(item => (
              <div key={item.label} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Thông tin nhanh</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <Calendar size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <span>{todayLabel}</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <span>Giờ hoạt động: 8h – 19h (Thứ Hai – Chủ Nhật)</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <span>PK Mắt Ngoài Giờ</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

