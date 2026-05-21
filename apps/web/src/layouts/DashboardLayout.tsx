import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar.js';
import { Header } from '../components/Header.js';
import '../styles/dashboard.css';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      <div className="dashboard-main">
        <Header onMenuClick={toggleSidebar} />
        
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
