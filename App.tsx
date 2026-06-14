import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Reception } from './components/Reception';
import { Refraction } from './components/Refraction';
import { Doctor } from './components/Doctor';
import { BillingInventory } from './components/BillingInventory';
import { History } from './components/History';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginModal } from './components/LoginModal';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, showLoginModal, isLoginModalOpen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAdmin && !isLoginModalOpen) {
      showLoginModal();
    }
  }, [isAdmin, isLoginModalOpen, showLoginModal]);

  // If showing modal, render null or children (but effectively hidden by modal)
  // Or better, just show children if admin, else return null while waiting for modal
  if (!isAdmin) {
    // If we're on a protected route and not admin, we show the modal via Context
    // But we need to render *something* behind it, or redirect back if they cancel
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-slate-400 text-sm font-medium">Vui lòng đăng nhập...</div>
      </div>
    );
  }

  return <>{children}</>;
};

// Component to handle Login Modal rendering globally
const GlobalAuthHandler = () => {
  const { isLoginModalOpen, hideLoginModal, login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = () => {
    login();
  };

  const handleClose = () => {
    hideLoginModal();
    // If we are on a protected route and close the modal without logging in, go back home
    if (!isAdmin && ['/statistics', '/settings', '/inventory'].includes(location.pathname)) {
      navigate('/');
    }
  };

  return (
    <LoginModal
      isOpen={isLoginModalOpen}
      onClose={handleClose}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}

const AppContent: React.FC = () => {
  return (
    <>
      <GlobalAuthHandler />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="reception" element={<Reception />} />
          <Route path="refraction" element={<Refraction />} />
          <Route path="doctor" element={<Doctor />} />
          <Route path="billing" element={<BillingInventory />} /> {/* Billing is public */}
          <Route path="inventory" element={<ProtectedRoute><BillingInventory activeTab="inventory" /></ProtectedRoute>} />
          <Route path="statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;