import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { NPC } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import './NPCForm.css';

interface NPCFormProps {
  npc?: NPC;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NPCForm({ npc, onSuccess, onCancel }: NPCFormProps) {
  const { create, update } = useCollection<NPC>(COLLECTIONS.NPC);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: npc?.Sprite?.Name || '',
    behavior: npc?.Behavior || 'stationary',
    dialogueTreeId: npc?.dialogueTreeId || '',
    x: npc?.Placement?.x?.toString() || '0',
    y: npc?.Placement?.y?.toString() || '0',
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
      const npcData: Omit<NPC, 'id'> = {
        Sprite: {
          Name: formData.name,
        },
        Behavior: formData.behavior,
        dialogueTreeId: formData.dialogueTreeId || undefined,
        Placement: {
          x: parseFloat(formData.x) || 0,
          y: parseFloat(formData.y) || 0,
        },
      };

      if (npc?.id) {
        // Update existing NPC
        await update(npc.id, npcData);
        alert('NPC updated successfully!');
      } else {
        // Create new NPC
        await create(npcData);
        alert('NPC created successfully!');
      }

      onSuccess();
    } catch (error) {
      alert('Error saving NPC: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="npc-form">
      <div className="form-section">
        <h4 className="form-section-title">Basic Information</h4>
        
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            NPC Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter NPC name"
          />
        </div>

        <div className="form-field">
          <label htmlFor="behavior" className="form-label">
            Behavior *
          </label>
          <select
            id="behavior"
            name="behavior"
            value={formData.behavior}
            onChange={handleChange}
            required
            className="form-input"
          >
            <option value="stationary">Stationary</option>
            <option value="wander">Wander</option>
            <option value="patrol">Patrol</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="dialogueTreeId" className="form-label">
            Dialogue Tree ID
          </label>
          <input
            type="text"
            id="dialogueTreeId"
            name="dialogueTreeId"
            value={formData.dialogueTreeId}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter dialogue tree ID (optional)"
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">Placement</h4>
        
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="x" className="form-label">
              X Position *
            </label>
            <input
              type="number"
              id="x"
              name="x"
              value={formData.x}
              onChange={handleChange}
              required
              className="form-input"
              step="0.1"
            />
          </div>

          <div className="form-field">
            <label htmlFor="y" className="form-label">
              Y Position *
            </label>
            <input
              type="number"
              id="y"
              name="y"
              value={formData.y}
              onChange={handleChange}
              required
              className="form-input"
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : npc ? 'Update NPC' : 'Create NPC'}
        </Button>
      </div>
    </form>
  );
}

