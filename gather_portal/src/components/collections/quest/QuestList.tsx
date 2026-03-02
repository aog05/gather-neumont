import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Quest } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import QuestForm from './QuestForm';
import './QuestList.css';

export default function QuestList() {
  const { data: quests, loading, error, refresh, remove } = useCollection<Quest>(COLLECTIONS.QUEST);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const columns: Column<Quest>[] = [
    {
      key: 'Title',
      label: 'Title',
    },
    {
      key: 'Reward',
      label: 'Reward (Points)',
      render: (quest) => (
        <span className="quest-reward">{quest.Reward?.toString() || '0'}</span>
      ),
    },
    {
      key: 'Next',
      label: 'Next Quest',
      render: (quest) => (
        <span className={quest.Next ? 'quest-has-next' : 'quest-no-next'}>
          {quest.Next ? '→ ' + quest.Next : '✓ Final'}
        </span>
      ),
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
                  <span className="quest-detail-label">Reward (Points):</span>
                  <span className="quest-detail-value quest-reward">
                    {selectedQuest.Reward?.toString() || '0'}
                  </span>
                </div>
                <div className="quest-detail-item">
                  <span className="quest-detail-label">Next Quest ID:</span>
                  <span className="quest-detail-value">
                    {selectedQuest.Next || 'None (Final quest)'}
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

