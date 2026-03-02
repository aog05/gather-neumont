import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { Cosmetic } from '../types/firestore.types';

export class CosmeticService extends FirestoreService<Cosmetic> {
  constructor() {
    super(COLLECTIONS.COSMETIC);
  }

  /**
   * Get cosmetics by type
   */
  async getCosmeticsByType(type: string): Promise<Cosmetic[]> {
    return this.getAll({
      filters: [{ field: 'Type', operator: '==', value: type }],
    });
  }

  /**
   * Get cosmetics by cost range
   */
  async getCosmeticsByCostRange(minCost: number, maxCost: number): Promise<Cosmetic[]> {
    const allCosmetics = await this.getAll();
    return allCosmetics.filter(
      (c) => c.ObjectCost >= minCost && c.ObjectCost <= maxCost
    );
  }

  /**
   * Get free cosmetics (cost = 0)
   */
  async getFreeCosmetics(): Promise<Cosmetic[]> {
    return this.getCosmeticsByCostRange(0, 0);
  }

  /**
   * Get premium cosmetics (cost > 0)
   */
  async getPremiumCosmetics(): Promise<Cosmetic[]> {
    const allCosmetics = await this.getAll();
    return allCosmetics.filter((c) => c.ObjectCost > 0);
  }
}

