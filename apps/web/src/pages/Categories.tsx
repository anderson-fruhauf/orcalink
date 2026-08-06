import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, AlertTriangle, FolderOpen } from 'lucide-react';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/errors.js';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal.js';
import '../styles/categories.css';

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: Category[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(meta.limit));
      if (search) {
        params.set('search', search);
      }
      const response = await api.get<PaginatedResponse>(`/categories?${params.toString()}`);
      setCategories(response.data.data);
      setMeta(response.data.meta);
    } catch {
      toast.error('Não foi possível carregar as categorias.');
    } finally {
      setLoading(false);
    }
  }, [page, meta.limit, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setFormSubmitting(true);
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, { name: formName.trim() });
        toast.success('Categoria atualizada com sucesso.');
      } else {
        await api.post('/categories', { name: formName.trim() });
        toast.success('Categoria criada com sucesso.');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar categoria.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await api.delete(`/categories/${deletingCategory.id}`);
      toast.success('Categoria excluída com sucesso.');
      setDeletingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir categoria.'));
      setDeletingCategory(null);
    }
  };

  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="categories-page">
      <div className="categories-page-header">
        <div>
          <h1 className="categories-page-title">Categorias</h1>
          <p className="categories-page-subtitle">
            Gerencie as categorias de produtos e fornecedores.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          <span>Nova Categoria</span>
        </button>
      </div>

      <div className="categories-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar categorias..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button className="search-btn" onClick={handleSearch}>
            Buscar
          </button>
        </div>
        <span className="categories-count">
          {meta.total} {meta.total === 1 ? 'categoria' : 'categorias'}
        </span>
      </div>

      {loading ? (
        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Criada em</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((_, i) => (
                <tr key={i}>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '60%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '60px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FolderOpen size={40} />
          </div>
          <h3 className="empty-state-title">
            {search ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
          </h3>
          <p className="empty-state-description">
            {search
              ? 'Tente ajustar sua busca ou limpar o filtro.'
              : 'Crie categorias para organizar seus produtos e fornecedores.'}
          </p>
          {search && (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
            >
              Limpar busca
            </button>
          )}
          {!search && !loading && (
            <button className="btn-primary" onClick={openCreateModal}>
              <Plus size={18} />
              <span>Criar primeira categoria</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Criada em</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="td-name">{category.name}</td>
                    <td className="td-date">
                      {new Date(category.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="td-actions">
                      <button
                        className="action-btn"
                        title="Editar"
                        onClick={() => openEditModal(category)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="action-btn action-btn-danger"
                        title="Excluir"
                        onClick={() => setDeletingCategory(category)}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <form onSubmit={handleFormSubmit} className="category-form">
          <div className="form-group">
            <label className="form-label" htmlFor="category-name">
              Nome da categoria
            </label>
            <input
              id="category-name"
              type="text"
              className="form-input"
              placeholder="Ex: Material de escritório"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!formName.trim() || formSubmitting}
            >
              {formSubmitting
                ? 'Salvando...'
                : editingCategory
                  ? 'Salvar'
                  : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title="Confirmar Exclusão"
      >
        <div className="delete-confirm">
          <div className="delete-confirm-icon">
            <AlertTriangle size={32} />
          </div>
          <p className="delete-confirm-text">
            Tem certeza que deseja excluir a categoria{' '}
            <strong>{deletingCategory?.name}</strong>?
          </p>
          <p className="delete-confirm-hint">
            Esta ação não poderá ser desfeita. Categorias com produtos ou fornecedores
            vinculados não podem ser excluídas.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setDeletingCategory(null)}
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
