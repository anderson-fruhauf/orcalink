import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.js';
import { WhatsappConnectModal } from './WhatsappConnectModal.js';
import { Modal } from './Modal.js';
import {
  disconnectWhatsapp,
  fetchWhatsappStatus,
  type WhatsappStatus,
} from '../lib/whatsapp.js';
import { getApiErrorMessage } from '../lib/errors.js';

function formatPhoneDisplay(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (digits.length >= 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return number;
}

function renderStatusBadge(status: WhatsappStatus['state']) {
  switch (status) {
    case 'CONNECTED':
      return (
        <span className="badge badge-submitted">
          <span className="badge-dot" />
          Conectado
        </span>
      );
    case 'QR_PENDING':
      return (
        <span className="badge badge-pending">
          <span className="badge-dot" />
          Aguardando leitura
        </span>
      );
    case 'ERROR':
      return (
        <span className="badge badge-expired">
          <span className="badge-dot" />
          Erro
        </span>
      );
    default:
      return (
        <span className="badge badge-draft">
          <span className="badge-dot" style={{ background: 'var(--neutral-400)' }} />
          Desconectado
        </span>
      );
  }
}

interface WhatsappConnectionCardProps {
  /** Remove limite de largura — ideal para grid do dashboard */
  fullWidth?: boolean;
  /** Exibe link para a página de configurações */
  showSettingsLink?: boolean;
}

export const WhatsappConnectionCard: React.FC<WhatsappConnectionCardProps> = ({
  fullWidth = false,
  showSettingsLink = false,
}) => {
  const { user } = useAuth();
  const isPro = user?.tenant?.plan === 'PRO';

  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!isPro) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchWhatsappStatus();
      setStatus(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar o status do WhatsApp.'));
      setStatus({
        state: 'DISCONNECTED',
        connectedNumber: null,
        lastConnectedAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, [isPro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStatus]);

  const handleConnected = (connectedNumber: string) => {
    setStatus({
      state: 'CONNECTED',
      connectedNumber,
      lastConnectedAt: new Date().toISOString(),
    });
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const data = await disconnectWhatsapp();
      setStatus(data);
      setConfirmDisconnect(false);
      toast.success('WhatsApp desconectado.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao desconectar o WhatsApp.'));
    } finally {
      setDisconnecting(false);
    }
  };

  const showReconnect =
    status?.state === 'DISCONNECTED' ||
    status?.state === 'ERROR' ||
    status?.state === 'QR_PENDING';

  return (
    <>
      <div
        className={`integration-card${fullWidth ? ' integration-card--full' : ''}`}
      >
        <div className="integration-card-header">
          <div className="integration-card-icon whatsapp">
            <MessageCircle size={22} strokeWidth={1.5} />
          </div>
          <div className="integration-card-info">
            <h3 className="integration-card-title">WhatsApp</h3>
            <p className="integration-card-description">
              Conecte seu número para enviar cotações por WhatsApp com fallback automático para e-mail.
            </p>
          </div>
          {!loading && isPro && status && (
            <div className="integration-card-status">
              {renderStatusBadge(status.state)}
            </div>
          )}
        </div>

        <div className="integration-card-body">
          {!isPro ? (
            <div className="integration-plan-notice">
              <p>
                O envio por WhatsApp está disponível no plano Pro.
                Faça upgrade para conectar seu número.
              </p>
            </div>
          ) : loading ? (
            <div className="integration-loading">
              <div
                className="skeleton skeleton-label"
                style={{ width: '180px', height: '20px' }}
              />
            </div>
          ) : (
            <>
              {status?.state === 'CONNECTED' && status.connectedNumber && (
                <div className="integration-connected-info">
                  <Smartphone size={16} strokeWidth={1.5} />
                  <span>Número conectado: {formatPhoneDisplay(status.connectedNumber)}</span>
                </div>
              )}

              <div className="integration-card-actions">
                {showReconnect && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setConnectOpen(true)}
                  >
                    {status?.state === 'ERROR' || status?.state === 'QR_PENDING'
                      ? 'Reconectar WhatsApp'
                      : 'Conectar WhatsApp'}
                  </button>
                )}

                {status?.state === 'CONNECTED' && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setConfirmDisconnect(true)}
                  >
                    Desconectar
                  </button>
                )}

                {showSettingsLink && (
                  <Link to="/dashboard/settings" className="btn-secondary">
                    Configurações
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <WhatsappConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleConnected}
      />

      <Modal
        isOpen={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Desconectar WhatsApp"
      >
        <div className="delete-confirm">
          <p className="delete-confirm-text">
            Tem certeza que deseja desconectar o WhatsApp?
          </p>
          <p className="delete-confirm-hint">
            Será necessário escanear um novo QR Code para reconectar. Envios pendentes usarão e-mail como fallback.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setConfirmDisconnect(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
            >
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
