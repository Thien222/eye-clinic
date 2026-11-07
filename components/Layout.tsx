import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Eye, Stethoscope, ShoppingBag,
  History, Settings, TrendingUp, Menu, X, Wifi, WifiOff, RefreshCw, Activity
} from 'lucide-react';
import { db, ConnectionStatus } from '../services/db';
import { AlertBanner } from './ui/AlertBanner';
import { IconButton } from './ui/IconButton';
import { NetworkStatusOverlay } from './NetworkStatusOverlay';

type NavItem = { to: string; icon: React.ElementType; label: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Vận hành',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
      { to: '/reception', icon: Users, label: 'Tiếp tân' },
      { to: '/refraction', icon: Eye, label: 'Đo khúc xạ' },
      { to: '/doctor', icon: Stethoscope, label: 'Khám mắt' },
      { to: '/billing', icon: ShoppingBag, label: 'Thu ngân' },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { to: '/statistics', icon: TrendingUp, label: 'Thống kê' },
      { to: '/history', icon: History, label: 'Lịch sử' },
      { to: '/settings', icon: Settings, label: 'Cài đặt' },
    ],
  },
];

/** Màu ô trạng thái kết nối ở chân sidebar — cùng tone với AlertBanner */
const statusToneClasses = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
} as const;

const statusDotClasses = {
  success: 'bg-emerald-500',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
} as const;

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(db.getConnectionStatus());

  useEffect(() => {
    const handler = (e: Event) => {
      setConnectionStatus((e as CustomEvent<ConnectionStatus>).detail);
    };
    window.addEventListener('clinic-connection-status', handler);
    return () => window.removeEventListener('clinic-connection-status', handler);
  }, []);

  const statusConfig = {
    connected: { text: 'Đã kết nối máy chủ', tone: 'success' as const, icon: Wifi },
    syncing: { text: 'Đang đồng bộ dữ liệu...', tone: 'info' as const, icon: RefreshCw },
    disconnected: { text: 'Mất kết nối — đang thử kết nối lại', tone: 'warning' as const, icon: WifiOff },
    offline: { text: 'Không có mạng — dữ liệu có thể chưa đồng bộ', tone: 'danger' as const, icon: WifiOff },
  };

  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'group flex items-center gap-3 h-10 px-3 rounded-lg text-sm transition-colors duration-150 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold'
        : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900',
    ].join(' ');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden no-print">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4 safe-area">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <Activity className="text-white" size={18} aria-hidden />
          </div>
          <span className="text-base font-bold text-slate-900">EyeClinic Pro</span>
        </div>
        <IconButton
          icon={mobileMenuOpen ? X : Menu}
          label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
      </header>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-200 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:pt-0 pt-14
        `}
      >
        <div className="h-16 px-5 border-b border-slate-200 hidden lg:flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-sm">
            <Activity className="text-white" size={20} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 leading-tight">EyeClinic Pro</p>
            <p className="text-xs text-slate-500">Quản lý phòng khám</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto mobile-scroll space-y-6">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={navClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={18}
                          strokeWidth={2}
                          aria-hidden
                          className={`shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                        />
                        <span className="nav-text truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 hidden lg:block">
          <div className={`flex items-center gap-2 h-9 px-3 rounded-lg ring-1 ring-inset text-xs font-semibold ${statusToneClasses[status.tone]}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClasses[status.tone]}`} aria-hidden />
            <StatusIcon size={14} className={connectionStatus === 'syncing' ? 'animate-spin-slow' : ''} aria-hidden />
            <span className="truncate">
              {connectionStatus === 'connected' ? 'Đồng bộ OK' : connectionStatus === 'offline' ? 'Server không phản hồi' : 'Đang kết nối...'}
            </span>
          </div>
        </div>
      </aside>

      {/* Màn rộng (lg+): main KHÔNG cuộn — mỗi trang tự có vùng cuộn bên trong (.page-fill / .page-scroll).
          Màn nhỏ: giữ cuộn cả trang như cũ. */}
      <main className="flex-1 min-w-0 overflow-auto lg:overflow-hidden lg:flex lg:flex-col relative px-4 sm:px-6 lg:px-8 pt-20 pb-6 lg:py-8 main-content-mobile safe-area">
        {connectionStatus !== 'connected' && (
          <div className="lg:shrink-0">
            <AlertBanner tone={status.tone} icon={StatusIcon} spinning={connectionStatus === 'syncing'}>
              {status.text}
              {connectionStatus === 'offline' && ' — Kiểm tra server (start.bat) và kết nối mạng.'}
            </AlertBanner>
          </div>
        )}
        <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
          <Outlet />
        </div>
        <NetworkStatusOverlay status={connectionStatus} />
      </main>
    </div>
  );
};
