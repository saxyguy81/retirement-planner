/**
 * FormulaDisplay - Shows calculation formula with both PV and FV values
 *
 * When PV mode is active, shows:
 * - PV line (primary): clickable values discounted to present
 * - FV line (reference): nominal values in dimmer style
 *
 * When PV mode is off, shows:
 * - Single line with clickable future values
 */

import { Fragment, useMemo } from 'react';

import { ClickableValue } from './ClickableValue';
import { fK, fM, f$ } from '../../lib/calculationDefinitions';
import { CELL_DEPENDENCIES } from '../../lib/calculationDependencies';

/**
 * Format a value appropriately based on magnitude
 * @param {number} value - The value to format
 * @returns {string} Formatted string
 */
function formatK(value) {
  if (value == null || isNaN(value)) return '-';
  if (Math.abs(value) >= 1e6) {
    return fM(value);
  }
  if (Math.abs(value) >= 1e3) {
    return fK(value);
  }
  return f$(value);
}

/**
 * Apply Present Value discount factor
 * PV = FV / (1 + r)^n
 */
function applyPV(value, yearsFromStart, discountRate) {
  if (typeof value !== 'number' || isNaN(value)) return value;
  const pvFactor = Math.pow(1 + discountRate, yearsFromStart);
  return value / pvFactor;
}

/**
 * FormulaDisplay component
 *
 * @param {Object} props
 * @param {Object} props.calc - The calculation definition from CALCULATIONS
 * @param {Object} props.computed - The computed result from calc.compute()
 * @param {Object} props.activeData - Current year's projection data
 * @param {number} props.activeYear - The year being inspected
 * @param {Array} props.allProjections - All projection data
 * @param {boolean} props.showPV - Whether PV mode is active
 * @param {number} props.discountRate - The discount rate for PV calculations
 * @param {Function} props.onNavigate - Navigation callback (field, year) => void
 */
export function FormulaDisplay({
  calc,
  computed,
  activeData,
  activeYear,
  allProjections,
  showPV,
  discountRate,
  onNavigate,
}) {
  // Get dependencies for this calculation
  const dependencies = useMemo(() => {
    if (!calc?.key) return [];
    const getDeps = CELL_DEPENDENCIES[calc.key];
    if (!getDeps) return [];
    return getDeps(activeYear, activeData, allProjections);
  }, [calc?.key, activeYear, activeData, allProjections]);

  // Compute values for each dependency (both PV and FV)
  const depValues = useMemo(() => {
    return dependencies.map(dep => {
      const depData = allProjections.find(p => p.year === dep.year) || activeData;
      const fvValue = depData?.[dep.field] || 0;
      const yearsFromStart = depData?.yearsFromStart || 0;
      const pvValue = applyPV(fvValue, yearsFromStart, discountRate);

      return {
        ...dep,
        fvValue,
        pvValue,
        yearsFromStart,
      };
    });
  }, [dependencies, allProjections, activeData, discountRate]);

  // Handle input fields (no formula - show source instead)
  if (!calc?.formula || dependencies.length === 0) {
    return (
      <div className="text-slate-400 text-sm">
        <span className="text-amber-400">Input value</span>
        <p className="mt-2 text-slate-500">This value comes from your inputs, not a calculation.</p>
      </div>
    );
  }

  // Get formula string (may be a getter)
  const formulaString = typeof calc.formula === 'function' ? calc.formula() : calc.formula;

  // Compute total result values
  const fvResult = computed?.simple || formatK(activeData[calc.key]);
  const pvResult =
    computed?.simpleSecondary ||
    (showPV
      ? formatK(applyPV(activeData[calc.key], activeData.yearsFromStart, discountRate))
      : null);

  return (
    <div className="space-y-3">
      {/* Symbolic formula */}
      <div className="text-slate-400 text-sm font-mono whitespace-pre-wrap">{formulaString}</div>

      {/* Values - PV primary when in PV mode */}
      <div className="bg-slate-800 rounded p-3 font-mono text-sm">
        {showPV ? (
          <>
            {/* PV line (primary) */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-500 w-8 shrink-0">PV:</span>
              {depValues.map((dep, i) => (
                <Fragment key={`${dep.field}-${dep.year}`}>
                  {i > 0 && <span className="text-slate-600 mx-1">+</span>}
                  <ClickableValue
                    value={dep.pvValue}
                    field={dep.field}
                    year={dep.year}
                    onNavigate={onNavigate}
                    className="text-amber-400"
                  />
                </Fragment>
              ))}
              <span className="text-slate-600 mx-2">=</span>
              <span className="text-emerald-400 font-bold">{pvResult || fvResult}</span>
            </div>

            {/* FV line (reference) */}
            <div className="flex items-center gap-1 flex-wrap mt-1 opacity-60">
              <span className="text-slate-500 w-8 shrink-0">FV:</span>
              {depValues.map((dep, i) => (
                <Fragment key={`fv-${dep.field}-${dep.year}`}>
                  {i > 0 && <span className="text-slate-700 mx-1">+</span>}
                  <span className="text-slate-500 font-mono text-sm">({formatK(dep.fvValue)})</span>
                </Fragment>
              ))}
              <span className="text-slate-700 mx-2">=</span>
              <span className="text-slate-500">({fvResult})</span>
            </div>
          </>
        ) : (
          /* FV only (default mode) */
          <div className="flex items-center gap-1 flex-wrap">
            {depValues.map((dep, i) => (
              <Fragment key={`${dep.field}-${dep.year}`}>
                {i > 0 && <span className="text-slate-600 mx-1">+</span>}
                <ClickableValue
                  value={dep.fvValue}
                  field={dep.field}
                  year={dep.year}
                  onNavigate={onNavigate}
                  className="text-amber-400"
                />
              </Fragment>
            ))}
            <span className="text-slate-600 mx-2">=</span>
            <span className="text-emerald-400 font-bold">{fvResult}</span>
          </div>
        )}
      </div>

      {/* Click hint */}
      <div className="text-slate-600 text-xs">Click any value to navigate to that calculation</div>
    </div>
  );
}

export default FormulaDisplay;
