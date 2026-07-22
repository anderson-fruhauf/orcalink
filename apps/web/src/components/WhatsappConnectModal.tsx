import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from './Modal.js';
import { connectWhatsappStream } from '../lib/whatsapp.js';
import { getApiErrorMessage } from '../lib/errors.js';

const QR_GENERATION_TIMEOUT_MS = 45_000;

interface WhatsappConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (connectedNumber: string) => void;
}

export const WhatsappConnectModal: React.FC<WhatsappConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onConnectedRef = useRef(onConnected);
  const onCloseRef = useRef(onClose);

  onConnectedRef.current = onConnected;
  onCloseRef.current = onClose;

  const startConnection = () => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setReconnecting(false);
    setQrBase64(null);

    let qrTimeout: ReturnType<typeof setTimeout> | undefined;

    const clearQrTimeout = (): void => {
      if (qrTimeout) {
        clearTimeout(qrTimeout);
        qrTimeout = undefined;
      }
    };

    const scheduleQrTimeout = (): void => {
      clearQrTimeout();
      qrTimeout = setTimeout(() => {
        if (controller.signal.aborted) return;
        controller.abort();
        setError('Tempo esgotado ao gerar o QR Code. Tente novamente.');
        setLoading(false);
      }, QR_GENERATION_TIMEOUT_MS);
    };

    scheduleQrTimeout();

    void connectWhatsappStream(
      (event) => {
        if (controller.signal.aborted) return;

        if (event.type === 'QR') {
          clearQrTimeout();
          setQrBase64(event.qrBase64);
          setLoading(false);
          setReconnecting(false);
        }
        if (event.type === 'STATUS' && event.state === 'RECONNECTING') {
          clearQrTimeout();
          setReconnecting(true);
          setLoading(false);
        }
        if (event.type === 'CONNECTED') {
          clearQrTimeout();
          toast.success('WhatsApp conectado com sucesso!');
          onConnectedRef.current(event.connectedNumber);
          onCloseRef.current();
        }
        if (event.type === 'ERROR') {
          clearQrTimeout();
          setError(event.message);
          setLoading(false);
          setReconnecting(false);
        }
      },
      controller.signal,
    )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = getApiErrorMessage(
          err,
          'Não foi possível conectar o WhatsApp.',
        );
        setError(message);
        setLoading(false);
      })
      .finally(() => {
        clearQrTimeout();
      });
  };

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      abortRef.current = null;
      setQrBase64(null);
      setError(null);
      setLoading(false);
      setReconnecting(false);
      return;
    }

    startConnection();

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conectar WhatsApp">
      <div className="whatsapp-connect-modal">
        <div className="whatsapp-connect-icon">
          <Smartphone size={28} strokeWidth={1.5} />
        </div>
        <p className="whatsapp-connect-description">
          Abra o WhatsApp no celular, vá em <strong>Aparelhos conectados</strong> e escaneie o QR Code abaixo.
        </p>

        <div
          className="whatsapp-qr-wrapper"
          aria-live="polite"
          aria-busy={loading || reconnecting}
        >
          {loading && !qrBase64 && (
            <div className="whatsapp-qr-loading">
              <Loader2 size={32} className="whatsapp-spinner" aria-hidden="true" />
              <span>Gerando QR Code...</span>
            </div>
          )}

          {qrBase64 && (
            <div className="whatsapp-qr-stage">
              <img
                src={qrBase64}
                alt="QR Code para conectar WhatsApp ao Orçalink"
                className={`whatsapp-qr-image${reconnecting ? ' whatsapp-qr-image--dimmed' : ''}`}
                width={280}
                height={280}
              />
              {reconnecting && (
                <div className="whatsapp-qr-overlay">
                  <Loader2 size={32} className="whatsapp-spinner" aria-hidden="true" />
                  <span>Confirmando pareamento...</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="whatsapp-connect-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={startConnection}
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        <p className="whatsapp-connect-hint">
          {reconnecting
            ? 'QR escaneado. Aguarde enquanto confirmamos a conexão com o WhatsApp.'
            : 'O QR Code pode ser atualizado automaticamente. Mantenha esta janela aberta até concluir a conexão.'}
        </p>
      </div>
    </Modal>
  );
};
