import React, { useState, useEffect } from 'react';

import { NavLink, Outlet } from 'react-router-dom';

import {

  LayoutDashboard, Users, Eye, Stethoscope, ShoppingBag, Package,

  History, Settings, TrendingUp, Menu, X, Wifi, WifiOff, RefreshCw, Activity

} from 'lucide-react';

import { db, ConnectionStatus } from '../services/db';

import { AlertBanner } from './ui/AlertBanner';
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

      { to: '/inventory', icon: Package, label: 'Kho hàng' },

      { to: '/statistics', icon: TrendingUp, label: 'Thống kê' },

      { to: '/history', icon: History, label: 'Lịch sử' },

      { to: '/settings', icon: Settings, label: 'Cài đặt' },

    ],

  },

];



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

    `flex items-center gap-3 px-3 py-2.5 mb-0.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer

    ${isActive

      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200/60'

      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'

    }`;



  return (

    <div className="flex h-screen bg-slate-50 overflow-hidden no-print">

      {/* Mobile Header */}

      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4 py-3 safe-area">

        <div className="flex items-center gap-2.5">

          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">

            <Activity className="text-white" size={18} />

          </div>

          <h1 className="text-base font-bold text-slate-900">EyeClinic Pro</h1>

        </div>

        <button

          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

          className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"

          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}

        >

          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}

        </button>

      </header>



      {mobileMenuOpen && (

        <div

          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"

          onClick={() => setMobileMenuOpen(false)}

        />

      )}



      {/* Sidebar */}

      <aside className={`

        fixed lg:relative inset-y-0 left-0 z-40

        w-64 bg-white border-r border-slate-200 flex flex-col

        transform transition-transform duration-300 ease-out

        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}

        lg:pt-0 pt-14

      `}>

        <div className="p-5 border-b border-slate-100 hidden lg:flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm shadow-brand-600/25">

            <Activity className="text-white" size={20} />

          </div>

          <div>

            <h1 className="text-base font-bold text-slate-900 leading-tight">EyeClinic Pro</h1>

            <p className="text-xs text-slate-500">Quản lý phòng khám</p>

          </div>

        </div>



        <nav className="flex-1 p-3 overflow-y-auto mobile-scroll">

          {navGroups.map(group => (

            <div key={group.label} className="mb-4">

              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">

                {group.label}

              </p>

              {group.items.map(item => (

                <NavLink

                  key={item.to}

                  to={item.to}

                  end={item.to === '/'}

                  className={navClass}

                  onClick={() => setMobileMenuOpen(false)}

                >

                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />

                  <span className="nav-text">{item.label}</span>

                </NavLink>

              ))}

            </div>

          ))}

        </nav>



        <div className="p-4 border-t border-slate-100 hidden lg:block">

          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${

            connectionStatus === 'connected' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'

          }`}>

            <StatusIcon size={14} className={connectionStatus === 'syncing' ? 'animate-spin-slow' : ''} />

            {connectionStatus === 'connected' ? 'Đồng bộ OK' : connectionStatus === 'offline' ? 'Server không phản hồi' : 'Đang kết nối...'}

          </div>

        </div>

      </aside>



      <main className="flex-1 overflow-auto p-4 lg:p-8 relative pt-16 lg:pt-6 main-content-mobile safe-area">

        {connectionStatus !== 'connected' && (

          <AlertBanner tone={status.tone} icon={StatusIcon} spinning={connectionStatus === 'syncing'}>

            {status.text}
            {connectionStatus === 'offline' && ' — Kiểm tra server (start.bat) và kết nối mạng.'}

          </AlertBanner>

        )}

        <Outlet />

        <NetworkStatusOverlay status={connectionStatus} />

      </main>

    </div>

  );

};


