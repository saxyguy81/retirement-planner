/**
 * InspectorPanel - Side panel for calculation inspection
 *
 * Replaces the modal-based CalculationInspector with a persistent side panel
 * that keeps the projections table visible and maintains context.
 *
 * Features:
 * - Resizable: 300px min, 500px max
 * - Collapsible: Close button or click outside
 * - Persistent: Width saved to localStorage
 * - PV/FV dual display in formulas
 * - Clickable navigation through dependencies
 */

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DependencyList } from './DependencyList';
import { FormulaDisplay } from './FormulaDisplay';
import { QuickAnswer } from './QuickAnswer';
import { ResizeHandle } from './ResizeHandle';
import { CALCULATIONS } from '../../lib/calculationDefinitions';
import { getReverseDependencies } from '../../lib/calculationDependencies';
import { fmt$ } from '../../lib/formatters';
import { getInputSources } from '../../lib/inputSources';
import { ClickableFormula } from '../CalculationInspector/ClickableFormula';
import { StepByStepBreakdown } from '../CalculationInspector/StepByStepBreakdown';

const PANEL_WIDTH_KEY = 'inspector-panel-width';
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 300;
const MAX_WIDTH = 500;

/**
 * InspectorPanel component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the panel is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.activeField - The field being inspected
 * @param {number} props.activeYear - The year being inspected
 * @param {Object} props.activeData - Current year's projection data
 * @param {Array} props.allProjections - All projection data
 * @param {Object} props.params - Model parameters
 * @param {boolean} props.showPV - Whether PV mode is active
 * @param {Function} props.onNavigate - Navigation callback (field, year) => void
 * @param {Function} props.onBack - Go back in history
 * @param {Function} props.onForward - Go forward in history
 * @param {boolean} props.canGoBack - Whether back navigation is available
 * @param {boolean} props.canGoForward - Whether forward navigation is available
 * @param {Function} props.scrollToCell - Function to scroll table to a cell
 * @param {Function} props.onOpenTaxTables - Callback to open tax table viewer
 */
export function InspectorPanel({
  isOpen,
  onClose,
  activeField,
  activeYear,
  activeData,
  allProjections,
  params,
  showPV,
  onNavigate,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  scrollToCell,
  onOpenTaxTables,
}) {
  // Panel width with localStorage persistence
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(PANEL_WIDTH_KEY);
      return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(saved))) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });

  // Save width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(width));
    } catch {
      // Ignore storage errors
    }
  }, [width]);

  // Get calculation definition
  const calc = useMemo(() => CALCULATIONS[activeField], [activeField]);

  // Compute the result
  const computed = useMemo(() => {
    if (!calc || !activeData || !params) return null;
    return calc.compute(activeData, params, {
      showPV,
      discountRate: params.discountRate || 0.03,
    });
  }, [calc, activeData, params, showPV]);

  // Compute "Used By" - fields that depend on this value (used by DependencyList)
  const _usedBy = useMemo(() => {
    if (!allProjections || !activeField || !activeData) return [];
    return getReverseDependencies(activeField, activeData.year, allProjections);
  }, [activeField, activeData, allProjections]);

  // Compute input sources
  const inputSources = useMemo(() => {
    if (!activeField || !activeData || !params) return null;
    return getInputSources(activeField, activeData.year, activeData.yearsFromStart || 0, params);
  }, [activeField, activeData, params]);

  // Handle navigation with scroll-to-cell
  const handleNavigate = useCallback(
    (field, year) => {
      const data = allProjections.find(p => p.year === year);
      if (data && onNavigate) {
        onNavigate(field, year, data);
        // Scroll to the cell after a brief delay for state update
        if (scrollToCell) {
          setTimeout(() => scrollToCell(field, year), 50);
        }
      }
    },
    [allProjections, onNavigate, scrollToCell]
  );

  // Don't render if closed or no field selected
  if (!isOpen || !activeField) return null;

  // Fallback for fields without calculation definitions
  if (!calc) {
    return (
      <aside
        className="border-l border-slate-700 bg-slate-900 flex flex-col relative shrink-0"
        style={{ width: `${width}px` }}
        data-testid="inspector-panel"
      >
        <ResizeHandle width={width} onResize={setWidth} minWidth={MIN_WIDTH} maxWidth={MAX_WIDTH} />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <div>
            <h3 className="text-blue-400 font-medium" data-testid="inspector-title">
              {activeField}
            </h3>
            <span className="text-slate-500 text-xs">{activeYear}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-slate-400 text-sm">Value: {fmt$(activeData?.[activeField])}</p>
          <p className="text-slate-500 text-xs mt-2">
            Detailed explanation not yet available for this field.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="border-l border-slate-700 bg-slate-900 flex flex-col relative shrink-0"
      style={{ width: `${width}px` }}
      data-testid="calculation-inspector"
    >
      <ResizeHandle width={width} onResize={setWidth} minWidth={MIN_WIDTH} maxWidth={MAX_WIDTH} />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {/* Back/Forward buttons */}
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className={`p-1 rounded ${canGoBack ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
            title="Previous (Alt+Left)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onForward}
            disabled={!canGoForward}
            className={`p-1 rounded ${canGoForward ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
            title="Next (Alt+Right)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 text-center">
          <h3 className="text-blue-400 font-medium text-sm" data-testid="inspector-title">
            {calc.name}
          </h3>
          <div className="text-slate-500 text-xs">
            Year {activeYear} (Age {activeData?.age})
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Answer */}
        <QuickAnswer computed={computed} showPV={showPV} />

        {/* Concept explanation */}
        {calc.concept && (
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">What is this?</div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {calc.concept}
            </p>
          </div>
        )}

        {/* Formula with PV/FV display (Phase 2) */}
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
            Calculation <span className="text-slate-600">(click values to navigate)</span>
          </div>
          <FormulaDisplay
            calc={{ ...calc, key: activeField }}
            computed={computed}
            activeData={activeData}
            activeYear={activeYear}
            allProjections={allProjections}
            showPV={showPV}
            discountRate={params.discountRate || 0.03}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Original formula display for reference */}
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Formula</div>
          <div className="bg-slate-950 rounded p-3 font-mono text-sm space-y-1">
            {/* Symbolic formula */}
            <div className="text-emerald-400">
              <ClickableFormula
                formula={calc.formula}
                data={activeData}
                projections={allProjections}
                onNavigate={handleNavigate}
                currentField={activeField}
              />
            </div>
            {/* Values overlay */}
            {computed?.formulaWithValues && (
              <div className="text-amber-400">{computed.formulaWithValues}</div>
            )}
          </div>
        </div>

        {/* Step-by-Step Breakdown (for complex calculations) */}
        {computed?.steps && computed.steps.length > 0 && (
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              Step-by-Step Calculation
            </div>
            <StepByStepBreakdown
              steps={computed.steps}
              data={activeData}
              projections={allProjections}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* Input Sources */}
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

        {/* Dependencies */}
        <DependencyList
          field={activeField}
          year={activeYear}
          allProjections={allProjections}
          onNavigate={handleNavigate}
        />

        {/* Rule of Thumb */}
        {calc.backOfEnvelope && (
          <div className="text-slate-500 text-xs italic border-t border-slate-800 pt-3">
            <span className="text-slate-400">Rule of thumb:</span> {calc.backOfEnvelope}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t border-slate-700 flex gap-2 text-xs text-slate-400">
        <button
          onClick={() => onOpenTaxTables?.(activeField, activeYear, activeData)}
          className="hover:text-slate-300 transition-colors"
        >
          View Tax Tables
        </button>
        <span className="text-slate-600">|</span>
        <button className="hover:text-slate-300">Export Details</button>
      </div>
    </aside>
  );
}

export default InspectorPanel;
