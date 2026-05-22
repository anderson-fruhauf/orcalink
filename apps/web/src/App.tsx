import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext.js';
import { useAuth } from './hooks/useAuth.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { DashboardLayout } from './layouts/DashboardLayout.js';
import { DashboardHome } from './pages/DashboardHome.js';
import { Categories } from './pages/Categories.js';
import { Suppliers } from './pages/Suppliers.js';
import { SupplierForm } from './pages/SupplierForm.js';

// Route wrapper for authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--primary-500)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.backendUser || !user.tenant) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route wrapper to prevent logged in users from visiting auth pages
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--primary-500)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (user && user.backendUser && user.tenant) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPassword />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="quotations" element={<div style={{ padding: 'var(--space-6)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}><h2 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>Cotações</h2><p style={{ color: 'var(--text-muted)' }}>Gerencie suas cotações e envie propostas para fornecedores.</p></div>} />
            <Route path="products" element={<div style={{ padding: 'var(--space-6)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}><h2 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>Produtos</h2><p style={{ color: 'var(--text-muted)' }}>Cadastre e gerencie a lista de produtos da empresa.</p></div>} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/new" element={<SupplierForm />} />
            <Route path="suppliers/:id/edit" element={<SupplierForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="settings" element={<div style={{ padding: 'var(--space-6)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}><h2 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>Configurações</h2><p style={{ color: 'var(--text-muted)' }}>Ajuste as preferências e configurações de conta.</p></div>} />
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      
      {/* Toast Notifications Provider */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-heading)',
          },
          success: {
            iconTheme: {
              primary: 'var(--success-500)',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--danger-500)',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
