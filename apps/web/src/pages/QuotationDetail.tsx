import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Users, FileText, Send, Lock, Copy, Trash2, Plus, Mail, AlertTriangle } from 'lucide-react';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal.js';
import '../styles/quotations.css';

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
  contactName?: string;
  phone?: string;
}

interface QuotationItem {
  id: string;
  productId: string;
  quantity: number;
  observation?: string;
  product: Product;
}

interface QuotationSupplier {
  id: string;
  supplierId: string;
  responseStatus: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
  sentAt: string;
  supplier: Supplier;
}

interface MagicLink {
  token: string;
  supplierId: string;
  active: boolean;
}

interface ProposalItem {
  id: string;
  productId: string;
  unitPrice: number;
  unavailable: boolean;
  product: Product;
}

interface Proposal {
  id: string;
  supplierId: string;
  deliveryDays?: number;
  paymentTerms?: string;
  notes?: string;
  submittedAt?: string;
  supplier: Supplier;
  items: ProposalItem[];
}

interface QuotationDetailResponse {
  id: string;
  title: string;
  deadline: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  createdAt: string;
  items: QuotationItem[];
  suppliers: QuotationSupplier[];
  proposals: Proposal[];
  magicLinks: MagicLink[];
}

export const QuotationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<QuotationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'suppliers' | 'comparison'>('items');

  // Edit draft states
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isEditingSuppliers, setIsEditingSuppliers] = useState(false);

  const [deletingConfirm, setDeletingConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch quotation details
  const fetchQuotationDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get<QuotationDetailResponse>(`/quotations/${id}`);
      setQuotation(response.data);
      setSelectedSupplierIds(response.data.suppliers.map((s) => s.supplierId));
    } catch {
      toast.error('Não foi possível carregar os detalhes da cotação.');
      navigate('/dashboard/quotations');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Fetch products and suppliers (only if draft)
  const fetchExtraData = useCallback(async () => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        api.get<{ data: Product[] }>('/products?limit=100'),
        api.get<{ data: Supplier[] }>('/suppliers?limit=100'),
      ]);
      setAllProducts(productsRes.data.data);
      setAllSuppliers(suppliersRes.data.data);
    } catch (error) {
      console.error('Erro ao buscar dados adicionais:', error);
    }
  }, []);

  useEffect(() => {
    fetchQuotationDetails();
  }, [fetchQuotationDetails]);

  useEffect(() => {
    if (quotation?.status === 'DRAFT') {
      fetchExtraData();
    }
  }, [quotation?.status, fetchExtraData]);

  // Header Actions
  const handlePublish = async () => {
    if (!quotation) return;
    if (quotation.items.length === 0) {
      toast.error('Adicione pelo menos um produto antes de publicar.');
      return;
    }
    if (quotation.suppliers.length === 0) {
      toast.error('Selecione pelo menos um fornecedor antes de publicar.');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/quotations/${quotation.id}/publish`);
      toast.success('Cotação publicada! Os e-mails de convite foram enviados.');
      fetchQuotationDetails();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao publicar cotação.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      await api.post(`/quotations/${quotation.id}/close`);
      toast.success('Cotação encerrada com sucesso.');
      fetchQuotationDetails();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao encerrar cotação.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      const response = await api.post<{ id: string }>(`/quotations/${quotation.id}/duplicate`);
      toast.success('Cotação duplicada! Direcionando para o novo rascunho...');
      navigate(`/dashboard/quotations/${response.data.id}`);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao duplicar cotação.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      await api.delete(`/quotations/${quotation.id}`);
      toast.success('Cotação excluída com sucesso.');
      setDeletingConfirm(false);
      navigate('/dashboard/quotations');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao excluir cotação.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };



  // Draft Actions: Items
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation || !selectedProductId || itemQty < 1) return;

    try {
      setActionLoading(true);
      await api.post(`/quotations/${quotation.id}/items`, {
        productId: selectedProductId,
        quantity: itemQty,
        notes: itemNotes.trim() || undefined,
      });
      toast.success('Produto adicionado à cotação.');
      setSelectedProductId('');
      setItemQty(1);
      setItemNotes('');
      fetchQuotationDetails();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao adicionar item.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      await api.delete(`/quotations/${quotation.id}/items/${itemId}`);
      toast.success('Item removido da cotação.');
      fetchQuotationDetails();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao remover item.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Draft Actions: Suppliers
  const handleSaveSuppliers = async () => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      await api.post(`/quotations/${quotation.id}/suppliers`, {
        supplierIds: selectedSupplierIds,
      });
      toast.success('Fornecedores associados atualizados com sucesso.');
      setIsEditingSuppliers(false);
      fetchQuotationDetails();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Erro ao atualizar fornecedores.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Active/Open Actions: Suppliers
  const handleCopySupplierLink = (supplierId: string) => {
    if (!quotation) return;
    const qs = quotation.suppliers?.find((s) => s.supplierId === supplierId);
    if (!qs) return;

    const magicLink = quotation.magicLinks?.find(
      (ml) => ml.supplierId === supplierId && ml.active
    );

    if (!magicLink) {
      toast.error('Link de acesso não disponível.');
      return;
    }

    const inviteUrl = `${window.location.origin}/v/${magicLink.token}`;
    
    // Greeting: Use contact name if available, otherwise supplier name
    const greetingName = qs.supplier?.contactName || qs.supplier?.name || 'Fornecedor';
    
    const deadlineStr = new Date(quotation.deadline).toLocaleString('pt-BR');
    
    const message = `Olá, ${greetingName}! Segue o link para responder à nossa cotação ${quotation.title}.
Prazo limite para envio da proposta: ${deadlineStr}.

Acesse pelo link: ${inviteUrl}

Obrigado!`;

    navigator.clipboard.writeText(message);
    toast.success('Mensagem com link copiada para a área de transferência!');
  };

  const handleShareSupplierWhatsApp = (supplierId: string) => {
    if (!quotation) return;
    const qs = quotation.suppliers?.find((s) => s.supplierId === supplierId);
    if (!qs) return;

    const magicLink = quotation.magicLinks?.find(
      (ml) => ml.supplierId === supplierId && ml.active
    );

    if (!magicLink) {
      toast.error('Link de acesso não disponível.');
      return;
    }

    const inviteUrl = `${window.location.origin}/v/${magicLink.token}`;
    
    // Greeting: Use contact name if available, otherwise supplier name
    const greetingName = qs.supplier?.contactName || qs.supplier?.name || 'Fornecedor';
    
    const deadlineStr = new Date(quotation.deadline).toLocaleString('pt-BR');
    
    const message = `Olá, ${greetingName}! Segue o link para responder à nossa cotação *${quotation.title}*.
Prazo limite para envio da proposta: *${deadlineStr}*.

Acesse pelo link: ${inviteUrl}

Obrigado!`;

    const phone = qs.supplier?.phone;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    let whatsappNumber = cleanPhone;
    if (whatsappNumber && whatsappNumber.length <= 11) {
      whatsappNumber = `55${whatsappNumber}`;
    }

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = whatsappNumber 
      ? `https://wa.me/${whatsappNumber}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleResendEmail = async (supplierId: string) => {
    if (!quotation) return;
    try {
      toast.loading('Enviando e-mail...');
      await api.post(`/quotations/${quotation.id}/resend/${supplierId}`);
      toast.dismiss();
      toast.success('E-mail de convite reenviado com sucesso!');
    } catch (error: any) {
      toast.dismiss();
      const message = error?.response?.data?.message || 'Erro ao reenviar e-mail.';
      toast.error(message);
    }
  };

  // Calculate proposal totals
  const getProposalTotal = (proposal: Proposal) => {
    if (!quotation) return 0;
    return proposal.items.reduce((sum, pItem) => {
      if (pItem.unavailable) return sum;
      const qItem = quotation.items.find((qi) => qi.productId === pItem.productId);
      const qty = qItem ? qItem.quantity : 0;
      return sum + pItem.unitPrice * qty;
    }, 0);
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

  const getSupplierResponseBadge = (status: 'PENDING' | 'SUBMITTED' | 'EXPIRED') => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-pending"><span className="badge-dot" />Pendente</span>;
      case 'SUBMITTED':
        return <span className="badge badge-submitted"><span className="badge-dot" />Respondido</span>;
      case 'EXPIRED':
        return <span className="badge badge-expired"><span className="badge-dot" />Expirado</span>;
      default:
        return null;
    }
  };

  if (loading || !quotation) {
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

  const isDraft = quotation.status === 'DRAFT';
  const isOpen = quotation.status === 'OPEN';
  const isClosed = quotation.status === 'CLOSED';

  // Filter products that are not already added
  const availableProducts = allProducts.filter(
    (p) => !quotation.items.some((qi) => qi.productId === p.id)
  );

  return (
    <div className="quotations-page">
      {/* Header */}
      <div className="quotations-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/dashboard/quotations" className="action-btn" title="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1 className="quotations-page-title">{quotation.title}</h1>
              {getStatusBadge(quotation.status)}
            </div>
            <p className="quotations-page-subtitle">
              Criada em {new Date(quotation.createdAt).toLocaleDateString('pt-BR')} | 
              Prazo limite: <span style={{ fontWeight: 600 }}>{new Date(quotation.deadline).toLocaleString('pt-BR')}</span>
            </p>
          </div>
        </div>

        {/* Actions bar based on status */}
        <div className="quotation-detail-header-actions">
          {isDraft && (
            <>
              <button
                className="btn-secondary"
                onClick={() => setDeletingConfirm(true)}
                disabled={actionLoading}
              >
                Excluir
              </button>
              <button
                className="btn-primary"
                onClick={handlePublish}
                disabled={actionLoading}
              >
                <Send size={16} />
                <span>Publicar Cotação</span>
              </button>
            </>
          )}

          {isOpen && (
            <>
              <button
                className="btn-secondary"
                onClick={handleDuplicate}
                disabled={actionLoading}
              >
                Duplicar
              </button>
              <button
                className="btn-danger"
                onClick={handleClose}
                disabled={actionLoading}
              >
                <Lock size={16} />
                <span>Encerrar Cotação</span>
              </button>
            </>
          )}

          {isClosed && (
            <button
              className="btn-primary"
              onClick={handleDuplicate}
              disabled={actionLoading}
            >
              Duplicar Cotação
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="quotations-tabs">
        <button
          className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Itens ({quotation.items.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          Fornecedores ({quotation.suppliers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Comparativo ({quotation.proposals?.length || 0})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="detail-tab-content">
        
        {/* TAB 1: ITEMS */}
        {activeTab === 'items' && (
          <div>
            {/* Inline add item form (if draft) */}
            {isDraft && (
              <form onSubmit={handleAddItem} className="inline-add-item-form">
                <div className="inline-form-field">
                  <label className="form-label" htmlFor="add-item-product">Adicionar Produto</label>
                  <select
                    id="add-item-product"
                    className="form-input"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    <option value="">Selecione um produto...</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) {p.internalCode ? ` - SKU: ${p.internalCode}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inline-form-field inline-form-field-qty">
                  <label className="form-label" htmlFor="add-item-qty">Qtd</label>
                  <input
                    id="add-item-qty"
                    type="number"
                    min="1"
                    className="form-input"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value))}
                    required
                  />
                </div>
                <div className="inline-form-field" style={{ flex: 1.5 }}>
                  <label className="form-label" htmlFor="add-item-notes">Observação</label>
                  <input
                    id="add-item-notes"
                    type="text"
                    className="form-input"
                    placeholder="Especificação do item..."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading || !selectedProductId}
                  style={{ height: '40px', padding: '10px 16px' }}
                >
                  <Plus size={16} />
                  <span>Adicionar</span>
                </button>
              </form>
            )}

            {quotation.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
                <Package size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--text-heading)', marginBottom: '4px' }}>Nenhum item na cotação</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  {isDraft ? 'Adicione produtos acima para compor esta cotação.' : 'Esta cotação não possui itens.'}
                </p>
              </div>
            ) : (
              <div className="products-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>SKU</th>
                      <th>Unidade</th>
                      <th>Quantidade</th>
                      <th>Observação</th>
                      {isDraft && <th className="th-actions">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item) => (
                      <tr key={item.id}>
                        <td className="td-name">{item.product?.name}</td>
                        <td>
                          {item.product?.internalCode ? (
                            <span className="td-product-code">{item.product.internalCode}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span className="td-product-unit">{item.product?.unit}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{item.observation || '-'}</td>
                        {isDraft && (
                          <td className="td-actions">
                            <button
                              type="button"
                              className="action-btn action-btn-danger"
                              title="Remover Item"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={actionLoading}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <div>
            {/* Associated suppliers editing form (if draft) */}
            {isDraft && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                {!isEditingSuppliers ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      Estes fornecedores receberão convites por e-mail para propor preços quando a cotação for publicada.
                    </p>
                    <button className="btn-secondary" onClick={() => setIsEditingSuppliers(true)}>
                      Gerenciar Fornecedores
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>Selecionar Fornecedores</h4>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn-secondary" onClick={() => {
                          setSelectedSupplierIds(quotation.suppliers.map((s) => s.supplierId));
                          setIsEditingSuppliers(false);
                        }}>
                          Cancelar
                        </button>
                        <button className="btn-primary" onClick={handleSaveSuppliers} disabled={actionLoading}>
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                    <div className="wizard-suppliers-grid" style={{ maxHeight: '400px' }}>
                      {allSuppliers.map((supplier) => {
                        const isSelected = selectedSupplierIds.includes(supplier.id);
                        return (
                          <div
                            key={supplier.id}
                            className={`supplier-checkbox-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedSupplierIds((prev) =>
                              prev.includes(supplier.id) ? prev.filter((id) => id !== supplier.id) : [...prev, supplier.id]
                            )}
                          >
                            <input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: 'none' }} />
                            <div className="supplier-card-info">
                              <span className="supplier-card-name">{supplier.name}</span>
                              <span className="supplier-card-email">{supplier.email}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List of associated suppliers (read-only if not editing draft) */}
            {(!isDraft || !isEditingSuppliers) && (
              quotation.suppliers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
                  <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                  <h4 style={{ color: 'var(--text-heading)', marginBottom: '4px' }}>Nenhum fornecedor selecionado</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    {isDraft ? 'Selecione fornecedores clicando em "Gerenciar Fornecedores" acima.' : 'Não há fornecedores nesta cotação.'}
                  </p>
                </div>
              ) : (
                <div className="products-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>Fornecedor</th>
                        <th>Contato</th>
                        <th>E-mail</th>
                        <th>Status Convite</th>
                        {!isDraft && <th className="th-actions" style={{ width: '150px' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.suppliers.map((qs) => (
                        <tr key={qs.id}>
                          <td className="td-name">{qs.supplier?.name}</td>
                          <td>{qs.supplier?.contactName || '-'}</td>
                          <td>{qs.supplier?.email}</td>
                          <td>{getSupplierResponseBadge(qs.responseStatus)}</td>
                          {!isDraft && (
                            <td className="td-actions">
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="action-btn"
                                  title="Copiar Link de Acesso"
                                  onClick={() => handleCopySupplierLink(qs.supplierId)}
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="action-btn action-btn-whatsapp"
                                  title="Compartilhar no WhatsApp"
                                  onClick={() => handleShareSupplierWhatsApp(qs.supplierId)}
                                >
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                </button>
                                {isOpen && qs.responseStatus === 'PENDING' && (
                                  <button
                                    type="button"
                                    className="action-btn"
                                    title="Reenviar e-mail de convite"
                                    onClick={() => handleResendEmail(qs.supplierId)}
                                  >
                                    <Mail size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 3: COMPARATIVE */}
        {activeTab === 'comparison' && (
          <div>
            {!quotation.proposals || quotation.proposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
                <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--text-heading)', marginBottom: '4px' }}>Nenhuma proposta recebida</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  {isDraft ? 'Aguardando publicação para poder receber propostas.' : 'Nenhum fornecedor respondeu a esta cotação ainda.'}
                </p>
              </div>
            ) : (
              <div className="comparative-list">
                {quotation.proposals.map((proposal) => {
                  const totalCents = getProposalTotal(proposal);
                  return (
                    <div key={proposal.id} className="comparative-supplier-row">
                      <div className="comparative-supplier-header">
                        <div>
                          <span className="comparative-supplier-name">{proposal.supplier?.name}</span>
                          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {proposal.deliveryDays && <span>Prazo: {proposal.deliveryDays} dias úteis</span>}
                            {proposal.paymentTerms && <span>Pagamento: {proposal.paymentTerms}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Total Proposta</span>
                          <span className="comparative-supplier-total">
                            {(totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>

                      {/* Item list inside proposal */}
                      <table className="comparative-supplier-items-table">
                        <tbody>
                          {proposal.items.map((pItem) => {
                            const qItem = quotation.items.find((qi) => qi.productId === pItem.productId);
                            const qty = qItem ? qItem.quantity : 0;
                            return (
                              <tr key={pItem.id}>
                                <td style={{ width: '40%' }}>{pItem.product?.name}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                  Qtd: {qty} {pItem.product?.unit}
                                </td>
                                <td>
                                  {pItem.unavailable ? (
                                    <span className="comparative-price unavailable">Não atende</span>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                      <span className="comparative-price">
                                        {(pItem.unitPrice / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {pItem.product?.unit}
                                      </span>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        Subtotal: {((pItem.unitPrice * qty) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {proposal.notes && (
                        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--neutral-50)', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                          <strong>Observações do fornecedor:</strong> {proposal.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingConfirm}
        onClose={() => setDeletingConfirm(false)}
        title="Excluir Cotação"
      >
        <div className="delete-confirm">
          <div className="delete-confirm-icon">
            <AlertTriangle size={32} />
          </div>
          <p className="delete-confirm-text">
            Tem certeza de que deseja excluir a cotação <strong>{quotation.title}</strong>?
          </p>
          <p className="delete-confirm-hint">
            Esta ação excluirá permanentemente o rascunho. Esta operação não poderá ser desfeita.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setDeletingConfirm(false)}
              disabled={actionLoading}
            >
              Cancelar
            </button>
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Excluindo...' : 'Excluir Rascunho'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
