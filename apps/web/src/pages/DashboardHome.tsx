import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Package, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import api from '../lib/api.js';
import { fetchWhatsappStatus, type WhatsappStatus } from '../lib/whatsapp.js';
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
  const isPro = user?.tenant?.plan === 'PRO';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(true);

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

  useEffect(() => {
    if (!isPro) {
      setWhatsappLoading(false);
      return;
    }

    fetchWhatsappStatus()
      .then(setWhatsappStatus)
      .catch(() =>
        setWhatsappStatus({
          state: 'DISCONNECTED',
          connectedNumber: null,
          lastConnectedAt: null,
        }),
      )
      .finally(() => setWhatsappLoading(false));
  }, [isPro]);

  const name = user?.backendUser?.name || user?.firebaseUser?.displayName || 'Usuário';

  const getWhatsappStatusLabel = (): string => {
    if (!isPro) return 'Pro';

    switch (whatsappStatus?.state) {
      case 'CONNECTED':
        return 'Conectado';
      case 'QR_PENDING':
        return 'Pendente';
      case 'ERROR':
        return 'Erro';
      default:
        return 'Desconectado';
    }
  };

  const getWhatsappDescription = (): string => {
    if (!isPro) {
      return 'Disponível no plano Pro';
    }

    if (whatsappStatus?.state === 'CONNECTED') {
      return 'Número vinculado ao Orçalink';
    }

    return 'Integração não configurada';
  };

  const showWhatsappPulse =
    isPro && whatsappStatus?.state !== 'CONNECTED' && whatsappStatus?.state !== 'QR_PENDING';

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
        <div
          className="kpi-card"
          onClick={() => navigate('/dashboard/settings')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard/settings')}
        >
          <div className="kpi-card-header">
            <span className="kpi-card-label">WhatsApp</span>
            <div className="kpi-card-icon success">
              <MessageCircle />
            </div>
          </div>
          {whatsappLoading ? (
            <div className="skeleton skeleton-value" style={{ marginTop: '4px' }} />
          ) : (
            <div className="kpi-card-value kpi-card-value--status">
              {getWhatsappStatusLabel()}
              {showWhatsappPulse && <span className="pulse-dot" />}
            </div>
          )}
          <div className="kpi-card-description">{getWhatsappDescription()}</div>
          <span className="kpi-card-link">Configurar</span>
        </div>
      </div>

      {/* Details Section */}
      <div className="dashboard-details-grid">
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
