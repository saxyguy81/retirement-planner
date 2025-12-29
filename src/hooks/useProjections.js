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
const SETTINGS_KEY = 'retirement-planner-settings';

// Default options
const DEFAULT_OPTIONS = { iterativeTax: true, maxIterations: 5 };

// Default settings (global configuration)
// NOTE: Heirs and discountRate have been moved to DEFAULT_PARAMS (in taxTables.js)
// for direct access in InputPanel
const DEFAULT_SETTINGS = {
  // User Profile
  primaryName: 'Ira',
  primaryBirthYear: 1955, // 2/17/55
  spouseName: 'Carol',
  spouseBirthYear: 1954, // 7/17/54

  // Tax Settings
  taxYear: 2025, // Updated to current year
  ssExemptionMode: 'through2028', // 'disabled' | 'through2028' | 'permanent' - Trump proposal default

  // Display Preferences
  defaultPV: true,
  displayPrecision: 'abbreviated', // 'abbreviated' | 'dollars' | 'cents'

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

  const [settings, setSettings] = useState(() => {
    const restored = loadSettings();
    return restored || { ...DEFAULT_SETTINGS };
  });

  // Auto-save whenever params or options change
  useEffect(() => {
    saveCurrentState(params, options);
  }, [params, options]);

  // Auto-save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

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
  const updateRothConversion = useCallback((year, amount) => {
    setParams(prev => ({
      ...prev,
      rothConversions: { ...prev.rothConversions, [year]: amount },
    }));
  }, []);

  // Update expense override for a specific year
  const updateExpenseOverride = useCallback((year, amount) => {
    setParams(prev => {
      const newOverrides = { ...prev.expenseOverrides };
      if (amount === null || amount === 0) {
        delete newOverrides[year]; // Remove override if cleared
      } else {
        newOverrides[year] = amount;
      }
      return { ...prev, expenseOverrides: newOverrides };
    });
  }, []);

  // Update AT harvest override for a specific year
  const updateATHarvest = useCallback((year, amount) => {
    setParams(prev => {
      const newOverrides = { ...(prev.atHarvestOverrides || {}) };
      if (amount === null || amount === 0) {
        delete newOverrides[year]; // Remove override if cleared
      } else {
        newOverrides[year] = amount;
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

  // Save current state with optional name
  const saveState = useCallback(
    (name = '') => {
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
    },
    [params, options, savedStates]
  );

  // Load a saved state
  const loadState = useCallback(
    stateId => {
      const state = savedStates.find(s => s.id === stateId);
      if (state) {
        setParams({ ...DEFAULT_PARAMS, ...state.params });
        setOptions({ ...DEFAULT_OPTIONS, ...state.options });
      }
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
  };
}

export default useProjections;
