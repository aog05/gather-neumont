import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Player } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import './PlayerList.css';

export default function PlayerList() {
  const { data: players, loading, error, refresh } = useCollection<Player>(COLLECTIONS.PLAYER);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const columns: Column<Player>[] = [
    {
      key: 'Username',
      label: 'Username',
    },
    {
      key: 'RealName',
      label: 'Real Name',
    },
    {
      key: 'Email',
      label: 'Email',
    },
    {
      key: 'Wallet',
      label: 'Points',
      render: (player) => (
        <span className="player-points">{parseInt(player.Wallet, 10) || 0}</span>
      ),
    },
    {
      key: 'ActiveQuests',
      label: 'Active Quests',
      render: (player) => player.ActiveQuests?.length || 0,
    },
    {
      key: 'CompletedQuests',
      label: 'Completed Quests',
      render: (player) => player.CompletedQuests?.length || 0,
    },
  ];

  const handleRowClick = (player: Player) => {
    setSelectedPlayer(player);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPlayer(null);
  };

  if (error) {
    return (
      <Card title="Players">
        <div className="error-message">
          <p>Error loading players: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Players"
        actions={
          <Button onClick={refresh} size="sm">
            🔄 Refresh
          </Button>
        }
      >
        <DataTable
          data={players}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No players found"
        />
      </Card>

      {selectedPlayer && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          title={`Player: ${selectedPlayer.Username}`}
          size="lg"
        >
          <div className="player-detail">
            <div className="player-detail-section">
              <h4 className="player-detail-heading">Basic Information</h4>
              <div className="player-detail-grid">
                <div className="player-detail-item">
                  <span className="player-detail-label">Username:</span>
                  <span className="player-detail-value">{selectedPlayer.Username}</span>
                </div>
                <div className="player-detail-item">
                  <span className="player-detail-label">Real Name:</span>
                  <span className="player-detail-value">{selectedPlayer.RealName}</span>
                </div>
                <div className="player-detail-item">
                  <span className="player-detail-label">Email:</span>
                  <span className="player-detail-value">{selectedPlayer.Email}</span>
                </div>
                <div className="player-detail-item">
                  <span className="player-detail-label">Points:</span>
                  <span className="player-detail-value player-points">
                    {parseInt(selectedPlayer.Wallet, 10) || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="player-detail-section">
              <h4 className="player-detail-heading">Quest Progress</h4>
              <div className="player-detail-grid">
                <div className="player-detail-item">
                  <span className="player-detail-label">Active Quests:</span>
                  <span className="player-detail-value">
                    {selectedPlayer.ActiveQuests?.length || 0}
                  </span>
                </div>
                <div className="player-detail-item">
                  <span className="player-detail-label">Completed Quests:</span>
                  <span className="player-detail-value">
                    {selectedPlayer.CompletedQuests?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="player-detail-section">
              <h4 className="player-detail-heading">Cosmetics</h4>
              <p className="player-detail-value">
                {selectedPlayer.OwnedCosmetics?.length || 0} items owned
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

