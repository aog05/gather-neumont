import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Dialogue, DialoguePaths } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import './DialogueForm.css';

/**
 * Internal form representation of a dialogue path
 */
interface DialoguePathForm {
  OptionText: string;
  NextDialogueId: string;
}

interface DialogueFormProps {
  dialogue?: Dialogue;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Convert Firebase Paths object to form array
 */
function pathsObjectToArray(paths?: DialoguePaths): DialoguePathForm[] {
  if (!paths || typeof paths !== 'object') {
    return [];
  }

  return Object.entries(paths).map(([optionText, nextDialogueId]) => ({
    OptionText: optionText,
    NextDialogueId: nextDialogueId,
  }));
}

/**
 * Convert form array to Firebase Paths object
 */
function pathsArrayToObject(paths: DialoguePathForm[]): DialoguePaths {
  const pathsObject: DialoguePaths = {};

  paths.forEach((path) => {
    if (path.OptionText.trim() !== '') {
      pathsObject[path.OptionText] = path.NextDialogueId || '';
    }
  });

  return pathsObject;
}

export default function DialogueForm({ dialogue, onSuccess, onCancel }: DialogueFormProps) {
  const { create, update } = useCollection<Dialogue>(COLLECTIONS.DIALOGUE);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    content: dialogue?.content || '',
    treeId: dialogue?.treeId || '',
    triggeredQuest: dialogue?.TriggeredQuest || '',
    paths: pathsObjectToArray(dialogue?.Paths),
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddPath = () => {
    setFormData({
      ...formData,
      paths: [
        ...formData.paths,
        {
          OptionText: '',
          NextDialogueId: '',
        },
      ],
    });
  };

  const handleRemovePath = (index: number) => {
    setFormData({
      ...formData,
      paths: formData.paths.filter((_, i) => i !== index),
    });
  };

  const handlePathChange = (index: number, field: keyof DialoguePathForm, value: string) => {
    const newPaths = [...formData.paths];
    newPaths[index] = {
      ...newPaths[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      paths: newPaths,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert form array back to Firebase object format
      const pathsObject = pathsArrayToObject(formData.paths);

      const dialogueData: Omit<Dialogue, 'id'> = {
        content: formData.content,
        treeId: formData.treeId,
        TriggeredQuest: formData.triggeredQuest || '',
        Paths: pathsObject,
      };

      if (dialogue?.id) {
        // Update existing dialogue
        await update(dialogue.id, dialogueData);
        alert('Dialogue updated successfully!');
      } else {
        // Create new dialogue
        await create(dialogueData);
        alert('Dialogue created successfully!');
      }

      onSuccess();
    } catch (error) {
      alert('Error saving dialogue: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="dialogue-form">
      <div className="form-section">
        <h4 className="form-section-title">Dialogue Content</h4>

        <div className="form-field">
          <label htmlFor="treeId" className="form-label">
            Tree ID *
          </label>
          <input
            type="text"
            id="treeId"
            name="treeId"
            value={formData.treeId}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="e.g., chen_welcome, walsh_greeting"
          />
          <p className="form-hint">
            Stable identifier for this dialogue node. Used by NPCs to reference this dialogue.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="content" className="form-label">
            Dialogue Text *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            className="form-textarea"
            placeholder="Enter the dialogue text that the NPC will say..."
            rows={4}
          />
        </div>

        <div className="form-field">
          <label htmlFor="triggeredQuest" className="form-label">
            Triggered Quest ID
          </label>
          <input
            type="text"
            id="triggeredQuest"
            name="triggeredQuest"
            value={formData.triggeredQuest}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter quest ID to trigger (optional)"
          />
          <p className="form-hint">
            If specified, this quest will be added to the player's active quests when this dialogue is shown
          </p>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h4 className="form-section-title">Dialogue Paths ({formData.paths.length})</h4>
          <Button type="button" size="sm" onClick={handleAddPath}>
            ➕ Add Path
          </Button>
        </div>

        {formData.paths.length === 0 ? (
          <p className="form-hint">
            No paths added. This dialogue will end the conversation. Add paths to create branching dialogue.
          </p>
        ) : (
          <div className="dialogue-paths-editor">
            {formData.paths.map((path, index) => (
              <div key={index} className="dialogue-path-editor">
                <div className="dialogue-path-header">
                  <span className="dialogue-path-number">Path {index + 1}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemovePath(index)}
                  >
                    🗑️ Remove
                  </Button>
                </div>

                <div className="form-field">
                  <label className="form-label">Option Text *</label>
                  <input
                    type="text"
                    value={path.OptionText}
                    onChange={(e) => handlePathChange(index, 'OptionText', e.target.value)}
                    className="form-input"
                    placeholder="What the player can say/choose..."
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Next Dialogue ID</label>
                  <input
                    type="text"
                    value={path.NextDialogueId || ''}
                    onChange={(e) => handlePathChange(index, 'NextDialogueId', e.target.value)}
                    className="form-input"
                    placeholder="ID of next dialogue (leave empty to end conversation)"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : dialogue ? 'Update Dialogue' : 'Create Dialogue'}
        </Button>
      </div>
    </form>
  );
}

