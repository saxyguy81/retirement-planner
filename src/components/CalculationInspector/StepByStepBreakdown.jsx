/**
 * StepByStepBreakdown - Renders a multi-step calculation breakdown
 *
 * Shows intermediate calculation steps with clickable field references.
 * Used for complex calculations like withdrawal order, tax computations.
 */

import { FORMULA_COLORS } from '../../lib/colors';

/**
 * StepByStepBreakdown component
 *
 * @param {Object} props
 * @param {Array} props.steps - Array of step objects with label, formula, values, result, fields
 * @param {Object} props.data - Current row data with field values
 * @param {Array} props.projections - All projection rows (for navigation)
 * @param {Function} props.onNavigate - Navigation handler (field, year, data) => void
 */
export function StepByStepBreakdown({ steps, data, projections, onNavigate }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="step-by-step-breakdown">
      {steps.map((step, idx) => (
        <div key={idx} className="bg-slate-900 rounded p-2">
          <div className="text-slate-400 text-xs mb-1">
            Step {idx + 1}: {step.label}
          </div>
          <div className="font-mono text-sm">
            <span className="text-slate-500">{step.formula}</span>
            <div className="text-amber-400">{step.values}</div>
            <div className="text-emerald-400 font-medium">= {step.result}</div>
          </div>
          {/* Clickable field references */}
          {step.fields && step.fields.length > 0 && onNavigate && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {step.fields.map(field => {
                const colorConfig = FORMULA_COLORS[field];
                const color = colorConfig?.color || '#94a3b8';
                const fieldData = projections?.find(p => p.year === data.year);
                return (
                  <button
                    key={field}
                    onClick={() =>
                      onNavigate && fieldData && onNavigate(field, data.year, fieldData)
                    }
                    className="text-xs px-1 rounded hover:bg-white/10"
                    style={{ color, borderBottom: `1px solid ${color}` }}
                    title={`Click to see ${field} calculation`}
                  >
                    {field}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default StepByStepBreakdown;
