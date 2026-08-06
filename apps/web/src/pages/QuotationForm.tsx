import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Users, Save, Send, Package, MessageCircle, AlertTriangle } from 'lucide-react';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/errors.js';
import { fetchWhatsappStatus, type WhatsappStatus } from '../lib/whatsapp.js';
import { type DispatchChannel } from '../lib/dispatch-channel.js';
import { useAuth } from '../hooks/useAuth.js';
import { SupplierChannelToggle } from '../components/SupplierChannelToggle.js';
import { WhatsappConnectModal } from '../components/WhatsappConnectModal.js';
import toast from 'react-hot-toast';
import '../styles/quotations.css';
import '../styles/suppliers.css';
import '../styles/settings.css';

interface Product {
  id: string;
  name: string;
  unit: string;
  internalCode?: string;
  category: {
    id: string;
    name: string;
  };
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferredChannel?: DispatchChannel;
  categories?: {
    category: {
      id: string;
      name: string;
    };
  }[];
}

interface SelectedItem {
  product: Product;
  quantity: number;
  notes: string;
}

export const QuotationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPro = user?.tenant?.plan === 'PRO';

  // Wizard state
  const [step, setStep] = useState(1);

  // Step 1 states
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

  // Step 2 states
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Step 3 states
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierChannels, setSupplierChannels] = useState<Record<string, DispatchChannel>>({});
  const [filterBySelectedCategories, setFilterBySelectedCategories] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  // Loading/saving states
  const [submitting, setSubmitting] = useState(false);

  // Fetch products and suppliers
  const fetchData = useCallback(async () => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        api.get<{ data: Product[] }>('/products?limit=100'),
        api.get<{ data: Supplier[] }>('/suppliers?limit=100'),
      ]);
      setAllProducts(productsRes.data.data);
      setAllSuppliers(suppliersRes.data.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Não foi possível carregar produtos ou fornecedores.');
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Default deadline to tomorrow at 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    // Format to yyyy-MM-ddThh:mm
    const tzoffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzoffset).toISOString().slice(0, 16);
    setDeadline(localISOTime);
  }, [fetchData]);

  useEffect(() => {
    if (!isPro) {
      setWhatsappStatus(null);
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
      );
  }, [isPro]);

  // Step 1 Validation
  const validateStep1 = () => {
    if (!title.trim()) {
      toast.error('O título da cotação é obrigatório.');
      return false;
    }
    if (!deadline) {
      toast.error('O prazo de resposta é obrigatório.');
      return false;
    }
    if (new Date(deadline) <= new Date()) {
      toast.error('O prazo de resposta deve ser no futuro.');
      return false;
    }
    return true;
  };

  // Step 2: Add item to selection
  const handleAddProduct = (product: Product) => {
    const alreadySelected = selectedItems.some((item) => item.product.id === product.id);
    if (alreadySelected) {
      toast.error('Produto já adicionado.');
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        product,
        quantity: 1,
        notes: '',
      },
    ]);
    setProductSearch('');
    setProductDropdownOpen(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, val: number) => {
    if (isNaN(val) || val < 1) return;
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.floor(val) } : item
      )
    );
  };

  const handleNotesChange = (productId: string, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, notes } : item))
    );
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (selectedItems.length === 0) {
      toast.error('Selecione pelo menos um produto para cotar.');
      return false;
    }
    return true;
  };

  // Step 3 Supplier toggle
  const handleToggleSupplier = (supplierId: string) => {
    const isSelected = selectedSupplierIds.includes(supplierId);

    if (isSelected) {
      setSelectedSupplierIds((prev) => prev.filter((id) => id !== supplierId));
      setSupplierChannels((prev) => {
        const next = { ...prev };
        delete next[supplierId];
        return next;
      });
      return;
    }

    const supplier = allSuppliers.find((item) => item.id === supplierId);
    setSelectedSupplierIds((prev) => [...prev, supplierId]);
    setSupplierChannels((prev) => ({
      ...prev,
      [supplierId]: supplier?.preferredChannel || 'EMAIL',
    }));
  };

  const handleSupplierChannelChange = (
    supplierId: string,
    channel: DispatchChannel,
  ) => {
    setSupplierChannels((prev) => ({
      ...prev,
      [supplierId]: channel,
    }));
  };

  const handleWhatsappConnected = (connectedNumber: string) => {
    setWhatsappStatus({
      state: 'CONNECTED',
      connectedNumber,
      lastConnectedAt: new Date().toISOString(),
    });
    setConnectOpen(false);
  };

  const hasWhatsappChannelSelected = selectedSupplierIds.some(
    (supplierId) => supplierChannels[supplierId] === 'WHATSAPP',
  );

  // Get categories of selected products
  const selectedProductCategoryIds = Array.from(
    new Set(selectedItems.map((item) => item.product.category.id))
  );

  // Filter suppliers by selected product categories
  const displayedSuppliers = allSuppliers.filter((supplier) => {
    if (!filterBySelectedCategories || selectedProductCategoryIds.length === 0) return true;
    
    // Check if supplier has any matching category
    return supplier.categories?.some((sc) =>
      selectedProductCategoryIds.includes(sc.category.id)
    );
  });

  // Submit flow (either DRAFT or DRAFT -> OPEN via publish)
  const handleSubmit = async (shouldPublish: boolean) => {
    if (!validateStep1() || !validateStep2()) return;

    if (selectedSupplierIds.length === 0 && shouldPublish) {
      toast.error('Para publicar a cotação, você deve selecionar pelo menos um fornecedor.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Create quotation
      const quotationRes = await api.post<{ id: string }>('/quotations', {
        title: title.trim(),
        deadline: new Date(deadline).toISOString(),
      });
      const quotationId = quotationRes.data.id;

      // 2. Add products
      for (const item of selectedItems) {
        await api.post(`/quotations/${quotationId}/items`, {
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes.trim() || undefined,
        });
      }

      // 3. Associate suppliers
      if (selectedSupplierIds.length > 0) {
        await api.post(`/quotations/${quotationId}/suppliers`, {
          supplierIds: selectedSupplierIds,
        });

        for (const supplierId of selectedSupplierIds) {
          const channel = supplierChannels[supplierId] || 'EMAIL';
          await api.patch(`/quotations/${quotationId}/suppliers/${supplierId}/channel`, {
            channel,
          });
        }
      }

      // 4. Publish if requested
      if (shouldPublish) {
        await api.post(`/quotations/${quotationId}/publish`);
        toast.success('Cotação criada e publicada! Os convites foram enviados aos fornecedores.');
      } else {
        toast.success('Cotação salva como rascunho com sucesso.');
      }

      navigate(`/dashboard/quotations/${quotationId}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar cotação.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products for dropdown
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      (product.internalCode && product.internalCode.toLowerCase().includes(productSearch.toLowerCase()));
    const alreadySelected = selectedItems.some((item) => item.product.id === product.id);
    return matchesSearch && !alreadySelected;
  });

  return (
    <div className="quotations-page">
      <div className="quotations-page-header" style={{ maxWidth: '800px', margin: '0 auto var(--space-6) auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/dashboard/quotations" className="action-btn" title="Voltar para Cotações">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="quotations-page-title">Nova Cotação</h1>
            <p className="quotations-page-subtitle">Configure as informações da cotação passo a passo.</p>
          </div>
        </div>
      </div>

      <div className="wizard-container">
        {/* Step Indicator Header */}
        <div className="wizard-steps-header">
          <div className={`wizard-step-indicator ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="wizard-step-num">1</span>
            <span>Informações Básicas</span>
          </div>
          <div className={`wizard-step-indicator ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="wizard-step-num">2</span>
            <span>Adicionar Produtos</span>
          </div>
          <div className={`wizard-step-indicator ${step === 3 ? 'active' : ''}`}>
            <span className="wizard-step-num">3</span>
            <span>Selecionar Fornecedores</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="wizard-body">
          {/* STEP 1: Basic details */}
          {step === 1 && (
            <div className="fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="quotation-title">Título da Cotação *</label>
                <input
                  id="quotation-title"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Compra Mensal de Insumos - Junho"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ maxWidth: '300px' }}>
                <label className="form-label" htmlFor="quotation-deadline">Prazo Limite de Resposta *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="quotation-deadline"
                    type="datetime-local"
                    className="form-input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Os fornecedores não poderão mais enviar preços após este prazo.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Add Products */}
          {step === 2 && (
            <div className="fadeIn">
              <label className="form-label">Adicionar Produtos *</label>
              
              {/* Product Autocomplete Search Dropdown */}
              <div className="category-single-select" style={{ marginBottom: 'var(--space-5)' }}>
                <div
                  className="single-select-trigger"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                >
                  <span className="single-select-placeholder">Pesquisar produto pelo nome ou SKU...</span>
                  <Search size={16} className="search-icon" />
                </div>

                {productDropdownOpen && (
                  <div className="single-select-dropdown" style={{ display: 'block' }}>
                    <div className="single-select-search-wrapper" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="single-select-search"
                        placeholder="Digitar nome ou SKU do produto..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="single-select-options-list">
                      {filteredProducts.length === 0 ? (
                        <div className="single-select-no-options">Nenhum produto correspondente disponível</div>
                      ) : (
                        filteredProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="single-select-option"
                            onClick={() => handleAddProduct(prod)}
                          >
                            <span style={{ fontWeight: 600 }}>{prod.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              ({prod.category.name}) {prod.internalCode ? ` - SKU: ${prod.internalCode}` : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Added Products Table/List */}
              {selectedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                  <Package size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhum produto adicionado à cotação.</p>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>
                    Itens da Cotação ({selectedItems.length})
                  </h4>
                  <div className="wizard-items-list">
                    {selectedItems.map((item) => (
                      <div key={item.product.id} className="wizard-item-row">
                        <div className="wizard-item-info">
                          <span className="wizard-item-name">{item.product.name}</span>
                          <div className="wizard-item-meta">
                            <span>Unidade: {item.product.unit} | Categoria: {item.product.category.name}</span>
                          </div>
                        </div>

                        <div className="wizard-item-qty">
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Qtd ({item.product.unit}):</span>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value))}
                            style={{ padding: '6px 10px', height: '32px' }}
                          />
                        </div>

                        <div className="wizard-item-notes">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Obs/Especificação (ex: Sem sal, Marca X)"
                            value={item.notes}
                            onChange={(e) => handleNotesChange(item.product.id, e.target.value)}
                            style={{ padding: '6px 10px', height: '32px' }}
                          />
                        </div>

                        <button
                          type="button"
                          className="action-btn action-btn-danger"
                          title="Remover produto"
                          onClick={() => handleRemoveProduct(item.product.id)}
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Select Suppliers */}
          {step === 3 && (
            <div className="fadeIn">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <label className="form-label" style={{ margin: 0 }}>Selecione os Fornecedores</label>
                
                {/* Filter toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-body)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterBySelectedCategories}
                    onChange={(e) => setFilterBySelectedCategories(e.target.checked)}
                  />
                  <span>Recomendar apenas fornecedores das categorias dos produtos selecionados</span>
                </label>
              </div>

              <p className="quotation-suppliers-intro" style={{ marginTop: 'var(--space-3)' }}>
                Para cada fornecedor selecionado, escolha o canal de envio do convite antes de publicar.
              </p>

              {hasWhatsappChannelSelected && !isPro && (
                <div className="quotation-channel-notice quotation-channel-notice--plan" role="status" style={{ marginTop: 'var(--space-4)' }}>
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div>
                    <p>
                      O envio por WhatsApp está disponível no plano Pro. Fornecedores com canal WhatsApp
                      receberão o convite por e-mail até você fazer upgrade.
                    </p>
                    <Link to="/dashboard/settings" className="quotation-channel-notice-link">
                      Ver configurações e planos
                    </Link>
                  </div>
                </div>
              )}

              {hasWhatsappChannelSelected && isPro && whatsappStatus?.state !== 'CONNECTED' && (
                <div className="quotation-channel-notice quotation-channel-notice--session" role="status" style={{ marginTop: 'var(--space-4)' }}>
                  <MessageCircle size={18} aria-hidden="true" />
                  <div>
                    <p>
                      Conecte seu WhatsApp para enviar convites por este canal. Enquanto não conectar,
                      o sistema usará e-mail automaticamente.
                    </p>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setConnectOpen(true)}
                    >
                      Conectar WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {displayedSuppliers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', marginTop: '16px' }}>
                  <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Nenhum fornecedor encontrado para o filtro ativo.
                  </p>
                  {filterBySelectedCategories && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setFilterBySelectedCategories(false)}
                      style={{ marginTop: 'var(--space-3)' }}
                    >
                      Mostrar todos os fornecedores
                    </button>
                  )}
                </div>
              ) : (
                <div className="wizard-suppliers-grid">
                  {displayedSuppliers.map((supplier) => {
                    const isSelected = selectedSupplierIds.includes(supplier.id);
                    return (
                      <div
                        key={supplier.id}
                        className={`supplier-checkbox-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleSupplier(supplier.id)}
                      >
                        <div className="supplier-card-main">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ marginTop: '3px', pointerEvents: 'none' }}
                          />
                          <div className="supplier-card-info">
                            <span className="supplier-card-name">{supplier.name}</span>
                            <span className="supplier-card-email">{supplier.email}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="supplier-card-channel"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="supplier-card-channel-label">Canal de envio</span>
                            <SupplierChannelToggle
                              supplierName={supplier.name}
                              phone={supplier.phone}
                              channel={supplierChannels[supplier.id] || supplier.preferredChannel || 'EMAIL'}
                              onChange={(channel) => handleSupplierChannelChange(supplier.id, channel)}
                              isPro={isPro}
                              whatsappStatus={whatsappStatus}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 'var(--space-5)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                {selectedSupplierIds.length} fornecedor(es) selecionado(s)
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="form-actions-bar" style={{ padding: 'var(--space-4) var(--space-6)', background: 'var(--neutral-25)' }}>
          {step > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              style={{ marginRight: 'auto' }}
            >
              Anterior
            </button>
          )}

          <Link to="/dashboard/quotations" className="btn-secondary" style={{ display: step === 1 ? 'inline-flex' : 'none' }}>
            Cancelar
          </Link>

          {step < 3 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (step === 1 && validateStep1()) setStep(2);
                if (step === 2 && validateStep2()) setStep(3);
              }}
            >
              Avançar
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
              >
                <Save size={16} />
                <span>Salvar como Rascunho</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
              >
                <Send size={16} />
                <span>{submitting ? 'Salvando...' : 'Publicar Agora'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <WhatsappConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleWhatsappConnected}
      />
    </div>
  );
};
