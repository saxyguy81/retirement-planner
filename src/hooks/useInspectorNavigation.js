/**
 * useInspectorNavigation Hook
 * Manages navigation history for the CalculationInspector
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing calculation inspector navigation history
 * Provides browser-like back/forward navigation between calculations
 */
export function useInspectorNavigation() {
  // History stack: [{field, year, data}]
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Current inspection state
  const current = historyIndex >= 0 ? history[historyIndex] : null;

  // Navigate to a new field (adds to history)
  const navigateTo = useCallback(
    (field, year, data) => {
      setHistory(prev => {
        // Truncate forward history if navigating from middle
        const truncated = prev.slice(0, historyIndex + 1);
        // Limit history depth to 100 entries
        const limited = truncated.length >= 100 ? truncated.slice(1) : truncated;
        return [...limited, { field, year, data }];
      });
      setHistoryIndex(prev => Math.min(prev + 1, 99));
    },
    [historyIndex]
  );

  // Go back in history
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  // Go forward in history
  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Close inspector and clear history
  const close = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Can navigate?
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return {
    current,
    navigateTo,
    goBack,
    goForward,
    close,
    canGoBack,
    canGoForward,
    historyLength: history.length,
    historyIndex,
  };
}

export default useInspectorNavigation;
