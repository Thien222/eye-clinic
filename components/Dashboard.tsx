import React, { useState } from 'react';
import { db } from '../services/db';
import { isSameLocalDay } from '../services/utils';
import { Glasses, Stethoscope, FileText, Users, Calendar, Clock, MapPin, LayoutDashboard, Activity, Info } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto w-full page-fill">
      <PageHeader
        title="Tổng quan phòng khám"
        subtitle={`Hôm nay — ${todayLabel}`}
        icon={LayoutDashboard}
      />

      <div className="page-scroll space-y-6 lg:p-0.5 lg:pb-1 lg:pr-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Khúc xạ hôm nay" value={stats.refractionToday} icon={Glasses} accent="teal" />
        <StatCard label="Khám bệnh hôm nay" value={stats.examinationToday} icon={Stethoscope} accent="emerald" />
        <StatCard label="Hóa đơn hôm nay" value={stats.invoicesToday} icon={FileText} accent="sky" />
        <StatCard label="Chờ đo khúc xạ" value={stats.waitingRefraction} icon={Users} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Hoạt động hôm nay" icon={Activity}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Khúc xạ', value: stats.refractionToday, color: 'text-brand-600' },
              { label: 'Khám', value: stats.examinationToday, color: 'text-emerald-600' },
              { label: 'Hóa đơn', value: stats.invoicesToday, color: 'text-sky-600' },
              { label: 'Đang chờ', value: stats.waitingRefraction, color: 'text-amber-600' },
            ].map(item => (
              <div key={item.label} className="subtle-panel p-4 text-center">
                <p className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-sm text-slate-500 mt-1 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Thông tin nhanh" icon={Info}>
          <ul className="space-y-3 text-sm text-slate-600">
            {[
              { icon: Calendar, text: todayLabel },
              { icon: Clock, text: 'Giờ hoạt động: 8h – 19h (Thứ Hai – Chủ Nhật)' },
              { icon: MapPin, text: 'PK Mắt Ngoài Giờ' },
            ].map(({ icon: ItemIcon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <ItemIcon size={16} aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      </div>
    </div>
  );
};
