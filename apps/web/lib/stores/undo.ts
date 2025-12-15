import { create } from 'zustand';

interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  timestamp: number;
}

interface UndoState {
  actions: UndoableAction[];
  addAction: (action: Omit<UndoableAction, 'id' | 'timestamp'>) => string;
  performUndo: (id: string) => Promise<void>;
  clearAction: (id: string) => void;
  clearOldActions: () => void;
}

const UNDO_WINDOW_MS = 5000; // 5 seconds to undo

export const useUndoStore = create<UndoState>((set, get) => ({
  actions: [],

  addAction: (action) => {
    const id = Math.random().toString(36).substring(2, 11);
    const undoAction: UndoableAction = {
      id,
      ...action,
      timestamp: Date.now(),
    };

    set((state) => ({
      actions: [...state.actions, undoAction],
    }));

    // Auto-remove after undo window expires
    setTimeout(() => {
      get().clearAction(id);
    }, UNDO_WINDOW_MS);

    return id;
  },

  performUndo: async (id) => {
    const action = get().actions.find((a) => a.id === id);
    if (!action) return;

    try {
      await action.undo();
      set((state) => ({
        actions: state.actions.filter((a) => a.id !== id),
      }));
    } catch (error) {
      console.error('[Undo] Failed to undo action:', error);
      throw error;
    }
  },

  clearAction: (id) => {
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
    }));
  },

  clearOldActions: () => {
    const now = Date.now();
    set((state) => ({
      actions: state.actions.filter((a) => now - a.timestamp < UNDO_WINDOW_MS),
    }));
  },
}));

// Keyboard shortcut for undo (Cmd+Z / Ctrl+Z)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      const { actions, performUndo } = useUndoStore.getState();
      const lastAction = actions[actions.length - 1];
      if (lastAction) {
        e.preventDefault();
        performUndo(lastAction.id);
      }
    }
  });
}

