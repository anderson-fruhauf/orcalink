import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronDown, ArrowLeft, AlertTriangle } from 'lucide-react';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/errors.js';
import toast from 'react-hot-toast';
import '../styles/products.css';

interface Category {
  id: string;
  name: string;
}

interface ProductResponse {
  id: string;
  name: string;
  description?: string;
  unit: string;
  internalCode?: string;
  category: {
    id: string;
    name: string;
  };
}

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('UN');
  const [internalCode, setInternalCode] = useState('');
  
  // Selected category state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // All available categories fetched from API
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);
  
  // Custom single-select dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all categories
  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await api.get<{ data: Category[] }>('/categories?limit=100');
      setAvailableCategories(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast.error('Não foi possível carregar as categorias.');
    }
  }, []);

  // Fetch product data on edit
  const fetchProductData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get<ProductResponse>(`/products/${id}`);
      const data = response.data;
      setName(data.name || '');
      setDescription(data.description || '');
      setUnit(data.unit || 'UN');
      setInternalCode(data.internalCode || '');
      
      if (data.category) {
        setSelectedCategory(data.category);
      }
    } catch {
      toast.error('Erro ao carregar os dados do produto.');
      navigate('/dashboard/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAllCategories();
    if (isEdit) {
      fetchProductData();
    }
  }, [fetchAllCategories, fetchProductData, isEdit]);

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setDropdownOpen(false);
    setCatSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome do produto é obrigatório.');
      return;
    }
    if (!selectedCategory) {
      toast.error('A categoria do produto é obrigatória.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      unit,
      internalCode: internalCode.trim() || undefined,
      categoryId: selectedCategory.id,
    };

    try {
      setSaving(true);
      setLimitExceeded(false);
      if (isEdit) {
        await api.patch(`/products/${id}`, payload);
        toast.success('Produto atualizado com sucesso.');
      } else {
        await api.post('/products', payload);
        toast.success('Produto criado com sucesso.');
      }
      navigate('/dashboard/products');
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setLimitExceeded(true);
        toast.error(getApiErrorMessage(error, 'Limite do plano atingido. Faça upgrade para o plano Pro.'), { duration: 5000 });
      } else {
        toast.error(getApiErrorMessage(error, 'Erro ao salvar o produto.'));
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter categories by search string
  const filteredCategories = availableCategories.filter((cat) =>
    cat.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div style={{
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--primary-500)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="products-page-header" style={{ maxWidth: '680px', margin: '0 auto var(--space-6) auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/dashboard/products" className="action-btn" title="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="products-page-title">
              {isEdit ? 'Editar Produto' : 'Novo Produto'}
            </h1>
            <p className="products-page-subtitle">
              {isEdit ? 'Atualize as informações do produto.' : 'Cadastre um novo produto no seu catálogo.'}
            </p>
          </div>
        </div>
      </div>

      <div className="product-form-container">
        {limitExceeded && (
          <div className="plan-limit-banner">
            <AlertTriangle className="plan-limit-banner-icon" size={20} />
            <div>
              <h4 className="plan-limit-banner-title">Limite de plano atingido</h4>
              <p className="plan-limit-banner-text">
                Você atingiu o limite máximo de 20 produtos cadastrados no plano Free. Faça upgrade para o plano Pro para cadastrar produtos ilimitados.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="product-name">
                Nome do Produto *
              </label>
              <input
                id="product-name"
                type="text"
                className="form-input"
                placeholder="Ex: Arroz Agulhinha Tipo 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus={!isEdit}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="product-unit">
                Unidade de Medida *
              </label>
              <div className="filter-select-wrapper">
                <select
                  id="product-unit"
                  className="filter-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="UN">UN - Unidade</option>
                  <option value="KG">KG - Quilograma</option>
                  <option value="LITRO">LITRO - Litro</option>
                  <option value="CX">CX - Caixa</option>
                  <option value="M">M - Metro</option>
                  <option value="M2">M2 - Metro Quadrado</option>
                  <option value="M3">M3 - Metro Cúbico</option>
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="product-code">
                Código Interno (SKU)
              </label>
              <input
                id="product-code"
                type="text"
                className="form-input"
                placeholder="Ex: PROD-102"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Categoria do Produto *</label>
              <div className="category-single-select" ref={dropdownRef}>
                <div
                  className={`single-select-trigger ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedCategory ? (
                    <span>{selectedCategory.name}</span>
                  ) : (
                    <span className="single-select-placeholder">Selecione uma categoria...</span>
                  )}
                  <ChevronDown size={16} className="select-chevron" />
                </div>

                {dropdownOpen && (
                  <div className="single-select-dropdown">
                    <div className="single-select-search-wrapper" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="single-select-search"
                        placeholder="Pesquisar categoria..."
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="single-select-options-list">
                      {filteredCategories.length === 0 ? (
                        <div className="single-select-no-options">Nenhuma categoria encontrada</div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <div
                            key={cat.id}
                            className={`single-select-option ${selectedCategory?.id === cat.id ? 'selected' : ''}`}
                            onClick={() => handleSelectCategory(cat)}
                          >
                            <span>{cat.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="product-desc">
                Descrição do Produto
              </label>
              <textarea
                id="product-desc"
                className="form-input"
                placeholder="Detalhes ou especificações técnicas do produto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions-bar">
            <Link to="/dashboard/products" className="btn-secondary">
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
