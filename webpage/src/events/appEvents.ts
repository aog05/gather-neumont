type VoidHandler = () => void;
type BooleanHandler = (isOpen: boolean) => void;

const openDailyQuizListeners = new Set<VoidHandler>();
const dailyQuizOpenChangedListeners = new Set<BooleanHandler>();

export const appEvents = {
  onOpenDailyQuiz(handler: VoidHandler) {
    openDailyQuizListeners.add(handler);
    return () => openDailyQuizListeners.delete(handler);
  },
  emitOpenDailyQuiz() {
    for (const handler of openDailyQuizListeners) handler();
  },

  onDailyQuizOpenChanged(handler: BooleanHandler) {
    dailyQuizOpenChangedListeners.add(handler);
    return () => dailyQuizOpenChangedListeners.delete(handler);
  },
  emitDailyQuizOpenChanged(isOpen: boolean) {
    for (const handler of dailyQuizOpenChangedListeners) handler(isOpen);
  },
};

