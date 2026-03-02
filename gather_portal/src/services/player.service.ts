import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { Player } from '../types/firestore.types';

export class PlayerService extends FirestoreService<Player> {
  constructor() {
    super(COLLECTIONS.PLAYER);
  }

  /**
   * Adjust player's wallet points
   */
  async adjustPoints(playerId: string, pointsDelta: number): Promise<void> {
    const player = await this.getById(playerId);
    if (!player) throw new Error('Player not found');

    const currentPoints = parseInt(player.Wallet, 10) || 0;
    const newPoints = Math.max(0, currentPoints + pointsDelta);

    await this.update(playerId, {
      Wallet: newPoints.toString(),
    });
  }

  /**
   * Get players with active quests
   */
  async getPlayersWithActiveQuests(): Promise<Player[]> {
    const allPlayers = await this.getAll();
    return allPlayers.filter((p) => p.ActiveQuests && p.ActiveQuests.length > 0);
  }

  /**
   * Search players by username or email
   */
  async searchPlayers(searchTerm: string): Promise<Player[]> {
    const allPlayers = await this.getAll();
    const lowerSearch = searchTerm.toLowerCase();

    return allPlayers.filter(
      (p) =>
        p.Username.toLowerCase().includes(lowerSearch) ||
        p.Email.toLowerCase().includes(lowerSearch) ||
        p.RealName.toLowerCase().includes(lowerSearch)
    );
  }
}

