/**
 * useProjections Hook
 * Manages projection state and recalculation
 * Includes localStorage persistence for auto-restore and named saves
 * Includes undo/redo functionality for fearless exploration
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { generateProjections, calculateSummary, DEFAULT_PARAMS } from '../lib';
import { SAMPLE_PARAMS, SAMPLE_SETTINGS, SAMPLE_OPTIONS } from '../lib/sampleData';

// localStorage keys
const STORAGE_KEY = 'retirement-planner-state';
const SAVED_STATES_KEY = 'retirement-planner-saved-states';
const SETTINGS_KEY = 'retirement-planner-settings';
const VISITED_KEY = 'retirement-planner-visited';

// Default options
const DEFAULT_OPTIONS = { iterativeTax: true, maxIterations: 5 };

// Default settings (global configuration)
// NOTE: Heirs and discountRate have been moved to DEFAULT_PARAMS (in taxTables.js)
// for direct access in InputPanel
const DEFAULT_SETTINGS = {
  // User Profile
  primaryName: 'Primary',
  primaryBirthYear: 1960,
  spouseName: 'Spouse',
  spouseBirthYear: 1962,

  // Tax Settings
  taxYear: 2025, // Updated to current year
  ssExemptionMode: 'disabled', // 'disabled' | 'through2028' | 'permanent'

  // Display Preferences
  defaultPV: true,
  displayPrecision: 'sig3', // 'sig2' | 'sig3' | 'sig4' | 'dollars' | 'cents'

  // Custom Tax Brackets (null means use defaults)
  customBrackets: null,

  // Custom IRMAA Brackets (null means use defaults)
  customIRMAA: null,
};

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
const saveSavedStates = states => {
  try {
    localStorage.setItem(SAVED_STATES_KEY, JSON.stringify(states));
  } catch (e) {
    console.error('Failed to save states list:', e);
  }
};

// Helper: Load settings from localStorage
const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return null;
};

// Helper: Save settings to localStorage
const saveSettings = settings => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

// Helper: Check if this is a first visit (no saved data)
const isFirstVisit = () => {
  try {
    const hasVisited = localStorage.getItem(VISITED_KEY);
    const hasSavedState = localStorage.getItem(STORAGE_KEY);
    return !hasVisited && !hasSavedState;
  } catch (e) {
    return false;
  }
};

// Helper: Mark as visited
const markAsVisited = () => {
  try {
    localStorage.setItem(VISITED_KEY, 'true');
  } catch (e) {
    console.error('Failed to mark as visited:', e);
  }
};

export function useProjections(initialParams = {}) {
  // Check if this is a first visit for sample data
  const [isSampleData, setIsSampleData] = useState(() => isFirstVisit());

  // Auto-restore last state, use sample data on first visit, or use defaults
  const [params, setParams] = useState(() => {
    // First visit: use sample data
    if (isFirstVisit()) {
      return { ...DEFAULT_PARAMS, ...SAMPLE_PARAMS };
    }
    // Returning user: try to restore
    const restored = loadLastState();
    if (restored) {
      return restored.params;
    }
    return { ...DEFAULT_PARAMS, ...initialParams };
  });

  const [options, setOptions] = useState(() => {
    // First visit: use sample options
    if (isFirstVisit()) {
      return { ...DEFAULT_OPTIONS, ...SAMPLE_OPTIONS };
    }
    const restored = loadLastState();
    if (restored) {
      return restored.options;
    }
    return { ...DEFAULT_OPTIONS };
  });

  const [savedStates, setSavedStates] = useState(() => loadSavedStates());

  const [settings, setSettings] = useState(() => {
    // First visit: use sample settings
    if (isFirstVisit()) {
      return { ...DEFAULT_SETTINGS, ...SAMPLE_SETTINGS };
    }
    const restored = loadSettings();
    return restored || { ...DEFAULT_SETTINGS };
  });

  // Auto-save whenever params or options change (and mark as visited once user makes changes)
  useEffect(() => {
    saveCurrentState(params, options);
    // Mark as visited once user has made any changes (params saved means they're committed)
    if (!isFirstVisit()) {
      markAsVisited();
    }
  }, [params, options]);

  // Auto-save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Clear sample data flag when user modifies params
  const clearSampleData = useCallback(() => {
    setIsSampleData(false);
    markAsVisited();
  }, []);

  // Reset to sample data (for easy exploration)
  const resetToSampleData = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS, ...SAMPLE_PARAMS });
    setOptions({ ...DEFAULT_OPTIONS, ...SAMPLE_OPTIONS });
    setSettings(prev => ({ ...prev, ...SAMPLE_SETTINGS }));
    setIsSampleData(true);
  }, []);

  // Memoized projections - recalculates only when params/options/settings change
  // Merges relevant settings into projection params
  const projections = useMemo(() => {
    // Compute exemptSSFromTax based on ssExemptionMode
    const getExemptSSForYear = year => {
      const mode = settings.ssExemptionMode || 'disabled';
      if (mode === 'disabled') return false;
      if (mode === 'permanent') return true;
      // 'through2028' - only exempt from 2025-2028
      return year >= 2025 && year <= 2028;
    };

    const projectionParams = {
      ...params,
      ...options,
      // Use params values (heirs, discountRate now come from params/DEFAULT_PARAMS)
      heirs: params.heirs || [],
      discountRate: params.discountRate || 0.03,
      heirDistributionStrategy: params.heirDistributionStrategy || 'even',
      heirNormalizationYears: params.heirNormalizationYears || 10,
      // Function to check SS exemption per year
      getExemptSSForYear,
      // Legacy boolean for backward compatibility (uses first projection year)
      exemptSSFromTax: getExemptSSForYear(params.startYear || 2026),
      birthYear: settings.primaryBirthYear || params.birthYear,
      customBrackets: settings.customBrackets || null,
      customIRMAA: settings.customIRMAA || null,
      taxYear: settings.taxYear || 2025,
    };
    return generateProjections(projectionParams);
  }, [params, options, settings]);

  // Summary statistics
  const summary = useMemo(() => {
    return calculateSummary(projections);
  }, [projections]);

  // Update a single parameter
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple parameters at once
  const updateParams = useCallback(updates => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  // Update Roth conversion for a specific year
  const updateRothConversion = useCallback((year, amount, isPV = true) => {
    setParams(prev => {
      const newConversions = { ...prev.rothConversions };
      if (amount === null || amount === 0) {
        delete newConversions[year]; // Remove conversion if cleared
      } else {
        newConversions[year] = { amount, isPV };
      }
      return { ...prev, rothConversions: newConversions };
    });
  }, []);

  // Update expense override for a specific year
  const updateExpenseOverride = useCallback((year, amount, isPV = true) => {
    setParams(prev => {
      const newOverrides = { ...prev.expenseOverrides };
      if (amount === null || amount === 0) {
        delete newOverrides[year]; // Remove override if cleared
      } else {
        newOverrides[year] = { amount, isPV };
      }
      return { ...prev, expenseOverrides: newOverrides };
    });
  }, []);

  // Update AT harvest override for a specific year
  const updateATHarvest = useCallback((year, amount, isPV = true) => {
    setParams(prev => {
      const newOverrides = { ...(prev.atHarvestOverrides || {}) };
      if (amount === null || amount === 0) {
        delete newOverrides[year]; // Remove override if cleared
      } else {
        newOverrides[year] = { amount, isPV };
      }
      return { ...prev, atHarvestOverrides: newOverrides };
    });
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
  const setMaxIterations = useCallback(max => {
    setOptions(prev => ({ ...prev, maxIterations: max }));
  }, []);

  // Save current state with optional name and scenarios
  const saveState = useCallback(
    (name = '', scenarios = []) => {
      const newState = {
        id: Date.now(),
        name: name.trim() || `Saved ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        params: { ...params },
        options: { ...options },
        scenarios: scenarios,
      };
      const updated = [...savedStates, newState];
      setSavedStates(updated);
      saveSavedStates(updated);
      return newState;
    },
    [params, options, savedStates]
  );

  // Load a saved state and return scenarios for caller to restore
  const loadState = useCallback(
    stateId => {
      const state = savedStates.find(s => s.id === stateId);
      if (state) {
        setParams({ ...DEFAULT_PARAMS, ...state.params });
        setOptions({ ...DEFAULT_OPTIONS, ...state.options });
        return state.scenarios || [];
      }
      return [];
    },
    [savedStates]
  );

  // Delete a saved state
  const deleteState = useCallback(
    stateId => {
      const updated = savedStates.filter(s => s.id !== stateId);
      setSavedStates(updated);
      saveSavedStates(updated);
    },
    [savedStates]
  );

  // Reset to defaults (start fresh)
  const resetToDefaults = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS });
    setOptions({ ...DEFAULT_OPTIONS });
  }, []);

  // Update settings
  const updateSettings = useCallback(updates => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  // ============================================
  // UNDO/REDO FUNCTIONALITY
  // ============================================
  const UNDO_DEBOUNCE = 500; // ms
  const MAX_HISTORY = 50;

  const [history, setHistory] = useState(() => [{ params, options }]);
  const [historyPointer, setHistoryPointer] = useState(0);
  const debounceRef = useRef(null);
  const lastPushedRef = useRef(JSON.stringify({ params, options }));
  const isUndoingRef = useRef(false);

  // Push state to history (debounced)
  const pushToHistory = useCallback(
    (newParams, newOptions) => {
      // Skip if we're in the middle of an undo/redo operation
      if (isUndoingRef.current) return;

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const newState = { params: newParams, options: newOptions };
        const newStateStr = JSON.stringify(newState);

        // Skip if state hasn't changed
        if (newStateStr === lastPushedRef.current) return;

        lastPushedRef.current = newStateStr;

        setHistory(prev => {
          // Trim future states if we're not at the end
          const newHistory = prev.slice(0, historyPointer + 1);
          newHistory.push(newState);

          // Limit history size
          while (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
          }

          setHistoryPointer(newHistory.length - 1);
          return newHistory;
        });
      }, UNDO_DEBOUNCE);
    },
    [historyPointer]
  );

  // Track params/options changes for history
  useEffect(() => {
    pushToHistory(params, options);
  }, [params, options, pushToHistory]);

  // Undo
  const undo = useCallback(() => {
    if (historyPointer <= 0) return;

    isUndoingRef.current = true;
    const newPointer = historyPointer - 1;
    const prevState = history[newPointer];

    setParams(prevState.params);
    setOptions(prevState.options);
    setHistoryPointer(newPointer);
    lastPushedRef.current = JSON.stringify(prevState);

    // Reset flag after a tick to allow state to settle
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  }, [history, historyPointer]);

  // Redo
  const redo = useCallback(() => {
    if (historyPointer >= history.length - 1) return;

    isUndoingRef.current = true;
    const newPointer = historyPointer + 1;
    const nextState = history[newPointer];

    setParams(nextState.params);
    setOptions(nextState.options);
    setHistoryPointer(newPointer);
    lastPushedRef.current = JSON.stringify(nextState);

    // Reset flag after a tick to allow state to settle
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  }, [history, historyPointer]);

  const canUndo = historyPointer > 0;
  const canRedo = historyPointer < history.length - 1;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    params,
    options,
    projections,
    summary,
    updateParam,
    updateParams,
    updateRothConversion,
    updateExpenseOverride,
    updateATHarvest,
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
    // Settings
    settings,
    updateSettings,
    resetSettings,
    // Sample data
    isSampleData,
    clearSampleData,
    resetToSampleData,
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
    historyPosition: historyPointer + 1,
  };
}

export default useProjections;
