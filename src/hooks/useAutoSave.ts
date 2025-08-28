'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Status of the auto-save operation
 */
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'success' | 'error';

/**
 * Configuration options for the useAutoSave hook
 */
export interface UseAutoSaveOptions<T> {
  /** Initial value for the data */
  initialValue: T;
  /** Function to save the data - should return a Promise */
  saveFunction: (value: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 3000ms) */
  debounceMs?: number;
  /** Whether to enable auto-save (default: true) */
  enabled?: boolean;
  /** Duration to show success status in milliseconds (default: 2000ms) */
  successDisplayMs?: number;
}

/**
 * Return type for the useAutoSave hook
 */
export interface UseAutoSaveReturn<T> {
  /** Current value */
  value: T;
  /** Function to update the value */
  setValue: (value: T | ((prev: T) => T)) => void;
  /** Current auto-save status */
  status: AutoSaveStatus;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Manually trigger a save operation */
  save: () => Promise<void>;
  /** Reset error state */
  clearError: () => void;
  /** Check if there are unsaved changes */
  hasUnsavedChanges: boolean;
}

/**
 * Custom React hook for auto-saving data with debouncing
 * 
 * Features:
 * - Auto-saves after a specified debounce period (default: 3 seconds)
 * - Handles loading states during save operations
 * - Provides success/error feedback
 * - Optimistic updates for better UX
 * - Prevents multiple simultaneous save requests
 * - Proper cleanup on unmount to prevent memory leaks
 * - TypeScript support with comprehensive error handling
 * 
 * @example
 * ```typescript
 * const saveNotes = async (notes: string) => {
 *   await fetch('/api/records/notes', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ notes })
 *   });
 * };
 * 
 * const {
 *   value: notes,
 *   setValue: setNotes,
 *   status,
 *   isSaving,
 *   error
 * } = useAutoSave({
 *   initialValue: '',
 *   saveFunction: saveNotes,
 *   debounceMs: 3000
 * });
 * ```
 * 
 * @param options Configuration options for the hook
 * @returns Object containing value, setter, and save state information
 */
export function useAutoSave<T>({
  initialValue,
  saveFunction,
  debounceMs = 3000,
  enabled = true,
  successDisplayMs = 2000
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  // State management
  const [value, setValue] = useState<T>(initialValue);
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Refs for managing timers and preventing race conditions
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedValueRef = useRef<T>(initialValue);
  const mountedRef = useRef(true);

  // Derived state
  const isSaving = status === 'saving';
  const hasUnsavedChanges = JSON.stringify(value) !== JSON.stringify(lastSavedValueRef.current);

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async (valueToSave: T): Promise<void> => {
    // Prevent multiple simultaneous saves
    if (isSavingRef.current || !mountedRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;
      setStatus('saving');
      setError(null);

      await saveFunction(valueToSave);

      if (!mountedRef.current) return;

      // Update last saved value
      lastSavedValueRef.current = valueToSave;
      setStatus('success');

      // Clear success status after specified duration
      successTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setStatus('idle');
        }
      }, successDisplayMs);

    } catch (err) {
      if (!mountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      setStatus('error');
      console.error('Auto-save failed:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFunction, successDisplayMs]);

  /**
   * Manual save function
   */
  const save = useCallback(async (): Promise<void> => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    // Clear any pending auto-save
    clearTimers();
    await performSave(value);
  }, [enabled, hasUnsavedChanges, value, clearTimers, performSave]);

  /**
   * Debounced auto-save effect
   */
  useEffect(() => {
    // Skip if auto-save is disabled, no changes, or currently saving
    if (!enabled || !hasUnsavedChanges || isSavingRef.current) {
      return;
    }

    // Clear existing debounce timer
    clearTimers();

    // Set status to pending to indicate auto-save is scheduled
    setStatus('pending');

    // Set up new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current && enabled) {
        performSave(value);
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      clearTimers();
    };
  }, [value, enabled, hasUnsavedChanges, debounceMs, clearTimers, performSave]);

  /**
   * Custom setValue function that handles both direct values and updater functions
   */
  const setValueWrapper = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prevValue => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevValue)
        : newValue;
      
      // Clear error when user starts typing again
      if (error) {
        setError(null);
      }

      return nextValue;
    });
  }, [error]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    value,
    setValue: setValueWrapper,
    status,
    isSaving,
    error,
    save,
    clearError,
    hasUnsavedChanges
  };
}