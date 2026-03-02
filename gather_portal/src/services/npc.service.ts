import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { NPC } from '../types/firestore.types';

export class NPCService extends FirestoreService<NPC> {
  constructor() {
    super(COLLECTIONS.NPC);
  }

  /**
   * Get NPCs by behavior type
   */
  async getNPCsByBehavior(behavior: string): Promise<NPC[]> {
    return this.getAll({
      filters: [{ field: 'Behavior', operator: '==', value: behavior }],
    });
  }

  /**
   * Get NPCs by dialogue tree ID
   */
  async getNPCsByDialogueTree(treeId: string): Promise<NPC[]> {
    return this.getAll({
      filters: [{ field: 'dialogueTreeId', operator: '==', value: treeId }],
    });
  }

  /**
   * Get NPCs without dialogue assigned
   */
  async getNPCsWithoutDialogue(): Promise<NPC[]> {
    const allNPCs = await this.getAll();
    return allNPCs.filter((npc) => !npc.dialogueTreeId);
  }
}

