import React from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import {
  type DispatchChannel,
  getWhatsappDisableMessage,
  getWhatsappDisableReason,
} from '../lib/dispatch-channel.js';
import type { WhatsappStatus } from '../lib/whatsapp.js';

interface SupplierChannelToggleProps {
  supplierName: string;
  phone?: string;
  channel: DispatchChannel;
  onChange: (channel: DispatchChannel) => void;
  isPro: boolean;
  whatsappStatus: WhatsappStatus | null;
  disabled?: boolean;
}

export const SupplierChannelToggle: React.FC<SupplierChannelToggleProps> = ({
  supplierName,
  phone,
  channel,
  onChange,
  isPro,
  whatsappStatus,
  disabled = false,
}) => {
  const disableReason = getWhatsappDisableReason(isPro, whatsappStatus, phone);

  return (
    <div
      className="channel-toggle"
      role="group"
      aria-label={`Canal de envio para ${supplierName}`}
    >
      <button
        type="button"
        className={`channel-toggle-option ${channel === 'EMAIL' ? 'active active-email' : ''}`}
        aria-pressed={channel === 'EMAIL'}
        disabled={disabled}
        onClick={() => onChange('EMAIL')}
      >
        <Mail size={14} strokeWidth={1.5} aria-hidden="true" />
        E-mail
      </button>
      <button
        type="button"
        className={`channel-toggle-option ${channel === 'WHATSAPP' ? 'active active-whatsapp' : ''}`}
        aria-pressed={channel === 'WHATSAPP'}
        disabled={disabled || disableReason !== null}
        title={
          disableReason
            ? getWhatsappDisableMessage(disableReason, supplierName)
            : undefined
        }
        onClick={() => onChange('WHATSAPP')}
      >
        <MessageCircle size={14} strokeWidth={1.5} aria-hidden="true" />
        WhatsApp
      </button>
    </div>
  );
};
