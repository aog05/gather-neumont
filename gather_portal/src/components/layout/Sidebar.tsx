import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/players', label: 'Players', icon: '👥' },
    { path: '/npcs', label: 'NPCs', icon: '🤖' },
    { path: '/dialogue', label: 'Dialogue', icon: '💬' },
    { path: '/quests', label: 'Quests', icon: '⚔️' },
    { path: '/puzzles', label: 'Puzzles', icon: '🧩' },
    { path: '/puzzle-weeks', label: 'Puzzle Weeks', icon: '📅' },
    { path: '/cosmetics', label: 'Cosmetics', icon: '👕' },
    { path: '/skills', label: 'Skills', icon: '🌟' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">NEUMONT</h1>
        <p className="sidebar-subtitle">Admin Portal</p>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

