import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { NPC, Dialogue } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import NPCForm from './NPCForm';
import './NPCList.css';

export default function NPCList() {
  const { data: npcs, loading, error, refresh, remove } = useCollection<NPC>(COLLECTIONS.NPC);
  const { data: dialogues } = useCollection<Dialogue>(COLLECTIONS.DIALOGUE);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState(false);
  const [selectedDialogue, setSelectedDialogue] = useState<Dialogue | null>(null);

  /**
   * Get dialogue by treeId
   */
  const getDialogueByTreeId = (treeId: string): Dialogue | undefined => {
    return dialogues.find((d) => d.treeId === treeId || d.id === treeId);
  };

  /**
   * Get display name for a dialogue
   */
  const getDialogueName = (dialogue: Dialogue): string => {
    if (dialogue.content && dialogue.content.trim()) {
      const content = dialogue.content.trim();
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
    return dialogue.treeId || dialogue.id || 'Unnamed dialogue';
  };

  const columns: Column<NPC>[] = [
    {
      key: 'Name',
      label: 'Name',
      render: (npc) => npc.Name || 'Unnamed NPC',
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
      render: (npc) => {
        if (!npc.Placement) return 'Not placed';
        // Placement is an array [x, y]
        if (Array.isArray(npc.Placement)) {
          return `(${npc.Placement[0]}, ${npc.Placement[1]})`;
        }
        // Fallback for object format {x, y}
        if (typeof npc.Placement === 'object' && 'x' in npc.Placement && 'y' in npc.Placement) {
          return `(${(npc.Placement as any).x}, ${(npc.Placement as any).y})`;
        }
        return 'Invalid placement';
      },
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
    if (window.confirm(`Are you sure you want to delete NPC "${npc.Name}"?`)) {
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
          title={`NPC: ${selectedNPC.Name || 'Unnamed'}`}
          size="lg"
        >
          <div className="npc-detail">
            <div className="npc-detail-section">
              <h4 className="npc-detail-heading">Basic Information</h4>
              <div className="npc-detail-grid">
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Name:</span>
                  <span className="npc-detail-value">{selectedNPC.Name || 'N/A'}</span>
                </div>
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Behavior:</span>
                  <span className="npc-detail-value">{selectedNPC.Behavior || 'None'}</span>
                </div>
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Dialogue Tree:</span>
                  <span className="npc-detail-value">
                    {selectedNPC.dialogueTreeId ? (
                      (() => {
                        const dialogue = getDialogueByTreeId(selectedNPC.dialogueTreeId);
                        return dialogue ? (
                          <button
                            className="npc-dialogue-link"
                            onClick={() => {
                              setSelectedDialogue(dialogue);
                              setIsDialogueModalOpen(true);
                            }}
                            title={`View: ${getDialogueName(dialogue)}`}
                          >
                            🔗 {getDialogueName(dialogue)} <span className="npc-dialogue-link-id">({dialogue.treeId || dialogue.id})</span>
                          </button>
                        ) : (
                          <span className="npc-dialogue-missing">⚠️ Missing: {selectedNPC.dialogueTreeId}</span>
                        );
                      })()
                    ) : (
                      'Not assigned'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="npc-detail-section">
              <h4 className="npc-detail-heading">Placement</h4>
              <div className="npc-detail-grid">
                <div className="npc-detail-item">
                  <span className="npc-detail-label">X Position:</span>
                  <span className="npc-detail-value">
                    {selectedNPC.Placement ? (Array.isArray(selectedNPC.Placement) ? selectedNPC.Placement[0] : (selectedNPC.Placement as any).x) : 'N/A'}
                  </span>
                </div>
                <div className="npc-detail-item">
                  <span className="npc-detail-label">Y Position:</span>
                  <span className="npc-detail-value">
                    {selectedNPC.Placement ? (Array.isArray(selectedNPC.Placement) ? selectedNPC.Placement[1] : (selectedNPC.Placement as any).y) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Dialogue Detail Modal */}
      {selectedDialogue && (
        <Modal
          isOpen={isDialogueModalOpen}
          onClose={() => {
            setIsDialogueModalOpen(false);
            setSelectedDialogue(null);
          }}
          title={`Dialogue: ${selectedDialogue.treeId || selectedDialogue.id}`}
          size="lg"
        >
          <div className="npc-dialogue-detail">
            <div className="npc-dialogue-detail-section">
              <h4 className="npc-dialogue-detail-heading">Dialogue Content</h4>
              <p className="npc-dialogue-detail-content">{selectedDialogue.content || 'No content'}</p>
            </div>
            {selectedDialogue.Paths && Object.keys(selectedDialogue.Paths).length > 0 && (
              <div className="npc-dialogue-detail-section">
                <h4 className="npc-dialogue-detail-heading">Player Options</h4>
                <ul className="npc-dialogue-detail-paths">
                  {Object.entries(selectedDialogue.Paths).map(([option, nextId], index) => (
                    <li key={index} className="npc-dialogue-detail-path">
                      <span className="npc-dialogue-detail-path-arrow">→</span>
                      <span className="npc-dialogue-detail-path-text">{option}</span>
                      <span className="npc-dialogue-detail-path-next">({nextId})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedDialogue.TriggeredQuest && (
              <div className="npc-dialogue-detail-section">
                <h4 className="npc-dialogue-detail-heading">Triggered Quest</h4>
                <p className="npc-dialogue-detail-quest">⚡ {selectedDialogue.TriggeredQuest}</p>
              </div>
            )}
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

