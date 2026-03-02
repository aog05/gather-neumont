import { db, COLLECTIONS } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * Analytics Event Types
 */
export enum AnalyticsEventType {
  // Session Events
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  
  // NPC Events
  NPC_INTERACTION = 'npc_interaction',
  DIALOGUE_START = 'dialogue_start',
  DIALOGUE_END = 'dialogue_end',
  
  // Quest Events
  QUEST_START = 'quest_start',
  QUEST_COMPLETE = 'quest_complete',
  QUEST_ABANDON = 'quest_abandon',
  
  // Quiz Events
  QUIZ_START = 'quiz_start',
  QUIZ_COMPLETE = 'quiz_complete',
  QUIZ_ATTEMPT = 'quiz_attempt',
  
  // Navigation Events
  SCENE_ENTER = 'scene_enter',
  SCENE_EXIT = 'scene_exit',
  
  // Cosmetic Events
  COSMETIC_PURCHASE = 'cosmetic_purchase',
  COSMETIC_EQUIP = 'cosmetic_equip',
}

/**
 * Analytics Event Data Interface
 */
export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  playerId: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Analytics Service for tracking player events
 * Implements batching and async logging to minimize performance impact
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private eventQueue: Omit<AnalyticsEvent, 'timestamp'>[] = [];
  private batchSize = 10;
  private batchInterval = 30000; // 30 seconds
  private batchTimer: NodeJS.Timeout | null = null;
  private enabled = true;
  private sessionStartTime: number | null = null;

  private constructor() {
    this.startBatchTimer();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Enable or disable analytics tracking
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    } else if (enabled && !this.batchTimer) {
      this.startBatchTimer();
    }
  }

  /**
   * Start batch timer for periodic flushing
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.batchInterval);
  }

  /**
   * Track an analytics event
   */
  public async trackEvent(
    eventType: AnalyticsEventType,
    playerId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      // Add to queue
      this.eventQueue.push({
        eventType,
        playerId,
        metadata,
      });

      // Flush if batch size reached
      if (this.eventQueue.length >= this.batchSize) {
        await this.flush();
      }
    } catch (error) {
      console.error('[AnalyticsService] Error tracking event:', error);
    }
  }

  /**
   * Flush event queue to Firebase
   */
  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send events to Firebase in parallel
      const promises = eventsToSend.map((event) =>
        addDoc(collection(db, 'Analytics'), {
          ...event,
          timestamp: serverTimestamp(),
        })
      );

      await Promise.all(promises);
      console.log(`[AnalyticsService] Flushed ${eventsToSend.length} events`);
    } catch (error) {
      console.error('[AnalyticsService] Error flushing events:', error);
      // Re-add failed events to queue
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  /**
   * Track session start
   */
  public async trackSessionStart(playerId: string): Promise<void> {
    this.sessionStartTime = Date.now();
    await this.trackEvent(AnalyticsEventType.SESSION_START, playerId, {
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    });
  }

  /**
   * Track session end
   */
  public async trackSessionEnd(playerId: string): Promise<void> {
    const duration = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    await this.trackEvent(AnalyticsEventType.SESSION_END, playerId, {
      durationMs: duration,
      durationMinutes: Math.round(duration / 60000),
    });
    await this.flush(); // Ensure session end is sent immediately
  }
}

