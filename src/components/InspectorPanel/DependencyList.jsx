/**
 * DependencyList - Shows inputs (what feeds into this) and outputs (what depends on this)
 *
 * Provides clickable navigation to related calculations.
 */

import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

import { CALCULATIONS, fK, fM } from '../../lib/calculationDefinitions';
import { CELL_DEPENDENCIES, getReverseDependencies } from '../../lib/calculationDependencies';
import { fmt$ } from '../../lib/formatters';

/**
 * Format a value appropriately based on magnitude
 */
function formatK(value) {
  if (value == null || isNaN(value)) return '-';
  if (Math.abs(value) >= 1e6) {
    return fM(value);
  }
  if (Math.abs(value) >= 1e3) {
    return fK(value);
  }
  return fmt$(value);
}

/**
 * DependencyList component
 *
 * @param {Object} props
 * @param {string} props.field - The field being inspected
 * @param {number} props.year - The year being inspected
 * @param {Array} props.allProjections - All projection data
 * @param {Function} props.onNavigate - Navigation callback (field, year) => void
 */
export function DependencyList({ field, year, allProjections, onNavigate }) {
  const data = allProjections.find(p => p.year === year);

  // Get inputs (what feeds into this calculation)
  const inputs = useMemo(() => {
    if (!field || !data) return [];
    const getDeps = CELL_DEPENDENCIES[field];
    if (!getDeps) return [];
    return getDeps(year, data, allProjections);
  }, [field, year, data, allProjections]);

  // Get outputs (what depends on this calculation)
  const outputs = useMemo(() => {
    if (!field || !allProjections) return [];
    return getReverseDependencies(field, year, allProjections);
  }, [field, year, allProjections]);

  return (
    <div className="space-y-4">
      {/* Inputs */}
      {inputs.length > 0 && (
        <div>
          <h4 className="text-slate-500 text-xs uppercase mb-2 tracking-wide">
            Inputs (click to jump)
          </h4>
          <div className="space-y-1">
            {inputs.map(dep => {
              const depData = allProjections.find(p => p.year === dep.year);
              const value = depData?.[dep.field] || 0;
              const calc = CALCULATIONS[dep.field];
              const label = calc?.name || dep.field;
              const yearDiff = dep.year !== year ? ` (${dep.year})` : '';

              return (
                <button
                  key={`${dep.field}-${dep.year}`}
                  onClick={() => onNavigate(dep.field, dep.year)}
                  className="w-full flex items-center justify-between p-2 rounded
                             bg-slate-800 hover:bg-slate-700 text-left transition-colors"
                >
                  <span className="text-slate-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    {label}
                    {yearDiff}
                  </span>
                  <span className="text-amber-400 text-sm font-mono">{formatK(value)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Outputs / Used By */}
      {outputs.length > 0 && (
        <div data-testid="used-by">
          <h4 className="text-slate-500 text-xs uppercase mb-2 tracking-wide">This feeds into</h4>
          <div className="space-y-1">
            {outputs.map(dep => {
              const calc = CALCULATIONS[dep.field];
              const label = calc?.name || dep.field;
              const yearDiff = dep.year !== year ? ` (${dep.year})` : ' (same year)';

              return (
                <button
                  key={`${dep.field}-${dep.year}`}
                  onClick={() => onNavigate(dep.field, dep.year)}
                  className="w-full flex items-center justify-between p-2 rounded
                             bg-slate-800 hover:bg-slate-700 text-left transition-colors"
                >
                  <span className="text-slate-300 text-sm">{label}</span>
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    {yearDiff}
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No dependencies message */}
      {inputs.length === 0 && outputs.length === 0 && (
        <div className="text-slate-500 text-sm italic">No related calculations found.</div>
      )}
    </div>
  );
}

export default DependencyList;
