import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, AlertTriangle, Package, ChevronDown } from 'lucide-react';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal.js';
import '../styles/products.css';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  unit: string;
  internalCode?: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
}

interface PaginatedResponse {
  data: Product[];
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

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Fetch categories for the filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<CategoryListResponse>('/categories?limit=100');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar categorias para o filtro:', error);
    }
  }, []);

  // Fetch products list
  const fetchProducts = useCallback(async () => {
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
      const response = await api.get<PaginatedResponse>(`/products?${params.toString()}`);
      setProducts(response.data.data);
      setMeta(response.data.meta);
    } catch {
      toast.error('Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  }, [page, meta.limit, search, selectedCategoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    if (!deletingProduct) return;

    try {
      await api.delete(`/products/${deletingProduct.id}`);
      toast.success('Produto excluído com sucesso.');
      setDeletingProduct(null);
      fetchProducts();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Erro ao excluir produto.';
      toast.error(message);
      setDeletingProduct(null);
    }
  };

  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="products-page">
      <div className="products-page-header">
        <div>
          <h1 className="products-page-title">Produtos</h1>
          <p className="products-page-subtitle">
            Cadastre e gerencie a lista de produtos da empresa.
          </p>
        </div>
        <Link to="/dashboard/products/new" className="btn-primary">
          <Plus size={18} />
          <span>Novo Produto</span>
        </Link>
      </div>

      <div className="products-toolbar">
        <div className="products-filters">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome ou código..."
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
        <span className="products-count">
          {meta.total} {meta.total === 1 ? 'produto' : 'produtos'}
        </span>
      </div>

      {loading ? (
        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Código Interno</th>
                <th>Unidade</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((_, i) => (
                <tr key={i}>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '75%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '40%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '30px' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '60%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '80%' }} />
                  </td>
                  <td>
                    <div className="skeleton skeleton-label" style={{ width: '60px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Package size={40} />
          </div>
          <h3 className="empty-state-title">
            {search || selectedCategoryId
              ? 'Nenhum produto encontrado'
              : 'Nenhum produto cadastrado'}
          </h3>
          <p className="empty-state-description">
            {search || selectedCategoryId
              ? 'Tente ajustar seus filtros ou busca.'
              : 'Cadastre os produtos de sua empresa para poder cotá-los.'}
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
            <Link to="/dashboard/products/new" className="btn-primary">
              <Plus size={18} />
              <span>Cadastrar primeiro produto</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código Interno</th>
                  <th>Unidade</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="td-name">{product.name}</td>
                    <td>
                      {product.internalCode ? (
                        <span className="td-product-code">{product.internalCode}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className="td-product-unit">{product.unit}</span>
                    </td>
                    <td className="td-product-category">{product.category?.name}</td>
                    <td className="td-product-desc" title={product.description || ''}>
                      {product.description || '-'}
                    </td>
                    <td className="td-actions">
                      <Link
                        to={`/dashboard/products/${product.id}/edit`}
                        className="action-btn"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        className="action-btn action-btn-danger"
                        title="Excluir"
                        onClick={() => setDeletingProduct(product)}
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
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        title="Confirmar Exclusão"
      >
        <div className="delete-confirm">
          <div className="delete-confirm-icon">
            <AlertTriangle size={32} />
          </div>
          <p className="delete-confirm-text">
            Tem certeza que deseja excluir o produto{' '}
            <strong>{deletingProduct?.name}</strong>?
          </p>
          <p className="delete-confirm-hint">
            Esta ação excluirá permanentemente o produto. Produtos vinculados a cotações ativas (status OPEN) não podem ser excluídos.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setDeletingProduct(null)}
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
