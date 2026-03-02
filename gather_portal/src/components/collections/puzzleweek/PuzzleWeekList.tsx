import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { PuzzleWeek } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import PuzzleWeekForm from './PuzzleWeekForm';
import PuzzleWeekDays from './PuzzleWeekDays';
import './PuzzleWeekList.css';

export default function PuzzleWeekList() {
  const { data: weeks, loading, error, refresh, remove } = useCollection<PuzzleWeek>(
    COLLECTIONS.PUZZLE_WEEK
  );
  const [selectedWeek, setSelectedWeek] = useState<PuzzleWeek | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDaysModalOpen, setIsDaysModalOpen] = useState(false);

  const columns: Column<PuzzleWeek>[] = [
    {
      key: 'id',
      label: 'Week ID',
      render: (week) => (
        <span className="week-id">{week.id || 'N/A'}</span>
      ),
    },
    {
      key: 'id',
      label: 'Month',
      render: (week) => {
        const monthMatch = week.id?.match(/^[A-Za-z]+/);
        return <span className="week-month">{monthMatch ? monthMatch[0] : 'Unknown'}</span>;
      },
    },
    {
      key: 'id',
      label: 'Year',
      render: (week) => {
        const yearMatch = week.id?.match(/\d{4}/);
        return <span className="week-year">{yearMatch ? yearMatch[0] : 'Unknown'}</span>;
      },
    },
    {
      key: 'id',
      label: 'Week Number',
      render: (week) => {
        const weekMatch = week.id?.match(/\d+$/);
        return <span className="week-number">{weekMatch ? weekMatch[0] : 'Unknown'}</span>;
      },
    },
  ];

  const handleRowClick = (week: PuzzleWeek) => {
    setSelectedWeek(week);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (week: PuzzleWeek) => {
    setSelectedWeek(week);
    setIsEditModalOpen(true);
  };

  const handleManageDays = (week: PuzzleWeek) => {
    setSelectedWeek(week);
    setIsDaysModalOpen(true);
  };

  const handleDelete = async (week: PuzzleWeek) => {
    if (window.confirm(`Are you sure you want to delete week "${week.id}"?`)) {
      try {
        await remove(week.id!);
        alert('Puzzle week deleted successfully');
      } catch (err) {
        alert('Failed to delete puzzle week: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDaysModalOpen(false);
    setSelectedWeek(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  if (error) {
    return (
      <Card title="Puzzle Weeks">
        <div className="error-message">
          <p>Error loading puzzle weeks: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Puzzle Weeks (Weekly Schedule)"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create Week
            </Button>
            <Button onClick={refresh} size="sm" variant="secondary">
              🔄 Refresh
            </Button>
          </>
        }
      >
        <DataTable
          data={weeks}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No puzzle weeks found"
          actions={(week) => (
            <>
              <Button size="sm" variant="success" onClick={() => handleManageDays(week)}>
                📅 Manage Days
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleEdit(week)}>
                ✏️ Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(week)}>
                🗑️ Delete
              </Button>
            </>
          )}
        />
      </Card>

      {/* Detail Modal */}
      {selectedWeek && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`Puzzle Week: ${selectedWeek.id}`}
          size="lg"
        >
          <div className="week-detail">
            <div className="week-detail-section">
              <h4 className="week-detail-heading">Week Information</h4>
              <div className="week-detail-grid">
                <div className="week-detail-item">
                  <span className="week-detail-label">Week ID:</span>
                  <span className="week-detail-value">{selectedWeek.id}</span>
                </div>
              </div>
              <p className="week-detail-hint">
                Click "Manage Days" to assign puzzles to specific days of this week
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Create New Puzzle Week"
        size="lg"
      >
        <PuzzleWeekForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedWeek && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title={`Edit Puzzle Week: ${selectedWeek.id}`}
          size="lg"
        >
          <PuzzleWeekForm
            week={selectedWeek}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
          />
        </Modal>
      )}

      {/* Manage Days Modal */}
      {selectedWeek && (
        <Modal
          isOpen={isDaysModalOpen}
          onClose={handleCloseModals}
          title={`Manage Days: ${selectedWeek.id}`}
          size="xl"
        >
          <PuzzleWeekDays weekId={selectedWeek.id!} onClose={handleCloseModals} />
        </Modal>
      )}
    </>
  );
}

