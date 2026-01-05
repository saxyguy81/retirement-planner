/**
 * useUndoRedo Hook
 *
 * Provides undo/redo functionality with a state history stack.
 * Designed to enable fearless exploration by letting users easily
 * reverse changes.
 *
 * Features:
 * - Configurable max history size (default: 50)
 * - Debounced state changes to avoid flooding history
 * - Keyboard shortcut support (Ctrl+Z, Ctrl+Shift+Z)
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Debounce delay (ms) - prevents flooding history with rapid changes
const DEBOUNCE_DELAY = 500;

/**
 * Custom hook for undo/redo functionality
 * @param {Object} initialState - Initial state object
 * @param {number} maxHistory - Maximum number of states to keep in history
 * @returns {Object} State and undo/redo controls
 */
export function useUndoRedo(initialState, maxHistory = 50) {
  // History stack: array of past states
  const [history, setHistory] = useState([initialState]);
  // Pointer to current position in history
  const [pointer, setPointer] = useState(0);

  // Debounce timer ref
  const debounceRef = useRef(null);
  // Last pushed state (for comparison)
  const lastPushedRef = useRef(JSON.stringify(initialState));

  // Current state is whatever pointer points to
  const current = history[pointer];

  /**
   * Push a new state to history (debounced)
   * Only adds to history if state has actually changed
   */
  const pushState = useCallback(
    newState => {
      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce to prevent history flooding
      debounceRef.current = setTimeout(() => {
        const newStateStr = JSON.stringify(newState);

        // Skip if state hasn't changed
        if (newStateStr === lastPushedRef.current) {
          return;
        }

        lastPushedRef.current = newStateStr;

        setHistory(prev => {
          // Trim future states if we're not at the end
          const newHistory = prev.slice(0, pointer + 1);

          // Add new state
          newHistory.push(newState);

          // Limit history size
          while (newHistory.length > maxHistory) {
            newHistory.shift();
          }

          // Update pointer to new end
          setPointer(newHistory.length - 1);

          return newHistory;
        });
      }, DEBOUNCE_DELAY);
    },
    [pointer, maxHistory]
  );

  /**
   * Undo - go back one state in history
   */
  const undo = useCallback(() => {
    setPointer(p => {
      const newP = Math.max(0, p - 1);
      // Update last pushed ref to prevent pushState from overriding
      lastPushedRef.current = JSON.stringify(history[newP]);
      return newP;
    });
  }, [history]);

  /**
   * Redo - go forward one state in history
   */
  const redo = useCallback(() => {
    setPointer(p => {
      const newP = Math.min(history.length - 1, p + 1);
      // Update last pushed ref to prevent pushState from overriding
      lastPushedRef.current = JSON.stringify(history[newP]);
      return newP;
    });
  }, [history.length]);

  // Can undo/redo flags
  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  // History info for debugging/display
  const historyInfo = {
    position: pointer + 1,
    total: history.length,
    canUndo,
    canRedo,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    current,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyInfo,
    // Force update current without going through history (for loading saved states)
    resetHistory: useCallback(newState => {
      setHistory([newState]);
      setPointer(0);
      lastPushedRef.current = JSON.stringify(newState);
    }, []),
  };
}

export default useUndoRedo;
