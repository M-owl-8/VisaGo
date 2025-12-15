import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const MAX_TOASTS = 5;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast,
    };

    set((state) => {
      const newToasts = [...state.toasts, newToast];
      // Keep only the last MAX_TOASTS
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) };
      }
      return { toasts: newToasts };
    });

    // Auto-dismiss if duration is set
    if (newToast.duration) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions for common toast types
export const toast = {
  success: (message: string, options?: { action?: ToastAction; duration?: number }) =>
    useToastStore.getState().addToast({ message, variant: 'success', ...options }),
  
  error: (message: string, options?: { action?: ToastAction; duration?: number }) =>
    useToastStore.getState().addToast({ message, variant: 'error', ...options }),
  
  info: (message: string, options?: { action?: ToastAction; duration?: number }) =>
    useToastStore.getState().addToast({ message, variant: 'info', ...options }),
  
  warning: (message: string, options?: { action?: ToastAction; duration?: number }) =>
    useToastStore.getState().addToast({ message, variant: 'warning', ...options }),
};

