/**
 * CalculationInspector - Shows calculation breakdown with navigation
 *
 * Unified single-page layout showing all sections at once:
 * 1. Quick Answer - Large, centered back-of-envelope result
 * 2. What is this? - Concept explanation
 * 3. Formula - Color-coded with clickable variable names
 * 4. This Year's Values - Formula -> values -> result
 * 5. Rule of Thumb - Quick mental math
 * 6. Used By - Shows which calculations depend on this value
 */

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

import { ClickableFormula } from './ClickableFormula';
import { StepByStepBreakdown } from './StepByStepBreakdown';
import { CALCULATIONS, fK, fM } from '../../lib/calculationDefinitions';
import { getReverseDependencies } from '../../lib/calculationDependencies';
import { fmt$ } from '../../lib/formatters';
import { getInputSources } from '../../lib/inputSources';

// Re-export CALCULATIONS for backwards compatibility and testing
export { CALCULATIONS };

/**
 * CalculationInspector - Unified single-page view showing all calculation info
 * Supports navigation between calculations with back/forward buttons
 */
export function CalculationInspector({
  // Legacy props (for backwards compatibility)
  field,
  data,
  // New navigation props
  current, // {field, year, data} from navigation hook
  params,
  projections, // All projections for dependency lookup and navigation
  showPV = false, // Whether PV mode is enabled
  discountRate = 0.03, // For PV calculations
  onNavigate, // (field, year, data) => void
  onBack,
  onForward,
  onClose,
  canGoBack,
  canGoForward,
}) {
  // Support both old and new API
  const activeField = current?.field || field;
  const activeData = current?.data || data;

  const calc = CALCULATIONS[activeField];

  // Compute "Used By" - fields that depend on this value
  const usedBy = useMemo(() => {
    if (!projections || !activeField || !activeData) return [];
    return getReverseDependencies(activeField, activeData.year, projections);
  }, [activeField, activeData, projections]);

  // Compute input sources - what user inputs feed into this value
  const inputSources = useMemo(() => {
    if (!activeField || !activeData || !params) return null;
    return getInputSources(activeField, activeData.year, activeData.yearsFromStart || 0, params);
  }, [activeField, activeData, params]);

  // Check if we have navigation capabilities
  const hasNavigation = Boolean(onNavigate && projections);

  // Fallback for fields without detailed calculations
  if (!calc) {
    const handleClose = onClose || (() => {});
    return (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        onClick={handleClose}
      >
        <div
          className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-slate-200">{activeField}</span>
            <button onClick={handleClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-400 text-sm">Value: {fmt$(activeData[activeField])}</p>
          <p className="text-slate-500 text-xs mt-2">
            Detailed explanation not yet available for this field.
          </p>
        </div>
      </div>
    );
  }

  const computed = calc.compute(activeData, params, { showPV, discountRate });
  const handleClose = onClose || (() => {});

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-slate-900 rounded-lg border border-slate-700 w-[600px] max-h-[80vh] overflow-auto shadow-xl"
        onClick={e => e.stopPropagation()}
        data-testid="calculation-inspector"
      >
        {/* Header with Navigation */}
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          {hasNavigation ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  disabled={!canGoBack}
                  className={`p-1 rounded ${canGoBack ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Go back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={onForward}
                  disabled={!canGoForward}
                  className={`p-1 rounded ${canGoForward ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Go forward"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center flex-1">
                <h3 className="text-lg font-medium text-slate-200" data-testid="inspector-title">
                  {calc.name}
                </h3>
                <div className="text-slate-500 text-xs">
                  Year {activeData.year} (Age {activeData.age})
                </div>
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-slate-200" data-testid="inspector-title">
                {calc.name}
              </h3>
              <div className="text-slate-500 text-xs">
                Year {activeData.year} (Age {activeData.age})
              </div>
            </div>
          )}
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - All sections visible */}
        <div className="p-4 space-y-4">
          {/* Quick Answer */}
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            {computed.simpleSecondary && (
              <div className="text-slate-400 text-sm mb-1">{computed.simpleSecondary}</div>
            )}
            <div className="text-3xl font-mono text-blue-400">{computed.simple}</div>
            <div className="text-slate-500 text-xs mt-1">Back-of-envelope</div>
          </div>

          {/* Concept */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">What is this?</div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {calc.concept}
            </p>
          </div>

          {/* Formula with Color-Coded/Clickable Values */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              Formula{' '}
              {hasNavigation && <span className="text-slate-600">(click values to navigate)</span>}
            </div>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm space-y-1">
              {/* Symbolic formula */}
              <div className="text-emerald-400">
                <ClickableFormula
                  formula={calc.formula}
                  data={activeData}
                  projections={projections}
                  onNavigate={hasNavigation ? onNavigate : null}
                  currentField={activeField}
                />
              </div>
              {/* Values overlay - adjacent line with actual numbers */}
              {computed.formulaWithValues && (
                <div className="text-amber-400">{computed.formulaWithValues}</div>
              )}
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              This Year&apos;s Values
            </div>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm space-y-1">
              <div className="text-slate-400 whitespace-pre-wrap">{computed.formula}</div>
              <div className="text-amber-400 whitespace-pre-wrap">{computed.values}</div>
              <div className="text-emerald-400 font-medium text-base pt-2 border-t border-slate-800">
                {computed.result}
              </div>
            </div>
          </div>

          {/* Step-by-Step Breakdown (for complex calculations) */}
          {computed.steps && computed.steps.length > 0 && (
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Step-by-Step Calculation
              </div>
              <StepByStepBreakdown
                steps={computed.steps}
                data={activeData}
                projections={projections}
                onNavigate={hasNavigation ? onNavigate : null}
              />
            </div>
          )}

          {/* Input Sources Section */}
          {inputSources && (
            <div data-testid="input-sources">
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                Input Sources
                <span className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                  User Inputs
                </span>
              </div>
              <div className="bg-slate-950 rounded p-3 space-y-2">
                <div className="text-slate-500 text-sm italic">{inputSources.formula}</div>
                {inputSources.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-1 border-b border-slate-800 last:border-0"
                  >
                    <span className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      {source.label}
                    </span>
                    <span className="text-amber-400 font-mono text-sm">{source.formatted}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Used By Section */}
          {hasNavigation && (
            <div data-testid="used-by">
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                Used By
                {usedBy.length > 0 && <span className="text-slate-500">({usedBy.length})</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {usedBy.length === 0 ? (
                  <span className="text-slate-500 text-sm italic">
                    Not used by other calculations
                  </span>
                ) : (
                  usedBy.map((dep, idx) => {
                    const depCalc = CALCULATIONS[dep.field];
                    const depData = projections.find(p => p.year === dep.year);
                    // Get the actual value from the dependent calculation
                    const depValue = depData ? depData[dep.field] : null;
                    let formattedDepValue = '';
                    if (
                      depValue !== null &&
                      depValue !== undefined &&
                      typeof depValue === 'number'
                    ) {
                      if (Math.abs(depValue) >= 1e6) {
                        formattedDepValue = fM(depValue);
                      } else if (Math.abs(depValue) >= 1e3) {
                        formattedDepValue = fK(depValue);
                      } else {
                        formattedDepValue = `$${Math.round(depValue).toLocaleString()}`;
                      }
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => depData && onNavigate(dep.field, dep.year, depData)}
                        className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-1"
                      >
                        <span>{depCalc?.name || dep.field}</span>
                        {formattedDepValue && (
                          <span className="text-blue-400 font-mono text-xs">
                            {formattedDepValue}
                          </span>
                        )}
                        {dep.year !== activeData.year && (
                          <span className="text-slate-500">({dep.year})</span>
                        )}
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Rule of Thumb */}
          {calc.backOfEnvelope && (
            <div className="text-slate-500 text-xs italic border-t border-slate-800 pt-3">
              <span className="text-slate-400">Rule of thumb:</span> {calc.backOfEnvelope}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalculationInspector;
