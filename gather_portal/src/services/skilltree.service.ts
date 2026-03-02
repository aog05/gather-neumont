import { FirestoreService } from './firestore.service';
import { COLLECTIONS } from '../lib/firebase';
import type { SkillTreeItems } from '../types/firestore.types';

export class SkillTreeService extends FirestoreService<SkillTreeItems> {
  constructor() {
    super(COLLECTIONS.SKILL_TREE_ITEMS);
  }

  /**
   * Get skills by proficiency level
   */
  async getSkillsByProficiency(proficiency: string): Promise<SkillTreeItems[]> {
    return this.getAll({
      filters: [{ field: 'Proficiency', operator: '==', value: proficiency }],
    });
  }

  /**
   * Get skills by source
   */
  async getSkillsBySource(source: string): Promise<SkillTreeItems[]> {
    return this.getAll({
      filters: [{ field: 'Source', operator: '==', value: source }],
    });
  }

  /**
   * Search skills by name
   */
  async searchSkills(searchTerm: string): Promise<SkillTreeItems[]> {
    const allSkills = await this.getAll();
    const lowerSearch = searchTerm.toLowerCase();

    return allSkills.filter((skill) =>
      skill.Name.toLowerCase().includes(lowerSearch)
    );
  }
}

