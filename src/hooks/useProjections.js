/**
 * useProjections Hook
 * Manages projection state and recalculation
 */

import { useState, useMemo, useCallback } from 'react';
import { generateProjections, calculateSummary, DEFAULT_PARAMS } from '../lib';

export function useProjections(initialParams = {}) {
  const [params, setParams] = useState({ ...DEFAULT_PARAMS, ...initialParams });
  const [options, setOptions] = useState({
    iterativeTax: true,
    maxIterations: 5,
  });
  
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
  };
}

export default useProjections;
