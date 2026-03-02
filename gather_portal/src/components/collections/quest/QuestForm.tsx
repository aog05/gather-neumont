import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Quest } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import './QuestForm.css';

interface QuestFormProps {
  quest?: Quest;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuestForm({ quest, onSuccess, onCancel }: QuestFormProps) {
  const { create, update } = useCollection<Quest>(COLLECTIONS.QUEST);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: quest?.Title || '',
    reward: quest?.Reward?.toString() || '0',
    next: quest?.Next || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questData: Omit<Quest, 'id'> = {
        Title: formData.title,
        Reward: parseInt(formData.reward, 10) || 0,
        Next: formData.next || undefined,
      };

      if (quest?.id) {
        // Update existing quest
        await update(quest.id, questData);
        alert('Quest updated successfully!');
      } else {
        // Create new quest
        await create(questData);
        alert('Quest created successfully!');
      }

      onSuccess();
    } catch (error) {
      alert('Error saving quest: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="quest-form">
      <div className="form-section">
        <h4 className="form-section-title">Quest Information</h4>
        
        <div className="form-field">
          <label htmlFor="title" className="form-label">
            Quest Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter quest title"
          />
        </div>

        <div className="form-field">
          <label htmlFor="reward" className="form-label">
            Reward (Points) *
          </label>
          <input
            type="number"
            id="reward"
            name="reward"
            value={formData.reward}
            onChange={handleChange}
            required
            className="form-input"
            min="0"
            placeholder="Enter reward points"
          />
        </div>

        <div className="form-field">
          <label htmlFor="next" className="form-label">
            Next Quest ID
          </label>
          <input
            type="text"
            id="next"
            name="next"
            value={formData.next}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter next quest ID (optional)"
          />
          <p className="form-hint">
            Leave empty if this is the final quest in the chain
          </p>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : quest ? 'Update Quest' : 'Create Quest'}
        </Button>
      </div>
    </form>
  );
}

