import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Check, AlertCircle, Info } from 'lucide-react';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/errors.js';
import toast from 'react-hot-toast';
import '../styles/portal.css';

interface QuotationItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  notes?: string;
  priceInCents?: number;
  unavailable?: boolean;
}

interface QuotationData {
  companyName: string;
  quotationTitle: string;
  deadline: string;
  daysRemaining: number;
  status: string;
  items: QuotationItem[];
  alreadyResponded: boolean;
  deliveryDays?: number;
  paymentCondition?: string;
  notes?: string;
}

interface ProposalItemInput {
  quotationItemId: string;
  priceInCents: number;
  unavailable: boolean;
}

const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#6366F1', '#A78BFA', '#22C55E', '#F59E0B', '#F43F5E', '#3B82F6', '#EC4899'];
    const newParticles = Array.from({ length: 80 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 2.5;
      const duration = 2 + Math.random() * 2;
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      return {
        id: i,
        style: {
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          transform: `rotate(${Math.random() * 360}deg)`,
        },
      };
    });
    setParticles(newParticles);
  }, []);

  return (
    <>
      {particles.map((p) => (
        <div key={p.id} className="confetti-particle" style={p.style} />
      ))}
    </>
  );
};

export const PortalFornecedor: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [deliveryDays, setDeliveryDays] = useState<number | ''>('');
  const [paymentConditions, setPaymentConditions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [itemsState, setItemsState] = useState<ProposalItemInput[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const isFirstLoad = useRef(true);

  // Fetch initial data
  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        const response = await api.get<QuotationData>(`/portal/${token}`);
        const data = response.data;
        setQuotation(data);

        // Prepopulate items from fetched data
        const initialItemsState: ProposalItemInput[] = data.items.map((item) => ({
          quotationItemId: item.id,
          priceInCents: item.priceInCents ?? 0,
          unavailable: item.unavailable ?? false,
        }));

        if (data.alreadyResponded) {
          setDeliveryDays(data.deliveryDays ?? '');
          setPaymentConditions(
            data.paymentCondition
              ? data.paymentCondition.split(', ').filter(Boolean)
              : [],
          );
          setNotes(data.notes ?? '');
          setItemsState(initialItemsState);
          setSubmitted(true);
        } else {
          // Check local storage for draft response
          const savedStateRaw = localStorage.getItem(`orcalink-proposal-${token}`);
          if (savedStateRaw) {
            try {
              const savedState = JSON.parse(savedStateRaw);
              if (savedState.deliveryDays) setDeliveryDays(savedState.deliveryDays);
              if (savedState.paymentConditions) {
                setPaymentConditions(savedState.paymentConditions);
              } else if (savedState.paymentCondition) {
                setPaymentConditions(savedState.paymentCondition.split(', ').filter(Boolean));
              }
              if (savedState.notes) setNotes(savedState.notes);
              if (savedState.items) {
                // Ensure items match the fetched IDs
                const mergedItems = initialItemsState.map((initItem) => {
                  const savedItem = savedState.items.find(
                    (si: any) => si.quotationItemId === initItem.quotationItemId,
                  );
                  return savedItem ? savedItem : initItem;
                });
                setItemsState(mergedItems);
              }
            } catch (e) {
              console.error('Erro ao carregar dados salvos localmente:', e);
              setItemsState(initialItemsState);
            }
          } else {
            setItemsState(initialItemsState);
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar cotação:', err);
        setErrorMsg(getApiErrorMessage(err, 'Este link de acesso é inválido ou já expirou.'));
      } finally {
        setLoading(false);
        isFirstLoad.current = false;
      }
    };

    if (token) {
      fetchQuotation();
    }
  }, [token]);

  // Auto-save to localStorage
  useEffect(() => {
    if (loading || !quotation || quotation.alreadyResponded || isFirstLoad.current) return;

    const stateToSave = {
      deliveryDays,
      paymentConditions,
      notes,
      items: itemsState,
    };
    localStorage.setItem(`orcalink-proposal-${token}`, JSON.stringify(stateToSave));
  }, [deliveryDays, paymentConditions, notes, itemsState, quotation, loading, token]);

  const handlePriceChange = (itemId: string, rawValue: string) => {
    // Strip non-digits
    const digits = rawValue.replace(/\D/g, '');
    const cents = digits ? parseInt(digits, 10) : 0;

    setItemsState((prev) =>
      prev.map((item) =>
        item.quotationItemId === itemId ? { ...item, priceInCents: cents } : item,
      ),
    );

    // Clear validation error when field is updated
    if (cents > 0 && errors[itemId]) {
      setErrors((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const toggleUnavailable = (itemId: string) => {
    setItemsState((prev) =>
      prev.map((item) => {
        if (item.quotationItemId === itemId) {
          const newUnavailable = !item.unavailable;
          return {
            ...item,
            unavailable: newUnavailable,
            priceInCents: newUnavailable ? 0 : 0, // reset price
          };
        }
        return item;
      }),
    );

    // Clear validation error when marked unavailable
    setErrors((prev) => ({ ...prev, [itemId]: false }));
  };

  const formatDisplay = (cents: number): string => {
    if (!cents) return '';
    return (cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate Progress %
  const calculateProgress = (): number => {
    if (itemsState.length === 0) return 0;
    const answeredCount = itemsState.filter(
      (item) => item.unavailable || item.priceInCents > 0,
    ).length;
    return Math.round((answeredCount / itemsState.length) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quotation?.alreadyResponded || submitting) return;

    // Poka-yoke validation
    const invalidItem = quotation?.items.find((item) => {
      const answer = itemsState.find((it) => it.quotationItemId === item.id);
      if (!answer) return true;
      return (
        !answer.unavailable &&
        (!answer.priceInCents || answer.priceInCents <= 0)
      );
    });

    if (invalidItem) {
      setErrors((prev) => ({ ...prev, [invalidItem.id]: true }));
      // Scroll to invalid item card
      const element = document.getElementById(`item-card-${invalidItem.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Vibrate if browser supports it
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Remove shake animation class after 1s
      setTimeout(() => {
        setErrors((prev) => ({ ...prev, [invalidItem.id]: false }));
      }, 1000);

      toast.error(
        `Preencha o preço do item "${invalidItem.name}" ou marque como "Não tenho".`,
      );
      return;
    }

    if (deliveryDays === '' || deliveryDays <= 0) {
      toast.error('Informe um prazo de entrega válido.');
      return;
    }

    if (paymentConditions.length === 0) {
      toast.error('Selecione pelo menos uma forma de pagamento.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        deliveryDays,
        paymentCondition: paymentConditions.join(', '),
        notes: notes || undefined,
        items: itemsState,
      };

      await api.post(`/portal/${token}`, payload);
      
      // Success Protocol
      setSubmitted(true);
      localStorage.removeItem(`orcalink-proposal-${token}`);
      toast.success('Proposta enviada com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Erro ao enviar proposta.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-loading">
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '480px', padding: '20px' }}>
          <div className="skeleton" style={{ height: '32px', width: '80%', marginBottom: '16px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '20px', width: '50%', marginBottom: '32px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '140px', width: '100%', marginBottom: '24px', borderRadius: '12px' }} />
          <div className="skeleton" style={{ height: '140px', width: '100%', marginBottom: '24px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="portal-error">
        <div className="portal-error-card">
          <AlertCircle size={48} className="portal-error-icon" />
          <h2 className="portal-error-title">Acesso Indisponível</h2>
          <p className="portal-error-message">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="portal-success-container">
        <Confetti />
        <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle className="checkmark-circle" cx="26" cy="26" r="23" fill="none" />
          <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
        <h1 className="success-title">Proposta Enviada!</h1>
        <p className="success-subtitle">
          Sua proposta comercial foi enviada com sucesso para <strong>{quotation?.companyName}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="portal-wrapper">
      <form onSubmit={handleSubmit} className="portal-container" noValidate>
        {/* Header */}
        <header className="portal-header">
          <div className="portal-logo-container">
            <svg className="portal-logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Orçalink</span>
          </div>
          <span className="portal-company-name">{quotation?.companyName}</span>
          <h1 className="portal-quotation-title">{quotation?.quotationTitle}</h1>

          <div className={`portal-deadline-badge ${quotation?.daysRemaining === 0 ? 'danger' : ''}`}>
            <Clock size={16} />
            <span>
              {quotation?.daysRemaining === 0
                ? 'Expira hoje'
                : quotation?.daysRemaining === 1
                ? 'Expira amanhã'
                : `Expira em ${quotation?.daysRemaining} dias`}
            </span>
          </div>
        </header>

        {/* Read-Only Banner */}
        {quotation?.alreadyResponded && (
          <div className="portal-readonly-banner">
            <Info size={18} />
            <span>Você já respondeu a esta cotação. Exibindo em modo de leitura.</span>
          </div>
        )}

        {/* Sticky Progress Bar */}
        {!quotation?.alreadyResponded && (
          <div className="portal-progress-sticky">
            <div className="portal-progress-bar">
              <div className="portal-progress-fill" style={{ width: `${calculateProgress()}%` }} />
            </div>
            <div className="portal-progress-text">
              <span>Progresso do preenchimento</span>
              <span>{calculateProgress()}% concluído</span>
            </div>
          </div>
        )}

        {/* List of Items */}
        {quotation?.items.map((item) => {
          const itemAnswer = itemsState.find((it) => it.quotationItemId === item.id);
          const isUnavailable = itemAnswer?.unavailable ?? false;
          const isInvalid = errors[item.id];

          return (
            <div
              key={item.id}
              id={`item-card-${item.id}`}
              className={`portal-item-card ${isInvalid ? 'shake' : ''}`}
              style={
                isUnavailable
                  ? { backgroundColor: 'var(--neutral-50)', borderColor: 'var(--neutral-200)', opacity: 0.85 }
                  : {}
              }
            >
              <div className="portal-item-header">
                <h3 className="portal-item-name">{item.name}</h3>
              </div>

              {item.notes && <p className="portal-item-notes">{item.notes}</p>}

              <div className="portal-item-meta">
                <div>
                  <span className="portal-item-meta-label">Quantidade:</span>
                  <span className="portal-item-meta-value">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              </div>

              {/* Price Field */}
              <div className="portal-price-field">
                <div className="portal-price-input-wrapper">
                  <span className="portal-price-prefix">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    disabled={isUnavailable || quotation?.alreadyResponded}
                    className="portal-price-input"
                    value={formatDisplay(itemAnswer?.priceInCents ?? 0)}
                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                  />
                </div>
              </div>

              {/* Toggle switch (Não tenho este item) */}
              {!quotation?.alreadyResponded && (
                <button
                  type="button"
                  className={`toggle-unavailable ${isUnavailable ? 'active' : ''}`}
                  onClick={() => toggleUnavailable(item.id)}
                >
                  <span>Não tenho este item</span>
                </button>
              )}
            </div>
          );
        })}

        {/* Conditions Footer Form */}
        <div className="portal-form-footer">
          <h2 className="portal-footer-title">Condições da Proposta</h2>

          <div className="form-group">
            <label className="form-label" htmlFor="deliveryDays">
              Prazo de Entrega (dias úteis)
            </label>
            <input
              id="deliveryDays"
              type="number"
              min="1"
              disabled={quotation?.alreadyResponded}
              className="form-input"
              style={{ height: '44px', fontSize: '15px' }}
              placeholder="Ex: 5"
              value={deliveryDays}
              onChange={(e) =>
                setDeliveryDays(e.target.value ? parseInt(e.target.value, 10) : '')
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Formas de Pagamento Aceitas
            </label>
            <div className="payment-conditions-grid">
              {[
                'Pix à vista',
                'Boleto à vista',
                'Faturado 15 dias',
                'Faturado 30 dias',
                'Faturado 45 dias',
                'Faturado 60 dias',
                'Cartão de Crédito',
              ].map((option) => {
                const isSelected = paymentConditions.includes(option);
                const disabled = quotation?.alreadyResponded;

                return (
                  <div
                    key={option}
                    className={`payment-checkbox-card ${isSelected ? 'selected' : ''} ${
                      disabled ? 'disabled' : ''
                    }`}
                    onClick={() => {
                      if (disabled) return;
                      if (isSelected) {
                        setPaymentConditions(paymentConditions.filter((c) => c !== option));
                      } else {
                        setPaymentConditions([...paymentConditions, option]);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`payment-option-${option.replace(/\s+/g, '-')}`}
                      className="payment-checkbox-input"
                      checked={isSelected}
                      disabled={disabled}
                      readOnly
                    />
                    <label
                      htmlFor={`payment-option-${option.replace(/\s+/g, '-')}`}
                      className="payment-checkbox-label"
                      onClick={(e) => e.preventDefault()} // prevent double toggles
                    >
                      {option}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notes">
              Observações Gerais (opcional)
            </label>
            <textarea
              id="notes"
              rows={3}
              disabled={quotation?.alreadyResponded}
              className="form-input"
              style={{ minHeight: '80px', padding: '12px', fontSize: '15px', fontFamily: 'inherit' }}
              placeholder="Escreva alguma observação ou condição comercial especial..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Sticky bottom submit button */}
        {!quotation?.alreadyResponded && (
          <div className="portal-sticky-bottom">
            <button
              type="submit"
              disabled={submitting}
              className="btn-submit-proposal"
            >
              {submitting ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Check size={18} />
                  <span>Enviar Proposta</span>
                </>
              )}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          🔒 Seus dados comerciais estão protegidos e são privados.
        </div>
      </form>
    </div>
  );
};
