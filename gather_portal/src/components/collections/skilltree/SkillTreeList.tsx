import React, { useState, useMemo } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { SkillTreeItems } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import SearchBar from '../../shared/SearchBar';
import SkillTreeForm from './SkillTreeForm';
import './SkillTreeList.css';

export default function SkillTreeList() {
  const { data: skills, loading, error, refresh, remove } = useCollection<SkillTreeItems>(
    COLLECTIONS.SKILL_TREE_ITEMS
  );
  const [selectedSkill, setSelectedSkill] = useState<SkillTreeItems | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filter skills based on search query
   */
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;

    const query = searchQuery.toLowerCase();
    return skills.filter((skill) => {
      const name = skill.Name?.toLowerCase() || '';
      const proficiency = skill.Proficiency?.toLowerCase() || '';
      const source = skill.Source?.toLowerCase() || '';
      const id = skill.id?.toLowerCase() || '';

      return name.includes(query) || proficiency.includes(query) || source.includes(query) || id.includes(query);
    });
  }, [skills, searchQuery]);

  const columns: Column<SkillTreeItems>[] = [
    {
      key: 'Name',
      label: 'Skill Name',
      render: (skill) => (
        <span className="skill-name">{skill.Name || 'Unnamed'}</span>
      ),
    },
    {
      key: 'Proficiency',
      label: 'Proficiency',
      render: (skill) => (
        <span className={`skill-proficiency skill-proficiency-${skill.Proficiency?.toLowerCase()}`}>
          {skill.Proficiency || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'Source',
      label: 'Source',
      render: (skill) => (
        <span className="skill-source">{skill.Source || 'Unknown'}</span>
      ),
    },
  ];

  const handleRowClick = (skill: SkillTreeItems) => {
    setSelectedSkill(skill);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (skill: SkillTreeItems) => {
    setSelectedSkill(skill);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (skill: SkillTreeItems) => {
    if (window.confirm(`Are you sure you want to delete skill "${skill.Name}"?`)) {
      try {
        await remove(skill.id!);
        alert('Skill deleted successfully');
      } catch (err) {
        alert('Failed to delete skill: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedSkill(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  if (error) {
    return (
      <Card title="Skill Tree Items">
        <div className="error-message">
          <p>Error loading skills: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Skill Tree Items"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create Skill
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
          placeholder="Search skills by name, proficiency, source, or ID..."
        />
        <DataTable
          data={filteredSkills}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage={searchQuery ? "No skills match your search" : "No skills found"}
          actions={(skill) => (
            <>
              <Button size="sm" variant="secondary" onClick={() => handleEdit(skill)}>
                ✏️ Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(skill)}>
                🗑️ Delete
              </Button>
            </>
          )}
        />
      </Card>

      {/* Detail Modal */}
      {selectedSkill && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`Skill: ${selectedSkill.Name}`}
          size="lg"
        >
          <div className="skill-detail">
            <div className="skill-detail-section">
              <h4 className="skill-detail-heading">Skill Information</h4>
              <div className="skill-detail-grid">
                <div className="skill-detail-item">
                  <span className="skill-detail-label">Name:</span>
                  <span className="skill-detail-value">{selectedSkill.Name}</span>
                </div>
                <div className="skill-detail-item">
                  <span className="skill-detail-label">Proficiency:</span>
                  <span className="skill-detail-value">{selectedSkill.Proficiency}</span>
                </div>
                <div className="skill-detail-item">
                  <span className="skill-detail-label">Source:</span>
                  <span className="skill-detail-value">{selectedSkill.Source}</span>
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
        title="Create New Skill"
        size="lg"
      >
        <SkillTreeForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedSkill && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title={`Edit Skill: ${selectedSkill.Name}`}
          size="lg"
        >
          <SkillTreeForm
            skill={selectedSkill}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
          />
        </Modal>
      )}
    </>
  );
}

