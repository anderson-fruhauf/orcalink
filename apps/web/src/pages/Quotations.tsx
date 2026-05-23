import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar, Package, Users, FileText } from 'lucide-react';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import '../styles/quotations.css';

interface Quotation {
  id: string;
  title: string;
  deadline: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  createdAt: string;
  _count?: {
    items: number;
    suppliers: number;
  };
}

interface PaginatedResponse {
  data: Quotation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const Quotations: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 12, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'OPEN' | 'CLOSED'>('ALL');
  const [page, setPage] = useState(1);

  // Fetch quotations list
  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(meta.limit));
      if (search) {
        params.set('search', search);
      }
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      const response = await api.get<PaginatedResponse>(`/quotations?${params.toString()}`);
      setQuotations(response.data.data);
      setMeta(response.data.meta);
    } catch {
      toast.error('Não foi possível carregar as cotações.');
    } finally {
      setLoading(false);
    }
  }, [page, meta.limit, search, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTabChange = (status: 'ALL' | 'DRAFT' | 'OPEN' | 'CLOSED') => {
    setStatusFilter(status);
    setPage(1);
  };

  const getStatusBadge = (status: 'DRAFT' | 'OPEN' | 'CLOSED') => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge badge-draft">Rascunho</span>;
      case 'OPEN':
        return <span className="badge badge-open"><span className="badge-dot" style={{ background: 'var(--primary-500)' }} />Aberta</span>;
      case 'CLOSED':
        return <span className="badge badge-closed">Encerrada</span>;
      default:
        return null;
    }
  };

  const skeletonCards = Array.from({ length: 6 });

  return (
    <div className="quotations-page">
      <div className="quotations-page-header">
        <div>
          <h1 className="quotations-page-title">Cotações</h1>
          <p className="quotations-page-subtitle">
            Gerencie suas cotações de compra e envie propostas para seus fornecedores.
          </p>
        </div>
        <Link to="/dashboard/quotations/new" className="btn-primary">
          <Plus size={18} />
          <span>Nova Cotação</span>
        </Link>
      </div>

      {/* Tabs Filter */}
      <div className="quotations-tabs">
        <button
          className={`tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => handleTabChange('ALL')}
        >
          Todas
        </button>
        <button
          className={`tab-btn ${statusFilter === 'DRAFT' ? 'active' : ''}`}
          onClick={() => handleTabChange('DRAFT')}
        >
          Rascunhos
        </button>
        <button
          className={`tab-btn ${statusFilter === 'OPEN' ? 'active' : ''}`}
          onClick={() => handleTabChange('OPEN')}
        >
          Abertas
        </button>
        <button
          className={`tab-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
          onClick={() => handleTabChange('CLOSED')}
        >
          Encerradas
        </button>
      </div>

      {/* Toolbar */}
      <div className="products-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por título..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button className="search-btn" onClick={handleSearch}>
            Buscar
          </button>
        </div>
        <span className="products-count">
          {meta.total} {meta.total === 1 ? 'cotação' : 'cotações'}
        </span>
      </div>

      {loading ? (
        <div className="quotations-grid">
          {skeletonCards.map((_, i) => (
            <div key={i} className="quotation-card" style={{ cursor: 'default' }}>
              <div>
                <div className="skeleton skeleton-label" style={{ width: '40%', marginBottom: '12px' }} />
                <div className="skeleton skeleton-label" style={{ width: '80%', height: '20px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-label" style={{ width: '60%', marginBottom: '8px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }}>
                <div className="skeleton skeleton-label" style={{ width: '60px' }} />
                <div className="skeleton skeleton-label" style={{ width: '80px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : quotations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={40} />
          </div>
          <h3 className="empty-state-title">
            {search || statusFilter !== 'ALL'
              ? 'Nenhuma cotação encontrada'
              : 'Nenhuma cotação cadastrada'}
          </h3>
          <p className="empty-state-description">
            {search || statusFilter !== 'ALL'
              ? 'Tente ajustar seus filtros ou busca.'
              : 'Crie uma nova cotação, adicione produtos e selecione fornecedores para receber propostas de preço.'}
          </p>
          {(search || statusFilter !== 'ALL') && (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setStatusFilter('ALL');
                setPage(1);
              }}
            >
              Limpar busca e filtros
            </button>
          )}
          {!search && statusFilter === 'ALL' && !loading && (
            <Link to="/dashboard/quotations/new" className="btn-primary">
              <Plus size={18} />
              <span>Criar primeira cotação</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="quotations-grid">
            {quotations.map((quotation) => (
              <div
                key={quotation.id}
                className="quotation-card"
                onClick={() => navigate(`/dashboard/quotations/${quotation.id}`)}
              >
                <div>
                  <div className="quotation-card-header">
                    {getStatusBadge(quotation.status)}
                    <span className="quotation-card-meta-item" style={{ margin: 0 }}>
                      <Calendar size={13} />
                      {new Date(quotation.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h3 className="quotation-card-title">{quotation.title}</h3>
                </div>

                <div className="quotation-card-body">
                  <div className="quotation-card-meta-item">
                    <span style={{ fontWeight: 500 }}>Prazo de Resposta:</span>
                    <span>{new Date(quotation.deadline).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="quotation-card-footer">
                  <div className="quotation-card-stats">
                    <div className="quotation-card-stat" title="Produtos associados">
                      <Package size={14} className="search-icon" />
                      <span>{quotation._count?.items || 0} itens</span>
                    </div>
                    <div className="quotation-card-stat" title="Fornecedores convidados">
                      <Users size={14} className="search-icon" />
                      <span>{quotation._count?.suppliers || 0} forn.</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--primary-500)', fontWeight: 600 }}>
                    Ver Detalhes →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {meta.page} de {meta.totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
