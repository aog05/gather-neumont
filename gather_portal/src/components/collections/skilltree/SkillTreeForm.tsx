import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { SkillTreeItems } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import './SkillTreeForm.css';

interface SkillTreeFormProps {
  skill?: SkillTreeItems;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SkillTreeForm({ skill, onSuccess, onCancel }: SkillTreeFormProps) {
  const { create, update } = useCollection<SkillTreeItems>(COLLECTIONS.SKILL_TREE_ITEMS);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: skill?.Name || '',
    proficiency: skill?.Proficiency || 'Beginner',
    source: skill?.Source || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const skillData: Omit<SkillTreeItems, 'id'> = {
        Name: formData.name,
        Proficiency: formData.proficiency,
        Source: formData.source,
      };

      if (skill?.id) {
        // Update existing skill
        await update(skill.id, skillData);
        alert('Skill updated successfully!');
      } else {
        // Create new skill
        await create(skillData);
        alert('Skill created successfully!');
      }

      onSuccess();
    } catch (error) {
      alert('Error saving skill: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="skilltree-form">
      <div className="form-section">
        <h4 className="form-section-title">Skill Information</h4>

        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Skill Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter skill name (e.g., JavaScript, Python, React)"
          />
        </div>

        <div className="form-field">
          <label htmlFor="proficiency" className="form-label">
            Proficiency Level *
          </label>
          <select
            id="proficiency"
            name="proficiency"
            value={formData.proficiency}
            onChange={handleChange}
            required
            className="form-input"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="source" className="form-label">
            Source *
          </label>
          <input
            type="text"
            id="source"
            name="source"
            value={formData.source}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter source (e.g., Course, Project, Self-taught)"
          />
          <p className="form-hint">
            Where or how this skill was acquired
          </p>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : skill ? 'Update Skill' : 'Create Skill'}
        </Button>
      </div>
    </form>
  );
}

