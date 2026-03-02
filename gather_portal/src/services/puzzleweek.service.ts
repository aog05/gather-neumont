import { FirestoreService } from './firestore.service';
import { COLLECTIONS, db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { PuzzleWeek, PuzzleDay } from '../types/firestore.types';

export class PuzzleWeekService extends FirestoreService<PuzzleWeek> {
  constructor() {
    super(COLLECTIONS.PUZZLE_WEEK);
  }

  /**
   * Get all days for a specific week
   */
  async getWeekDays(weekId: string): Promise<PuzzleDay[]> {
    try {
      const daysCollectionRef = collection(db, COLLECTIONS.PUZZLE_WEEK, weekId, 'days');
      const snapshot = await getDocs(daysCollectionRef);
      
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PuzzleDay[];
    } catch (error) {
      console.error('Error fetching week days:', error);
      throw error;
    }
  }

  /**
   * Add or update a day in a week
   */
  async setWeekDay(weekId: string, dayId: string, dayData: Omit<PuzzleDay, 'id'>): Promise<void> {
    try {
      const dayDocRef = doc(db, COLLECTIONS.PUZZLE_WEEK, weekId, 'days', dayId);
      await setDoc(dayDocRef, dayData);
    } catch (error) {
      console.error('Error setting week day:', error);
      throw error;
    }
  }

  /**
   * Delete a day from a week
   */
  async deleteWeekDay(weekId: string, dayId: string): Promise<void> {
    try {
      const dayDocRef = doc(db, COLLECTIONS.PUZZLE_WEEK, weekId, 'days', dayId);
      await deleteDoc(dayDocRef);
    } catch (error) {
      console.error('Error deleting week day:', error);
      throw error;
    }
  }

  /**
   * Get weeks by year
   */
  async getWeeksByYear(year: number): Promise<PuzzleWeek[]> {
    const allWeeks = await this.getAll();
    return allWeeks.filter((week) => {
      // Week ID format: MonthYearWeekNumber (e.g., Jan20261)
      const yearMatch = week.id?.match(/\d{4}/);
      return yearMatch && parseInt(yearMatch[0]) === year;
    });
  }

  /**
   * Get weeks by month and year
   */
  async getWeeksByMonthYear(month: string, year: number): Promise<PuzzleWeek[]> {
    const allWeeks = await this.getAll();
    const searchPattern = `${month}${year}`;
    return allWeeks.filter((week) => week.id?.startsWith(searchPattern));
  }
}

