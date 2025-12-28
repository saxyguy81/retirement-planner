/**
 * useProjections Hook
 * Manages projection state and recalculation
 * Includes localStorage persistence for auto-restore and named saves
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { generateProjections, calculateSummary, DEFAULT_PARAMS } from '../lib';

// localStorage keys
const STORAGE_KEY = 'retirement-planner-state';
const SAVED_STATES_KEY = 'retirement-planner-saved-states';

// Default options
const DEFAULT_OPTIONS = { iterativeTax: true, maxIterations: 5 };

// Helper: Load last state from localStorage
const loadLastState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        params: { ...DEFAULT_PARAMS, ...parsed.params },
        options: { ...DEFAULT_OPTIONS, ...parsed.options },
      };
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return null;
};

// Helper: Save current state to localStorage
const saveCurrentState = (params, options) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, options }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

// Helper: Load all saved states
const loadSavedStates = () => {
  try {
    const saved = localStorage.getItem(SAVED_STATES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load saved states:', e);
  }
  return [];
};

// Helper: Save states list
const saveSavedStates = (states) => {
  try {
    localStorage.setItem(SAVED_STATES_KEY, JSON.stringify(states));
  } catch (e) {
    console.error('Failed to save states list:', e);
  }
};

export function useProjections(initialParams = {}) {
  // Auto-restore last state or use defaults
  const [params, setParams] = useState(() => {
    const restored = loadLastState();
    if (restored) {
      return restored.params;
    }
    return { ...DEFAULT_PARAMS, ...initialParams };
  });

  const [options, setOptions] = useState(() => {
    const restored = loadLastState();
    if (restored) {
      return restored.options;
    }
    return { ...DEFAULT_OPTIONS };
  });

  const [savedStates, setSavedStates] = useState(() => loadSavedStates());

  // Auto-save whenever params or options change
  useEffect(() => {
    saveCurrentState(params, options);
  }, [params, options]);
  
  // Memoized projections - recalculates only when params/options change
  const projections = useMemo(() => {
    return generateProjections({ ...params, ...options });
  }, [params, options]);
  
  // Summary statistics
  const summary = useMemo(() => {
    return calculateSummary(projections);
  }, [projections]);
  
  // Update a single parameter
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Update multiple parameters at once
  const updateParams = useCallback((updates) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Update Roth conversion for a specific year
  const updateRothConversion = useCallback((year, amount) => {
    setParams(prev => ({
      ...prev,
      rothConversions: { ...prev.rothConversions, [year]: amount }
    }));
  }, []);
  
  // Reset to defaults
  const resetParams = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  // Toggle iterative tax calculation
  const toggleIterative = useCallback(() => {
    setOptions(prev => ({ ...prev, iterativeTax: !prev.iterativeTax }));
  }, []);

  // Set max iterations
  const setMaxIterations = useCallback((max) => {
    setOptions(prev => ({ ...prev, maxIterations: max }));
  }, []);

  // Save current state with optional name
  const saveState = useCallback((name = '') => {
    const newState = {
      id: Date.now(),
      name: name.trim() || `Saved ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      params: { ...params },
      options: { ...options },
    };
    const updated = [...savedStates, newState];
    setSavedStates(updated);
    saveSavedStates(updated);
    return newState;
  }, [params, options, savedStates]);

  // Load a saved state
  const loadState = useCallback((stateId) => {
    const state = savedStates.find(s => s.id === stateId);
    if (state) {
      setParams({ ...DEFAULT_PARAMS, ...state.params });
      setOptions({ ...DEFAULT_OPTIONS, ...state.options });
    }
  }, [savedStates]);

  // Delete a saved state
  const deleteState = useCallback((stateId) => {
    const updated = savedStates.filter(s => s.id !== stateId);
    setSavedStates(updated);
    saveSavedStates(updated);
  }, [savedStates]);

  // Reset to defaults (start fresh)
  const resetToDefaults = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS });
    setOptions({ ...DEFAULT_OPTIONS });
  }, []);

  return {
    params,
    options,
    projections,
    summary,
    updateParam,
    updateParams,
    updateRothConversion,
    resetParams,
    toggleIterative,
    setMaxIterations,
    setOptions,
    // State persistence
    savedStates,
    saveState,
    loadState,
    deleteState,
    resetToDefaults,
  };
}

export default useProjections;
