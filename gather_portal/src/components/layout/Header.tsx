import React from 'react';
import { useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const location = useLocation();
  
  // Get page title from current path
  const getPageTitle = () => {
    const path = location.pathname.slice(1); // Remove leading slash
    if (!path || path === 'dashboard') return 'Dashboard';
    
    // Convert path to title (e.g., 'puzzle-weeks' -> 'Puzzle Weeks')
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <header className="header">
      <div className="header-content">
        <h2 className="header-title">{getPageTitle()}</h2>
        <div className="header-actions">
          <span className="header-user">Admin User</span>
        </div>
      </div>
    </header>
  );
}

