import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Package, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';

interface DashboardStats {
  activeQuotations: number;
  totalSuppliers: number;
  totalProducts: number;
  pendingProposals: number;
}

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Não foi possível carregar os dados do painel.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const name = user?.backendUser?.name || user?.firebaseUser?.displayName || 'Usuário';

  const kpis = [
    {
      label: 'Cotações Ativas',
      value: stats?.activeQuotations,
      icon: FileText,
      colorClass: 'primary',
      description: 'Cotações com status Aberta',
      link: '/dashboard/quotations',
    },
    {
      label: 'Fornecedores',
      value: stats?.totalSuppliers,
      icon: Users,
      colorClass: 'accent',
      description: 'Fornecedores cadastrados',
      link: '/dashboard/suppliers',
    },
    {
      label: 'Produtos',
      value: stats?.totalProducts,
      icon: Package,
      colorClass: 'success',
      description: 'Itens ativos no catálogo',
      link: '/dashboard/products',
    },
    {
      label: 'Pendentes',
      value: stats?.pendingProposals,
      icon: Clock,
      colorClass: 'warning',
      description: 'Aguardando fornecedores',
      link: '/dashboard/quotations',
      pulse: true,
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 200ms ease' }}>
      {/* Welcome Message */}
      <div className="dashboard-welcome">
        <h1>Olá, {name}!</h1>
        <p>Acompanhe abaixo o resumo das atividades da sua empresa no Orçalink.</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="kpi-card"
            onClick={() => navigate(kpi.link)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(kpi.link)}
          >
            <div className="kpi-card-header">
              <span className="kpi-card-label">{kpi.label}</span>
              <div className={`kpi-card-icon ${kpi.colorClass}`}>
                <kpi.icon />
              </div>
            </div>
            {loading ? (
              <div className="skeleton skeleton-value" style={{ marginTop: '4px' }} />
            ) : (
              <div className="kpi-card-value">
                {kpi.value ?? 0}
                {kpi.pulse && (kpi.value ?? 0) > 0 && <span className="pulse-dot" />}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {kpi.description}
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Details Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-8)' }}>
        <div className="card">
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--primary-500)' }} />
            Atividades Recentes
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Não há atividades pendentes de ação imediata. Use o menu lateral para gerenciar suas cotações, produtos ou fornecedores.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--accent-500)' }} />
            Dica do Orçalink
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Vincule seus produtos a categorias e relacione seus fornecedores a essas mesmas categorias. O sistema sugerirá automaticamente quem convidar ao iniciar novas cotações.
          </p>
        </div>
      </div>
    </div>
  );
};
