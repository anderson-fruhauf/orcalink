import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada.');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erro ao sair da conta.');
    }
  };

  // Generate breadcrumb items from location path
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    
    // Map paths to friendly Portuguese labels
    const labelMap: Record<string, string> = {
      dashboard: 'Dashboard',
      products: 'Produtos',
      suppliers: 'Fornecedores',
      categories: 'Categorias',
      quotations: 'Cotações',
      settings: 'Configurações',
    };

    return pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`;
      const isLast = index === pathnames.length - 1;
      const label = labelMap[value] || value;

      return (
        <React.Fragment key={to}>
          {index > 0 && <span className="breadcrumb-separator">/</span>}
          {isLast ? (
            <span className="breadcrumb-current">{label}</span>
          ) : (
            <Link to={to}>{label}</Link>
          )}
        </React.Fragment>
      );
    });
  };

  const name = user?.backendUser?.name || user?.firebaseUser?.displayName || 'Usuário';

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button onClick={onMenuClick} className="header-hamburger" title="Abrir menu">
          <Menu size={20} />
        </button>
        <div className="header-breadcrumb">{getBreadcrumbs()}</div>
      </div>

      <div className="header-right">
        <span className="header-user-name">Olá, {name}</span>
        <button
          onClick={handleLogout}
          className="header-logout-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};
