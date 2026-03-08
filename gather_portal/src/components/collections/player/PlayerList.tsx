import React, { useState, useMemo } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Player, Quest, Cosmetic } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import SearchBar from '../../shared/SearchBar';
import './PlayerList.css';

export default function PlayerList() {
  const { data: players, loading, error, refresh } = useCollection<Player>(COLLECTIONS.PLAYER);
  const { data: quests } = useCollection<Quest>(COLLECTIONS.QUEST);
  const { data: cosmetics } = useCollection<Cosmetic>(COLLECTIONS.COSMETIC);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Get quest by ID
   */
  const getQuestById = (questId: string): Quest | undefined => {
    return quests.find((q) => q.id === questId);
  };

  /**
   * Get cosmetic by ID
   */
  const getCosmeticById = (cosmeticId: string): Cosmetic | undefined => {
    return cosmetics.find((c) => c.id === cosmeticId);
  };

  /**
   * Get display name for a quest
   */
  const getQuestName = (quest: Quest): string => {
    return quest.Title || quest.id || 'Unnamed Quest';
  };

  /**
   * Get display name for a cosmetic
   */
  const getCosmeticName = (cosmetic: Cosmetic): string => {
    return cosmetic.Name || cosmetic.id || 'Unnamed Cosmetic';
  };

  /**
   * Filter players based on search query
   */
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;

    const query = searchQuery.toLowerCase();
    return players.filter((player) => {
      const username = player.Username?.toLowerCase() || '';
      const email = player.Email?.toLowerCase() || '';
      const id = player.id?.toLowerCase() || '';

      return username.includes(query) || email.includes(query) || id.includes(query);
    });
  }, [players, searchQuery]);

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
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search players by username, email, or ID..."
        />
        <DataTable
          data={filteredPlayers}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage={searchQuery ? "No players match your search" : "No players found"}
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
              <h4 className="player-detail-heading">Active Quests</h4>
              {selectedPlayer.ActiveQuests && selectedPlayer.ActiveQuests.length > 0 ? (
                <ul className="player-quest-list">
                  {selectedPlayer.ActiveQuests.map((questId, index) => {
                    const quest = getQuestById(questId);
                    return (
                      <li key={index} className="player-quest-item">
                        {quest ? (
                          <>
                            <span className="player-quest-name">{getQuestName(quest)}</span>
                            <span className="player-quest-id">({quest.id})</span>
                          </>
                        ) : (
                          <span className="player-quest-missing">⚠️ Missing: {questId}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="player-detail-empty">No active quests</p>
              )}
            </div>

            <div className="player-detail-section">
              <h4 className="player-detail-heading">Completed Quests</h4>
              {selectedPlayer.CompletedQuests && selectedPlayer.CompletedQuests.length > 0 ? (
                <ul className="player-quest-list">
                  {selectedPlayer.CompletedQuests.map((questId, index) => {
                    const quest = getQuestById(questId);
                    return (
                      <li key={index} className="player-quest-item">
                        {quest ? (
                          <>
                            <span className="player-quest-name">{getQuestName(quest)}</span>
                            <span className="player-quest-id">({quest.id})</span>
                          </>
                        ) : (
                          <span className="player-quest-missing">⚠️ Missing: {questId}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="player-detail-empty">No completed quests</p>
              )}
            </div>

            <div className="player-detail-section">
              <h4 className="player-detail-heading">Owned Cosmetics</h4>
              {selectedPlayer.OwnedCosmetics && selectedPlayer.OwnedCosmetics.length > 0 ? (
                <ul className="player-cosmetic-list">
                  {selectedPlayer.OwnedCosmetics.map((cosmeticId, index) => {
                    const cosmetic = getCosmeticById(cosmeticId);
                    return (
                      <li key={index} className="player-cosmetic-item">
                        {cosmetic ? (
                          <>
                            <span className="player-cosmetic-name">{getCosmeticName(cosmetic)}</span>
                            <span className="player-cosmetic-type">({cosmetic.Type})</span>
                            <span className="player-cosmetic-id">{cosmetic.id}</span>
                          </>
                        ) : (
                          <span className="player-cosmetic-missing">⚠️ Missing: {cosmeticId}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="player-detail-empty">No cosmetics owned</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

