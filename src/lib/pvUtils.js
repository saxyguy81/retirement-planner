/**
 * Present Value utilities - centralized for consistency
 * Replaces duplicate implementations in ProjectionsTable, Dashboard,
 * ScenarioComparison, and HeirAnalysis
 */
import { fK } from './calculationDefinitions';

export const applyPV = (value, yearsFromStart, discountRate) => {
  if (typeof value !== 'number' || isNaN(value)) return value;
  return value / Math.pow(1 + discountRate, yearsFromStart);
};

/**
 * Format value with optional dual PV/FV display
 * Returns structured data for component rendering
 *
 * In FV mode: returns single FV value (no label)
 * In PV mode: returns PV as primary (closest to symbol), FV labeled above
 *
 * @param {number} fvValue - The future value
 * @param {number} yearsFromStart - Years from year 0
 * @param {number} discountRate - e.g., 0.03
 * @param {boolean} showPV - Whether PV mode is enabled
 * @param {function} formatter - Formatting function (e.g., fK, fM)
 * @returns {{ primary: string, secondary: string|null }}
 */
export const formatDualValue = (fvValue, yearsFromStart, discountRate, showPV, formatter = fK) => {
  const pvValue = applyPV(fvValue, yearsFromStart, discountRate);

  // FV mode: just show FV, no label
  if (!showPV) {
    return { primary: formatter(fvValue), secondary: null };
  }

  // PV mode: skip dual display if values are nearly equal (year 0 or small diff)
  if (yearsFromStart === 0 || Math.abs(fvValue - pvValue) < 100) {
    return { primary: formatter(pvValue), secondary: null };
  }

  // PV mode: dual display - PV primary (closest to symbol), FV secondary (labeled, above)
  return {
    primary: formatter(pvValue),
    secondary: `FV: ${formatter(fvValue)}`,
  };
};
