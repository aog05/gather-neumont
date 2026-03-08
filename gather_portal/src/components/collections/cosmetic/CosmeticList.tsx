import React, { useState, useMemo } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Cosmetic } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import SearchBar from '../../shared/SearchBar';
import CosmeticForm from './CosmeticForm';
import './CosmeticList.css';

export default function CosmeticList() {
  const { data: cosmetics, loading, error, refresh, remove } = useCollection<Cosmetic>(
    COLLECTIONS.COSMETIC
  );
  const [selectedCosmetic, setSelectedCosmetic] = useState<Cosmetic | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filter cosmetics based on search query
   */
  const filteredCosmetics = useMemo(() => {
    if (!searchQuery.trim()) return cosmetics;

    const query = searchQuery.toLowerCase();
    return cosmetics.filter((cosmetic) => {
      const name = cosmetic.Name?.toLowerCase() || '';
      const type = cosmetic.Type?.toLowerCase() || '';
      const id = cosmetic.id?.toLowerCase() || '';

      return name.includes(query) || type.includes(query) || id.includes(query);
    });
  }, [cosmetics, searchQuery]);

  const columns: Column<Cosmetic>[] = [
    {
      key: 'Name',
      label: 'Name',
      render: (cosmetic) => (
        <span className="cosmetic-name">{cosmetic.Name || 'Unnamed'}</span>
      ),
    },
    {
      key: 'Type',
      label: 'Type',
      render: (cosmetic) => (
        <span className="cosmetic-type">{cosmetic.Type || 'Unknown'}</span>
      ),
    },
    {
      key: 'ObjectCost',
      label: 'Cost (Points)',
      render: (cosmetic) => (
        <span className={cosmetic.ObjectCost === 0 ? 'cosmetic-free' : 'cosmetic-cost'}>
          {cosmetic.ObjectCost === 0 ? 'FREE' : cosmetic.ObjectCost}
        </span>
      ),
    },
    {
      key: 'SpritePath',
      label: 'Sprite Path',
      render: (cosmetic) => (
        <span className="cosmetic-sprite-path">
          {cosmetic.SpritePath ? cosmetic.SpritePath.substring(0, 30) + '...' : 'No sprite'}
        </span>
      ),
    },
  ];

  const handleRowClick = (cosmetic: Cosmetic) => {
    setSelectedCosmetic(cosmetic);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (cosmetic: Cosmetic) => {
    setSelectedCosmetic(cosmetic);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (cosmetic: Cosmetic) => {
    if (window.confirm(`Are you sure you want to delete cosmetic "${cosmetic.Name}"?`)) {
      try {
        await remove(cosmetic.id!);
        alert('Cosmetic deleted successfully');
      } catch (err) {
        alert('Failed to delete cosmetic: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedCosmetic(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  if (error) {
    return (
      <Card title="Cosmetics">
        <div className="error-message">
          <p>Error loading cosmetics: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Cosmetics (Avatar Items)"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create Cosmetic
            </Button>
            <Button onClick={refresh} size="sm" variant="secondary">
              🔄 Refresh
            </Button>
          </>
        }
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search cosmetics by name, type, or ID..."
        />
        <DataTable
          data={filteredCosmetics}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage={searchQuery ? "No cosmetics match your search" : "No cosmetics found"}
          actions={(cosmetic) => (
            <>
              <Button size="sm" variant="secondary" onClick={() => handleEdit(cosmetic)}>
                ✏️ Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(cosmetic)}>
                🗑️ Delete
              </Button>
            </>
          )}
        />
      </Card>

      {/* Detail Modal */}
      {selectedCosmetic && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`Cosmetic: ${selectedCosmetic.Name}`}
          size="lg"
        >
          <div className="cosmetic-detail">
            <div className="cosmetic-detail-section">
              <h4 className="cosmetic-detail-heading">Basic Information</h4>
              <div className="cosmetic-detail-grid">
                <div className="cosmetic-detail-item">
                  <span className="cosmetic-detail-label">Name:</span>
                  <span className="cosmetic-detail-value">{selectedCosmetic.Name}</span>
                </div>
                <div className="cosmetic-detail-item">
                  <span className="cosmetic-detail-label">Type:</span>
                  <span className="cosmetic-detail-value">{selectedCosmetic.Type}</span>
                </div>
                <div className="cosmetic-detail-item">
                  <span className="cosmetic-detail-label">Cost:</span>
                  <span className="cosmetic-detail-value cosmetic-cost">
                    {selectedCosmetic.ObjectCost === 0 ? 'FREE' : `${selectedCosmetic.ObjectCost} points`}
                  </span>
                </div>
                <div className="cosmetic-detail-item">
                  <span className="cosmetic-detail-label">Sprite Path:</span>
                  <span className="cosmetic-detail-value cosmetic-sprite-path">
                    {selectedCosmetic.SpritePath || 'No sprite'}
                  </span>
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
        title="Create New Cosmetic"
        size="lg"
      >
        <CosmeticForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedCosmetic && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title={`Edit Cosmetic: ${selectedCosmetic.Name}`}
          size="lg"
        >
          <CosmeticForm
            cosmetic={selectedCosmetic}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
          />
        </Modal>
      )}
    </>
  );
}

