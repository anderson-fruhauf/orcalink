import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { X, ChevronDown, ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/errors.js';
import toast from 'react-hot-toast';
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

type DispatchChannel = 'EMAIL' | 'WHATSAPP';

interface SupplierResponse {
  id: string;
  name: string;
  document?: string;
  contactName?: string;
  email: string;
  phone?: string;
  preferredChannel?: DispatchChannel;
  categories?: SupplierCategory[];
}

export const SupplierForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [documentVal, setDocumentVal] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<DispatchChannel>('EMAIL');
  
  // Selected categories state (array of Category objects)
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  
  // All available categories fetched from API
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  // Custom multi-select dropdown states
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

  // Fetch supplier data on edit
  const fetchSupplierData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get<SupplierResponse>(`/suppliers/${id}`);
      const data = response.data;
      setName(data.name || '');
      setDocumentVal(data.document ? formatDocument(data.document) : '');
      setContactName(data.contactName || '');
      setEmail(data.email || '');
      setPhone(data.phone ? formatPhone(data.phone) : '');
      setPreferredChannel(data.preferredChannel || 'EMAIL');
      
      if (data.categories) {
        setSelectedCategories(data.categories.map((sc) => sc.category));
      }
    } catch {
      toast.error('Erro ao carregar os dados do fornecedor.');
      navigate('/dashboard/suppliers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllCategories();
      if (isEdit) {
        fetchSupplierData();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAllCategories, fetchSupplierData, isEdit]);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentVal(formatDocument(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategories((prev) => [...prev, category]);
    setCatSearch('');
    // Keep dropdown open for further selections, or close it if desired. Let's keep it open but clear search.
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome do fornecedor é obrigatório.');
      return;
    }
    if (!email.trim()) {
      toast.error('O e-mail é obrigatório.');
      return;
    }

    // Clean masks before sending to backend
    const rawDocument = documentVal.replace(/\D/g, '');
    const rawPhone = phone.replace(/\D/g, '');
    const categoryIds = selectedCategories.map((c) => c.id);

    const payload = {
      name: name.trim(),
      document: rawDocument || undefined,
      contactName: contactName.trim() || undefined,
      email: email.trim(),
      phone: rawPhone || undefined,
      preferredChannel,
      categoryIds,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await api.patch(`/suppliers/${id}`, payload);
        toast.success('Fornecedor atualizado com sucesso.');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Fornecedor criado com sucesso.');
      }
      navigate('/dashboard/suppliers');
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error(getApiErrorMessage(error, 'Limite do plano atingido. Faça upgrade para o plano Pro.'), { duration: 5000 });
      } else {
        toast.error(getApiErrorMessage(error, 'Erro ao salvar o fornecedor.'));
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter options: not already selected and matching the search string
  const filteredOptions = availableCategories.filter((cat) => {
    const isSelected = selectedCategories.some((selected) => selected.id === cat.id);
    const matchesSearch = cat.name.toLowerCase().includes(catSearch.toLowerCase());
    return !isSelected && matchesSearch;
  });

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
    <div className="suppliers-page">
      <div className="suppliers-page-header" style={{ maxWidth: '680px', margin: '0 auto var(--space-6) auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/dashboard/suppliers" className="action-btn" title="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="suppliers-page-title">
              {isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h1>
            <p className="suppliers-page-subtitle">
              {isEdit ? 'Atualize as informações do fornecedor.' : 'Cadastre um novo fornecedor na sua base.'}
            </p>
          </div>
        </div>
      </div>

      <div className="supplier-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label" htmlFor="supplier-name">
                Nome do Fornecedor *
              </label>
              <input
                id="supplier-name"
                type="text"
                className="form-input"
                placeholder="Ex: ACME Ltda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus={!isEdit}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="supplier-document">
                CNPJ ou CPF
              </label>
              <input
                id="supplier-document"
                type="text"
                className="form-input"
                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                value={documentVal}
                onChange={handleDocumentChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="supplier-contact">
                Nome do Contato
              </label>
              <input
                id="supplier-contact"
                type="text"
                className="form-input"
                placeholder="Ex: João Silva"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="supplier-email">
                E-mail *
              </label>
              <input
                id="supplier-email"
                type="email"
                className="form-input"
                placeholder="Ex: contato@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="supplier-phone">
                Telefone
              </label>
              <input
                id="supplier-phone"
                type="text"
                className="form-input"
                placeholder="Ex: (11) 99999-9999"
                value={phone}
                onChange={handlePhoneChange}
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Canal de Envio Preferido</label>
              <div className="channel-toggle channel-toggle--inline" role="group" aria-label="Canal de envio preferido">
                <button
                  type="button"
                  className={`channel-toggle-option ${preferredChannel === 'EMAIL' ? 'active active-email' : ''}`}
                  onClick={() => setPreferredChannel('EMAIL')}
                  aria-pressed={preferredChannel === 'EMAIL'}
                >
                  <Mail size={16} strokeWidth={1.5} />
                  <span>E-mail</span>
                </button>
                <button
                  type="button"
                  className={`channel-toggle-option ${preferredChannel === 'WHATSAPP' ? 'active active-whatsapp' : ''}`}
                  onClick={() => setPreferredChannel('WHATSAPP')}
                  aria-pressed={preferredChannel === 'WHATSAPP'}
                >
                  <MessageCircle size={16} strokeWidth={1.5} />
                  <span>WhatsApp</span>
                </button>
              </div>
              <p className="form-hint">
                Define o canal padrão usado para enviar as cotações a este fornecedor. Pode ser alterado por cotação antes do envio.
              </p>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Categorias Atendidas</label>
              <div className="category-multi-select" ref={dropdownRef}>
                <div
                  className={`multi-select-trigger ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedCategories.length === 0 ? (
                    <span className="multi-select-placeholder">Selecione as categorias...</span>
                  ) : (
                    <div className="multi-select-chips">
                      {selectedCategories.map((cat) => (
                        <span key={cat.id} className="multi-select-chip" onClick={(e) => e.stopPropagation()}>
                          {cat.name}
                          <button
                            type="button"
                            className="multi-select-chip-remove"
                            onClick={() => handleRemoveCategory(cat.id)}
                            title="Remover categoria"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <ChevronDown size={16} className="select-chevron" />
                </div>

                {dropdownOpen && (
                  <div className="multi-select-dropdown">
                    <div className="multi-select-search-wrapper" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="multi-select-search"
                        placeholder="Pesquisar categoria..."
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="multi-select-options-list">
                      {filteredOptions.length === 0 ? (
                        <div className="multi-select-no-options">Nenhuma categoria disponível</div>
                      ) : (
                        filteredOptions.map((cat) => (
                          <div
                            key={cat.id}
                            className="multi-select-option"
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
          </div>

          <div className="form-actions-bar">
            <Link to="/dashboard/suppliers" className="btn-secondary">
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
