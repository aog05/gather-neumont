import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { Dialogue } from '../types/firestore.types';

export class DialogueService extends FirestoreService<Dialogue> {
  constructor() {
    super(COLLECTIONS.DIALOGUE);
  }

  /**
   * Get dialogues that trigger a specific quest
   */
  async getDialoguesByTriggeredQuest(questId: string): Promise<Dialogue[]> {
    const allDialogues = await this.getAll();
    return allDialogues.filter((d) => d.TriggeredQuest === questId);
  }

  /**
   * Get dialogues without any paths (dead-end dialogues)
   */
  async getDialoguesWithoutPaths(): Promise<Dialogue[]> {
    const allDialogues = await this.getAll();
    return allDialogues.filter((d) => !d.Paths || d.Paths.length === 0);
  }

  /**
   * Get dialogues that reference a specific dialogue ID in their paths
   */
  async getDialoguesLeadingTo(dialogueId: string): Promise<Dialogue[]> {
    const allDialogues = await this.getAll();
    return allDialogues.filter((d) =>
      d.Paths?.some((path) => path.NextDialogueId === dialogueId)
    );
  }

  /**
   * Get root dialogues (dialogues not referenced by any other dialogue's paths)
   */
  async getRootDialogues(): Promise<Dialogue[]> {
    const allDialogues = await this.getAll();
    const referencedIds = new Set<string>();

    allDialogues.forEach((d) => {
      d.Paths?.forEach((path) => {
        if (path.NextDialogueId) {
          referencedIds.add(path.NextDialogueId);
        }
      });
    });

    return allDialogues.filter((d) => d.id && !referencedIds.has(d.id));
  }
}

