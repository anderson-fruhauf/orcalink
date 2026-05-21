import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  FolderOpen,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import logoIcon from '../assets/logo-icon.svg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const plan = user?.tenant?.plan || 'FREE';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, end: true },
    { name: 'Cotações', path: '/dashboard/quotations', icon: FileText },
    { name: 'Produtos', path: '/dashboard/products', icon: Package },
    { name: 'Fornecedores', path: '/dashboard/suppliers', icon: Users },
    { name: 'Categorias', path: '/dashboard/categories', icon: FolderOpen },
  ];

  return (
    <>
      {/* Sidebar Container */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo and close button for mobile */}
        <div className="sidebar-logo">
          <img src={logoIcon} alt="Orçalink Logo" />
          <span>Orçalink</span>
          <button
            onClick={onClose}
            className="header-hamburger"
            style={{ marginLeft: 'auto', display: isOpen ? 'flex' : 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-group">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-nav-group">
            <NavLink
              to="/dashboard/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Settings />
              <span>Configurações</span>
            </NavLink>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <span
            className={`sidebar-plan-badge ${
              plan === 'PRO' ? 'pro' : 'free'
            }`}
          >
            Plano {plan}
          </span>
        </div>
      </aside>

      {/* Overlay to close drawer on mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
    </>
  );
};
