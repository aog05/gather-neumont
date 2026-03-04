import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Quest, Cosmetic } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import QuestForm from './QuestForm';
import './QuestList.css';

export default function QuestList() {
  const { data: quests, loading, error, refresh, remove } = useCollection<Quest>(COLLECTIONS.QUEST);
  const { data: cosmetics } = useCollection<Cosmetic>(COLLECTIONS.COSMETIC);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const columns: Column<Quest>[] = [
    {
      key: 'Title',
      label: 'Title',
    },
    {
      key: 'Reward',
      label: 'Reward',
      render: (quest) => {
        if (!quest.Reward) return <span className="quest-reward">0 Points</span>;
        const cosmetic = quest.Reward.Cosmetic ? getCosmeticById(quest.Reward.Cosmetic) : null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="quest-reward">⭐ {quest.Reward.Points || 0} Points</span>
            {quest.Reward.Cosmetic && cosmetic && (
              <span className="quest-reward-cosmetic">🎨 {getCosmeticName(cosmetic)}</span>
            )}
            {quest.Reward.Cosmetic && !cosmetic && (
              <span className="quest-missing">⚠️ Missing Cosmetic: {quest.Reward.Cosmetic}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'Next',
      label: 'Next Quest',
      render: (quest) => {
        if (!quest.Next) {
          return <span className="quest-no-next">✓ Final</span>;
        }
        const nextQuest = getQuestById(quest.Next);
        return (
          <span className="quest-has-next">
            → {nextQuest ? getQuestName(nextQuest) : quest.Next}
          </span>
        );
      },
    },
  ];

  const handleRowClick = (quest: Quest) => {
    setSelectedQuest(quest);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (quest: Quest) => {
    setSelectedQuest(quest);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (quest: Quest) => {
    if (window.confirm(`Are you sure you want to delete quest "${quest.Title}"?`)) {
      try {
        await remove(quest.id!);
        alert('Quest deleted successfully');
      } catch (err) {
        alert('Failed to delete quest: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedQuest(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  if (error) {
    return (
      <Card title="Quests">
        <div className="error-message">
          <p>Error loading quests: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Quests"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create Quest
            </Button>
            <Button onClick={refresh} size="sm" variant="secondary">
              🔄 Refresh
            </Button>
          </>
        }
      >
        <DataTable
          data={quests}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No quests found"
          actions={(quest) => (
            <>
              <Button size="sm" variant="secondary" onClick={() => handleEdit(quest)}>
                ✏️ Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(quest)}>
                🗑️ Delete
              </Button>
            </>
          )}
        />
      </Card>

      {/* Detail Modal */}
      {selectedQuest && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`Quest: ${selectedQuest.Title}`}
          size="lg"
        >
          <div className="quest-detail">
            <div className="quest-detail-section">
              <h4 className="quest-detail-heading">Quest Information</h4>
              <div className="quest-detail-grid">
                <div className="quest-detail-item">
                  <span className="quest-detail-label">Title:</span>
                  <span className="quest-detail-value">{selectedQuest.Title}</span>
                </div>
                <div className="quest-detail-item">
                  <span className="quest-detail-label">Reward:</span>
                  <div className="quest-detail-value">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="quest-reward">⭐ {selectedQuest.Reward?.Points || 0} Points</span>
                      {selectedQuest.Reward?.Cosmetic && (() => {
                        const cosmetic = getCosmeticById(selectedQuest.Reward.Cosmetic);
                        return cosmetic ? (
                          <span className="quest-reward-cosmetic">
                            🎨 {getCosmeticName(cosmetic)} <span className="quest-link-id">({cosmetic.id})</span>
                          </span>
                        ) : (
                          <span className="quest-missing">⚠️ Missing Cosmetic: {selectedQuest.Reward.Cosmetic}</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="quest-detail-item">
                  <span className="quest-detail-label">Next Quest:</span>
                  <span className="quest-detail-value">
                    {selectedQuest.Next ? (
                      (() => {
                        const nextQuest = getQuestById(selectedQuest.Next);
                        return nextQuest ? (
                          <button
                            className="quest-link"
                            onClick={() => {
                              setSelectedQuest(nextQuest);
                              setIsDetailModalOpen(true);
                            }}
                            title={`View: ${getQuestName(nextQuest)}`}
                          >
                            🔗 {getQuestName(nextQuest)} <span className="quest-link-id">({nextQuest.id})</span>
                          </button>
                        ) : (
                          <span className="quest-missing">⚠️ Missing: {selectedQuest.Next}</span>
                        );
                      })()
                    ) : (
                      'None (Final quest)'
                    )}
                  </span>
                </div>
                <div className="quest-detail-item">
                  <span className="quest-detail-label">Quest ID:</span>
                  <span className="quest-detail-value">{selectedQuest.id}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Create New Quest"
        size="lg"
      >
        <QuestForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedQuest && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title={`Edit Quest: ${selectedQuest.Title}`}
          size="lg"
        >
          <QuestForm
            quest={selectedQuest}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
          />
        </Modal>
      )}
    </>
  );
}

