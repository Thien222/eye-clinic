import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Eye, Stethoscope, ShoppingBag, Package, History, Settings, TrendingUp, Menu, X } from 'lucide-react';

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-3 mb-2 rounded-lg transition-colors ${isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-brand-50'}`;

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/reception', icon: Users, label: 'Tiếp Tân' },
    { to: '/refraction', icon: Eye, label: 'Đo Khúc Xạ' },
    { to: '/doctor', icon: Stethoscope, label: 'Khám Mắt' },
    { to: '/billing', icon: ShoppingBag, label: 'Thu Ngân' },
    { to: '/inventory', icon: Package, label: 'Kho Hàng' },
    { to: '/statistics', icon: TrendingUp, label: 'Thống Kê' },
    { to: '/history', icon: History, label: 'Lịch sử' },
    { to: '/settings', icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden no-print">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-50 flex items-center justify-between p-3 safe-area">
        <h1 className="text-lg font-bold text-brand-700">EyeClinic Pro</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-64 bg-white shadow-md flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:pt-0 pt-14
      `}>
        <div className="p-6 border-b hidden lg:block">
          <h1 className="text-xl font-bold text-brand-700">EyeClinic Pro</h1>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto mobile-scroll">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="nav-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 lg:p-8 relative pt-16 lg:pt-4 main-content-mobile safe-area">
        <Outlet />
      </main>
    </div>
  );
};