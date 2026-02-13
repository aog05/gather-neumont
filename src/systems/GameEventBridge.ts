/**
 * GameEventBridge - Centralized event communication between Phaser and React
 *
 * Provides a singleton EventEmitter that allows Phaser scenes and React components
 * to communicate without tight coupling. This pattern will serve all future UI
 * overlays (inventory, quests, profile, etc.).
 *
 * Event Contracts:
 * - Phaser → React:
 *   - 'dialogue:start' → { npcId, node: DialogueNode }
 *   - 'dialogue:update' → { node: DialogueNode }
 *   - 'dialogue:end' → {}
 *   - 'player:state' → { state: 'EXPLORING' | 'DIALOGUE' }
 *
 * - React → Phaser:
 *   - 'dialogue:response' → { responseId: string }
 *   - 'dialogue:close' → {}
 *
 * @example
 * ```typescript
 * // In Phaser scene
 * const bridge = GameEventBridge.getInstance();
 * bridge.emit('dialogue:start', { npcId: 'prof_smith', node: startNode });
 *
 * // In React component
 * useEffect(() => {
 *   const bridge = GameEventBridge.getInstance();
 *   const handler = (data) => setCurrentNode(data.node);
 *   bridge.on('dialogue:update', handler);
 *   return () => bridge.off('dialogue:update', handler);
 * }, []);
 * ```
 */
export class GameEventBridge extends Phaser.Events.EventEmitter {
  private static instance: GameEventBridge;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of GameEventBridge
   * @returns The singleton instance
   */
  public static getInstance(): GameEventBridge {
    if (!GameEventBridge.instance) {
      GameEventBridge.instance = new GameEventBridge();
    }
    return GameEventBridge.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * @internal
   */
  public static resetInstance(): void {
    if (GameEventBridge.instance) {
      GameEventBridge.instance.removeAllListeners();
      GameEventBridge.instance = null as any;
    }
  }
}
