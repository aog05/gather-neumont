import React from 'react';
import './Dashboard.css';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <h1 className="dashboard-title">Welcome to Neumont Admin Portal</h1>
        <p className="dashboard-subtitle">
          Manage your virtual campus content, users, and analytics
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-icon">👥</div>
          <h3 className="dashboard-card-title">Players</h3>
          <p className="dashboard-card-value">-</p>
          <p className="dashboard-card-label">Total Users</p>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon">🤖</div>
          <h3 className="dashboard-card-title">NPCs</h3>
          <p className="dashboard-card-value">-</p>
          <p className="dashboard-card-label">Active NPCs</p>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon">⚔️</div>
          <h3 className="dashboard-card-title">Quests</h3>
          <p className="dashboard-card-value">-</p>
          <p className="dashboard-card-label">Available Quests</p>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon">🧩</div>
          <h3 className="dashboard-card-title">Puzzles</h3>
          <p className="dashboard-card-value">-</p>
          <p className="dashboard-card-label">Daily Challenges</p>
        </div>
      </div>

      <div className="dashboard-info">
        <div className="dashboard-info-card">
          <h3 className="dashboard-info-title">🚀 Getting Started</h3>
          <ul className="dashboard-info-list">
            <li>Use the sidebar to navigate between different collection managers</li>
            <li>Each manager provides full CRUD operations for its collection</li>
            <li>Data is synced in real-time with Firebase Firestore</li>
            <li>All changes are logged for audit purposes</li>
          </ul>
        </div>

        <div className="dashboard-info-card">
          <h3 className="dashboard-info-title">📊 Collections</h3>
          <ul className="dashboard-info-list">
            <li><strong>Players:</strong> Manage user profiles, points, and progress</li>
            <li><strong>NPCs:</strong> Create and configure non-player characters</li>
            <li><strong>Dialogue:</strong> Build conversation trees</li>
            <li><strong>Quests:</strong> Design missions and rewards</li>
            <li><strong>Puzzles:</strong> Create daily challenges</li>
            <li><strong>Cosmetics:</strong> Manage avatar items</li>
            <li><strong>Skills:</strong> Configure skill tree items</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

