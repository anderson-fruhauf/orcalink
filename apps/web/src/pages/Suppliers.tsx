import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, AlertTriangle, Users, ChevronDown } from 'lucide-react';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal.js';
import { formatDocument, formatPhone } from '../utils/masks.js';
import '../styles/suppliers.css';

interface Category {
  id: string;
  name: string;
}

interface SupplierCategory {
  category: {
    id: string;
    name: string;
  };
}

interface Supplier {
  id: string;
  name: string;
  document?: string;
  contactName?: string;
  email: string;
  phone?: string;
  createdAt: string;
  categories?: SupplierCategory[];
}

interface PaginatedResponse {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CategoryListResponse {
  data: Category[];
}

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Fetch categories for the filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<CategoryListResponse>('/categories?limit=100');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar categorias para o filtro:', error);
    }
  }, []);

  // Fetch suppliers list
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(meta.limit));
      if (search) {
        params.set('search', search);
      }
      if (selectedCategoryId) {
        params.set('categoryId', selectedCategoryId);
      }
      const response = await api.get<PaginatedResponse>(`/suppliers?${params.toString()}`);
      setSuppliers(response.data.data);
      setMeta(response.data.meta);
    } catch {
      toast.error('Não foi possível carregar os fornecedores.');
    } finally {
      setLoading(false);
    }
  }, [page, meta.limit, search, selectedCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;

    try {
      await api.delete(`/suppliers/${deletingSupplier.id}`);
      toast.success('Fornecedor excluído com sucesso.');
      setDeletingSupplier(null);
      fetchSuppliers();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Erro ao excluir fornecedor.';
      toast.error(message);
      setDeletingSupplier(null);
    }
  };

  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="suppliers-page">
      <div className="suppliers-page-header">
        <div>
          <h1 className="suppliers-page-title">Fornecedores</h1>
          <p className="suppliers-page-subtitle">
            Gerencie a base de fornecedores parceiros de sua empresa.
          </p>
        </div>
        <Link to="/dashboard/suppliers/new" className="btn-primary">
          <Plus size={18} />
          <span>Novo Fornecedor</span>
        </Link>
      </div>

      <div className="suppliers-toolbar">
        <div className="suppliers-filters">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome, documento, e-mail..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button className="search-btn" onClick={handleSearch}>
              Buscar
            </button>
          </div>

          <div className="filter-select-wrapper">
            <select
              className="filter-select"
              value={selectedCategoryId}
              onChange={handleCategoryChange}
            >
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </div>
        <span className="suppliers-count">
          {meta.total} {meta.total === 1 ? 'fornecedor' : 'fornecedores'}
        </span>
      </div>

      {loading ? (
        <div className="suppliers-table-wrapper">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>CNPJ/CPF</th>
                <th>Contato</th>
                <th>Categorias</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((_, i) => (
                <tr key={i}>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '70%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '50%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '80%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '60%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '60px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={40} />
          </div>
          <h3 className="empty-state-title">
            {search || selectedCategoryId
              ? 'Nenhum fornecedor encontrado'
              : 'Nenhum fornecedor cadastrado'}
          </h3>
          <p className="empty-state-description">
            {search || selectedCategoryId
              ? 'Tente ajustar seus filtros ou busca.'
              : 'Cadastre fornecedores parceiros para convidá-los para cotações.'}
          </p>
          {(search || selectedCategoryId) && (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setSelectedCategoryId('');
                setPage(1);
              }}
            >
              Limpar busca e filtros
            </button>
          )}
          {!search && !selectedCategoryId && !loading && (
            <Link to="/dashboard/suppliers/new" className="btn-primary">
              <Plus size={18} />
              <span>Cadastrar primeiro fornecedor</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="suppliers-table-wrapper">
            <table className="suppliers-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>CNPJ/CPF</th>
                  <th>Contato</th>
                  <th>Categorias</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="td-name">{supplier.name}</td>
                    <td className="td-document">
                      {supplier.document ? formatDocument(supplier.document) : '-'}
                    </td>
                    <td>
                      <div className="td-contact">
                        <span className="td-contact-name">{supplier.contactName || '-'}</span>
                        <span className="td-contact-email">{supplier.email}</span>
                        {supplier.phone && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formatPhone(supplier.phone)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="categories-chips-list">
                        {supplier.categories && supplier.categories.length > 0 ? (
                          supplier.categories.map((sc) => (
                            <span key={sc.category.id} className="category-chip-badge">
                              {sc.category.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhuma</span>
                        )}
                      </div>
                    </td>
                    <td className="td-actions">
                      <Link
                        to={`/dashboard/suppliers/${supplier.id}/edit`}
                        className="action-btn"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        className="action-btn action-btn-danger"
                        title="Excluir"
                        onClick={() => setDeletingSupplier(supplier)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        title="Confirmar Exclusão"
      >
        <div className="delete-confirm">
          <div className="delete-confirm-icon">
            <AlertTriangle size={32} />
          </div>
          <p className="delete-confirm-text">
            Tem certeza que deseja excluir o fornecedor{' '}
            <strong>{deletingSupplier?.name}</strong>?
          </p>
          <p className="delete-confirm-hint">
            Esta ação excluirá permanentemente o fornecedor. Fornecedores com propostas pendentes em cotações ativas (status OPEN) não podem ser excluídos.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setDeletingSupplier(null)}
            >
              Cancelar
            </button>
            <button className="btn-danger" onClick={handleDelete}>
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
