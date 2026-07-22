import React from 'react';
import { WhatsappConnectionCard } from '../components/WhatsappConnectionCard.js';
import '../styles/categories.css';
import '../styles/quotations.css';
import '../styles/settings.css';

export const Settings: React.FC = () => {
  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <div>
          <h1 className="settings-page-title">Configurações</h1>
          <p className="settings-page-subtitle">
            Gerencie integrações e preferências da sua conta.
          </p>
        </div>
      </div>

      <section className="settings-section">
        <h2 className="settings-section-title">Integrações</h2>
        <WhatsappConnectionCard />
      </section>
    </div>
  );
};
