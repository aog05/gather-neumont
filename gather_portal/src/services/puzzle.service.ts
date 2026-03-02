import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { Puzzle } from '../types/firestore.types';

export class PuzzleService extends FirestoreService<Puzzle> {
  constructor() {
    super(COLLECTIONS.PUZZLE);
  }

  /**
   * Get puzzles by type (QuizPuzzle or CodePuzzle)
   */
  async getPuzzlesByType(type: 'QuizPuzzle' | 'CodePuzzle'): Promise<Puzzle[]> {
    return this.getAll({
      filters: [{ field: 'Type', operator: '==', value: type }],
    });
  }

  /**
   * Get quiz puzzles only
   */
  async getQuizPuzzles(): Promise<Puzzle[]> {
    return this.getPuzzlesByType('QuizPuzzle');
  }

  /**
   * Get code puzzles only
   */
  async getCodePuzzles(): Promise<Puzzle[]> {
    return this.getPuzzlesByType('CodePuzzle');
  }
}

