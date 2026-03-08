/**
 * QuestToast - SG10: Global toast notification system for quest events.
 *
 * Listens to the GameEventBridge for:
 *   - quest:started           → "Quest Started!" toast
 *   - quest:completed         → "Quest Complete!" toast with points
 *   - quest:objective:updated → "Objective Updated" toast (only when completed)
 *   - quest:expired           → "Quest Expired" toast
 *   - quest:cosmetic:granted  → "Cosmetic Unlocked" toast (SG5)
 *
 * Renders a stacked list of dismissible toasts in the bottom-right corner.
 * Each toast auto-dismisses after 4 seconds.
 */

import { useState, useEffect, useCallback } from 'react';
import { GameEventBridge } from '../systems/GameEventBridge';
import type {
  QuestTimerExpiredPayload,
  QuestCosmeticGrantedPayload,
} from '../types/quest.types';
import './QuestToast.css';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  variant: ToastVariant;
  icon: string;
  title: string;
  message: string;
}

let _toastId = 0;

export default function QuestToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const bridge = GameEventBridge.getInstance();

    const onStarted = (data: { questId: string; questTitle?: string }) => {
      addToast({
        variant: 'info',
        icon: '📜',
        title: 'Quest Started!',
        message: data.questTitle ?? data.questId,
      });
    };

    const onCompleted = (data: { questId: string; questTitle?: string; rewardPoints?: number }) => {
      addToast({
        variant: 'success',
        icon: '✅',
        title: 'Quest Complete!',
        message: `${data.questTitle ?? data.questId}${data.rewardPoints ? ` · +${data.rewardPoints} pts` : ''}`,
      });
    };

    const onObjectiveUpdated = (data: { questId: string; objectiveId: string; completed: boolean }) => {
      if (!data.completed) return; // Only toast when an objective is freshly completed
      addToast({
        variant: 'info',
        icon: '🎯',
        title: 'Objective Complete',
        message: `Objective "${data.objectiveId}" finished for quest ${data.questId}`,
      });
    };

    const onExpired = (data: QuestTimerExpiredPayload) => {
      addToast({
        variant: 'error',
        icon: '⏰',
        title: 'Quest Expired',
        message: data.questTitle ?? data.questId,
      });
    };

    const onCosmeticGranted = (data: QuestCosmeticGrantedPayload) => {
      addToast({
        variant: 'success',
        icon: '🎨',
        title: 'Cosmetic Unlocked!',
        message: `${data.cosmeticName} (${data.cosmeticType})`,
      });
    };

    bridge.on('quest:started', onStarted);
    bridge.on('quest:completed', onCompleted);
    bridge.on('quest:objective:updated', onObjectiveUpdated);
    bridge.on('quest:expired', onExpired);
    bridge.on('quest:cosmetic:granted', onCosmeticGranted);

    return () => {
      bridge.off('quest:started', onStarted);
      bridge.off('quest:completed', onCompleted);
      bridge.off('quest:objective:updated', onObjectiveUpdated);
      bridge.off('quest:expired', onExpired);
      bridge.off('quest:cosmetic:granted', onCosmeticGranted);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="quest-toast-container" aria-live="polite" aria-label="Quest notifications">
      {toasts.map(toast => (
        <div key={toast.id} className={`quest-toast quest-toast--${toast.variant}`}>
          <span className="quest-toast-icon">{toast.icon}</span>
          <div className="quest-toast-body">
            <p className="quest-toast-title">{toast.title}</p>
            <p className="quest-toast-message">{toast.message}</p>
          </div>
          <button className="quest-toast-dismiss" onClick={() => dismiss(toast.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

