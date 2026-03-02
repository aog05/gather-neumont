import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { COLLECTIONS, db } from '../../../lib/firebase';
import type { PuzzleWeek } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import './PuzzleWeekForm.css';

interface PuzzleWeekFormProps {
  week?: PuzzleWeek;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PuzzleWeekForm({ week, onSuccess, onCancel }: PuzzleWeekFormProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    month: week?.id?.match(/^[A-Za-z]+/)?.[0] || 'Jan',
    year: week?.id?.match(/\d{4}/)?.[0] || new Date().getFullYear().toString(),
    weekNumber: week?.id?.match(/\d+$/)?.[0] || '1',
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
      // Generate week ID: MonthYearWeekNumber (e.g., Jan20261)
      const weekId = `${formData.month}${formData.year}${formData.weekNumber}`;

      // Create the week document (empty object, days are in subcollection)
      const weekDocRef = doc(db, COLLECTIONS.PUZZLEWEEK, weekId);
      await setDoc(weekDocRef, {});

      alert(`Puzzle week "${weekId}" ${week ? 'updated' : 'created'} successfully!`);
      onSuccess();
    } catch (error) {
      alert('Error saving puzzle week: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <form onSubmit={handleSubmit} className="puzzleweek-form">
      <div className="form-section">
        <h4 className="form-section-title">Week Information</h4>

        <div className="form-field">
          <label htmlFor="month" className="form-label">
            Month *
          </label>
          <select
            id="month"
            name="month"
            value={formData.month}
            onChange={handleChange}
            required
            className="form-input"
            disabled={!!week}
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          {week && <p className="form-hint">Month cannot be changed after creation</p>}
        </div>

        <div className="form-field">
          <label htmlFor="year" className="form-label">
            Year *
          </label>
          <select
            id="year"
            name="year"
            value={formData.year}
            onChange={handleChange}
            required
            className="form-input"
            disabled={!!week}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {week && <p className="form-hint">Year cannot be changed after creation</p>}
        </div>

        <div className="form-field">
          <label htmlFor="weekNumber" className="form-label">
            Week Number *
          </label>
          <input
            type="number"
            id="weekNumber"
            name="weekNumber"
            value={formData.weekNumber}
            onChange={handleChange}
            required
            className="form-input"
            min="1"
            max="5"
            disabled={!!week}
          />
          <p className="form-hint">
            Week number within the month (1-5). {week && 'Cannot be changed after creation.'}
          </p>
        </div>

        <div className="week-id-preview">
          <span className="week-id-preview-label">Week ID Preview:</span>
          <span className="week-id-preview-value">
            {formData.month}{formData.year}{formData.weekNumber}
          </span>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !!week}>
          {loading ? 'Saving...' : week ? 'Week ID Cannot Be Changed' : 'Create Week'}
        </Button>
      </div>
    </form>
  );
}

