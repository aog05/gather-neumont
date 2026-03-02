import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { Quest } from '../types/firestore.types';

export class QuestService extends FirestoreService<Quest> {
  constructor() {
    super(COLLECTIONS.QUEST);
  }

  /**
   * Get quest chain starting from a quest ID
   */
  async getQuestChain(startQuestId: string): Promise<Quest[]> {
    const chain: Quest[] = [];
    let currentId: string | null = startQuestId;

    while (currentId) {
      const quest = await this.getById(currentId);
      if (!quest) break;

      chain.push(quest);
      currentId = quest.Next || null;

      // Prevent infinite loops
      if (chain.length > 100) {
        console.warn('Quest chain exceeds 100 quests, stopping');
        break;
      }
    }

    return chain;
  }

  /**
   * Find quests that lead to a specific quest (reverse lookup)
   */
  async getQuestsLeadingTo(questId: string): Promise<Quest[]> {
    return this.getAll({
      filters: [{ field: 'Next', operator: '==', value: questId }],
    });
  }

  /**
   * Get all root quests (quests that are not referenced by any other quest's Next field)
   */
  async getRootQuests(): Promise<Quest[]> {
    const allQuests = await this.getAll();
    const nextQuestIds = new Set(
      allQuests.map((q) => q.Next).filter((next): next is string => !!next)
    );

    return allQuests.filter((q) => q.id && !nextQuestIds.has(q.id));
  }
}

