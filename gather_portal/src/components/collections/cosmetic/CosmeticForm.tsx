import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Cosmetic } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import ImageUpload from '../../shared/ImageUpload';
import './CosmeticForm.css';

interface CosmeticFormProps {
  cosmetic?: Cosmetic;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CosmeticForm({ cosmetic, onSuccess, onCancel }: CosmeticFormProps) {
  const { create, update } = useCollection<Cosmetic>(COLLECTIONS.COSMETIC);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: cosmetic?.Name || '',
    type: cosmetic?.Type || '',
    spritePath: cosmetic?.SpritePath || '',
    objectCost: cosmetic?.ObjectCost?.toString() || '0',
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
      const cosmeticData: Omit<Cosmetic, 'id'> = {
        Name: formData.name,
        Type: formData.type,
        SpritePath: formData.spritePath,
        ObjectCost: parseInt(formData.objectCost, 10) || 0,
      };

      if (cosmetic?.id) {
        // Update existing cosmetic
        await update(cosmetic.id, cosmeticData);
        alert('Cosmetic updated successfully!');
      } else {
        // Create new cosmetic
        await create(cosmeticData);
        alert('Cosmetic created successfully!');
      }

      onSuccess();
    } catch (error) {
      alert('Error saving cosmetic: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="cosmetic-form">
      <div className="form-section">
        <h4 className="form-section-title">Cosmetic Information</h4>

        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Cosmetic Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter cosmetic name (e.g., Red Hat, Blue Shirt)"
          />
        </div>

        <div className="form-field">
          <label htmlFor="type" className="form-label">
            Type *
          </label>
          <input
            type="text"
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter type (e.g., hat, shirt, pants, shoes)"
          />
          <p className="form-hint">
            Common types: hat, hair, shirt, pants, shoes, accessory
          </p>
        </div>

        <div className="form-field">
          <label className="form-label">
            Cosmetic Image *
          </label>
          <ImageUpload
            currentImageUrl={formData.spritePath}
            onImageUploaded={(url) => setFormData({ ...formData, spritePath: url })}
            folder="cosmetics"
            disabled={loading}
          />
          <p className="form-hint">
            Upload an image for this cosmetic item
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="spritePath" className="form-label">
            Sprite Path (URL)
          </label>
          <input
            type="text"
            id="spritePath"
            name="spritePath"
            value={formData.spritePath}
            onChange={handleChange}
            className="form-input"
            placeholder="Auto-filled after image upload or enter manually"
            readOnly={!formData.spritePath}
          />
          <p className="form-hint">
            This field is auto-populated when you upload an image above
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="objectCost" className="form-label">
            Cost (Points) *
          </label>
          <input
            type="number"
            id="objectCost"
            name="objectCost"
            value={formData.objectCost}
            onChange={handleChange}
            required
            className="form-input"
            min="0"
            placeholder="Enter cost in points (0 for free)"
          />
          <p className="form-hint">
            Set to 0 to make this cosmetic free for all players
          </p>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : cosmetic ? 'Update Cosmetic' : 'Create Cosmetic'}
        </Button>
      </div>
    </form>
  );
}

