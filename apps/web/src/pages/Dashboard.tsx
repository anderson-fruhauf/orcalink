import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.js';
import logoIcon from '../assets/logo-icon.svg';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada.');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erro ao sair da conta.');
    }
  };

  const name = user?.backendUser?.name || user?.firebaseUser?.displayName || 'Usuário';
  const email = user?.firebaseUser?.email || '';
  const tenantName = user?.tenant?.name || 'Empresa';
  const plan = user?.tenant?.plan || 'FREE';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', fontFamily: 'Inter, sans-serif' }}>
      {/* Premium Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        height: '64px',
        padding: '0 var(--space-6)',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1 }}>
          <img src={logoIcon} alt="Orçalink Icon" style={{ height: '28px' }} />
          <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-heading)' }}>Orçalink</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: plan === 'PRO' ? 'var(--primary-100)' : 'var(--neutral-100)',
            color: plan === 'PRO' ? 'var(--primary-700)' : 'var(--text-body)'
          }}>
            Plano {plan}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--neutral-50)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Sair
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-10) var(--space-4)' }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 'var(--space-6)'
        }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 'var(--space-2)' }}>
            Olá, {name}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
            Sua conta está ativa e sincronizada com o backend local do Orçalink.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>E-mail</span>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{email}</span>
            </div>

            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Empresa / Tenant</span>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{tenantName}</span>
            </div>

            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tenant ID</span>
              <code style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-600)', fontWeight: 'bold' }}>{user?.tenant?.id || 'N/A'}</code>
            </div>
          </div>
        </div>

        {/* Feature Cards Placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Minhas Cotações</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Acompanhe suas cotações enviadas para fornecedores e veja o status das respostas em tempo real.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Categorias</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Organize seus produtos e fornecedores criando categorias personalizadas para cotação rápida.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Fornecedores</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Cadastre e gerencie a base de parceiros, vinculando-os a categorias para agilizar envios.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
