import { toast } from '@/lib/stores/toast';

export interface OptimisticUpdateOptions<T> {
  optimisticData: T;
  apiCall: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRollback?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Perform an optimistic UI update
 * Updates the UI immediately, then confirms with API
 * Rolls back on error with toast notification
 */
export async function optimisticUpdate<T>({
  optimisticData,
  apiCall,
  onSuccess,
  onError,
  onRollback,
  successMessage,
  errorMessage,
}: OptimisticUpdateOptions<T>): Promise<T | null> {
  // Update UI optimistically
  if (onSuccess) {
    onSuccess(optimisticData);
  }

  try {
    // Call API to confirm
    const result = await apiCall();

    // If API returns different data, update again
    if (onSuccess && result !== optimisticData) {
      onSuccess(result);
    }

    // Show success toast if message provided
    if (successMessage) {
      toast.success(successMessage);
    }

    return result;
  } catch (error) {
    // Rollback on error
    if (onRollback) {
      onRollback();
    }

    // Show error toast
    const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
    toast.error(message, {
      action: {
        label: 'Retry',
        onClick: () => {
          // Retry the operation
          optimisticUpdate({
            optimisticData,
            apiCall,
            onSuccess,
            onError,
            onRollback,
            successMessage,
            errorMessage,
          });
        },
      },
    });

    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }

    return null;
  }
}

/**
 * Create an optimistic state manager
 * Useful for managing multiple optimistic updates
 */
export class OptimisticStateManager<T> {
  private originalState: T;
  private currentState: T;

  constructor(initialState: T) {
    this.originalState = initialState;
    this.currentState = initialState;
  }

  update(newState: T): void {
    this.currentState = newState;
  }

  rollback(): void {
    this.currentState = this.originalState;
  }

  getState(): T {
    return this.currentState;
  }

  commit(): void {
    this.originalState = this.currentState;
  }
}

