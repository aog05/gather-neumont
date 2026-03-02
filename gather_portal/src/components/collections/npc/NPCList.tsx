import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { NPC } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import NPCForm from './NPCForm';
import './NPCList.css';

export default function NPCList() {
  const { data: npcs, loading, error, refresh, remove } = useCollection<NPC>(COLLECTIONS.NPC);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const columns: Column<NPC>[] = [
    {
      key: 'Sprite',
      label: 'Name',
      render: (npc) => npc.Sprite?.Name || 'Unnamed NPC',
    },
    {
      key: 'Behavior',
      label: 'Behavior',
      render: (npc) => (
        <span className={`npc-behavior npc-behavior-${npc.Behavior?.toLowerCase()}`}>
          {npc.Behavior || 'None'}
        </span>
      ),
    },
    {
      key: 'Placement',
      label: 'Location',
      render: (npc) =>
        npc.Placement ? `(${npc.Placement.x}, ${npc.Placement.y})` : 'Not placed',
    },
    {
      key: 'dialogueTreeId',
      label: 'Dialogue',
      render: (npc) => (
        <span className={npc.dialogueTreeId ? 'npc-has-dialogue' : 'npc-no-dialogue'}>
          {npc.dialogueTreeId ? '✓ Assigned' : '✗ None'}
        </span>
      ),
    },
  ];

  const handleRowClick = (npc: NPC) => {
    setSelectedNPC(npc);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (npc: NPC) => {
    setSelectedNPC(npc);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (npc: NPC) => {
    if (window.confirm(`Are you sure you want to delete NPC "${npc.Sprite?.Name}"?`)) {
      try {
        await remove(npc.id!);
        alert('NPC deleted successfully');
      } catch (err) {
        alert('Failed to delete NPC: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedNPC(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  if (error) {
    return (
      <Card title="NPCs">
        <div className="error-message">
          <p>Error loading NPCs: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="NPCs"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create NPC
            </Button>
            <Button onClick={refresh} size="sm" variant="secondary">
              🔄 Refresh
            </Button>
          </>
        }
      >
        <DataTable
          data={npcs}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No NPCs found"
          actions={(npc) => (
            <>
              <Button size="sm" variant="secondary" onClick={() => handleEdit(npc)}>
                ✏️ Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(npc)}>
                🗑️ Delete
              </Button>
            </>
          )}
        />
      </Card>

      {/* Detail Modal */}
      {selectedNPC && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`NPC: ${selectedNPC.Sprite?.Name || 'Unnamed'}`}
          size="lg"
        >
          <div className="npc-detail">
            <div className="npc-detail-section">
              <h4 className="npc-detail-heading">Basic Information</h4>
              <div className="npc-detail-grid">
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Name:</span>
                  <span className="npc-detail-value">{selectedNPC.Sprite?.Name || 'N/A'}</span>
                </div>
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Behavior:</span>
                  <span className="npc-detail-value">{selectedNPC.Behavior || 'None'}</span>
                </div>
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Dialogue Tree ID:</span>
                  <span className="npc-detail-value">
                    {selectedNPC.dialogueTreeId || 'Not assigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="npc-detail-section">
              <h4 className="npc-detail-heading">Placement</h4>
              <div className="npc-detail-grid">
                <div className="npc-detail-item">
                  <span className="npc-detail-label">X Position:</span>
                  <span className="npc-detail-value">{selectedNPC.Placement?.x ?? 'N/A'}</span>
                </div>
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Y Position:</span>
                  <span className="npc-detail-value">{selectedNPC.Placement?.y ?? 'N/A'}</span>
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
        title="Create New NPC"
        size="lg"
      >
        <NPCForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedNPC && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title={`Edit NPC: ${selectedNPC.Sprite?.Name}`}
          size="lg"
        >
          <NPCForm npc={selectedNPC} onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
        </Modal>
      )}
    </>
  );
}

